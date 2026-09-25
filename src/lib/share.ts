import { formatDateTime } from "./format";

type ShareTrip = {
  name: string;
  state: "OPEN" | "SCORED" | "COMMIT" | "LOCKED";
  deadline: string;
  commitDeadline: string | null;
};

type ShareResults = {
  submittedCount: number;
  total: number;
  pendingNames: string[];
  // "Gokarna (Christmas)" style names; first is the current #1 or the locked choice.
  leader?: string;
};

export function shareMessage(trip: ShareTrip, results: ShareResults, link: string): string {
  if (trip.state === "OPEN") {
    if (results.submittedCount === 0 || results.pendingNames.length === 0) {
      return `Trip planning for ${trip.name}: tap your name and fill this in (3 min) by ${formatDateTime(trip.deadline)}. ${link}`;
    }
    return `${results.submittedCount} of ${results.total} in. Still waiting on ${results.pendingNames.join(", ")}. ${link}`;
  }
  if (trip.state === "SCORED") {
    return results.leader
      ? `Results are in. Top pick: ${results.leader}. See where everyone stands: ${link}`
      : `Results are in — nothing works for everyone yet. See what's blocking: ${link}`;
  }
  if (trip.state === "COMMIT") {
    return `Tick which of the top 3 you're in for by ${formatDateTime(trip.commitDeadline ?? trip.deadline)}. ${link}`;
  }
  return `Decided: ${results.leader ?? "see the link"}. ${link}`;
}

export function waLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
