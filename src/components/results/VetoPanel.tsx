"use client";

import { useState, useTransition } from "react";
import { vetoDecision } from "@/app/actions";
import { btn, field } from "../styles";

export function VetoPanel({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await vetoDecision(tripId, reason);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" className={btn.outline} onClick={() => setOpen(true)}>
        Something changed? Veto this
      </button>
    );
  }

  return (
    <section className="space-y-2 rounded-2xl border border-veto/50 bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">Veto the decision</h2>
      <p className="text-sm text-muted-foreground">
        Everyone will see your name and reason, and answers reopen. Use this only if something real changed.
      </p>
      <textarea
        rows={3}
        maxLength={300}
        className={`${field} h-auto py-2`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. My leave for those dates was cancelled"
      />
      <p className="text-xs text-muted-foreground">{reason.trim().length}/20 characters minimum</p>
      {error && <p role="alert" className="text-sm font-medium text-veto">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={btn.outline} onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
        <button type="button" className={`${btn.primary} flex-1`} onClick={submit} disabled={pending}>
          {pending ? "Sending…" : "Veto and reopen"}
        </button>
      </div>
    </section>
  );
}
