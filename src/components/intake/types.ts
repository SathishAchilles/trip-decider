import type { AvailabilityAnswer } from "@/lib/types";
import type { Vibe } from "@/lib/catalogue";

export type IntakeWindow = { id: string; label: string; dates: string };

export type IntakeDraft = {
  homeCity: string;
  availability: Record<string, AvailabilityAnswer>;
  budgetComfort: string;
  budgetMax: string;
  vibes: Record<Vibe, number>;
  hardNoTags: string[];
  hardNoText: string;
};
