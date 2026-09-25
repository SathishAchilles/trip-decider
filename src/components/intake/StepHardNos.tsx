"use client";

import { useState } from "react";
import { suggestHardNoTags } from "@/app/actions";
import { HARD_NO_TAGS, HARD_NO_TAG_IDS } from "@/lib/catalogue";
import { field } from "../styles";
import type { IntakeDraft } from "./types";

export function StepHardNos({
  draft,
  onChange,
  suggestionsEnabled,
}: {
  draft: IntakeDraft;
  onChange: (patch: Partial<IntakeDraft>) => void;
  suggestionsEnabled: boolean;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function toggle(tag: string) {
    const selected = draft.hardNoTags.includes(tag);
    if (!selected && draft.hardNoTags.length >= 3) return;
    onChange({ hardNoTags: selected ? draft.hardNoTags.filter((t) => t !== tag) : [...draft.hardNoTags, tag] });
  }

  async function suggest() {
    if (!suggestionsEnabled || !draft.hardNoText.trim()) return;
    setSuggesting(true);
    try {
      const tags = await suggestHardNoTags(draft.hardNoText);
      const merged = [...new Set([...draft.hardNoTags, ...tags])].slice(0, 3);
      const added = merged.filter((t) => !draft.hardNoTags.includes(t));
      onChange({ hardNoTags: merged });
      setNote(added.length ? "Ticked what your note suggests — check it's right." : null);
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick up to three dealbreakers. Any trip with one of these is out for everyone — so only pick real no&apos;s.
      </p>
      <div className="grid gap-2">
        {HARD_NO_TAG_IDS.map((tag) => {
          const checked = draft.hardNoTags.includes(tag);
          const disabled = !checked && draft.hardNoTags.length >= 3;
          return (
            <label
              key={tag}
              className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm transition ${
                checked ? "border-veto bg-card font-medium" : "border-line"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(tag)}
                className="size-4 accent-[var(--veto)]"
              />
              {HARD_NO_TAGS[tag]}
            </label>
          );
        })}
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Anything else? (optional)</span>
        <textarea
          maxLength={200}
          rows={3}
          className={`${field} h-auto py-2`}
          value={draft.hardNoText}
          onChange={(e) => onChange({ hardNoText: e.target.value })}
          onBlur={suggest}
          placeholder="e.g. I get altitude sickness"
        />
        <span className="text-xs text-muted-foreground">
          {suggesting ? "Reading your note…" : note ?? `${draft.hardNoText.length}/200`}
        </span>
      </label>
    </div>
  );
}
