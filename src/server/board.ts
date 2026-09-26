import "server-only";

import type { BoardRow } from "@/components/board/DepartureBoard";
import { iataFor } from "@/lib/iata";
import type { TripBundle } from "./trips";

// Public departure-board rows: name, home airport, persona and status only — never budgets.
export function boardRows(bundle: TripBundle, viewerId?: string): BoardRow[] {
  const deadlinePassed = new Date() > new Date(bundle.trip.deadline);
  return bundle.participants.map((p) => {
    const submitted = p.submittedAt !== null;
    const status: BoardRow["status"] = submitted
      ? "CHECKED IN"
      : deadlinePassed
        ? "FLEXIBLE"
        : p.claimed
          ? "BOARDING"
          : "AWAITED";
    return {
      name: p.displayName,
      from: submitted ? iataFor(p.homeCity) : "···",
      persona: p.persona ? `${p.persona.emoji} ${p.persona.title}` : "",
      status,
      isYou: p.id === viewerId,
    };
  });
}
