import type { RankedView } from "@/server/ranking";
import { PendingRefresh } from "./PendingRefresh";

export function RankingBadge({ view, live }: { view: Pick<RankedView, "source" | "status" | "model">; live: boolean }) {
  if (view.status === "pending" && live) {
    return (
      <p role="status" className="rounded-xl border border-stretch/50 bg-card px-3 py-2 text-sm">
        <span className="font-semibold text-stretch">AI is ranking the options…</span> Showing the formula ranking
        until it finishes; this page updates by itself.
        <PendingRefresh />
      </p>
    );
  }
  if (view.source === "llm") {
    return <p className="text-xs font-medium text-fit">✦ Ranked by AI reasoning ({view.model}) · hard limits checked by rules</p>;
  }
  if (view.status === "failed") {
    return <p className="text-xs text-muted-foreground">AI ranking unavailable right now — calculated by formula.</p>;
  }
  return <p className="text-xs text-muted-foreground">Calculated by formula.</p>;
}
