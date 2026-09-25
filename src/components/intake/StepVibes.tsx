"use client";

import { VIBES, VIBE_LABELS } from "@/lib/catalogue";
import type { IntakeDraft } from "./types";

const SCALE = ["Not for me", "Meh", "Fine", "Like it", "Love it"];

export function StepVibes({ draft, onChange }: { draft: IntakeDraft; onChange: (patch: Partial<IntakeDraft>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">How much do you want each of these on this trip?</p>
      {VIBES.map((vibe) => (
        <label key={vibe} className="block space-y-1">
          <span className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{VIBE_LABELS[vibe]}</span>
            <span className="text-muted-foreground">{SCALE[draft.vibes[vibe] - 1]}</span>
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={draft.vibes[vibe]}
            onChange={(e) => onChange({ vibes: { ...draft.vibes, [vibe]: Number(e.target.value) } })}
            className="w-full accent-[var(--accent-warm)]"
          />
        </label>
      ))}
    </div>
  );
}
