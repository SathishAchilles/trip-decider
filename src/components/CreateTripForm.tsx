"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createTrip, suggestTripName } from "@/app/actions";
import type { Weekend } from "@/lib/longWeekends";
import { Avatar } from "./Avatar";
import { DepartureBoard, type BoardRow } from "./board/DepartureBoard";
import { btn, field } from "./styles";

type WindowDraft = Weekend;

const NAME_IDEAS = [
  "Goa before we turn 30",
  "Operation: Escape the office",
  "The trip we actually take",
  "College gang reunion",
  "Mountains? Beach? Help.",
  "Finally, that Kerala trip",
  "Squad's first real holiday",
];

const GATE_OPTIONS = [
  { id: "3d", label: "In 3 days", days: 3 },
  { id: "1w", label: "In a week", days: 7 },
  { id: "2w", label: "In 2 weeks", days: 14 },
] as const;

type Gate = (typeof GATE_OPTIONS)[number]["id"] | "custom";

function shortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function tomorrowIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

function Step({
  n,
  title,
  hint,
  delay,
  children,
}: {
  n: string;
  title: string;
  hint?: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="pop-in space-y-4 rounded-3xl border border-line bg-card/80 p-6 backdrop-blur transition hover:border-brand/40 sm:p-7"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-baseline gap-3">
        <span className="font-ticket text-sm font-semibold text-amber">{n}</span>
        <div>
          <h3 className="font-heading text-xl font-semibold">{title}</h3>
          {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

const chip = "rounded-full border px-3.5 py-1.5 text-sm transition";
const chipOn = "pick border-brand bg-brand/15 font-semibold ring-2 ring-brand/40";
const chipOff = "border-line bg-raised/60 hover:border-brand/60 hover:-translate-y-0.5";

export function CreateTripForm({ weekends }: { weekends: Weekend[] }) {
  const [tripName, setTripName] = useState("");
  const [idea, setIdea] = useState(0);
  const [naming, setNaming] = useState(false);
  const [organiserName, setOrganiserName] = useState("");
  const [friends, setFriends] = useState<string[]>([]);
  const [friendText, setFriendText] = useState("");
  const [windows, setWindows] = useState<WindowDraft[]>([]);
  const [gate, setGate] = useState<Gate>("1w");
  const [customGate, setCustomGate] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const friendInput = useRef<HTMLInputElement>(null);
  const pinInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Rotate the trip-name suggestion while the field is empty.
  useEffect(() => {
    if (tripName) return;
    const timer = setInterval(() => setIdea((i) => (i + 1) % NAME_IDEAS.length), 2600);
    return () => clearInterval(timer);
  }, [tripName]);

  function addFriends(text: string) {
    const names = text
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) return;
    setFriends((current) => {
      const seen = new Set([organiserName, ...current].map((n) => n.toLowerCase()));
      const added = names.filter((n) => !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()));
      return [...current, ...added].slice(0, 11);
    });
    setFriendText("");
  }

  function toggleWeekend(w: WindowDraft) {
    setWindows((ws) =>
      ws.some((x) => x.startDate === w.startDate && x.label === w.label)
        ? ws.filter((x) => !(x.startDate === w.startDate && x.label === w.label))
        : [...ws, w].slice(0, 6),
    );
  }

  function updateWindow(index: number, patch: Partial<WindowDraft>) {
    setWindows((ws) => ws.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  function setPinDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setPin((p) => p.map((d, i) => (i === index ? digit : d)));
    if (digit && index < 3) pinInputs.current[index + 1]?.focus();
  }

  function deadlineIso(): string {
    if (gate === "custom") return customGate ? new Date(customGate).toISOString() : "";
    const days = GATE_OPTIONS.find((g) => g.id === gate)!.days;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  async function suggestName() {
    setNaming(true);
    try {
      const name = await suggestTripName({
        people: [organiserName, ...friends],
        windows: windows.map((w) => ({ label: w.label, startDate: w.startDate })),
      });
      setTripName(name);
    } finally {
      setNaming(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const allFriends = friendText.trim() ? [...friends, friendText.trim()] : friends;
    startTransition(async () => {
      const result = await createTrip({
        tripName: tripName.trim(),
        organiserName,
        otherNames: allFriends,
        windows,
        deadline: deadlineIso(),
        pin: pin.join(""),
      });
      if (result?.error) setError(result.error);
    });
  }

  const everyone = [organiserName.trim() || "You", ...friends];
  const boardRows: BoardRow[] = everyone.map((name, i) => ({
    name,
    from: "···",
    persona: "",
    status: "AWAITED",
    isYou: i === 0,
  }));

  return (
    <form
      onSubmit={submit}
      // Enter never submits early; the button at the end does.
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type !== "submit") e.preventDefault();
      }}
      className="gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_380px]"
    >
      <div className="space-y-5">
        <Step n="01" title="Who's on board?" hint="Your name first, then everyone else. Press Enter after each name, or paste a list." delay={0}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-ticket text-xs text-amber">
              YOU
            </span>
            <input
              aria-label="Your name"
              className={`${field} pl-14`}
              value={organiserName}
              maxLength={40}
              onChange={(e) => setOrganiserName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") friendInput.current?.focus();
              }}
              placeholder="Your name"
            />
          </div>
          <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-line bg-paper/60 p-2 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
            {friends.map((name, i) => (
              <span key={name} className="pop-in flex items-center gap-2 rounded-full bg-raised py-1 pr-2 pl-1 text-sm font-medium">
                <Avatar name={name} index={i + 1} />
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() => setFriends((f) => f.filter((n) => n !== name))}
                  className="px-1 text-muted-foreground hover:text-ink"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              ref={friendInput}
              aria-label="Add a friend"
              className="min-w-40 flex-1 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground/70"
              value={friendText}
              onChange={(e) => setFriendText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addFriends(friendText);
                } else if (e.key === "Backspace" && !friendText && friends.length) {
                  setFriends((f) => f.slice(0, -1));
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (/[,\n]/.test(text)) {
                  e.preventDefault();
                  addFriends(text);
                }
              }}
              onBlur={() => addFriends(friendText)}
              placeholder={friends.length ? "Add another…" : "Friends' names — Aisha, Karan, Preethi…"}
            />
          </div>
          <p className="font-ticket text-xs text-muted-foreground">{everyone.length} on board · 3 to 12 people</p>
        </Step>

        <Step n="02" title="Possible departures" hint="Tap the long weekends that could work, or add your own dates." delay={80}>
          <div className="flex flex-wrap gap-2">
            {weekends.map((w, i) => {
              const on = windows.some((x) => x.startDate === w.startDate && x.label === w.label);
              return (
                <button
                  key={`${w.label}-${w.startDate}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleWeekend(w)}
                  style={{ animationDelay: `${120 + i * 40}ms` }}
                  className={`pop-in ${chip} ${on ? chipOn : chipOff}`}
                >
                  {on ? "✓ " : "+ "}
                  {w.label}
                  <span className="ml-1.5 font-ticket text-xs text-muted-foreground">
                    {shortDate(w.startDate)}–{shortDate(w.endDate)}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setWindows((ws) => [...ws, { label: "", startDate: "", endDate: "" }].slice(0, 6))}
              className={`${chip} border-dashed ${chipOff}`}
            >
              + Custom dates
            </button>
          </div>
          {windows.length > 0 && (
            <ol className="space-y-2">
              {windows.map((w, index) => (
                <li
                  key={index}
                  className="pop-in grid gap-2 rounded-2xl border border-line bg-raised/40 p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                >
                  <input
                    aria-label={`Departure ${index + 1} name`}
                    className={`${field} h-10 text-sm`}
                    value={w.label}
                    onChange={(e) => updateWindow(index, { label: e.target.value })}
                    placeholder="e.g. Long weekend in March"
                  />
                  <input
                    type="date"
                    aria-label="From"
                    min={tomorrowIso()}
                    className={`${field} h-10 text-sm sm:w-40`}
                    value={w.startDate}
                    onChange={(e) => updateWindow(index, { startDate: e.target.value })}
                  />
                  <input
                    type="date"
                    aria-label="To"
                    min={w.startDate || tomorrowIso()}
                    className={`${field} h-10 text-sm sm:w-40`}
                    value={w.endDate}
                    onChange={(e) => updateWindow(index, { endDate: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label={`Remove departure ${index + 1}`}
                    onClick={() => setWindows((ws) => ws.filter((_, i) => i !== index))}
                    className={btn.small}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Step>

        <Step n="03" title="When does the gate close?" hint="After this, anyone who hasn't checked in counts as flexible and the trips are revealed." delay={160}>
          <div className="flex flex-wrap gap-2">
            {GATE_OPTIONS.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={gate === g.id}
                onClick={() => setGate(g.id)}
                className={`${chip} ${gate === g.id ? chipOn : chipOff}`}
              >
                {g.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={gate === "custom"}
              onClick={() => setGate("custom")}
              className={`${chip} ${gate === "custom" ? chipOn : chipOff}`}
            >
              Pick a time
            </button>
          </div>
          {gate === "custom" && (
            <input
              type="datetime-local"
              aria-label="Gate closes"
              className={`pop-in ${field} sm:w-72`}
              value={customGate}
              onChange={(e) => setCustomGate(e.target.value)}
            />
          )}
        </Step>

        <Step n="04" title="Set your organiser PIN" hint="4 digits. You'll need it to open the organiser page from another device." delay={240}>
          <div className="flex gap-3">
            {pin.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  pinInputs.current[i] = el;
                }}
                aria-label={`PIN digit ${i + 1}`}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setPinDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !d && i > 0) pinInputs.current[i - 1]?.focus();
                }}
                className={`size-14 rounded-2xl border bg-paper/60 text-center font-heading text-2xl font-bold outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40 ${
                  d ? "pick border-brand" : "border-line"
                }`}
              />
            ))}
          </div>
        </Step>

        <Step n="05" title="Give the trip a name" hint="Optional — leave it blank and we'll name it from your group and dates." delay={320}>
          <div className="relative">
            <input
              aria-label="Trip name"
              className={`${field} h-14 pr-36 font-heading text-lg`}
              value={tripName}
              maxLength={80}
              onChange={(e) => setTripName(e.target.value)}
            />
            {!tripName && (
              <span
                key={idea}
                aria-hidden
                className="rise pointer-events-none absolute inset-y-0 left-4 flex items-center font-heading text-lg text-muted-foreground/60"
              >
                {NAME_IDEAS[idea]}
              </span>
            )}
            <button
              type="button"
              onClick={suggestName}
              disabled={naming}
              className="absolute inset-y-2 right-2 rounded-xl bg-raised px-3 text-sm font-semibold text-amber transition hover:bg-brand/20 disabled:opacity-60"
            >
              {naming ? "Thinking…" : "✨ Suggest one"}
            </button>
          </div>
        </Step>

        {error && (
          <p role="alert" className="pop-in rounded-2xl border border-veto/40 bg-card px-4 py-3 text-sm font-medium text-veto">
            {error}
          </p>
        )}
        <button type="submit" className={`${btn.primary} h-14 w-full text-base`} disabled={pending}>
          {pending ? (tripName.trim() ? "Printing your link…" : "Naming your trip & printing your link…") : "Get our trip link →"}
        </button>
      </div>

      <aside className="mt-8 space-y-3 lg:sticky lg:top-8 lg:mt-0 lg:self-start">
        <p className="font-ticket text-xs tracking-[0.2em] text-muted-foreground uppercase">Your departure board</p>
        <DepartureBoard title={tripName || "Your trip"} rows={boardRows} compact />
        <p className="text-sm text-muted-foreground">
          Everyone gets one link. As friends check in, their names flip to <span className="text-[#6ee7a8]">CHECKED IN</span>.
        </p>
      </aside>
    </form>
  );
}
