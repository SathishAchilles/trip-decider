"use client";

import { field } from "../styles";
import type { IntakeDraft } from "./types";

export function StepBudget({ draft, onChange }: { draft: IntakeDraft; onChange: (patch: Partial<IntakeDraft>) => void }) {
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-muted px-3 py-2 text-sm">
        🔒 Only you see these numbers. Everyone else just sees &ldquo;within budget&rdquo; or &ldquo;budget stretch&rdquo;.
      </p>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Comfortable spend for the whole trip (₹, incl. travel)</span>
        <input
          inputMode="numeric"
          className={field}
          value={draft.budgetComfort}
          onChange={(e) => onChange({ budgetComfort: e.target.value.replace(/\D/g, "") })}
          placeholder="12000"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Absolute maximum (₹) — above this, you can&apos;t go</span>
        <input
          inputMode="numeric"
          className={field}
          value={draft.budgetMax}
          onChange={(e) => onChange({ budgetMax: e.target.value.replace(/\D/g, "") })}
          placeholder="18000"
        />
      </label>
    </div>
  );
}
