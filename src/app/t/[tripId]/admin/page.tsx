import Link from "next/link";
import { notFound } from "next/navigation";
import { closeEarly, resetClaim, setCostOverride, startCommitRound } from "@/app/actions";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Avatar } from "@/components/Avatar";
import { CopyLink } from "@/components/CopyLink";
import { ShareButton } from "@/components/ShareButton";
import { btn, card, field } from "@/components/styles";
import { DESTINATIONS } from "@/lib/catalogue";
import { formatDateTime, formatInr } from "@/lib/format";
import { shareMessage } from "@/lib/share";
import { publicResults } from "@/server/ranking";
import { isOrganiser, loadTrip, progressOf } from "@/server/trips";
import { baseUrl } from "@/server/url";

const STATE_LABEL = {
  OPEN: "Collecting answers",
  SCORED: "Results are in",
  COMMIT: "Commit round",
  LOCKED: "Decided",
} as const;

export const maxDuration = 300;

export default async function AdminPage(props: PageProps<"/t/[tripId]/admin">) {
  const { tripId } = await props.params;
  const { k } = await props.searchParams;
  const key = typeof k === "string" ? k : "";
  const bundle = await loadTrip(tripId);
  if (!bundle || !isOrganiser(bundle, key)) notFound();

  const { trip } = bundle;
  const origin = await baseUrl();
  const groupLink = `${origin}/t/${tripId}`;
  const progress = progressOf(bundle);
  const results = await publicResults(bundle);
  const leader = results.state !== "OPEN" ? results.top3[0] : undefined;
  const message = shareMessage(trip, { ...progress, leader: leader && `${leader.destinationName} (${leader.windowLabel})` }, groupLink);
  const overrides = new Map(bundle.overrides.map((o) => [o.destinationId, o]));
  const costsEditable = trip.state === "OPEN" || trip.state === "SCORED";
  const hidden = (
    <>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="k" value={key} />
    </>
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="stamp">Organiser · {STATE_LABEL[trip.state]}</span>
        <h1 className="font-heading text-3xl font-semibold">{trip.name}</h1>
        <p className="text-muted-foreground">
          {progress.submittedCount} of {progress.total} in · answers close {formatDateTime(trip.deadline)}
        </p>
      </header>

      <section className={`${card} space-y-4`}>
        <CopyLink url={groupLink} label="Group link — post this in WhatsApp" />
        <CopyLink url={`${origin}/t/${tripId}/admin?k=${key}`} label="Your admin link — keep this private" />
        <div className="flex flex-wrap gap-2">
          <ShareButton message={message} />
          <Link href={`/t/${tripId}`} className={btn.outline}>
            Open the group link (claim your name)
          </Link>
          {trip.state !== "OPEN" && (
            <Link href={`/t/${tripId}/results`} className={btn.outline}>
              Results
            </Link>
          )}
        </div>
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="font-heading text-lg font-semibold">Next step</h2>
        {trip.state === "OPEN" && (
          <form action={closeEarly} className="space-y-2">
            {hidden}
            <p className="text-sm text-muted-foreground">
              Results open automatically when everyone answers or at the deadline. Close early to open them now —
              anyone who hasn&apos;t answered counts as flexible.
            </p>
            <button type="submit" className={btn.outline}>Close answers now</button>
          </form>
        )}
        {trip.state === "SCORED" && (
          <form action={startCommitRound} className="space-y-2">
            {hidden}
            <p className="text-sm text-muted-foreground">
              Happy with the top three? Start the 48-hour commit round. Answers lock while it runs.
            </p>
            {results.state !== "OPEN" && results.status === "pending" && (
              <p className="text-sm font-medium text-stretch">
                The AI is still ranking the latest answers — you can start once it finishes.
              </p>
            )}
            <button
              type="submit"
              className={btn.primary}
              disabled={results.state !== "OPEN" && (results.top3.length === 0 || results.status === "pending")}
            >
              Start commit round
            </button>
          </form>
        )}
        {trip.state === "COMMIT" && (
          <p className="text-sm text-muted-foreground">
            Commit round closes {trip.commitDeadline ? formatDateTime(trip.commitDeadline) : "soon"}.{" "}
            {new Set(bundle.commits.map((c) => c.participantId)).size} of {progress.total} have answered.
          </p>
        )}
        {trip.state === "LOCKED" && (
          <p className="text-sm text-muted-foreground">The trip is decided. Only a participant&apos;s veto reopens it.</p>
        )}
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="font-heading text-lg font-semibold">People</h2>
        <ul className="divide-y divide-line">
          {bundle.participants.map((person, index) => (
            <li key={person.id} className="flex flex-wrap items-center gap-3 py-2">
              <Avatar name={person.displayName} index={index} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{person.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {person.submittedAt ? "Answered" : person.claimed ? "Opened the link, not answered" : "Not opened yet"}
                </p>
                {person.hardNoText && <p className="text-xs italic text-muted-foreground">&ldquo;{person.hardNoText}&rdquo;</p>}
              </div>
              {person.claimed && (
                <form action={resetClaim}>
                  {hidden}
                  <input type="hidden" name="participantId" value={person.id} />
                  <button type="submit" className={btn.small}>Reset claim</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} space-y-3`}>
        <div>
          <h2 className="font-heading text-lg font-semibold">Cost estimates</h2>
          <p className="text-sm text-muted-foreground">
            Per person. Travel is added from each person&apos;s own city. Correct these if you know better prices.
          </p>
        </div>
        <ul className="space-y-2">
          {DESTINATIONS.map((d) => {
            const o = overrides.get(d.id);
            return (
              <li key={d.id}>
                <form action={setCostOverride} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[8rem_1fr_1fr_auto]">
                  {hidden}
                  <input type="hidden" name="destinationId" value={d.id} />
                  <p className="col-span-2 font-medium sm:col-span-1 sm:self-center">
                    {d.name}
                    {o && <span className="ml-1 text-xs text-primary">edited</span>}
                  </p>
                  <label className="text-xs">
                    Stay / night
                    <input name="stayPerNight" inputMode="numeric" defaultValue={o?.stayPerNight ?? d.stayPerNight} className={`${field} h-9`} disabled={!costsEditable} />
                  </label>
                  <label className="text-xs">
                    Daily spend
                    <input name="dailySpend" inputMode="numeric" defaultValue={o?.dailySpend ?? d.dailySpend} className={`${field} h-9`} disabled={!costsEditable} />
                  </label>
                  <button type="submit" className={`${btn.small} h-9`} disabled={!costsEditable} aria-label={`Save ${d.name} costs`}>
                    Save
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          Defaults are rough estimates (e.g. Goa {formatInr(DESTINATIONS[0].stayPerNight)}/night).
        </p>
      </section>

      <ActivityFeed items={bundle.activity} />
    </div>
  );
}
