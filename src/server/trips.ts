import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import {
  activity,
  availability,
  commits,
  costOverrides,
  dateWindows,
  participants,
  trips,
  type ActivityKind,
} from "@/db/schema";
import { DESTINATIONS_BY_ID } from "@/lib/catalogue";
import { scoreTrip } from "@/lib/scoring";
import type { AvailabilityAnswer, ScoredTrip, ScoringInput } from "@/lib/types";

export type TripRow = typeof trips.$inferSelect;
export type ParticipantRow = typeof participants.$inferSelect;
export type WindowRow = typeof dateWindows.$inferSelect;
export type ActivityRow = typeof activity.$inferSelect;

export type TripBundle = {
  trip: TripRow;
  participants: ParticipantRow[];
  windows: WindowRow[];
  availability: (typeof availability.$inferSelect)[];
  overrides: (typeof costOverrides.$inferSelect)[];
  commits: (typeof commits.$inferSelect)[];
  activity: ActivityRow[];
};

export const COMMIT_WINDOW_MS = 48 * 60 * 60 * 1000;

export function cookieName(tripId: string): string {
  return `td_${tripId}`;
}

export async function logActivity(
  tripId: string,
  kind: ActivityKind,
  message: string,
  participantId: string | null = null,
) {
  await db.insert(activity).values({
    id: nanoid(12),
    tripId,
    participantId,
    kind,
    message,
    createdAt: new Date().toISOString(),
  });
}

async function readBundle(tripId: string): Promise<TripBundle | null> {
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
  if (!trip) return null;

  const people = await db
    .select()
    .from(participants)
    .where(eq(participants.tripId, tripId))
    .orderBy(asc(participants.displayName));
  const windows = await db
    .select()
    .from(dateWindows)
    .where(eq(dateWindows.tripId, tripId))
    .orderBy(asc(dateWindows.startDate));
  const ids = people.map((p) => p.id);
  const tripAvailability = ids.length
    ? await db.select().from(availability).where(inArray(availability.participantId, ids))
    : [];
  const overrides = await db
    .select()
    .from(costOverrides)
    .where(eq(costOverrides.tripId, tripId));
  const tripCommits = ids.length
    ? await db.select().from(commits).where(inArray(commits.participantId, ids))
    : [];
  const feed = await db
    .select()
    .from(activity)
    .where(eq(activity.tripId, tripId))
    .orderBy(desc(activity.createdAt));

  return {
    trip,
    participants: people,
    windows,
    availability: tripAvailability,
    overrides,
    commits: tripCommits,
    activity: feed,
  };
}

export function toScoringInput(bundle: TripBundle, now = new Date()): ScoringInput {
  const availabilityMap: Record<string, Record<string, AvailabilityAnswer>> = {};
  for (const row of bundle.availability) {
    availabilityMap[row.participantId] ??= {};
    availabilityMap[row.participantId][row.windowId] = row.answer;
  }

  return {
    participants: bundle.participants.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      submitted: p.submittedAt !== null,
      homeCity: p.homeCity,
      budgetComfort: p.budgetComfort,
      budgetMax: p.budgetMax,
      vibes: p.vibes,
      hardNoTags: p.hardNoTags,
    })),
    windows: bundle.windows,
    availability: availabilityMap,
    overrides: Object.fromEntries(
      bundle.overrides.map((o) => [
        o.destinationId,
        { stayPerNight: o.stayPerNight, dailySpend: o.dailySpend },
      ]),
    ),
    miseryThreshold: bundle.trip.miseryThreshold,
    deadlinePassed: now > new Date(bundle.trip.deadline),
  };
}

export function score(bundle: TripBundle): ScoredTrip {
  return scoreTrip(toScoringInput(bundle));
}

export function pickWinner(bundle: TripBundle, keys: string[]): string | null {
  if (keys.length === 0) return null;
  const committed = new Set(bundle.commits.map((c) => c.participantId));
  const silent = bundle.participants.filter((p) => !committed.has(p.id)).length;
  const total = bundle.participants.length;

  const approvals = keys.map((key) => ({
    key,
    count: bundle.commits.filter((c) => c.optionKey === key && c.approved).length + silent,
  }));

  const unanimous = approvals.find((a) => a.count === total);
  if (unanimous) return unanimous.key;
  // Stable sort keeps rank order among equal approval counts.
  return [...approvals].sort((a, b) => b.count - a.count)[0].key;
}

async function setState(tripId: string, values: Partial<TripRow>) {
  await db.update(trips).set(values).where(eq(trips.id, tripId));
}

export async function advanceState(bundle: TripBundle): Promise<boolean> {
  const { trip } = bundle;
  const now = new Date();

  if (trip.state === "OPEN") {
    const everyone = bundle.participants.every((p) => p.submittedAt !== null);
    const pastDeadline = now > new Date(trip.deadline);
    if (everyone || pastDeadline) {
      await setState(trip.id, { state: "SCORED" });
      await logActivity(
        trip.id,
        "state",
        everyone
          ? "Everyone has answered — results are in."
          : "The deadline passed — results are in. Anyone who didn't answer counts as flexible.",
      );
      return true;
    }
  }

  if (trip.state === "COMMIT") {
    const committed = new Set(bundle.commits.map((c) => c.participantId));
    const everyone = bundle.participants.every((p) => committed.has(p.id));
    const pastDeadline =
      trip.commitDeadline !== null && now > new Date(trip.commitDeadline);
    if (everyone || pastDeadline) {
      const keys = snapshotKeys(bundle) ?? score(bundle).top3.map((o) => o.optionKey);
      const winner = pickWinner(bundle, keys);
      await setState(trip.id, { state: "LOCKED", lockedOptionKey: winner });
      await logActivity(
        trip.id,
        "state",
        winner ? `Decided: ${optionLabel(bundle, winner)}.` : "The commit round closed with no option to lock.",
      );
      return true;
    }
  }

  return false;
}

export async function loadTrip(tripId: string): Promise<TripBundle | null> {
  const bundle = await readBundle(tripId);
  if (!bundle) return null;
  if (await advanceState(bundle)) return readBundle(tripId);
  return bundle;
}

export async function viewerFor(bundle: TripBundle): Promise<ParticipantRow | null> {
  const store = await cookies();
  const token = store.get(cookieName(bundle.trip.id))?.value;
  if (!token) return null;
  return bundle.participants.find((p) => p.editToken === token) ?? null;
}

export function isOrganiser(bundle: TripBundle, key: string | undefined | null): boolean {
  return !!key && key === bundle.trip.organiserToken;
}

export type Progress = {
  submittedCount: number;
  total: number;
  pendingNames: string[];
};

export function progressOf(bundle: TripBundle): Progress {
  const pending = bundle.participants.filter((p) => p.submittedAt === null);
  return {
    submittedCount: bundle.participants.length - pending.length,
    total: bundle.participants.length,
    pendingNames: pending.map((p) => p.displayName),
  };
}

function formatDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function windowDates(window: Pick<WindowRow, "startDate" | "endDate">): string {
  return `${formatDay(window.startDate)} – ${formatDay(window.endDate)}`;
}

export function optionLabel(bundle: TripBundle, optionKey: string): string {
  const [destinationId, windowId] = optionKey.split(":");
  const destination = DESTINATIONS_BY_ID[destinationId];
  const window = bundle.windows.find((w) => w.id === windowId);
  return `${destination?.name ?? destinationId} (${window?.label ?? "dates"})`;
}

// Top-three keys frozen when the commit round started (see ranking.ts).
export function snapshotKeys(bundle: TripBundle): string[] | null {
  const snapshot = bundle.trip.decisionSnapshot as { top3?: { optionKey?: unknown }[] } | null;
  if (!snapshot || !Array.isArray(snapshot.top3)) return null;
  return snapshot.top3.map((o) => o.optionKey).filter((k): k is string => typeof k === "string");
}
