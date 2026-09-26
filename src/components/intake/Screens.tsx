"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { suggestHardNoTags } from "@/app/actions";
import { HARD_NO_TAGS, HARD_NO_TAG_IDS, ORIGIN_CITY_NAMES, type OriginCity } from "@/lib/catalogue";
import { formatInr } from "@/lib/format";
import { IATA } from "@/lib/iata";
import { PHOTOS } from "@/lib/photos";
import { BUDGET_CHIPS, DAY_TWO, THIS_OR_THAT, WAKE_VIEWS, WALLET } from "@/lib/quiz";
import type { AvailabilityAnswer } from "@/lib/types";
import { field } from "../styles";
import type { IntakeWindow, ScreenProps } from "./types";

const option =
  "group relative flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition duration-200 hover:-translate-y-0.5 active:translate-y-0";
const selected = "border-brand bg-brand/15 ring-2 ring-brand/50";
const idle = "border-line bg-raised/60 hover:border-brand/60";

type PlaceResult = { label: string; detail: string; city: string; km: number };

export function ScreenFrom({ draft, change }: ScreenProps) {
  const [query, setQuery] = useState(draft.fromText);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // Debounced search of real places; picking one maps it to the nearest airport.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q === draft.fromText) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        setResults(res.ok ? await res.json() : []);
        setOpen(true);
      } catch {
        /* aborted or offline: keep previous results */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, draft.fromText]);

  function pick(place: PlaceResult) {
    const text = place.detail ? `${place.label}, ${place.detail}` : place.label;
    setQuery(text);
    setOpen(false);
    change({ fromText: text, homeCity: place.city as OriginCity });
  }

  const picked = draft.homeCity;
  return (
    <div className="space-y-5">
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-muted-foreground">
          ⌕
        </span>
        <input
          autoFocus
          role="combobox"
          aria-expanded={open}
          aria-controls="place-results"
          aria-label="Search your city or neighbourhood"
          className={`${field} h-14 pl-11 font-heading text-lg`}
          value={query}
          placeholder="Search your area — Whitefield, Salt Lake, Andheri…"
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) change({ fromText: "", homeCity: "" });
          }}
          onFocus={() => results.length && setOpen(true)}
        />
        {searching && <span className="absolute inset-y-0 right-4 flex items-center font-ticket text-xs text-muted-foreground">searching…</span>}
        {open && results.length > 0 && (
          <ul
            id="place-results"
            role="listbox"
            className="pop-in absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line bg-card shadow-2xl shadow-black/40"
          >
            {results.map((place, i) => (
              <li key={`${place.label}-${place.detail}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => pick(place)}
                  className="pop-in flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-raised"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <span>
                    <span className="block font-medium">{place.label}</span>
                    {place.detail && <span className="block text-xs text-muted-foreground">{place.detail}</span>}
                  </span>
                  <span className="shrink-0 font-ticket text-xs text-amber">
                    {IATA[place.city as OriginCity]} · {place.km} km
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="min-h-6 font-ticket text-sm">
        {picked ? (
          <span key={picked} className="pop-in inline-block text-fit">
            ✓ Flying from <strong>{IATA[picked]}</strong> · {picked}
          </span>
        ) : (
          <span className="text-muted-foreground">Search your area above, or pick your nearest airport:</span>
        )}
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {ORIGIN_CITY_NAMES.map((city, i) => (
          <button
            key={city}
            type="button"
            aria-pressed={draft.homeCity === city}
            onClick={() => {
              setOpen(false);
              change({ homeCity: city, fromText: city });
              setQuery(city);
            }}
            style={{ animationDelay: `${i * 30}ms` }}
            className={`pop-in rounded-xl border px-2 py-2 text-center transition ${draft.homeCity === city ? `${selected} pick` : idle}`}
          >
            <span className="block font-heading text-lg font-bold">{IATA[city]}</span>
            <span className="block text-[0.65rem] text-muted-foreground">{city}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const DEPARTURE_ANSWERS: { value: AvailabilityAnswer; label: string; hint: string }[] = [
  { value: "yes", label: "Confirmed", hint: "I'm there" },
  { value: "maybe", label: "Standby", hint: "Probably" },
  { value: "no", label: "Can't fly", hint: "Rules it out" },
];

export function ScreenDepartures({ draft, change, windows }: ScreenProps & { windows: IntakeWindow[] }) {
  return (
    <div className="space-y-3">
      {windows.map((w, i) => (
        <div key={w.id} className="pop-in rounded-2xl border border-line bg-raised/40 p-4" style={{ animationDelay: `${i * 70}ms` }}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="font-heading text-lg font-semibold">
              <span className="mr-2 font-ticket text-xs text-muted-foreground">TT{String(101 + i)}</span>
              {w.label}
            </p>
            <p className="font-ticket text-xs text-muted-foreground">{w.dates}</p>
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={w.label}>
            {DEPARTURE_ANSWERS.map((a) => {
              const on = draft.availability[w.id] === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => change({ availability: { [w.id]: a.value } })}
                  className={`rounded-xl border px-2 py-2.5 text-center transition ${
                    on ? `${a.value === "no" ? "border-veto bg-veto/15 ring-2 ring-veto/40" : selected} pick` : idle
                  }`}
                >
                  <span className="block font-heading text-sm font-semibold">{a.label}</span>
                  <span className="block text-[0.65rem] text-muted-foreground">{a.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScreenBaggage({ draft, change }: ScreenProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="flex items-baseline justify-between">
          <span className="font-ticket text-xs tracking-widest text-muted-foreground uppercase">Your ceiling</span>
          <span className="font-heading text-3xl font-bold text-amber">{formatInr(draft.budgetMax)}</span>
        </p>
        <input
          type="range"
          min={4000}
          max={50000}
          step={500}
          value={draft.budgetMax}
          onChange={(e) => change({ budgetMax: Number(e.target.value) })}
          className="w-full accent-[var(--brand)]"
          aria-label="Budget ceiling"
        />
        <div className="flex flex-wrap gap-2">
          {BUDGET_CHIPS.map((amount, i) => (
            <button
              key={amount}
              type="button"
              onClick={() => change({ budgetMax: amount })}
              style={{ animationDelay: `${i * 35}ms` }}
              className={`pop-in rounded-full border px-3 py-1 font-ticket text-xs transition ${draft.budgetMax === amount ? `${selected} pick` : idle}`}
            >
              {formatInr(amount)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-heading font-semibold">How do you like to spend?</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {WALLET.map((w, i) => (
            <button
              key={w.id}
              type="button"
              onClick={() => change({ wallet: w.id })}
              style={{ animationDelay: `${120 + i * 60}ms` }}
              className={`pop-in ${option} flex-col items-start ${draft.wallet === w.id ? `${selected} pick` : idle}`}
            >
              <span className="text-2xl">{w.emoji}</span>
              <span className="font-heading font-semibold">{w.label}</span>
              <span className="text-xs text-muted-foreground">{w.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScreenWakeView({ draft, change }: ScreenProps) {
  function toggle(id: string) {
    const has = draft.wakeViews.includes(id);
    const views = has ? draft.wakeViews.filter((v) => v !== id) : [...draft.wakeViews, id].slice(-2);
    change({ wakeViews: views }, !has && views.length === 2);
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {WAKE_VIEWS.map((view, i) => {
        const on = draft.wakeViews.includes(view.id);
        const photo = PHOTOS[view.id];
        return (
          <button
            key={view.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(view.id)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`pop-in group relative aspect-[4/5] overflow-hidden rounded-2xl text-left text-white transition duration-300 hover:-translate-y-1 ${
              on ? "pick ring-4 ring-amber" : "ring-1 ring-white/10 hover:ring-white/40"
            }`}
          >
            <Image src={photo.src} alt="" fill sizes="(min-width: 640px) 220px, 45vw" className="object-cover transition duration-500 group-hover:scale-105" />
            <span aria-hidden className="photo-scrim absolute inset-0" />
            <span className="absolute inset-x-3 bottom-3 font-heading text-sm leading-tight font-semibold">{view.caption}</span>
            {on && (
              <span className="absolute top-2 right-2 rounded-full bg-amber px-2 py-0.5 font-ticket text-[0.65rem] font-semibold text-black">
                ✓ PICKED
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ScreenDayTwo({ draft, change }: ScreenProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DAY_TWO.map((o, i) => (
        <button
          key={o.id}
          type="button"
          onClick={() => change({ dayTwo: o.id }, true)}
          style={{ animationDelay: `${i * 60}ms` }}
          className={`pop-in ${option} py-5 ${draft.dayTwo === o.id ? `${selected} pick` : idle}`}
        >
          <span className="text-4xl transition group-hover:scale-110">{o.emoji}</span>
          <span className="font-heading text-base font-semibold">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function ChoiceCard({
  side,
  on,
  onPick,
}: {
  side: { id: string; emoji: string; label: string };
  on: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(side.id)}
      className={`${option} h-full flex-col justify-center py-8 text-center ${on ? `${selected} pick` : idle}`}
    >
      <span className="text-5xl transition group-hover:scale-110">{side.emoji}</span>
      <span className="font-heading text-base font-semibold">{side.label}</span>
    </button>
  );
}

export function ScreenThisOrThat({ draft, change }: ScreenProps) {
  const answered = THIS_OR_THAT.filter((q) => draft.thisOrThat[q.key]).length;
  const [index, setIndex] = useState(Math.min(answered, THIS_OR_THAT.length - 1));
  const q = THIS_OR_THAT[index];

  function pick(id: string) {
    const lastPair = index === THIS_OR_THAT.length - 1;
    change({ thisOrThat: { [q.key]: id } }, lastPair);
    if (!lastPair) setTimeout(() => setIndex(index + 1), 280);
  }

  return (
    <div className="space-y-4">
      <p className="text-center font-ticket text-xs tracking-[0.2em] text-muted-foreground">
        {index + 1} / {THIS_OR_THAT.length}
      </p>
      <div key={q.key} className="rise grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <ChoiceCard side={q.a} on={draft.thisOrThat[q.key] === q.a.id} onPick={pick} />
        <span aria-hidden className="self-center font-ticket text-sm font-semibold text-amber">
          OR
        </span>
        <ChoiceCard side={q.b} on={draft.thisOrThat[q.key] === q.b.id} onPick={pick} />
      </div>
      <div className="flex justify-center gap-1.5">
        {THIS_OR_THAT.map((item, i) => (
          <button
            key={item.key}
            type="button"
            aria-label={`Question ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-amber" : draft.thisOrThat[item.key] ? "w-3 bg-brand" : "w-3 bg-line"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ScreenDream({ draft, change }: ScreenProps) {
  return (
    <div className="space-y-3">
      <textarea
        autoFocus
        rows={3}
        maxLength={140}
        className={`${field} h-auto py-3 font-heading text-lg`}
        value={draft.dream}
        onChange={(e) => change({ dream: e.target.value })}
        placeholder="…a bonfire, bad singing and zero phone signal"
      />
      <p className="text-right font-ticket text-xs text-muted-foreground">{draft.dream.length}/140 · optional</p>
    </div>
  );
}

export function ScreenNoFly({ draft, change, suggestionsEnabled }: ScreenProps & { suggestionsEnabled: boolean }) {
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function toggle(tag: string) {
    const on = draft.hardNoTags.includes(tag);
    if (!on && draft.hardNoTags.length >= 3) return;
    change({ hardNoTags: on ? draft.hardNoTags.filter((t) => t !== tag) : [...draft.hardNoTags, tag] });
  }

  async function suggest() {
    if (!suggestionsEnabled || !draft.hardNoText.trim()) return;
    setReading(true);
    try {
      const tags = await suggestHardNoTags(draft.hardNoText);
      const merged = [...new Set([...draft.hardNoTags, ...tags])].slice(0, 3);
      const added = merged.filter((t) => !draft.hardNoTags.includes(t));
      change({ hardNoTags: merged });
      setNote(added.length ? "✨ Flagged from your story — untick anything that's wrong." : null);
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-muted-foreground">Tap anything that would ruin a trip for you — up to three.</p>
        <div className="flex flex-wrap gap-2">
          {HARD_NO_TAG_IDS.map((tag, i) => {
            const on = draft.hardNoTags.includes(tag);
            const disabled = !on && draft.hardNoTags.length >= 3;
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                disabled={disabled}
                onClick={() => toggle(tag)}
                style={{ animationDelay: `${i * 35}ms` }}
                className={`pop-in rounded-full border px-4 py-2 text-sm transition disabled:opacity-40 ${
                  on ? "pick border-veto bg-veto/15 font-semibold ring-2 ring-veto/40" : idle
                }`}
              >
                {on ? "✕ " : ""}
                {HARD_NO_TAGS[tag]}
              </button>
            );
          })}
        </div>
        <p className="font-ticket text-xs text-muted-foreground">
          {draft.hardNoTags.length}/3 picked · each one takes those trips off the table for the group
        </p>
      </div>
      <label className="block space-y-2">
        <span className="font-heading font-semibold">Or just tell us the story</span>
        <textarea
          rows={2}
          maxLength={200}
          className={`${field} h-auto py-3`}
          value={draft.hardNoText}
          onChange={(e) => change({ hardNoText: e.target.value })}
          onBlur={suggest}
          placeholder="12 hours on an overnight bus to a hill station. Never again."
        />
        <span className="block font-ticket text-xs text-muted-foreground">
          {reading ? "✨ Reading your story…" : (note ?? "Optional — we'll tick the matching dealbreakers for you to check")}
        </span>
      </label>
    </div>
  );
}
