import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { claimName } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { DecisionRule } from "@/components/DecisionRule";
import { ShareButton } from "@/components/ShareButton";
import { btn, card } from "@/components/styles";
import { formatDateTime } from "@/lib/format";
import { shareMessage } from "@/lib/share";
import { publicResults } from "@/server/ranking";
import { loadTrip, progressOf, viewerFor } from "@/server/trips";
import { baseUrl } from "@/server/url";

export const maxDuration = 300;

export default async function GroupPage(props: PageProps<"/t/[tripId]">) {
  const { tripId } = await props.params;
  const { claimed } = await props.searchParams;
  const bundle = await loadTrip(tripId);
  if (!bundle) notFound();

  const viewer = await viewerFor(bundle);
  if (viewer) redirect(`/t/${tripId}/me`);

  const progress = progressOf(bundle);
  const results = await publicResults(bundle);
  const link = `${await baseUrl()}/t/${tripId}`;
  const leader = results.state !== "OPEN" ? results.top3[0] : undefined;
  const message = shareMessage(bundle.trip, { ...progress, leader: leader && `${leader.destinationName} (${leader.windowLabel})` }, link);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="stamp">Answers close {formatDateTime(bundle.trip.deadline)}</span>
        <h1 className="font-heading text-3xl font-semibold">{bundle.trip.name}</h1>
        <p className="text-muted-foreground">
          {progress.submittedCount} of {progress.total} in
          {progress.pendingNames.length > 0 && ` — waiting on ${progress.pendingNames.join(", ")}`}
        </p>
      </header>

      <section className={`${card} space-y-3`}>
        <h2 className="font-heading text-lg font-semibold">Tap your name</h2>
        {claimed && (
          <p role="alert" className="text-sm font-medium text-veto">
            That name is already taken on another phone. Ask the organiser to reset it.
          </p>
        )}
        <ul className="grid gap-2 sm:grid-cols-2">
          {bundle.participants.map((person, index) => (
            <li key={person.id}>
              <form action={claimName}>
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="participantId" value={person.id} />
                <button
                  type="submit"
                  disabled={person.claimed}
                  className="flex h-12 w-full items-center gap-3 rounded-xl border border-line bg-paper px-3 text-left font-medium transition hover:border-primary disabled:opacity-60"
                >
                  <Avatar name={person.displayName} index={index} />
                  <span className="flex-1">{person.displayName}</span>
                  {person.claimed && <span className="text-xs text-muted-foreground">claimed</span>}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <DecisionRule threshold={bundle.trip.miseryThreshold} />

      <div className="flex flex-wrap gap-2">
        <ShareButton message={message} />
        {results.state !== "OPEN" && (
          <Link href={`/t/${tripId}/results`} className={btn.outline}>
            See results
          </Link>
        )}
      </div>
    </div>
  );
}
