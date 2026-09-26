"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db/client";
import {
  availability,
  commits,
  costOverrides,
  dateWindows,
  participants,
  trips,
  type QuizAnswers,
} from "@/db/schema";
import { DESTINATIONS_BY_ID, HARD_NO_TAG_IDS, ORIGIN_CITY_NAMES } from "@/lib/catalogue";
import { formatDateTime } from "@/lib/format";
import { comfortFrom, rulesPersona, rulesVibes, WAKE_VIEWS, WALLET_RATIO } from "@/lib/quiz";
import { createTripSchema, type CreateTripInput } from "@/lib/schemas";
import { optionName } from "@/lib/scoring";
import { effectSummary, llmEnabled, queueRanking, resolveView } from "@/server/ranking";
import { mapHardNoText } from "@/server/hardNoMapper";
import { queueProfile } from "@/server/profiler";
import { adminCookieName, checkPin, hashPin, PIN_LOCK_MS, PIN_MAX_FAILS } from "@/server/pin";
import { nameTrip } from "@/server/tripNamer";
import {
  COMMIT_WINDOW_MS,
  cookieName,
  isOrganiser,
  loadTrip,
  logActivity,
  optionLabel,
  score,
  snapshotKeys,
  viewerFor,
  type TripBundle,
} from "@/server/trips";

export type ActionResult = { error: string } | undefined;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form.";
}

// ---------- Trip creation ----------

export async function createTrip(input: CreateTripInput): Promise<ActionResult> {
  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const value = parsed.data;

  const tripId = nanoid(12);
  const organiserToken = nanoid(21);
  const now = new Date().toISOString();
  const name =
    value.tripName ||
    (await nameTrip({ people: [value.organiserName, ...value.otherNames], windows: value.windows }));

  await db.insert(trips).values({
    id: tripId,
    name,
    organiserToken,
    deadline: value.deadline,
    adminPinHash: hashPin(value.pin),
    createdAt: now,
  });
  await db.insert(participants).values(
    [value.organiserName, ...value.otherNames].map((displayName) => ({
      id: nanoid(12),
      tripId,
      displayName,
      editToken: nanoid(21),
    })),
  );
  await db.insert(dateWindows).values(
    value.windows.map((w) => ({ id: nanoid(12), tripId, ...w })),
  );
  await logActivity(
    tripId,
    "state",
    `${value.organiserName} started the trip. Answers close ${formatDateTime(value.deadline)}.`,
  );

  // The creator is signed in to the admin page; others need the PIN.
  const store = await cookies();
  store.set(adminCookieName(tripId), organiserToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  redirect(`/t/${tripId}/admin`);
}

export async function suggestTripName(input: {
  people: string[];
  windows: { label: string; startDate: string }[];
}): Promise<string> {
  const people = input.people.map((p) => p.trim().slice(0, 40)).filter(Boolean).slice(0, 12);
  const windows = input.windows.slice(0, 6).map((w) => ({ label: w.label.slice(0, 40), startDate: w.startDate }));
  return nameTrip({ people, windows });
}

export async function verifyAdminPin(tripId: string, pin: string): Promise<ActionResult> {
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
  if (!trip?.adminPinHash) return { error: "This trip has no organiser PIN." };

  const now = Date.now();
  if (trip.adminPinLockedUntil && new Date(trip.adminPinLockedUntil).getTime() > now) {
    const minutes = Math.ceil((new Date(trip.adminPinLockedUntil).getTime() - now) / 60000);
    return { error: `Too many wrong tries. Try again in ${minutes} min.` };
  }
  if (!/^\d{4}$/.test(pin) || !checkPin(pin, trip.adminPinHash)) {
    const fails = trip.adminPinFails + 1;
    const locked = fails >= PIN_MAX_FAILS;
    await db
      .update(trips)
      .set({
        adminPinFails: locked ? 0 : fails,
        adminPinLockedUntil: locked ? new Date(now + PIN_LOCK_MS).toISOString() : null,
      })
      .where(eq(trips.id, tripId));
    return {
      error: locked
        ? "Too many wrong tries. Locked for 15 minutes."
        : `Wrong PIN — ${PIN_MAX_FAILS - fails} ${PIN_MAX_FAILS - fails === 1 ? "try" : "tries"} left.`,
    };
  }

  await db.update(trips).set({ adminPinFails: 0, adminPinLockedUntil: null }).where(eq(trips.id, tripId));
  const store = await cookies();
  store.set(adminCookieName(tripId), trip.organiserToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  refresh();
}

// ---------- Name claim ----------

export async function claimName(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  const bundle = await loadTrip(tripId);
  if (!bundle) redirect("/");

  const person = bundle.participants.find((p) => p.id === participantId);
  if (!person || person.claimed) redirect(`/t/${tripId}?claimed=1`);

  await db.update(participants).set({ claimed: true }).where(eq(participants.id, person.id));
  const store = await cookies();
  store.set(cookieName(tripId), person.editToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  redirect(`/t/${tripId}/me`);
}

// ---------- Preferences ----------

// Explicit answers (dates, budget ceiling, no-fly list, home city) drive the hard limits;
// the quiz is turned into vibes, comfortable spend and a persona by rules now and the AI after.
const quizSchema = z.object({
  from: z.string().trim().max(60),
  wakeViews: z
    .array(z.enum(WAKE_VIEWS.map((v) => v.id) as [string, ...string[]]))
    .min(1, "Pick at least one view you'd wake up to.")
    .max(2, "Pick at most two views."),
  dayTwo: z.enum(["trek", "beach", "streets", "asleep"], { message: "Tell us your day-two morning." }),
  thisOrThat: z.object({
    scenery: z.enum(["mountains", "sea"]),
    plan: z.enum(["planned", "wing"]),
    food: z.enum(["street", "cafe"]),
    crowd: z.enum(["lively", "quiet"]),
    travel: z.enum(["road", "fly"]),
  }, { message: "Finish the this-or-that round." }),
  wallet: z.enum(["splurge", "balanced", "backpacker"], { message: "Pick your wallet mood." }),
  dream: z.string().trim().max(140, "Keep it under 140 characters."),
});

const preferencesSchema = z.object({
  homeCity: z.enum(ORIGIN_CITY_NAMES, { message: "Tell us where you're flying in from." }),
  availability: z.record(z.string(), z.enum(["yes", "maybe", "no"])),
  budgetMax: z.number().int().min(2000, "Set a ceiling of at least ₹2,000.").max(500000),
  hardNoTags: z.array(z.enum(HARD_NO_TAG_IDS)).max(3, "Pick at most three dealbreakers."),
  hardNoText: z.string().trim().max(200, "Keep it under 200 characters.").optional(),
  quiz: quizSchema,
});

export type PreferencesInput = z.input<typeof preferencesSchema>;

function changedFields(
  bundle: TripBundle,
  before: TripBundle["participants"][number],
  after: z.output<typeof preferencesSchema>,
): string[] {
  const fields: string[] = [];
  const oldAvailability = bundle.availability.filter((a) => a.participantId === before.id);
  const datesChanged =
    before.homeCity !== after.homeCity ||
    oldAvailability.some((a) => after.availability[a.windowId] !== a.answer);
  if (datesChanged) fields.push("dates");
  if (before.budgetMax !== after.budgetMax || before.quiz?.wallet !== after.quiz.wallet) fields.push("budget");
  if (JSON.stringify({ ...before.quiz, from: "", wallet: "" }) !== JSON.stringify({ ...after.quiz, from: "", wallet: "" })) {
    fields.push("travel personality");
  }
  const oldTags = [...before.hardNoTags].sort().join(",");
  if (oldTags !== [...after.hardNoTags].sort().join(",")) fields.push("no-fly list");
  return fields;
}

export async function savePreferences(
  tripId: string,
  input: PreferencesInput,
): Promise<ActionResult> {
  const bundle = await loadTrip(tripId);
  if (!bundle) return { error: "This trip no longer exists." };
  const viewer = await viewerFor(bundle);
  if (!viewer) return { error: "Tap your name on the group link first." };
  if (bundle.trip.state === "COMMIT" || bundle.trip.state === "LOCKED") {
    return { error: "Answers are closed. Only a veto can reopen the decision." };
  }

  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const value = parsed.data;
  if (bundle.windows.some((w) => !value.availability[w.id])) {
    return { error: "Pick Confirmed, Standby or Can't fly for every departure." };
  }

  const firstSubmission = viewer.submittedAt === null;
  // With the LLM on, the re-rank itself logs the effect once it finishes.
  const formulaEffect = bundle.trip.state === "SCORED" && !llmEnabled();
  const named = (options: { optionKey: string; destinationName: string; windowLabel: string }[]) =>
    options.map((o) => ({ optionKey: o.optionKey, name: optionName(o) }));
  const beforeTop3 = formulaEffect ? named(score(bundle).top3) : [];
  const fields = firstSubmission ? [] : changedFields(bundle, viewer, value);

  const quiz = value.quiz as QuizAnswers;
  const quizChanged = firstSubmission || !viewer.persona || JSON.stringify(viewer.quiz) !== JSON.stringify(quiz);
  // Rules give an immediate profile; the AI refines it moments later when enabled.
  const vibes = quizChanged ? rulesVibes(quiz) : (viewer.vibes ?? rulesVibes(quiz));
  const budgetComfort =
    quizChanged || viewer.budgetMax !== value.budgetMax || !viewer.budgetComfort
      ? comfortFrom(value.budgetMax, WALLET_RATIO[quiz.wallet])
      : viewer.budgetComfort;
  const persona = quizChanged ? (llmEnabled() ? null : rulesPersona(vibes)) : viewer.persona;

  await db
    .update(participants)
    .set({
      homeCity: value.homeCity,
      budgetComfort,
      budgetMax: value.budgetMax,
      vibes,
      quiz,
      persona,
      hardNoTags: value.hardNoTags,
      hardNoText: value.hardNoText || null,
      submittedAt: viewer.submittedAt ?? new Date().toISOString(),
    })
    .where(eq(participants.id, viewer.id));
  await db.delete(availability).where(eq(availability.participantId, viewer.id));
  await db.insert(availability).values(
    bundle.windows.map((w) => ({
      participantId: viewer.id,
      windowId: w.id,
      answer: value.availability[w.id],
    })),
  );

  if (firstSubmission) {
    await logActivity(tripId, "submitted", `${viewer.displayName} checked in.`, viewer.id);
  } else if (fields.length > 0) {
    let message = `${viewer.displayName} updated ${fields.join(", ")}`;
    if (formulaEffect) {
      const updated = await loadTrip(tripId);
      message += ` — ${effectSummary(beforeTop3, updated ? named(score(updated).top3) : [])}`;
    }
    await logActivity(tripId, "edited", `${message}.`, viewer.id);
  }

  // Re-load so a final check-in moves the trip to SCORED immediately.
  await loadTrip(tripId);
  // The profile job re-ranks when it finishes, so only one of the two is queued.
  if (quizChanged && llmEnabled()) queueProfile(viewer.id, tripId);
  else queueRanking(tripId);
  redirect(`/t/${tripId}/me?checked=1`);
}

export async function suggestHardNoTags(text: string): Promise<string[]> {
  return mapHardNoText(text);
}

// ---------- Organiser ----------

async function organiserBundle(formData: FormData): Promise<TripBundle> {
  const tripId = String(formData.get("tripId") ?? "");
  const key = String(formData.get("k") ?? "");
  const bundle = await loadTrip(tripId);
  if (!bundle || !isOrganiser(bundle, key)) redirect("/");
  return bundle;
}

export async function closeEarly(formData: FormData): Promise<void> {
  const bundle = await organiserBundle(formData);
  if (bundle.trip.state !== "OPEN") return;
  await db.update(trips).set({ state: "SCORED" }).where(eq(trips.id, bundle.trip.id));
  await logActivity(
    bundle.trip.id,
    "state",
    "The organiser closed answers early — results are in. Anyone who didn't answer counts as flexible.",
  );
  queueRanking(bundle.trip.id);
  refresh();
}

export async function startCommitRound(formData: FormData): Promise<void> {
  const bundle = await organiserBundle(formData);
  if (bundle.trip.state !== "SCORED") return;
  const { view } = await resolveView(bundle);
  // Never freeze a ranking the AI is about to replace.
  if (view.status === "pending" || view.top3.length === 0) return;
  const commitDeadline = new Date(Date.now() + COMMIT_WINDOW_MS).toISOString();
  const ids = bundle.participants.map((p) => p.id);
  await db.delete(commits).where(inArray(commits.participantId, ids));
  await db
    .update(trips)
    .set({ state: "COMMIT", commitDeadline, decisionSnapshot: view })
    .where(eq(trips.id, bundle.trip.id));
  await logActivity(
    bundle.trip.id,
    "state",
    `Commit round started — tick which of the top 3 you're in for by ${formatDateTime(commitDeadline)}.`,
  );
  refresh();
}

export async function resetClaim(formData: FormData): Promise<void> {
  const bundle = await organiserBundle(formData);
  const participantId = String(formData.get("participantId") ?? "");
  const person = bundle.participants.find((p) => p.id === participantId);
  if (!person) return;
  await db
    .update(participants)
    .set({ claimed: false, editToken: nanoid(21) })
    .where(eq(participants.id, person.id));
  refresh();
}

const overrideSchema = z.object({
  destinationId: z.string().refine((id) => id in DESTINATIONS_BY_ID, "Unknown destination."),
  stayPerNight: z.coerce.number().int().min(0).max(100000),
  dailySpend: z.coerce.number().int().min(0).max(100000),
});

export async function setCostOverride(formData: FormData): Promise<void> {
  const bundle = await organiserBundle(formData);
  if (bundle.trip.state === "COMMIT" || bundle.trip.state === "LOCKED") return;
  const parsed = overrideSchema.safeParse({
    destinationId: formData.get("destinationId"),
    stayPerNight: formData.get("stayPerNight"),
    dailySpend: formData.get("dailySpend"),
  });
  if (!parsed.success) return;
  const value = parsed.data;
  await db
    .insert(costOverrides)
    .values({ tripId: bundle.trip.id, ...value })
    .onConflictDoUpdate({
      target: [costOverrides.tripId, costOverrides.destinationId],
      set: { stayPerNight: value.stayPerNight, dailySpend: value.dailySpend },
    });
  await logActivity(
    bundle.trip.id,
    "edited",
    `The organiser updated the cost estimate for ${DESTINATIONS_BY_ID[value.destinationId].name}.`,
  );
  queueRanking(bundle.trip.id);
  refresh();
}

// ---------- Commit round and veto ----------

export async function saveCommit(tripId: string, approvedKeys: string[]): Promise<ActionResult> {
  const bundle = await loadTrip(tripId);
  if (!bundle) return { error: "This trip no longer exists." };
  const viewer = await viewerFor(bundle);
  if (!viewer) return { error: "Tap your name on the group link first." };
  if (bundle.trip.state !== "COMMIT") return { error: "The commit round is not open." };

  const keys = snapshotKeys(bundle) ?? score(bundle).top3.map((o) => o.optionKey);
  await db.delete(commits).where(eq(commits.participantId, viewer.id));
  await db.insert(commits).values(
    keys.map((optionKey) => ({
      participantId: viewer.id,
      optionKey,
      approved: approvedKeys.includes(optionKey),
    })),
  );
  await loadTrip(tripId);
  refresh();
}

const vetoSchema = z
  .string()
  .trim()
  .min(20, "Please give a reason of at least 20 characters.")
  .max(300);

export async function vetoDecision(tripId: string, reason: string): Promise<ActionResult> {
  const bundle = await loadTrip(tripId);
  if (!bundle) return { error: "This trip no longer exists." };
  const viewer = await viewerFor(bundle);
  if (!viewer) return { error: "Tap your name on the group link first." };
  if (bundle.trip.state !== "LOCKED") return { error: "There is no locked decision to veto." };

  const parsed = vetoSchema.safeParse(reason);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const lockedKey = bundle.trip.lockedOptionKey;
  const ids = bundle.participants.map((p) => p.id);
  await db.delete(commits).where(inArray(commits.participantId, ids));
  await db
    .update(trips)
    .set({ state: "SCORED", lockedOptionKey: null, commitDeadline: null, decisionSnapshot: null })
    .where(and(eq(trips.id, tripId), eq(trips.state, "LOCKED")));
  await logActivity(
    tripId,
    "veto",
    `${viewer.displayName} vetoed ${lockedKey ? optionLabel(bundle, lockedKey) : "the decision"}: “${parsed.data}”. Answers are open again.`,
    viewer.id,
  );
  queueRanking(tripId);
  refresh();
}
