import { ImageResponse } from "next/og";
import { publicResults } from "@/server/ranking";
import { loadTrip } from "@/server/trips";

export const alt = "Trip Decider — group trip status";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// The state line changes as people answer, so never serve a cached image.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const bundle = await loadTrip(tripId);

  let title = "Trip Decider";
  let status = "Plan the trip in one link";
  if (bundle) {
    title = bundle.trip.name;
    const results = await publicResults(bundle);
    const { submittedCount, total } = results.progress;
    const locked = results.state !== "OPEN" ? results.top3.find((o) => o.optionKey === results.lockedOptionKey) : undefined;
    status =
      results.state === "OPEN"
        ? `Collecting answers — ${submittedCount} of ${total} in`
        : results.state === "LOCKED" && locked
          ? `Decided: ${locked.destinationName}, ${locked.windowDates}`
          : results.state === "COMMIT"
            ? "Commit round — tick the options you're in for"
            : "Results are in";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f5efe6",
          color: "#1f2a2e",
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            border: "4px dashed #d9653b",
            color: "#d9653b",
            borderRadius: 12,
            padding: "8px 20px",
            fontSize: 30,
            letterSpacing: 2,
          }}
        >
          TRIP DECIDER
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 44, color: "#2a7f7a" }}>{status}</div>
        </div>
        <div style={{ fontSize: 28, color: "#5c6669" }}>Tap your name · 3 minutes · one decision</div>
      </div>
    ),
    size,
  );
}
