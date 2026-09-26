import type { OriginCity } from "./catalogue";

// Nearest airport code per origin city, used only as boarding-pass and departure-board flavour.
export const IATA: Record<OriginCity, string> = {
  Bengaluru: "BLR",
  Chennai: "MAA",
  Hyderabad: "HYD",
  Mumbai: "BOM",
  Pune: "PNQ",
  Delhi: "DEL",
  Kolkata: "CCU",
};

export function iataFor(city: string | null | undefined): string {
  return city && city in IATA ? IATA[city as OriginCity] : "···";
}

// Compact dealbreaker labels for the boarding pass.
export const SHORT_NO: Record<string, string> = {
  trek: "Treks",
  high_altitude: "Altitude",
  beach_swim: "Beach trips",
  alcohol_centric: "Party trips",
  crowded: "Crowds",
  long_drive: "Long drives",
  overnight_bus: "Night buses",
  hot_weather: "Heat",
  water_adventure: "Rafting",
};

export type BudgetClass = { label: "ECONOMY" | "COMFORT" | "PREMIUM"; marks: string };

// Shown only to the pass owner; never to the group.
export function budgetClass(max: number | null | undefined): BudgetClass | null {
  if (!max) return null;
  if (max <= 12000) return { label: "ECONOMY", marks: "₹" };
  if (max <= 20000) return { label: "COMFORT", marks: "₹₹" };
  return { label: "PREMIUM", marks: "₹₹₹" };
}

// City-centre coordinates for mapping any searched place to its nearest origin airport.
const ORIGIN_COORDS: Record<OriginCity, [number, number]> = {
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Hyderabad: [17.385, 78.4867],
  Mumbai: [19.076, 72.8777],
  Pune: [18.5204, 73.8567],
  Delhi: [28.6139, 77.209],
  Kolkata: [22.5726, 88.3639],
};

function haversineKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function nearestOrigin(lat: number, lon: number): { city: OriginCity; km: number } {
  let best: { city: OriginCity; km: number } = { city: "Bengaluru", km: Number.POSITIVE_INFINITY };
  for (const [city, coords] of Object.entries(ORIGIN_COORDS) as [OriginCity, [number, number]][]) {
    const km = haversineKm([lat, lon], coords);
    if (km < best.km) best = { city, km };
  }
  return { city: best.city, km: Math.round(best.km) };
}

