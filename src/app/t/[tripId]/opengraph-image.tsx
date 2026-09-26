import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { HERO_PHOTO, PHOTOS } from "@/lib/photos";
import { publicResults } from "@/server/ranking";
import { loadTrip } from "@/server/trips";

export const alt = "Trip Together — group trip status";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// The state line changes as people answer, so never serve a cached image.
export const dynamic = "force-dynamic";

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Poppins-Medium.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Poppins-ExtraBold.ttf")),
]);

async function photoDataUrl(src: string): Promise<string> {
  const file = await readFile(join(process.cwd(), "public", src));
  return `data:image/jpeg;base64,${file.toString("base64")}`;
}

export default async function Image({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const bundle = await loadTrip(tripId);

  let title = "Trip Together";
  let big = "One link";
  let status = "Plan the trip in one link";
  let photo = HERO_PHOTO;

  if (bundle) {
    title = bundle.trip.name;
    const results = await publicResults(bundle);
    const { submittedCount, total } = results.progress;
    if (results.state === "OPEN") {
      big = `${submittedCount} of ${total} in`;
      status = "Collecting answers — tap your name";
    } else {
      const shown = results.top3.find((o) => o.optionKey === results.lockedOptionKey) ?? results.top3[0];
      if (shown) {
        big = shown.destinationName;
        photo = PHOTOS[shown.destinationId] ?? HERO_PHOTO;
        status =
          results.state === "LOCKED"
            ? `Decided · ${shown.windowLabel}, ${shown.windowDates}`
            : results.state === "COMMIT"
              ? "Commit round — tick what you're in for"
              : `Top pick · ${shown.windowLabel}, ${shown.windowDates}`;
      } else {
        big = "No match yet";
        status = "See what's ruling options out";
      }
    }
  }

  const background = await photoDataUrl(photo.src);
  const [medium, extraBold] = await fonts;

  return new ImageResponse(
    (
      <div
        style={{ width: "100%", height: "100%", display: "flex", position: "relative", color: "#ffffff", fontFamily: "Poppins" }}
      >
        <img src={background} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background: "linear-gradient(to top, rgba(8,16,24,0.95) 0%, rgba(8,16,24,0.7) 45%, rgba(8,16,24,0.3) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: 64,
            gap: 16,
          }}
        >
          <div style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", opacity: 0.8 }}>{title}</div>
          <div style={{ fontSize: 124, fontWeight: 800, lineHeight: 0.95, textTransform: "uppercase" }}>{big}</div>
          <div style={{ fontSize: 36, opacity: 0.92 }}>{status}</div>
          <div style={{ display: "flex", fontSize: 20, opacity: 0.55, marginTop: 12 }}>
            {"Trip Together · one link, one trip"}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Poppins", data: medium, weight: 500, style: "normal" },
        { name: "Poppins", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
