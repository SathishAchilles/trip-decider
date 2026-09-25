"use client";

import { useState, useTransition } from "react";
import { createTrip } from "@/app/actions";
import { btn, card, field } from "./styles";

type WindowDraft = { label: string; startDate: string; endDate: string };

function defaultDeadline(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function CreateTripForm() {
  const [tripName, setTripName] = useState("");
  const [organiserName, setOrganiserName] = useState("");
  const [otherNames, setOtherNames] = useState<string[]>(["", ""]);
  const [windows, setWindows] = useState<WindowDraft[]>([{ label: "", startDate: "", endDate: "" }]);
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateName(index: number, value: string) {
    setOtherNames((names) => names.map((n, i) => (i === index ? value : n)));
  }

  function updateWindow(index: number, patch: Partial<WindowDraft>) {
    setWindows((ws) => ws.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTrip({
        tripName,
        organiserName,
        otherNames: otherNames.filter((n) => n.trim() !== ""),
        windows,
        deadline: deadline ? new Date(deadline).toISOString() : "",
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className={`${card} space-y-4`}>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Trip name</span>
          <input className={field} value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="College trip" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Your name</span>
          <input className={field} value={organiserName} onChange={(e) => setOrganiserName(e.target.value)} placeholder="Riya" />
        </label>
      </section>

      <section className={`${card} space-y-3`}>
        <div>
          <h2 className="font-heading text-lg font-semibold">Who&apos;s going</h2>
          <p className="text-sm text-muted-foreground">Everyone taps their own name from one group link.</p>
        </div>
        {otherNames.map((name, index) => (
          <div key={index} className="flex gap-2">
            <input
              className={field}
              value={name}
              onChange={(e) => updateName(index, e.target.value)}
              placeholder={`Friend ${index + 1}`}
              aria-label={`Friend ${index + 1}`}
            />
            {otherNames.length > 2 && (
              <button
                type="button"
                className={btn.outline}
                onClick={() => setOtherNames((names) => names.filter((_, i) => i !== index))}
                aria-label={`Remove friend ${index + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {otherNames.length < 11 && (
          <button type="button" className={btn.outline} onClick={() => setOtherNames((n) => [...n, ""])}>
            + Add a friend
          </button>
        )}
      </section>

      <section className={`${card} space-y-3`}>
        <div>
          <h2 className="font-heading text-lg font-semibold">Possible dates</h2>
          <p className="text-sm text-muted-foreground">Long weekends work best. Everyone says yes, maybe or no to each.</p>
        </div>
        {windows.map((w, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-line p-3">
            <input
              className={field}
              value={w.label}
              onChange={(e) => updateWindow(index, { label: e.target.value })}
              placeholder="Christmas weekend"
              aria-label={`Window ${index + 1} label`}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-medium">
                From
                <input type="date" className={field} value={w.startDate} onChange={(e) => updateWindow(index, { startDate: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs font-medium">
                To
                <input type="date" className={field} value={w.endDate} onChange={(e) => updateWindow(index, { endDate: e.target.value })} />
              </label>
            </div>
            {windows.length > 1 && (
              <button type="button" className={btn.small} onClick={() => setWindows((ws) => ws.filter((_, i) => i !== index))}>
                Remove these dates
              </button>
            )}
          </div>
        ))}
        {windows.length < 6 && (
          <button
            type="button"
            className={btn.outline}
            onClick={() => setWindows((ws) => [...ws, { label: "", startDate: "", endDate: "" }])}
          >
            + Add dates
          </button>
        )}
      </section>

      <section className={`${card} space-y-2`}>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Answers close</span>
          <input type="datetime-local" className={field} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <p className="text-sm text-muted-foreground">
          After this, anyone who hasn&apos;t answered counts as flexible and the results open.
        </p>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-veto/40 bg-card px-3 py-2 text-sm font-medium text-veto">
          {error}
        </p>
      )}
      <button type="submit" className={`${btn.primary} w-full`} disabled={pending}>
        {pending ? "Creating…" : "Create the trip"}
      </button>
    </form>
  );
}
