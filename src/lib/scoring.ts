import {
  DESTINATIONS,
  HARD_NO_TAGS,
  VIBES,
  type Destination,
  type HardNoTag,
} from "./catalogue";
import { costFor, nights } from "./cost";
import type {
  Blocker,
  DateWindow,
  Participant,
  PersonCell,
  ScoredOption,
  ScoredTrip,
  ScoringInput,
  Stance,
  VetoReason,
} from "./types";

export const SCORE_WEIGHTS = { vibe: 0.5, budget: 0.3, date: 0.2 } as const;
const DATE_FIT = { yes: 1, maybe: 0.6 } as const;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function optionKey(destinationId: string, windowId: string): string {
  return `${destinationId}:${windowId}`;
}

export function optionName(option: Pick<ScoredOption, "destinationName" | "windowLabel">): string {
  return `${option.destinationName} (${option.windowLabel})`;
}

export function vetoLabel(reason: VetoReason): string {
  if (reason.kind === "dates") return "Can't — dates";
  if (reason.kind === "budget") return "Can't — over budget";
  return `Can't — ${HARD_NO_TAGS[reason.tag]}`;
}

export function stanceFor(
  cell: Pick<PersonCell, "score" | "stretch" | "vetoReason">,
  responded: boolean,
  deadlinePassed: boolean,
  threshold: number,
): { stance: Stance; icon: string; label: string } {
  if (!responded) {
    return deadlinePassed
      ? { stance: "flexible", icon: "—", label: "Didn't answer — counted as flexible" }
      : { stance: "pending", icon: "⏳", label: "Pending" };
  }
  if (cell.vetoReason) {
    return { stance: "veto", icon: "✕", label: vetoLabel(cell.vetoReason) };
  }

  const score = cell.score ?? 0;
  const suffix = cell.stretch ? " · budget stretch" : "";
  if (score >= 0.8) return { stance: "loves", icon: "✔", label: `Loves it${suffix}` };
  if (score >= 0.6) return { stance: "good", icon: "✔", label: `Good${suffix}` };
  if (score >= threshold) return { stance: "ok", icon: "◐", label: `OK${suffix}` };
  return { stance: "unhappy", icon: "▼", label: `Unhappy${suffix}` };
}

function vibeFit(participant: Participant, destination: Destination): number {
  if (!participant.vibes) return 0.5;
  let weighted = 0;
  let totalWeight = 0;
  for (const vibe of VIBES) {
    const weight = destination.weights[vibe];
    weighted += ((participant.vibes[vibe] - 1) / 4) * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : weighted / totalWeight;
}

function personCell(
  participant: Participant,
  destination: Destination,
  window: DateWindow,
  input: ScoringInput,
): PersonCell {
  const base = { participantId: participant.id, displayName: participant.displayName };

  if (!participant.submitted) {
    const cell = { stretch: false };
    return {
      ...base,
      ...cell,
      ...stanceFor(cell, false, input.deadlinePassed, input.miseryThreshold),
    };
  }

  const answer = input.availability[participant.id]?.[window.id] ?? "maybe";
  const cost = costFor(participant, destination, window, input.overrides) ?? 0;
  const comfort = participant.budgetComfort ?? cost;
  const max = participant.budgetMax ?? comfort;

  let vetoReason: VetoReason | undefined;
  if (answer === "no") {
    vetoReason = { kind: "dates" };
  } else if (cost > max) {
    vetoReason = { kind: "budget" };
  } else {
    const tag = participant.hardNoTags.find((t) =>
      destination.hardAttributes.includes(t as HardNoTag),
    );
    if (tag) vetoReason = { kind: "hardno", tag: tag as HardNoTag };
  }

  if (vetoReason) {
    const cell = { cost, stretch: false, vetoReason };
    return {
      ...base,
      ...cell,
      ...stanceFor(cell, true, input.deadlinePassed, input.miseryThreshold),
    };
  }

  const budgetFit =
    cost <= comfort ? 1 : Math.max(0, 1 - (cost - comfort) / (max - comfort));
  const dateFit = DATE_FIT[answer as keyof typeof DATE_FIT];
  const score = round2(
    SCORE_WEIGHTS.vibe * vibeFit(participant, destination) +
      SCORE_WEIGHTS.budget * budgetFit +
      SCORE_WEIGHTS.date * dateFit,
  );
  const cell = { cost, score, stretch: budgetFit < 1 };
  return {
    ...base,
    ...cell,
    ...stanceFor(cell, true, input.deadlinePassed, input.miseryThreshold),
  };
}

function scoreOption(
  destination: Destination,
  window: DateWindow,
  input: ScoringInput,
): ScoredOption {
  const cells = input.participants.map((p) => personCell(p, destination, window, input));
  const responded = cells.filter((_, i) => input.participants[i].submitted);
  const scores = responded
    .map((c) => c.score)
    .filter((s): s is number => s !== undefined);
  const costs = responded
    .map((c) => c.cost)
    .filter((c): c is number => c !== undefined);

  const vetoed = responded.some((c) => c.vetoReason);
  const meanScore = scores.length
    ? round2(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const minScore = scores.length ? Math.min(...scores) : 0;
  const avgCost = costs.length
    ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length)
    : 0;

  return {
    optionKey: optionKey(destination.id, window.id),
    destinationId: destination.id,
    destinationName: destination.name,
    windowId: window.id,
    windowLabel: window.label,
    vetoed,
    miserable: !vetoed && scores.length > 0 && minScore < input.miseryThreshold,
    meanScore,
    minScore,
    avgCost,
    cells,
  };
}

type Rankable = Pick<ScoredOption, "meanScore" | "minScore" | "avgCost" | "optionKey">;

export function compareOptions(a: Rankable, b: Rankable): number {
  return (
    b.meanScore - a.meanScore ||
    b.minScore - a.minScore ||
    a.avgCost - b.avgCost ||
    a.optionKey.localeCompare(b.optionKey)
  );
}

function pickTop3(ranked: ScoredOption[], miserable: ScoredOption[]): ScoredOption[] {
  const top: ScoredOption[] = [];
  const taken = new Set<string>();
  for (const option of [...ranked, ...miserable]) {
    if (top.length === 3) break;
    if (taken.has(option.destinationId)) continue;
    taken.add(option.destinationId);
    top.push(option);
  }
  return top;
}

function blockersFor(options: ScoredOption[]): Blocker[] {
  const counts = new Map<string, number>();
  for (const option of options) {
    for (const cell of option.cells) {
      if (!cell.vetoReason) continue;
      const label = `${cell.displayName} · ${vetoLabel(cell.vetoReason)}`;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
}

export function explain(top3: ScoredOption[], options: ScoredOption[]): string {
  if (top3.length === 0) return "No option works for everyone who has answered yet.";

  const [a, b] = top3;
  if (a.miserable) {
    return `No option clears the fairness floor for everyone; ${optionName(a)} comes closest.`;
  }

  let sentence: string;
  if (!b) {
    sentence = `${optionName(a)} is the only option that works for everyone who has answered.`;
  } else if (a.meanScore - b.meanScore >= 0.05) {
    sentence = `${optionName(a)} ranks above ${optionName(b)} because it suits the group better overall (${a.meanScore.toFixed(2)} vs ${b.meanScore.toFixed(2)}).`;
  } else if (a.minScore > b.minScore) {
    sentence = `${optionName(a)} ranks above ${optionName(b)} because its least happy person is happier (${a.minScore.toFixed(2)} vs ${b.minScore.toFixed(2)}).`;
  } else if (a.avgCost < b.avgCost) {
    sentence = `${optionName(a)} and ${optionName(b)} are nearly tied; ${optionName(a)} is cheaper on average.`;
  } else {
    sentence = `${optionName(a)} edges out ${optionName(b)} on overall fit (${a.meanScore.toFixed(2)} vs ${b.meanScore.toFixed(2)}).`;
  }

  const morePopular = options
    .filter((o) => o.miserable && o.meanScore > a.meanScore)
    .sort(compareOptions)[0];
  if (morePopular) {
    const unhappiest = morePopular.cells
      .filter((c) => c.score !== undefined)
      .sort((x, y) => (x.score ?? 0) - (y.score ?? 0))[0];
    sentence += ` ${optionName(morePopular)} was more popular but left ${unhappiest.displayName} below the fairness floor.`;
  }
  return sentence;
}

export function robustness(
  input: ScoringInput,
  ranked: ScoredOption[],
): string[] {
  const leader = ranked[0];
  if (!leader) return [];

  const nonRespondents = input.participants.filter((p) => !p.submitted);
  return nonRespondents.map((x) => {
    const adjusted = ranked.map((option) => {
      const scores = option.cells
        .map((c) => c.score)
        .filter((s): s is number => s !== undefined);
      const synthetic =
        option.optionKey === leader.optionKey ? input.miseryThreshold : 1;
      const all = [...scores, synthetic];
      return {
        optionKey: option.optionKey,
        avgCost: option.avgCost,
        meanScore: round2(all.reduce((s, v) => s + v, 0) / all.length),
        minScore: Math.min(...all),
      };
    });
    const stillFirst = adjusted.sort(compareOptions)[0].optionKey === leader.optionKey;
    return stillFirst
      ? `Stays #1 unless ${x.displayName} rules it out`
      : `${x.displayName}'s answer could change the result`;
  });
}

export function generateOptions(windows: DateWindow[]): { destination: Destination; window: DateWindow }[] {
  return DESTINATIONS.flatMap((destination) =>
    windows
      .filter((window) => nights(window) >= destination.minNights)
      .map((window) => ({ destination, window })),
  );
}

export function scoreTrip(input: ScoringInput): ScoredTrip {
  const options = generateOptions(input.windows).map(({ destination, window }) =>
    scoreOption(destination, window, input),
  );

  const ranked = options.filter((o) => !o.vetoed && !o.miserable).sort(compareOptions);
  const miserable = options.filter((o) => o.miserable).sort(compareOptions);
  const top3 = pickTop3(ranked, miserable);

  return {
    options,
    ranked,
    top3,
    blockers: top3.length < 3 ? blockersFor(options) : [],
    explanation: explain(top3, options),
    robustness: top3[0] && !top3[0].miserable ? robustness(input, ranked) : [],
  };
}
