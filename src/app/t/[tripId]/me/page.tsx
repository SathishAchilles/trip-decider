import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DepartureBoard } from "@/components/board/DepartureBoard";
import { Confetti } from "@/components/Confetti";
import { BoardingForm } from "@/components/intake/BoardingForm";
import type { Draft } from "@/components/intake/types";
import { BoardingPass } from "@/components/pass/BoardingPass";
import { PendingRefresh } from "@/components/results/PendingRefresh";
import { ShareButton } from "@/components/ShareButton";
import { Shell } from "@/components/Shell";
import { stageIndex, TRIP_STAGES } from "@/components/StageRail";
import { btn, card } from "@/components/styles";
import { HARD_NO_TAGS, isOriginCity, type HardNoTag } from "@/lib/catalogue";
import { formatInr } from "@/lib/format";
import { budgetClass, iataFor, SHORT_NO } from "@/lib/iata";
import { shareMessage } from "@/lib/share";
import { boardRows } from "@/server/board";
import { llmEnabled, ownCosts, publicResults } from "@/server/ranking";
import { loadTrip, progressOf, viewerFor, windowDates } from "@/server/trips";
import { baseUrl } from "@/server/url";

export const maxDuration = 300;

export default async function MePage(props: PageProps<"/t/[tripId]/me">) {
  const { tripId } = await props.params;
  const { edit, checked } = await props.searchParams;
  const bundle = await loadTrip(tripId);
  if (!bundle) notFound();

  const viewer = await viewerFor(bundle);
  if (!viewer) redirect(`/t/${tripId}`);

  const { trip } = bundle;
  const editable = trip.state === "OPEN" || trip.state === "SCORED";
  const submitted = viewer.submittedAt !== null;
  const showForm = editable && (!submitted || edit === "1");
  const stage = { steps: TRIP_STAGES, current: stageIndex(trip.state) };

  const windows = bundle.windows.map((w) => ({ id: w.id, label: w.label, dates: windowDates(w) }));
  const answers = Object.fromEntries(
    bundle.availability.filter((a) => a.participantId === viewer.id).map((a) => [a.windowId, a.answer]),
  );

  if (showForm) {
    const quiz = viewer.quiz;
    const initial: Draft = {
      fromText: quiz?.from ?? "",
      homeCity: viewer.homeCity && isOriginCity(viewer.homeCity) ? viewer.homeCity : "",
      availability: answers,
      budgetMax: viewer.budgetMax ?? 15000,
      wallet: quiz?.wallet,
      wakeViews: quiz?.wakeViews ?? [],
      dayTwo: quiz?.dayTwo,
      thisOrThat: quiz?.thisOrThat ?? {},
      dream: quiz?.dream ?? "",
      hardNoTags: viewer.hardNoTags,
      hardNoText: viewer.hardNoText ?? "",
    };
    const checkedIn = bundle.participants.filter((p) => p.submittedAt !== null).map((p) => p.displayName);
    return (
      <Shell stage={stage} right={`Hi, ${viewer.displayName}!`}>
        <div className="space-y-2 pb-6">
          <span className="stamp">{trip.name} · now boarding</span>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">Check in for the trip, {viewer.displayName}</h1>
          <p className="text-muted-foreground">Eight quick taps. Your answers print onto your pass as you go.</p>
        </div>
        <BoardingForm
          tripId={tripId}
          tripName={trip.name}
          passenger={viewer.displayName}
          windows={windows}
          initial={initial}
          suggestionsEnabled={llmEnabled()}
          social={{ checkedIn, total: bundle.participants.length }}
          closesAt={trip.deadline}
        />
      </Shell>
    );
  }

  const progress = progressOf(bundle);
  const results = await publicResults(bundle);
  const costs = results.state === "OPEN" ? [] : ownCosts(bundle, viewer, results.top3);
  const link = `${await baseUrl()}/t/${tripId}`;
  const leader = results.state !== "OPEN" ? results.top3[0] : undefined;
  const message = shareMessage(trip, { ...progress, leader: leader && `${leader.destinationName} (${leader.windowLabel})` }, link);
  const personaPending = !viewer.persona && llmEnabled();
  const pending = progress.pendingNames;

  return (
    <Shell stage={stage} right={`Hi, ${viewer.displayName}!`}>
      {checked === "1" && <Confetti />}
      <div className="space-y-8">
        <header className="space-y-2">
          <span className="stamp">{trip.name}</span>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">You&apos;re checked in, {viewer.displayName} ✈</h1>
          <p className="text-muted-foreground">
            {trip.state === "OPEN"
              ? pending.length
                ? `Waiting on ${pending.join(", ")} before the destinations are revealed.`
                : "Everyone's in — revealing destinations…"
              : "Destinations are revealed — see where everyone stands."}
          </p>
        </header>

        <div className="gap-8 lg:grid lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4">
            <BoardingPass
              data={{
                tripName: trip.name,
                passenger: viewer.displayName,
                from: iataFor(viewer.homeCity),
                to: leader ? leader.destinationName.slice(0, 3).toUpperCase() : "???",
                dates: windows.map((w) => ({ label: w.label, answer: answers[w.id] })),
                budgetClass: budgetClass(viewer.budgetMax),
                noFly: viewer.hardNoTags.map((t) => SHORT_NO[t] ?? HARD_NO_TAGS[t as HardNoTag] ?? t),
                persona: viewer.persona,
                personaPending,
                stamped: true,
                animateStamp: checked === "1",
              }}
            />
            {personaPending && <PendingRefresh />}
            <div className="flex flex-wrap gap-2">
              {trip.state !== "OPEN" && (
                <Link href={`/t/${tripId}/results`} className={btn.primary}>
                  See the destinations →
                </Link>
              )}
              {editable && (
                <Link href={`/t/${tripId}/me?edit=1`} className={btn.outline}>
                  Change my answers
                </Link>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-6 lg:mt-0">
            <DepartureBoard title={trip.name} rows={boardRows(bundle, viewer.id)} closesAt={trip.state === "OPEN" ? trip.deadline : undefined} />
            {pending.length > 0 && trip.state === "OPEN" && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber/30 bg-amber/10 p-4">
                <p className="text-sm">
                  The plane can&apos;t leave without <strong>{pending.join(", ")}</strong>. Give them a nudge.
                </p>
                <ShareButton message={message} label="Nudge on WhatsApp" />
              </div>
            )}
            {costs.length > 0 && (
              <section className={`${card} space-y-2`}>
                <h2 className="font-heading text-lg font-semibold">Your fare for the top options</h2>
                <p className="text-xs text-muted-foreground">Estimates from {viewer.homeCity}, including travel. Only you see this.</p>
                <ul className="divide-y divide-line">
                  {costs.map((c) => (
                    <li key={c.optionKey} className="flex justify-between py-2 text-sm">
                      <span>{c.name}</span>
                      <span className="font-ticket font-semibold">{c.cost !== null ? `~${formatInr(c.cost)}` : "—"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
