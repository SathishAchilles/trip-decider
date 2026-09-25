"use client";

import { useState, useTransition } from "react";
import { savePreferences } from "@/app/actions";
import { btn, card } from "../styles";
import { StepBudget } from "./StepBudget";
import { StepDates } from "./StepDates";
import { StepHardNos } from "./StepHardNos";
import { StepVibes } from "./StepVibes";
import type { IntakeDraft, IntakeWindow } from "./types";

const STEPS = ["Dates", "Budget", "Vibe", "Hard no's"];

function stepError(step: number, draft: IntakeDraft, windows: IntakeWindow[]): string | null {
  if (step === 0) {
    if (!draft.homeCity) return "Pick your home city.";
    if (windows.some((w) => !draft.availability[w.id])) return "Answer yes, maybe or no for every date.";
  }
  if (step === 1) {
    const comfort = Number(draft.budgetComfort);
    const max = Number(draft.budgetMax);
    if (!comfort || comfort < 1000) return "Enter a comfortable budget of at least ₹1,000.";
    if (!max || max < comfort) return "Your maximum must be at least your comfortable amount.";
  }
  return null;
}

export function IntakeForm({
  tripId,
  windows,
  initial,
  suggestionsEnabled,
}: {
  tripId: string;
  windows: IntakeWindow[];
  initial: IntakeDraft;
  suggestionsEnabled: boolean;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(patch: Partial<IntakeDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  }

  function next() {
    const problem = stepError(step, draft, windows);
    if (problem) return setError(problem);
    if (step < STEPS.length - 1) return setStep(step + 1);

    startTransition(async () => {
      const result = await savePreferences(tripId, {
        homeCity: draft.homeCity as never,
        availability: draft.availability,
        budgetComfort: Number(draft.budgetComfort),
        budgetMax: Number(draft.budgetMax),
        vibes: draft.vibes,
        hardNoTags: draft.hardNoTags as never,
        hardNoText: draft.hardNoText,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className={`${card} space-y-5`}>
      <ol className="flex gap-1.5" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <span className={`block h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-line"}`} />
            <span className={`mt-1 block text-xs ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && <StepDates draft={draft} windows={windows} onChange={change} />}
      {step === 1 && <StepBudget draft={draft} onChange={change} />}
      {step === 2 && <StepVibes draft={draft} onChange={change} />}
      {step === 3 && <StepHardNos draft={draft} onChange={change} suggestionsEnabled={suggestionsEnabled} />}

      {error && (
        <p role="alert" className="text-sm font-medium text-veto">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" className={btn.outline} onClick={() => setStep(step - 1)} disabled={pending}>
            Back
          </button>
        )}
        <button type="button" className={`${btn.primary} flex-1`} onClick={next} disabled={pending}>
          {step < STEPS.length - 1 ? "Next" : pending ? "Saving…" : "Send my answers"}
        </button>
      </div>
    </div>
  );
}
