import { nanoid } from "nanoid";
import { db } from "../src/db/client";
import { activity, availability, dateWindows, participants, trips, type Vibes } from "../src/db/schema";

type Answer = "yes" | "maybe" | "no";

type SeedPerson = {
  name: string;
  city?: string;
  answers?: [Answer, Answer, Answer];
  comfort?: number;
  max?: number;
  vibes?: Vibes;
  hardNo?: string[];
};

const vibes = (
  beach: number,
  hills: number,
  heritage: number,
  adventure: number,
  chill: number,
  nightlife: number,
): Vibes => ({ beach, hills, heritage, adventure, chill, nightlife });

const PEOPLE: SeedPerson[] = [
  { name: "Riya", city: "Bengaluru", answers: ["yes", "yes", "maybe"], comfort: 15000, max: 22000, vibes: vibes(5, 4, 3, 2, 5, 2), hardNo: [] },
  { name: "Siddharth", city: "Mumbai", answers: ["no", "yes", "yes"], comfort: 18000, max: 25000, vibes: vibes(4, 3, 2, 5, 3, 5), hardNo: ["high_altitude"] },
  { name: "Karan", city: "Delhi", answers: ["yes", "yes", "yes"], comfort: 10000, max: 16000, vibes: vibes(3, 5, 3, 4, 4, 2), hardNo: ["overnight_bus"] },
  { name: "Aisha", city: "Hyderabad", answers: ["maybe", "yes", "maybe"], comfort: 12000, max: 18000, vibes: vibes(4, 4, 5, 1, 5, 1), hardNo: ["trek", "alcohol_centric"] },
  { name: "Preethi" },
];

const WINDOWS = [
  { label: "Gandhi Jayanti", startDate: "2026-10-02", endDate: "2026-10-04" },
  { label: "Christmas", startDate: "2026-12-25", endDate: "2026-12-27" },
  { label: "Republic Day", startDate: "2027-01-23", endDate: "2027-01-26" },
];

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
      budgetComfort: person.comfort ?? null,
      budgetMax: person.max ?? null,
      vibes: person.vibes ?? null,
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
        message: `${person.name} sent their answers.`,
        createdAt: now,
      });
    }
  }

  console.log(`Group link:  ${base}/t/${tripId}`);
  console.log(`Admin link:  ${base}/t/${tripId}/admin?k=${organiserToken}`);
  console.log(`Cookie name: td_${tripId}`);
  for (const t of tokens) console.log(`  ${t.name.padEnd(10)} ${t.token}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
