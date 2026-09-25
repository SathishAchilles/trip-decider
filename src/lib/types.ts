import type { HardNoTag, Vibe } from "./catalogue";

export type AvailabilityAnswer = "yes" | "maybe" | "no";

export type Participant = {
  id: string;
  displayName: string;
  submitted: boolean;
  homeCity: string | null;
  budgetComfort: number | null;
  budgetMax: number | null;
  vibes: Record<Vibe, number> | null;
  hardNoTags: string[];
};

export type DateWindow = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type CostOverride = {
  stayPerNight: number;
  dailySpend: number;
};

export type ScoringInput = {
  participants: Participant[];
  windows: DateWindow[];
  // participantId -> windowId -> answer
  availability: Record<string, Record<string, AvailabilityAnswer>>;
  // destinationId -> override
  overrides: Record<string, CostOverride>;
  miseryThreshold: number;
  deadlinePassed: boolean;
};

export type VetoReason =
  | { kind: "dates" }
  | { kind: "budget" }
  | { kind: "hardno"; tag: HardNoTag };

export type Stance =
  | "veto"
  | "loves"
  | "good"
  | "ok"
  | "unhappy"
  | "pending"
  | "flexible";

export type PersonCell = {
  participantId: string;
  displayName: string;
  score?: number;
  cost?: number;
  stretch: boolean;
  vetoReason?: VetoReason;
  stance: Stance;
  icon: string;
  label: string;
};

export type ScoredOption = {
  optionKey: string;
  destinationId: string;
  destinationName: string;
  windowId: string;
  windowLabel: string;
  vetoed: boolean;
  miserable: boolean;
  meanScore: number;
  minScore: number;
  avgCost: number;
  cells: PersonCell[];
};

export type Blocker = {
  label: string;
  count: number;
};

export type ScoredTrip = {
  options: ScoredOption[];
  ranked: ScoredOption[];
  top3: ScoredOption[];
  blockers: Blocker[];
  explanation: string;
  robustness: string[];
};
