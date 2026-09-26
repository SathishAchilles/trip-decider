import type { QuizAnswers } from "@/db/schema";
import type { OriginCity } from "@/lib/catalogue";
import type { AvailabilityAnswer } from "@/lib/types";

export type IntakeWindow = { id: string; label: string; dates: string };

export type Draft = {
  fromText: string;
  homeCity: OriginCity | "";
  availability: Record<string, AvailabilityAnswer>;
  budgetMax: number;
  wallet?: QuizAnswers["wallet"];
  wakeViews: string[];
  dayTwo?: QuizAnswers["dayTwo"];
  thisOrThat: Partial<QuizAnswers["thisOrThat"]>;
  dream: string;
  hardNoTags: string[];
  hardNoText: string;
};

export type ScreenProps = {
  draft: Draft;
  // advance = move to the next question after a short beat (single-choice taps).
  change: (patch: Partial<Draft>, advance?: boolean) => void;
};
