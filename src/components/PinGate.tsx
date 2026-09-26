"use client";

import { useRef, useState, useTransition } from "react";
import { verifyAdminPin } from "@/app/actions";

export function PinGate({ tripId, tripName }: { tripId: string; tripName: string }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // Latest digits for fast typing: several keystrokes can land before React re-renders.
  const latest = useRef(["", "", "", ""]);

  function submit(pin: string) {
    startTransition(async () => {
      const result = await verifyAdminPin(tripId, pin);
      if (result?.error) {
        setError(result.error);
        setShake((n) => n + 1);
        latest.current = ["", "", "", ""];
        setDigits(latest.current);
        inputs.current[0]?.focus();
      }
    });
  }

  function update(next: string[]) {
    latest.current = next;
    setDigits(next);
    setError(null);
    if (next.every(Boolean)) submit(next.join(""));
  }

  function set(index: number, value: string) {
    const typed = value.replace(/\D/g, "");
    // Autofill or a fast insert can deliver several digits into one box: spread them forward.
    const next = [...latest.current];
    if (!typed) next[index] = "";
    typed
      .slice(0, 4 - index)
      .split("")
      .forEach((digit, offset) => (next[index + offset] = digit));
    const last = Math.min(index + typed.length, 3);
    if (typed && last > index - 1) inputs.current[typed.length > 1 ? last : Math.min(index + 1, 3)]?.focus();
    update(next);
  }

  function paste(text: string) {
    const pasted = text.replace(/\D/g, "").slice(0, 4).split("");
    if (pasted.length !== 4) return false;
    inputs.current[3]?.focus();
    update(pasted);
    return true;
  }

  return (
    <div className="mx-auto max-w-md space-y-8 py-10 text-center">
      <div className="space-y-3">
        <span className="stamp justify-center">Organiser only</span>
        <h1 className="font-heading text-3xl font-bold">{tripName}</h1>
        <p className="text-muted-foreground">Enter the 4-digit PIN you set when you created this trip.</p>
      </div>
      <div key={shake} className={`flex justify-center gap-3 ${shake ? "slide-back" : "pop-in"}`}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            aria-label={`PIN digit ${i + 1}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus={i === 0}
            maxLength={1}
            value={d}
            disabled={pending}
            onChange={(e) => set(i, e.target.value)}
            onPaste={(e) => {
              if (paste(e.clipboardData.getData("text"))) e.preventDefault();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0) inputs.current[i - 1]?.focus();
            }}
            className="size-16 rounded-2xl border border-line bg-card text-center font-heading text-3xl font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
          />
        ))}
      </div>
      <p role="alert" className="min-h-6 text-sm font-medium text-veto">
        {pending ? <span className="text-muted-foreground">Checking…</span> : error}
      </p>
    </div>
  );
}
