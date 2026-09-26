import { randomBytes, scryptSync } from "node:crypto";
import { nanoid } from "nanoid";
import { db } from "../src/db/client";
import { activity, availability, dateWindows, participants, trips, type QuizAnswers } from "../src/db/schema";
import { comfortFrom, rulesPersona, rulesVibes, WALLET_RATIO } from "../src/lib/quiz";

type Answer = "yes" | "maybe" | "no";

type SeedPerson = {
  name: string;
  city?: string;
  answers?: [Answer, Answer, Answer];
  max?: number;
  quiz?: QuizAnswers;
  hardNo?: string[];
};

const PEOPLE: SeedPerson[] = [
  {
    name: "Riya",
    city: "Bengaluru",
    answers: ["yes", "yes", "maybe"],
    max: 22000,
    hardNo: [],
    quiz: {
      from: "Koramangala",
      wakeViews: ["varkala", "munnar"],
      dayTwo: "beach",
      thisOrThat: { scenery: "sea", plan: "wing", food: "cafe", crowd: "quiet", travel: "fly" },
      wallet: "balanced",
      dream: "hammocks, sunsets and no alarms",
    },
  },
  {
    name: "Siddharth",
    city: "Mumbai",
    answers: ["no", "yes", "yes"],
    max: 25000,
    hardNo: ["high_altitude"],
    quiz: {
      from: "Andheri",
      wakeViews: ["rishikesh", "goa"],
      dayTwo: "trek",
      thisOrThat: { scenery: "mountains", plan: "wing", food: "street", crowd: "lively", travel: "road" },
      wallet: "splurge",
      dream: "rafting by day, a loud beach shack by night",
    },
  },
  {
    name: "Karan",
    city: "Delhi",
    answers: ["yes", "yes", "yes"],
    max: 16000,
    hardNo: ["overnight_bus"],
    quiz: {
      from: "Gurgaon",
      wakeViews: ["munnar", "manali"],
      dayTwo: "trek",
      thisOrThat: { scenery: "mountains", plan: "planned", food: "street", crowd: "quiet", travel: "road" },
      wallet: "backpacker",
      dream: "a cheap homestay with a mountain view",
    },
  },
  {
    name: "Aisha",
    city: "Hyderabad",
    answers: ["maybe", "yes", "maybe"],
    max: 18000,
    hardNo: ["trek", "alcohol_centric"],
    quiz: {
      from: "Gachibowli",
      wakeViews: ["hampi", "varkala"],
      dayTwo: "streets",
      thisOrThat: { scenery: "sea", plan: "planned", food: "cafe", crowd: "quiet", travel: "fly" },
      wallet: "balanced",
      dream: "old palaces, good coffee, slow mornings",
    },
  },
  { name: "Preethi" },
];

const WINDOWS = [
  { label: "Gandhi Jayanti", startDate: "2026-10-02", endDate: "2026-10-04" },
  { label: "Christmas", startDate: "2026-12-25", endDate: "2026-12-27" },
  { label: "Republic Day", startDate: "2027-01-23", endDate: "2027-01-26" },
];

const DEMO_PIN = "1234";

// Same "salt:scrypt-hash" format as src/server/pin.ts (which is server-only).
function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

async function main() {
  const base = process.env.SEED_BASE_URL ?? "http://localhost:3000";
  const tripId = nanoid(12);
  const organiserToken = nanoid(21);
  const now = new Date().toISOString();

  await db.insert(trips).values({
    id: tripId,
    name: "College trip",
    organiserToken,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    adminPinHash: hashPin(DEMO_PIN),
    createdAt: now,
  });

  const windowIds = WINDOWS.map(() => nanoid(12));
  await db.insert(dateWindows).values(WINDOWS.map((w, i) => ({ id: windowIds[i], tripId, ...w })));

  const tokens: { name: string; token: string }[] = [];
  for (const person of PEOPLE) {
    const id = nanoid(12);
    const editToken = nanoid(21);
    const submitted = person.city !== undefined;
    tokens.push({ name: person.name, token: editToken });

    await db.insert(participants).values({
      id,
      tripId,
      displayName: person.name,
      editToken,
      claimed: submitted,
      homeCity: person.city ?? null,
      budgetComfort: person.quiz && person.max ? comfortFrom(person.max, WALLET_RATIO[person.quiz.wallet]) : null,
      budgetMax: person.max ?? null,
      vibes: person.quiz ? rulesVibes(person.quiz) : null,
      quiz: person.quiz ?? null,
      persona: person.quiz ? rulesPersona(rulesVibes(person.quiz)) : null,
      hardNoTags: person.hardNo ?? [],
      submittedAt: submitted ? now : null,
    });
    if (person.answers) {
      await db.insert(availability).values(
        person.answers.map((answer, i) => ({ participantId: id, windowId: windowIds[i], answer })),
      );
      await db.insert(activity).values({
        id: nanoid(12),
        tripId,
        participantId: id,
        kind: "submitted",
        message: `${person.name} checked in.`,
        createdAt: now,
      });
    }
  }

  console.log(`Group link:  ${base}/t/${tripId}`);
  console.log(`Admin link:  ${base}/t/${tripId}/admin  (PIN ${DEMO_PIN})`);
  console.log(`Backup link: ${base}/t/${tripId}/admin?k=${organiserToken}`);
  console.log(`Cookie name: tt_${tripId}`);
  for (const t of tokens) console.log(`  ${t.name.padEnd(10)} ${t.token}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
