export const VIBES = [
  "beach",
  "hills",
  "heritage",
  "adventure",
  "chill",
  "nightlife",
] as const;

export type Vibe = (typeof VIBES)[number];

export const VIBE_LABELS: Record<Vibe, string> = {
  beach: "Beach",
  hills: "Hills",
  heritage: "Heritage",
  adventure: "Adventure",
  chill: "Chill",
  nightlife: "Nightlife",
};

export type OriginRegion = "S" | "W" | "N" | "E";
export type DestinationRegion = OriginRegion | "H";

export const ORIGIN_CITIES = {
  Bengaluru: "S",
  Chennai: "S",
  Hyderabad: "S",
  Mumbai: "W",
  Pune: "W",
  Delhi: "N",
  Kolkata: "E",
} as const satisfies Record<string, OriginRegion>;

export type OriginCity = keyof typeof ORIGIN_CITIES;

export const ORIGIN_CITY_NAMES = Object.keys(ORIGIN_CITIES) as OriginCity[];

// Round-trip travel per person in INR, origin region -> destination region.
export const TRAVEL_COST: Record<
  OriginRegion,
  Record<DestinationRegion, number>
> = {
  S: { S: 3000, W: 7000, N: 11000, H: 13000, E: 11000 },
  W: { S: 7000, W: 2500, N: 7000, H: 10000, E: 11000 },
  N: { S: 11000, W: 7000, N: 3000, H: 3500, E: 9000 },
  E: { S: 11000, W: 11000, N: 9000, H: 11000, E: 3000 },
};

export const HARD_NO_TAGS = {
  trek: "Treks or long hikes",
  high_altitude: "High altitude",
  beach_swim: "Beach or swimming-centred trips",
  alcohol_centric: "Party or drinking-centred trips",
  crowded: "Very crowded tourist spots",
  long_drive: "Road journeys over 5 hours",
  overnight_bus: "Overnight buses",
  hot_weather: "Very hot weather",
  water_adventure: "Rafting or water sports",
} as const;

export type HardNoTag = keyof typeof HARD_NO_TAGS;

export const HARD_NO_TAG_IDS = Object.keys(HARD_NO_TAGS) as HardNoTag[];

export type Destination = {
  id: string;
  name: string;
  region: DestinationRegion;
  weights: Record<Vibe, number>;
  minNights: number;
  stayPerNight: number;
  dailySpend: number;
  hardAttributes: HardNoTag[];
};

function destination(
  id: string,
  name: string,
  region: DestinationRegion,
  [beach, hills, heritage, adventure, chill, nightlife]: number[],
  minNights: number,
  stayPerNight: number,
  dailySpend: number,
  hardAttributes: HardNoTag[],
): Destination {
  return {
    id,
    name,
    region,
    weights: { beach, hills, heritage, adventure, chill, nightlife },
    minNights,
    stayPerNight,
    dailySpend,
    hardAttributes,
  };
}

export const DESTINATIONS: Destination[] = [
  destination("goa", "Goa", "W", [0.9, 0, 0.3, 0.3, 0.6, 0.8], 2, 1800, 1500, [
    "beach_swim",
    "alcohol_centric",
    "crowded",
  ]),
  destination("gokarna", "Gokarna", "S", [0.9, 0, 0.1, 0.3, 0.8, 0.2], 2, 1200, 1000, [
    "beach_swim",
    "overnight_bus",
  ]),
  destination("pondicherry", "Pondicherry", "S", [0.6, 0, 0.7, 0.1, 0.8, 0.3], 2, 1500, 1200, []),
  destination("varkala", "Varkala", "S", [0.9, 0.2, 0.1, 0.2, 0.8, 0.2], 2, 1300, 1100, [
    "beach_swim",
  ]),
  destination("coorg", "Coorg", "S", [0, 0.8, 0.2, 0.4, 0.8, 0.1], 2, 2000, 1200, [
    "long_drive",
  ]),
  destination("munnar", "Munnar", "S", [0, 0.9, 0.1, 0.4, 0.7, 0], 2, 1800, 1100, [
    "long_drive",
  ]),
  destination("hampi", "Hampi", "S", [0, 0.2, 0.9, 0.5, 0.5, 0.1], 2, 1000, 900, [
    "overnight_bus",
    "hot_weather",
  ]),
  destination("lonavala", "Lonavala", "W", [0, 0.6, 0.1, 0.3, 0.7, 0.2], 2, 2000, 1200, [
    "crowded",
  ]),
  destination("udaipur", "Udaipur", "W", [0, 0.1, 0.9, 0.1, 0.6, 0.3], 2, 1800, 1400, []),
  destination("jaipur", "Jaipur", "N", [0, 0, 0.9, 0.1, 0.3, 0.3], 2, 1500, 1300, [
    "crowded",
    "hot_weather",
  ]),
  destination("rishikesh", "Rishikesh", "N", [0, 0.6, 0.4, 0.9, 0.5, 0], 2, 1200, 1000, [
    "water_adventure",
  ]),
  destination("manali", "Manali", "H", [0, 1.0, 0.1, 0.8, 0.4, 0.3], 3, 1800, 1300, [
    "high_altitude",
    "long_drive",
    "overnight_bus",
    "trek",
  ]),
  destination("kasol", "Kasol", "H", [0, 0.9, 0, 0.6, 0.8, 0.3], 3, 1200, 900, [
    "trek",
    "overnight_bus",
    "long_drive",
  ]),
  destination("darjeeling", "Darjeeling", "E", [0, 0.9, 0.5, 0.2, 0.7, 0], 2, 1800, 1200, [
    "long_drive",
  ]),
];

export const DESTINATIONS_BY_ID: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.id, d]),
);

export function isOriginCity(city: string): city is OriginCity {
  return city in ORIGIN_CITIES;
}

export function topVibes(destination: Destination, count = 2): Vibe[] {
  return [...VIBES]
    .sort((a, b) => destination.weights[b] - destination.weights[a])
    .slice(0, count);
}
