import type { Persona, QuizAnswers, Vibes } from "@/db/schema";
import { VIBES, type Vibe } from "./catalogue";

// ---------- Question options (shared by the form, the rules fallback and the AI prompt) ----------

export const WAKE_VIEWS = [
  { id: "goa", caption: "Palm huts & a party beach" },
  { id: "varkala", caption: "Cliffs over an empty beach" },
  { id: "munnar", caption: "Tea hills in the clouds" },
  { id: "manali", caption: "Snow peaks at the window" },
  { id: "hampi", caption: "Ruins at golden hour" },
  { id: "rishikesh", caption: "A river roaring past" },
] as const;

export const DAY_TWO = [
  { id: "trek", emoji: "🥾", label: "Sunrise trek, already done" },
  { id: "beach", emoji: "☕", label: "Beach, coffee, a book" },
  { id: "streets", emoji: "🗺️", label: "Lost in old streets" },
  { id: "asleep", emoji: "😴", label: "Asleep after last night" },
] as const;

export const THIS_OR_THAT = [
  { key: "scenery", a: { id: "mountains", emoji: "⛰️", label: "Mountains" }, b: { id: "sea", emoji: "🌊", label: "Sea" } },
  { key: "plan", a: { id: "planned", emoji: "🗓️", label: "Planned to the hour" }, b: { id: "wing", emoji: "🎲", label: "Wing it" } },
  { key: "food", a: { id: "street", emoji: "🌮", label: "Street food" }, b: { id: "cafe", emoji: "🥐", label: "Cute café" } },
  { key: "crowd", a: { id: "lively", emoji: "🎉", label: "Lively & loud" }, b: { id: "quiet", emoji: "🍃", label: "Quiet & empty" } },
  { key: "travel", a: { id: "road", emoji: "🚗", label: "Road trip" }, b: { id: "fly", emoji: "✈️", label: "Just fly" } },
] as const;

export const WALLET = [
  { id: "splurge", emoji: "💸", label: "Spend freely", hint: "Happy to go close to my max" },
  { id: "balanced", emoji: "⚖️", label: "Keep it balanced", hint: "Comfortable a bit below my max" },
  { id: "backpacker", emoji: "🪙", label: "Keep it cheap", hint: "The less I spend, the better" },
] as const;

export const BUDGET_CHIPS = [8000, 12000, 15000, 20000, 25000, 30000];

// ---------- Rules fallback: quiz -> vibes, comfortable spend, persona ----------

type Delta = Partial<Record<Vibe, number>>;

const VIEW_DELTA: Record<string, Delta> = {
  goa: { beach: 2, nightlife: 2 },
  varkala: { beach: 2, chill: 2 },
  munnar: { hills: 2, chill: 1 },
  manali: { hills: 2, adventure: 2 },
  hampi: { heritage: 3, adventure: 1 },
  rishikesh: { adventure: 2, hills: 1, heritage: 1 },
};

const DAY_TWO_DELTA: Record<QuizAnswers["dayTwo"], Delta> = {
  trek: { adventure: 2, hills: 1 },
  beach: { beach: 1, chill: 2 },
  streets: { heritage: 2 },
  asleep: { nightlife: 2, chill: 1 },
};

const CHOICE_DELTA: Record<string, Delta> = {
  mountains: { hills: 1 },
  sea: { beach: 1 },
  planned: { heritage: 1 },
  wing: { adventure: 1 },
  street: { heritage: 1 },
  cafe: { chill: 1 },
  lively: { nightlife: 1 },
  quiet: { chill: 1 },
  road: { adventure: 1 },
  fly: { chill: 1 },
};

export const WALLET_RATIO: Record<QuizAnswers["wallet"], number> = {
  splurge: 0.95,
  balanced: 0.8,
  backpacker: 0.65,
};

export function comfortFrom(max: number, ratio: number): number {
  return Math.max(1000, Math.round((max * ratio) / 500) * 500);
}

export function rulesVibes(quiz: QuizAnswers): Vibes {
  const score = Object.fromEntries(VIBES.map((v) => [v, 2])) as Record<Vibe, number>;
  const apply = (delta: Delta | undefined) => {
    for (const [vibe, amount] of Object.entries(delta ?? {})) score[vibe as Vibe] += amount;
  };
  quiz.wakeViews.forEach((view) => apply(VIEW_DELTA[view]));
  apply(DAY_TWO_DELTA[quiz.dayTwo]);
  Object.values(quiz.thisOrThat).forEach((choice) => apply(CHOICE_DELTA[choice]));
  return Object.fromEntries(VIBES.map((v) => [v, Math.min(5, Math.max(1, score[v]))])) as Vibes;
}

const PERSONAS: Record<Vibe, Omit<Persona, "source">> = {
  beach: { emoji: "🏖️", title: "The Beach Bum", line: "Salt in the hair, zero plans before noon." },
  hills: { emoji: "⛰️", title: "The Mist Chaser", line: "Happiest where the road runs out of flat." },
  heritage: { emoji: "🏯", title: "The Time Traveller", line: "Reads every plaque, finds the best old café." },
  adventure: { emoji: "🧗", title: "The Adrenaline Seeker", line: "Up before the guide, first into the rapids." },
  chill: { emoji: "🌿", title: "The Slow Traveller", line: "A hammock, a view, nowhere to be." },
  nightlife: { emoji: "🎶", title: "The Night Owl", line: "Knows the best spot after midnight." },
};

export function rulesPersona(vibes: Vibes): Persona {
  const top = [...VIBES].sort((a, b) => vibes[b] - vibes[a])[0];
  return { ...PERSONAS[top], source: "rules" };
}

// Plain-language summary of the quiz for the AI profiler and ranker.
export function describeQuiz(quiz: QuizAnswers): Record<string, string> {
  const pick = <T extends { id: string }>(list: readonly T[], id: string) => list.find((o) => o.id === id);
  return {
    wakeUpViews: quiz.wakeViews.map((v) => pick(WAKE_VIEWS, v)?.caption ?? v).join("; "),
    dayTwoAt9am: pick(DAY_TWO, quiz.dayTwo)?.label ?? quiz.dayTwo,
    thisOrThat: THIS_OR_THAT.map((q) => {
      const chosen = quiz.thisOrThat[q.key];
      return `${q.a.label} vs ${q.b.label}: ${chosen === q.a.id ? q.a.label : q.b.label}`;
    }).join("; "),
    wallet: pick(WALLET, quiz.wallet)?.label ?? quiz.wallet,
    bestTripEverWouldHave: quiz.dream || "(skipped)",
  };
}
