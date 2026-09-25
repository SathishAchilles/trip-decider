import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/ActivityFeed";
import { DecisionRule } from "@/components/DecisionRule";
import { CommitPanel } from "@/components/results/CommitPanel";
import { RankingBadge } from "@/components/results/RankingBadge";
import { ResultsBoard } from "@/components/results/ResultsBoard";
import { VetoPanel } from "@/components/results/VetoPanel";
import { ShareButton } from "@/components/ShareButton";
import { btn, card } from "@/components/styles";
import { formatDateTime } from "@/lib/format";
import { shareMessage } from "@/lib/share";
import { publicResults } from "@/server/ranking";
import { loadTrip, viewerFor } from "@/server/trips";
import { baseUrl } from "@/server/url";

export const maxDuration = 300;

export default async function ResultsPage(props: PageProps<"/t/[tripId]/results">) {
  const { tripId } = await props.params;
  const bundle = await loadTrip(tripId);
  if (!bundle) notFound();

  const { trip } = bundle;
  const viewer = await viewerFor(bundle);
  const results = await publicResults(bundle);
  const link = `${await baseUrl()}/t/${tripId}`;

  if (results.state === "OPEN") {
    const { progress } = results;
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <span className="stamp">{trip.name}</span>
          <h1 className="font-heading text-3xl font-semibold">
            {progress.submittedCount} of {progress.total} in
          </h1>
          <p className="text-muted-foreground">
            {progress.pendingNames.length > 0 && `Waiting on ${progress.pendingNames.join(", ")}. `}
            Results stay hidden until everyone answers or answers close at {formatDateTime(trip.deadline)}, so
            nobody&apos;s answers are nudged by early results.
          </p>
        </header>
        <ShareButton message={shareMessage(trip, progress, link)} label="Nudge the group on WhatsApp" />
        <DecisionRule threshold={trip.miseryThreshold} />
        <ActivityFeed items={bundle.activity} />
      </div>
    );
  }

  const locked = results.top3.find((o) => o.optionKey === results.lockedOptionKey);
  const leader = locked ?? results.top3[0];
  const message = shareMessage(
    trip,
    { ...results.progress, leader: leader && `${leader.destinationName} (${leader.windowLabel}, ${leader.windowDates})` },
    link,
  );
  const viewerCommits = viewer ? bundle.commits.filter((c) => c.participantId === viewer.id) : [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="stamp">{trip.name}</span>
        <h1 className="font-heading text-3xl font-semibold">
          {trip.state === "LOCKED" && locked
            ? `Decided: ${locked.destinationName}`
            : trip.state === "COMMIT"
              ? "Commit round"
              : "Your best options"}
        </h1>
        <p className="text-base">{results.explanation}</p>
        <RankingBadge view={results} live={trip.state === "SCORED"} />
      </header>

      {results.top3.length > 0 && (
        <ResultsBoard
          options={results.top3}
          robustness={results.robustness}
          lockedOptionKey={trip.state === "LOCKED" ? results.lockedOptionKey : null}
        />
      )}

      {results.blockers.length > 0 && (
        <section className={`${card} space-y-2`}>
          <h2 className="font-heading text-lg font-semibold">What&apos;s ruling options out</h2>
          <ul className="space-y-1 text-sm">
            {results.blockers.map((b) => (
              <li key={b.label} className="flex justify-between gap-3">
                <span>{b.label}</span>
                <span className="text-muted-foreground">{b.count} options</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trip.state === "COMMIT" && viewer && (
        <CommitPanel
          tripId={tripId}
          options={results.top3.map((o) => ({ optionKey: o.optionKey, name: `${o.destinationName} (${o.windowLabel})` }))}
          initial={viewerCommits.filter((c) => c.approved).map((c) => c.optionKey)}
          alreadyCommitted={viewerCommits.length > 0}
          deadline={trip.commitDeadline ? formatDateTime(trip.commitDeadline) : ""}
        />
      )}
      {trip.state === "COMMIT" && !viewer && (
        <p className="text-sm text-muted-foreground">
          <Link href={`/t/${tripId}`} className="underline">Tap your name</Link> to say which options you&apos;re in for.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <ShareButton message={message} />
        {viewer && (trip.state === "OPEN" || trip.state === "SCORED") && (
          <Link href={`/t/${tripId}/me?edit=1`} className={btn.outline}>
            Change my answers
          </Link>
        )}
        {trip.state === "LOCKED" && viewer && <VetoPanel tripId={tripId} />}
      </div>

      <ActivityFeed items={bundle.activity} />
    </div>
  );
}
