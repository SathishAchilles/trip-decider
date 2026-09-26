import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db/client";
import { rankings } from "@/db/schema";
import { DESTINATIONS_BY_ID, HARD_NO_TAGS, topVibes, VIBE_LABELS, type HardNoTag } from "@/lib/catalogue";
import { costFor, nights } from "@/lib/cost";
import { describeQuiz } from "@/lib/quiz";
import { stanceFor } from "@/lib/scoring";
import type { Blocker, PersonCell, ScoredOption, ScoredTrip, Stance, VetoReason } from "@/lib/types";
import {
  RANKER_MODEL,
  RANKER_PROMPT_VERSION,
  RankingSchema,
  rankWithClaude,
  type LlmRanking,
} from "./llmRanker";
import {
  loadTrip,
  logActivity,
  optionLabel,
  progressOf,
  score,
  toScoringInput,
  windowDates,
  type ParticipantRow,
  type Progress,
  type TripBundle,
} from "./trips";

const PENDING_STALE_MS = 10 * 60 * 1000;
// A check-in's AI profile triggers its own re-rank; page views only step in if it seems lost.
const PROFILE_GRACE_MS = 3 * 60 * 1000;

function profilesPending(bundle: TripBundle): boolean {
  return bundle.participants.some(
    (p) => p.submittedAt !== null && !p.persona && !olderThan(p.submittedAt, PROFILE_GRACE_MS),
  );
}
const FAILED_RETRY_MS = 5 * 60 * 1000;

export type PublicCell = {
  participantId: string;
  displayName: string;
  stance: Stance;
  icon: string;
  label: string;
  stretch: boolean;
  vetoReason?: VetoReason;
  reason?: string;
};

export type PublicOption = {
  optionKey: string;
  destinationId: string;
  destinationName: string;
  windowLabel: string;
  windowDates: string;
  vibes: string[];
  meanScore: number;
  minScore: number;
  miserable: boolean;
  cells: PublicCell[];
};

export type ViewStatus = "ready" | "pending" | "failed" | "disabled";

// Privacy-safe ranking as displayed; also the shape frozen in trips.decisionSnapshot.
export type RankedView = {
  source: "llm" | "formula";
  model: string | null;
  status: ViewStatus;
  top3: PublicOption[];
  blockers: Blocker[];
  explanation: string;
  robustness: string[];
};

export type PublicResults =
  | { state: "OPEN"; progress: Progress }
  | (RankedView & {
      state: "SCORED" | "COMMIT" | "LOCKED";
      progress: Progress;
      lockedOptionKey: string | null;
    });

type StoredRanking = { llm: LlmRanking; displayed: string[] };

export function llmEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ---------- Sanitising LLM text ----------

const MONEY = /₹|\binr\b|\brs\.?\s*\d|\d{1,3}(,\d{3})+|\b\d{4,}\b|\b\d+(\.\d+)?\s?k\b/i;

export function stripMoney(text: string, maxLength = 200): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !MONEY.test(sentence))
    .join(" ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeRanking(result: LlmRanking): LlmRanking {
  return {
    ranking: result.ranking.map((r) => ({
      optionKey: r.optionKey,
      people: r.people.map((p) => ({
        participantId: p.participantId,
        fit: p.fit,
        reason: stripMoney(p.reason, 120),
      })),
    })),
    explanation: stripMoney(result.explanation, 300),
    robustness: result.robustness.map((r) => ({ participantId: r.participantId, line: stripMoney(r.line, 160) })),
  };
}

// ---------- Views ----------

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function publicCell(cell: PersonCell): PublicCell {
  // Costs and raw formula scores never leave the server.
  return {
    participantId: cell.participantId,
    displayName: cell.displayName,
    stance: cell.stance,
    icon: cell.icon,
    label: cell.label,
    stretch: cell.stretch,
    vetoReason: cell.vetoReason,
  };
}

function toPublicOption(bundle: TripBundle, option: ScoredOption): PublicOption {
  const window = bundle.windows.find((w) => w.id === option.windowId);
  const destination = DESTINATIONS_BY_ID[option.destinationId];
  return {
    optionKey: option.optionKey,
    destinationId: option.destinationId,
    destinationName: option.destinationName,
    windowLabel: option.windowLabel,
    windowDates: window ? windowDates(window) : "",
    vibes: topVibes(destination).map((v) => VIBE_LABELS[v]),
    meanScore: option.meanScore,
    minScore: option.minScore,
    miserable: option.miserable,
    cells: option.cells.map(publicCell),
  };
}

function formulaView(bundle: TripBundle, scored: ScoredTrip, status: ViewStatus): RankedView {
  return {
    source: "formula",
    model: null,
    status,
    top3: scored.top3.map((o) => toPublicOption(bundle, o)),
    blockers: scored.blockers,
    explanation: scored.explanation,
    robustness: scored.robustness,
  };
}

function llmView(bundle: TripBundle, scored: ScoredTrip, result: LlmRanking): RankedView | null {
  const input = toScoringInput(bundle);
  const threshold = bundle.trip.miseryThreshold;
  const feasible = new Map(scored.options.filter((o) => !o.vetoed).map((o) => [o.optionKey, o]));
  const respondedIds = new Set(bundle.participants.filter((p) => p.submittedAt !== null).map((p) => p.id));
  const pendingIds = new Set(bundle.participants.filter((p) => p.submittedAt === null).map((p) => p.id));

  const top3: PublicOption[] = [];
  const taken = new Set<string>();
  for (const entry of result.ranking) {
    // Hard limits are enforced here: anything outside the feasible set is dropped.
    const option = feasible.get(entry.optionKey);
    if (!option || taken.has(option.destinationId)) continue;

    const fits = new Map(
      entry.people
        .filter((p) => respondedIds.has(p.participantId))
        .map((p) => [p.participantId, { fit: round2(Math.min(1, Math.max(0, p.fit))), reason: p.reason }]),
    );
    if (fits.size !== respondedIds.size) return null;

    const cells = option.cells.map((cell) => {
      const judged = fits.get(cell.participantId);
      if (!judged) return publicCell(cell);
      const stance = stanceFor(
        { score: judged.fit, stretch: cell.stretch },
        true,
        input.deadlinePassed,
        threshold,
      );
      return { ...publicCell(cell), ...stance, reason: judged.reason || undefined };
    });
    const values = [...fits.values()].map((f) => f.fit);
    const minScore = values.length ? Math.min(...values) : 0;

    taken.add(option.destinationId);
    top3.push({
      ...toPublicOption(bundle, option),
      meanScore: values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : 0,
      minScore,
      miserable: values.length > 0 && minScore < threshold,
      cells,
    });
    if (top3.length === 3) break;
  }
  if (top3.length === 0) return null;

  const robustness = result.robustness
    .filter((r) => pendingIds.has(r.participantId) && r.line)
    .map((r) => r.line);

  return {
    source: "llm",
    model: RANKER_MODEL,
    status: "ready",
    top3,
    blockers: top3.length < 3 ? scored.blockers : [],
    explanation: result.explanation || scored.explanation,
    robustness: robustness.length || pendingIds.size === 0 ? robustness : scored.robustness,
  };
}

// ---------- LLM input and cache key ----------

export function rankingInput(bundle: TripBundle, scored: ScoredTrip) {
  const responded = bundle.participants.filter((p) => p.submittedAt !== null);
  const feasible = scored.options.filter((o) => !o.vetoed);
  const answerOf = (participantId: string, windowId: string) =>
    bundle.availability.find((a) => a.participantId === participantId && a.windowId === windowId)?.answer ?? "maybe";

  const payload = {
    participants: bundle.participants.map((p) =>
      p.submittedAt === null
        ? { participantId: p.id, name: p.displayName, answered: false }
        : {
            participantId: p.id,
            name: p.displayName,
            answered: true,
            homeCity: p.homeCity,
            budgetComfortable: p.budgetComfort,
            budgetMax: p.budgetMax,
            vibes: p.vibes,
            hardNos: p.hardNoTags.map((t) => HARD_NO_TAGS[t as HardNoTag] ?? t),
            notes: p.hardNoText ?? "",
            persona: p.persona ? `${p.persona.title} — ${p.persona.line}` : null,
            quiz: p.quiz ? describeQuiz(p.quiz) : null,
          },
    ),
    options: feasible.map((o) => {
      const destination = DESTINATIONS_BY_ID[o.destinationId];
      const window = bundle.windows.find((w) => w.id === o.windowId)!;
      return {
        optionKey: o.optionKey,
        destination: destination.name,
        region: destination.region,
        vibeWeights: destination.weights,
        attributes: destination.hardAttributes.map((t) => HARD_NO_TAGS[t]),
        window: window.label,
        startDate: window.startDate,
        endDate: window.endDate,
        nights: nights(window),
        people: responded.map((p) => ({
          participantId: p.id,
          dateAnswer: answerOf(p.id, window.id),
          estimatedCost: o.cells.find((c) => c.participantId === p.id)?.cost ?? null,
        })),
      };
    }),
  };

  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        promptVersion: RANKER_PROMPT_VERSION,
        model: RANKER_MODEL,
        threshold: bundle.trip.miseryThreshold,
        payload,
      }),
    )
    .digest("hex");

  return { hash, payload, feasibleCount: feasible.length, respondedCount: responded.length };
}

function olderThan(iso: string, ms: number): boolean {
  return Date.now() - new Date(iso).getTime() > ms;
}

function parseStored(value: unknown): StoredRanking | null {
  const stored = value as Partial<StoredRanking> | null;
  const parsed = RankingSchema.safeParse(stored?.llm);
  if (!parsed.success || !Array.isArray(stored?.displayed)) return null;
  return { llm: parsed.data, displayed: stored.displayed };
}

export async function resolveView(bundle: TripBundle): Promise<{ view: RankedView; queue: boolean }> {
  const scored = score(bundle);
  if (!llmEnabled()) return { view: formulaView(bundle, scored, "disabled"), queue: false };

  const { hash, feasibleCount, respondedCount } = rankingInput(bundle, scored);
  if (feasibleCount === 0 || respondedCount === 0) {
    return { view: formulaView(bundle, scored, "ready"), queue: false };
  }

  const [row] = await db
    .select()
    .from(rankings)
    .where(and(eq(rankings.tripId, bundle.trip.id), eq(rankings.inputHash, hash)));

  if (row?.status === "done") {
    const stored = parseStored(row.result);
    const view = stored && llmView(bundle, scored, stored.llm);
    return { view: view ?? formulaView(bundle, scored, "failed"), queue: false };
  }
  if (row?.status === "pending") {
    return { view: formulaView(bundle, scored, "pending"), queue: olderThan(row.updatedAt, PENDING_STALE_MS) };
  }
  if (row?.status === "failed") {
    return { view: formulaView(bundle, scored, "failed"), queue: olderThan(row.updatedAt, FAILED_RETRY_MS) };
  }
  return {
    view: formulaView(bundle, scored, "pending"),
    queue: bundle.trip.state === "SCORED" && !profilesPending(bundle),
  };
}

// ---------- Running the ranker ----------

export function queueRanking(tripId: string): void {
  if (!llmEnabled()) return;
  after(() =>
    runRanking(tripId).catch((error: unknown) => {
      console.error("trip ranking job failed:", error instanceof Error ? error.message : "unknown error");
    }),
  );
}

async function claim(tripId: string, hash: string): Promise<boolean> {
  const now = new Date().toISOString();
  const inserted = await db
    .insert(rankings)
    .values({ tripId, inputHash: hash, status: "pending", model: RANKER_MODEL, createdAt: now, updatedAt: now })
    .onConflictDoNothing()
    .returning();
  if (inserted.length > 0) return true;

  const [row] = await db
    .select()
    .from(rankings)
    .where(and(eq(rankings.tripId, tripId), eq(rankings.inputHash, hash)));
  if (!row) return false;
  const retryable =
    (row.status === "pending" && olderThan(row.updatedAt, PENDING_STALE_MS)) ||
    (row.status === "failed" && olderThan(row.updatedAt, FAILED_RETRY_MS));
  if (!retryable) return false;

  // Compare-and-set on updatedAt so two concurrent retries cannot both claim.
  const updated = await db
    .update(rankings)
    .set({ status: "pending", error: null, updatedAt: now })
    .where(and(eq(rankings.tripId, tripId), eq(rankings.inputHash, hash), eq(rankings.updatedAt, row.updatedAt)))
    .returning();
  return updated.length > 0;
}

export async function runRanking(tripId: string): Promise<void> {
  const bundle = await loadTrip(tripId);
  // Only SCORED shows a live ranking; COMMIT and LOCKED use the frozen snapshot.
  if (!bundle || !llmEnabled() || bundle.trip.state !== "SCORED") return;

  const scored = score(bundle);
  const input = rankingInput(bundle, scored);
  if (input.feasibleCount === 0 || input.respondedCount === 0) return;
  if (!(await claim(tripId, input.hash))) return;

  const where = and(eq(rankings.tripId, tripId), eq(rankings.inputHash, input.hash));
  const raw = await rankWithClaude(input.payload);
  const llm = raw && sanitizeRanking(raw);
  const view = llm && llmView(bundle, scored, llm);
  if (!llm || !view) {
    await db
      .update(rankings)
      .set({ status: "failed", error: raw ? "invalid ranking" : "no ranking returned", updatedAt: new Date().toISOString() })
      .where(where);
    return;
  }

  const [previous] = await db
    .select()
    .from(rankings)
    .where(and(eq(rankings.tripId, tripId), eq(rankings.status, "done"), ne(rankings.inputHash, input.hash)))
    .orderBy(desc(rankings.updatedAt))
    .limit(1);

  const displayed = view.top3.map((o) => o.optionKey);
  const stored: StoredRanking = { llm, displayed };
  await db
    .update(rankings)
    .set({ status: "done", result: stored, error: null, updatedAt: new Date().toISOString() })
    .where(where);

  const named = (keys: string[]) => keys.map((optionKey) => ({ optionKey, name: optionLabel(bundle, optionKey) }));
  const before = previous ? parseStored(previous.result)?.displayed : undefined;
  await logActivity(
    tripId,
    "edited",
    before
      ? `AI re-ranked the options — ${effectSummary(named(before), named(displayed))}.`
      : `AI ranked the options — #1 is ${optionLabel(bundle, displayed[0])}.`,
  );
}

// ---------- Results, costs and effects ----------

function isRankedView(value: unknown): value is RankedView {
  return !!value && typeof value === "object" && Array.isArray((value as RankedView).top3);
}

export async function publicResults(bundle: TripBundle): Promise<PublicResults> {
  const progress = progressOf(bundle);
  const { state, lockedOptionKey, decisionSnapshot } = bundle.trip;
  if (state === "OPEN") return { state, progress };

  if ((state === "COMMIT" || state === "LOCKED") && isRankedView(decisionSnapshot)) {
    return { ...decisionSnapshot, state, progress, lockedOptionKey };
  }

  const { view, queue } = await resolveView(bundle);
  if (queue) queueRanking(bundle.trip.id);
  return { ...view, state, progress, lockedOptionKey };
}

export type OwnCost = {
  optionKey: string;
  name: string;
  cost: number | null;
};

export function ownCosts(bundle: TripBundle, participant: ParticipantRow, top3: PublicOption[]): OwnCost[] {
  const { overrides } = toScoringInput(bundle);
  return top3.map((option) => {
    const window = bundle.windows.find((w) => w.id === option.optionKey.split(":")[1]);
    return {
      optionKey: option.optionKey,
      name: `${option.destinationName} (${option.windowLabel})`,
      cost: window ? costFor(participant, DESTINATIONS_BY_ID[option.destinationId], window, overrides) : null,
    };
  });
}

type Named = { optionKey: string; name: string };

export function effectSummary(before: Named[], after: Named[]): string {
  const beforeKeys = before.map((o) => o.optionKey);
  const afterKeys = after.map((o) => o.optionKey);
  const effects: string[] = [];

  if (before[0] && after[0] && before[0].optionKey !== after[0].optionKey) {
    effects.push(`#1 changed from ${before[0].name} to ${after[0].name}`);
  }
  for (const option of before) {
    if (!afterKeys.includes(option.optionKey)) effects.push(`${option.name} dropped out of the top three`);
  }
  for (const option of after) {
    if (!beforeKeys.includes(option.optionKey)) effects.push(`${option.name} entered the top three`);
  }
  return effects.length ? effects.join("; ") : "no change to the top three";
}
