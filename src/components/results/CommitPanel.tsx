"use client";

import { useState, useTransition } from "react";
import { saveCommit } from "@/app/actions";
import { btn, card } from "../styles";

export function CommitPanel({
  tripId,
  options,
  initial,
  alreadyCommitted,
  deadline,
}: {
  tripId: string;
  options: { optionKey: string; name: string }[];
  initial: string[];
  alreadyCommitted: boolean;
  deadline: string;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(alreadyCommitted);
  const [pending, startTransition] = useTransition();

  function toggle(key: string) {
    setSaved(false);
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveCommit(tripId, selected);
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <section className={`${card} space-y-3 border-primary`}>
      <h2 className="font-heading text-lg font-semibold">Which of these are you in for?</h2>
      <p className="text-sm text-muted-foreground">
        Tick every option you&apos;d actually go on. Closes {deadline}; if you don&apos;t answer, you count as in for all three.
      </p>
      <div className="grid gap-2">
        {options.map((o) => (
          <label key={o.optionKey} className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={selected.includes(o.optionKey)}
              onChange={() => toggle(o.optionKey)}
              className="size-4 accent-[var(--accent-warm)]"
            />
            I&apos;m in for {o.name}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm font-medium text-veto">{error}</p>}
      <button type="button" onClick={submit} disabled={pending} className={`${btn.primary} w-full`}>
        {pending ? "Saving…" : saved ? "Saved — update" : "Save my answer"}
      </button>
    </section>
  );
}
