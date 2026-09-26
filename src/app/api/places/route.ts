import { nearestOrigin } from "@/lib/iata";

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    countrycode?: string;
    type?: string;
  };
};

export type PlaceResult = { label: string; detail: string; city: string; km: number };

// Place search via Photon (OpenStreetMap), limited to India, mapped to the nearest origin airport.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 60) return Response.json([]);

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "20");
  url.searchParams.set("lang", "en");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "TripTogether/1.0 (group trip planner)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return Response.json([], { status: 502 });
    const data = (await response.json()) as { features: PhotonFeature[] };
    const seen = new Set<string>();
    const scored: { place: PlaceResult; score: number }[] = [];
    for (const [index, f] of data.features.entries()) {
      const p = f.properties;
      if (p.countrycode !== "IN" || !p.name) continue;
      const detail = [p.city ?? p.district ?? p.county, p.state].filter((part) => part && part !== p.name).join(", ");
      const key = `${p.name}|${detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const [lon, lat] = f.geometry.coordinates;
      const { city, km } = nearestOrigin(lat, lon);
      // Blend Photon's relevance with an exact-name match, settlement type and nearness to an
      // origin city, so "Indiranagar, Bengaluru" beats a same-named village 300 km away
      // while "Indore" still finds the city rather than a nearby park.
      const exact = p.name.toLowerCase() === q.toLowerCase();
      const settlement = ["city", "district", "locality", "county"].includes(p.type ?? "");
      const score = index * 15 + km * 0.15 + (exact ? 0 : 60) + (settlement ? 0 : 30);
      scored.push({ place: { label: p.name, detail, city, km }, score });
    }
    scored.sort((a, b) => a.score - b.score);
    return Response.json(scored.slice(0, 6).map((s) => s.place), { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return Response.json([], { status: 504 });
  }
}
