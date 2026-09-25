import {
  ORIGIN_CITIES,
  TRAVEL_COST,
  isOriginCity,
  type Destination,
} from "./catalogue";
import type { CostOverride, DateWindow, Participant } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function nights(window: Pick<DateWindow, "startDate" | "endDate">): number {
  return Math.round((utcDay(window.endDate) - utcDay(window.startDate)) / DAY_MS);
}

export function costFor(
  participant: Pick<Participant, "homeCity">,
  destination: Destination,
  window: Pick<DateWindow, "startDate" | "endDate">,
  overrides: Record<string, CostOverride>,
): number | null {
  if (!participant.homeCity || !isOriginCity(participant.homeCity)) return null;

  const override = overrides[destination.id];
  const stay = override?.stayPerNight ?? destination.stayPerNight;
  const daily = override?.dailySpend ?? destination.dailySpend;
  const n = nights(window);
  const travel = TRAVEL_COST[ORIGIN_CITIES[participant.homeCity]][destination.region];

  return travel + n * stay + (n + 1) * daily;
}
