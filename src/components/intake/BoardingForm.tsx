"use client";

import { useState, useTransition } from "react";
import { savePreferences } from "@/app/actions";
import { HARD_NO_TAGS, type HardNoTag } from "@/lib/catalogue";
import { budgetClass, IATA, SHORT_NO } from "@/lib/iata";
import { THIS_OR_THAT } from "@/lib/quiz";
import { Countdown } from "../board/Countdown";
import { BoardingPass } from "../pass/BoardingPass";
import { btn } from "../styles";
import { FlightPath } from "./FlightPath";
import {
  ScreenBaggage,
  ScreenDayTwo,
  ScreenDepartures,
  ScreenDream,
  ScreenFrom,
  ScreenNoFly,
  ScreenThisOrThat,
  ScreenWakeView,
} from "./Screens";
import type { Draft, IntakeWindow, ScreenProps } from "./types";

type Screen = {
  id: string;
  stage: number;
  title: string;
  sub?: string;
  check: (d: Draft) => string | null;
  render: (p: ScreenProps) => React.ReactNode;
};

export function BoardingForm({
  tripId,
  tripName,
  passenger,
  windows,
  initial,
  suggestionsEnabled,
  social,
  closesAt,
}: {
  tripId: string;
  tripName: string;
  passenger: string;
  windows: IntakeWindow[];
  initial: Draft;
  suggestionsEnabled: boolean;
  social: { checkedIn: string[]; total: number };
  closesAt: string;
}) {
  const [draft, setDraft] = useState(initial);
  const [screen, setScreen] = useState(0);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Fun questions open the flow; the practical ones (city, dates, money, dealbreakers)
  // are woven in between so answering keeps momentum. Ends on the dream question.
  const screens: Screen[] = [
    {
      id: "wake",
      stage: 0,
      title: "Pick the view you'd wake up to",
      sub: "Choose up to two. Go with your gut.",
      check: (d) => (d.wakeViews.length ? null : "Pick at least one view."),
      render: (p) => <ScreenWakeView {...p} />,
    },
    {
      id: "dayTwo",
      stage: 0,
      title: "Day two, 9 am. You are…",
      check: (d) => (d.dayTwo ? null : "Tap the one that's most you."),
      render: (p) => <ScreenDayTwo {...p} />,
    },
    {
      id: "from",
      stage: 1,
      title: "Where are you flying in from?",
      sub: "So we know how far everyone's travelling.",
      check: (d) => (d.homeCity ? null : "Pick your nearest airport."),
      render: (p) => <ScreenFrom {...p} />,
    },
    {
      id: "thisOrThat",
      stage: 1,
      title: "Quick! This or that",
      sub: "Five taps. Don't overthink it.",
      check: (d) => (THIS_OR_THAT.every((q) => d.thisOrThat[q.key]) ? null : "Finish the round."),
      render: (p) => <ScreenThisOrThat {...p} />,
    },
    {
      id: "departures",
      stage: 2,
      title: "Which dates can you actually make?",
      sub: "“Can't fly” takes those dates off the table for everyone — so only if you truly can't.",
      check: (d) => (windows.every((w) => d.availability[w.id]) ? null : "Answer every date."),
      render: (p) => <ScreenDepartures {...p} windows={windows} />,
    },
    {
      id: "wallet",
      stage: 2,
      title: "What's the most you'd spend?",
      sub: "The whole trip, travel included. Only you will ever see this number.",
      check: (d) => (d.wallet ? null : "Pick your wallet mood."),
      render: (p) => <ScreenBaggage {...p} />,
    },
    {
      id: "worst",
      stage: 3,
      title: "Worst trip memory?",
      sub: "We'll make sure it never happens again.",
      check: () => null,
      render: (p) => <ScreenNoFly {...p} suggestionsEnabled={suggestionsEnabled} />,
    },
    {
      id: "dream",
      stage: 3,
      title: "Last one: the best trip ever would have…",
      sub: "No wrong answers — say it the way you'd tell a friend.",
      check: () => null,
      render: (p) => <ScreenDream {...p} />,
    },
  ];

  const current = screens[screen];
  const last = screen === screens.length - 1;

  function change(patch: Partial<Draft>, advance = false) {
    // Merge per-date and per-pair answers into the latest state, so rapid taps never drop one.
    const merge = (d: Draft): Draft => ({
      ...d,
      ...patch,
      availability: { ...d.availability, ...patch.availability },
      thisOrThat: { ...d.thisOrThat, ...patch.thisOrThat },
    });
    setDraft(merge);
    setError(null);
    // Pass the fresh answers along: state from this render is stale by the time the beat ends.
    if (advance) setTimeout(() => next(merge(draft)), 280);
  }

  function next(d: Draft = draft) {
    const problem = screens[screen].check(d);
    if (problem) setError(problem);
    else if (!last) {
      setDirection("next");
      setScreen((s) => Math.min(s + 1, screens.length - 1));
    }
    else submit(d);
  }

  function submit(d: Draft) {
    startTransition(async () => {
      const result = await savePreferences(tripId, {
        homeCity: d.homeCity as never,
        availability: d.availability,
        budgetMax: d.budgetMax,
        hardNoTags: d.hardNoTags as never,
        hardNoText: d.hardNoText,
        quiz: {
          from: d.fromText || d.homeCity,
          wakeViews: d.wakeViews,
          dayTwo: d.dayTwo as never,
          thisOrThat: d.thisOrThat as never,
          wallet: d.wallet as never,
          dream: d.dream,
        },
      });
      if (result?.error) setError(result.error);
    });
  }

  const others = social.checkedIn.filter((n) => n !== passenger);
  const pass = (
    <BoardingPass
      data={{
        tripName,
        passenger,
        from: draft.homeCity ? IATA[draft.homeCity] : "···",
        to: "???",
        dates: windows.map((w) => ({ label: w.label, answer: draft.availability[w.id] })),
        budgetClass: draft.wallet ? budgetClass(draft.budgetMax) : null,
        noFly: draft.hardNoTags.map((t) => SHORT_NO[t] ?? HARD_NO_TAGS[t as HardNoTag]),
        persona: null,
        live: true,
      }}
    />
  );

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm">
        <span>
          {others.length > 0 ? (
            <>
              <strong>{others.slice(0, 3).join(", ")}</strong> {others.length === 1 ? "has" : "have"} checked in and{" "}
              {others.length === 1 ? "is" : "are"} waiting for you ✈
            </>
          ) : (
            <>Be the first to check in — your pass sets the tone ✈</>
          )}
        </span>
        <Countdown until={closesAt} className="font-ticket text-xs text-amber" />
      </p>

      <div className="gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-3xl border border-line bg-card p-5 sm:p-8">
          <FlightPath progress={screen / (screens.length - 1)} stage={current.stage} />
          <div key={screen} className={`mt-8 space-y-6 ${direction === "next" ? "slide-next" : "slide-back"}`}>
            <div className="space-y-2">
              <p className="font-ticket text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Question {screen + 1} of {screens.length}
              </p>
              <h2 className="font-heading text-3xl leading-tight font-bold sm:text-4xl">{current.title}</h2>
              {current.sub && <p className="text-muted-foreground">{current.sub}</p>}
            </div>
            {current.render({ draft, change })}
          </div>

          {error && (
            <p role="alert" className="mt-5 font-medium text-veto">
              {error}
            </p>
          )}
          <div className="mt-8 flex gap-3">
            {screen > 0 && (
              <button type="button" className={btn.outline} onClick={() => {
                  setDirection("back");
                  setScreen(screen - 1);
                }} disabled={pending}>
                ← Back
              </button>
            )}
            <button type="button" className={`${btn.primary} flex-1 text-base`} onClick={() => next()} disabled={pending}>
              {last
                ? pending
                  ? "Checking you in…"
                  : "Check in ✈"
                : current.id === "dream" && !draft.dream.trim()
                  ? "Skip →"
                  : "Next →"}
            </button>
          </div>
        </section>

        <aside className="mt-8 space-y-3 lg:sticky lg:top-8 lg:mt-0 lg:self-start">
          <p className="font-ticket text-xs tracking-[0.2em] text-muted-foreground uppercase">Your pass, printing live</p>
          {pass}
        </aside>
      </div>
    </div>
  );
}
