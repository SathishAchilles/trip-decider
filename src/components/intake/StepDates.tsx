"use client";

import { ORIGIN_CITY_NAMES } from "@/lib/catalogue";
import type { AvailabilityAnswer } from "@/lib/types";
import { field } from "../styles";
import type { IntakeDraft, IntakeWindow } from "./types";

const ANSWERS: { value: AvailabilityAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

export function StepDates({
  draft,
  windows,
  onChange,
}: {
  draft: IntakeDraft;
  windows: IntakeWindow[];
  onChange: (patch: Partial<IntakeDraft>) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Where will you travel from?</span>
        <select className={field} value={draft.homeCity} onChange={(e) => onChange({ homeCity: e.target.value })}>
          <option value="">Pick your city</option>
          {ORIGIN_CITY_NAMES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Can you make these dates?</legend>
        {windows.map((w) => (
          <div key={w.id} className="rounded-xl border border-line p-3">
            <p className="font-medium">{w.label}</p>
            <p className="text-xs text-muted-foreground">{w.dates}</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={w.label}>
              {ANSWERS.map((a) => {
                const selected = draft.availability[w.id] === a.value;
                return (
                  <button
                    key={a.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange({ availability: { ...draft.availability, [w.id]: a.value } })}
                    className={`h-10 rounded-lg border text-sm font-semibold transition ${
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-line bg-card"
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>
    </div>
  );
}
