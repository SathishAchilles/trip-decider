import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IntakeForm } from "@/components/intake/IntakeForm";
import type { IntakeDraft } from "@/components/intake/types";
import { ShareButton } from "@/components/ShareButton";
import { btn, card } from "@/components/styles";
import { HARD_NO_TAGS, VIBES, VIBE_LABELS, type HardNoTag } from "@/lib/catalogue";
import { formatDateTime, formatInr } from "@/lib/format";
import { shareMessage } from "@/lib/share";
import { ownCosts, publicResults } from "@/server/ranking";
import { loadTrip, progressOf, viewerFor, windowDates } from "@/server/trips";
import { Shell } from "@/components/Shell";
import { stageIndex, TRIP_STAGES } from "@/components/StageRail";
import { baseUrl } from "@/server/url";

export const maxDuration = 300;

export default async function MePage(props: PageProps<"/t/[tripId]/me">) {
  const { tripId } = await props.params;
  const { edit } = await props.searchParams;
  const bundle = await loadTrip(tripId);
  if (!bundle) notFound();

  const viewer = await viewerFor(bundle);
  if (!viewer) redirect(`/t/${tripId}`);

  const { trip } = bundle;
  const editable = trip.state === "OPEN" || trip.state === "SCORED";
  const submitted = viewer.submittedAt !== null;
  const showForm = editable && (!submitted || edit === "1");

  const windows = bundle.windows.map((w) => ({ id: w.id, label: w.label, dates: windowDates(w) }));
  const answers = Object.fromEntries(
    bundle.availability.filter((a) => a.participantId === viewer.id).map((a) => [a.windowId, a.answer]),
  );

  if (showForm) {
    const initial: IntakeDraft = {
      homeCity: viewer.homeCity ?? "",
      availability: answers,
      budgetComfort: viewer.budgetComfort?.toString() ?? "",
      budgetMax: viewer.budgetMax?.toString() ?? "",
      vibes: viewer.vibes ?? { beach: 3, hills: 3, heritage: 3, adventure: 3, chill: 3, nightlife: 3 },
      hardNoTags: viewer.hardNoTags,
      hardNoText: viewer.hardNoText ?? "",
    };
    return (
      <Shell stage={{ steps: TRIP_STAGES, current: stageIndex(trip.state) }} right={`Hi, ${viewer.displayName}!`}>
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="space-y-2">
          <span className="stamp">{trip.name}</span>
          <h1 className="font-heading text-3xl font-bold">Your answers — about 3 minutes</h1>
          <p className="text-sm text-muted-foreground">Answers close {formatDateTime(trip.deadline)}.</p>
        </header>
        <IntakeForm
          tripId={tripId}
          windows={windows}
          initial={initial}
          suggestionsEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
        />
      </div>
      </Shell>
    );
  }

  const progress = progressOf(bundle);
  const results = await publicResults(bundle);
  const costs = results.state === "OPEN" ? [] : ownCosts(bundle, viewer, results.top3);
  const link = `${await baseUrl()}/t/${tripId}`;
  const leader = results.state !== "OPEN" ? results.top3[0] : undefined;
  const message = shareMessage(trip, { ...progress, leader: leader && `${leader.destinationName} (${leader.windowLabel})` }, link);

  return (
    <Shell stage={{ steps: TRIP_STAGES, current: stageIndex(trip.state) }} right={`Hi, ${viewer.displayName}!`}>
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="stamp">{trip.name}</span>
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Thanks, {viewer.displayName}</h1>
        <p className="text-muted-foreground">
          {trip.state === "OPEN"
            ? `${progress.submittedCount} of ${progress.total} in. Results open when everyone has answered or at ${formatDateTime(trip.deadline)}.`
            : "Results are in."}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {trip.state !== "OPEN" && (
          <Link href={`/t/${tripId}/results`} className={btn.primary}>
            See where everyone stands
          </Link>
        )}
        <ShareButton message={message} />
        {editable && (
          <Link href={`/t/${tripId}/me?edit=1`} className={btn.outline}>
            Edit my answers
          </Link>
        )}
      </div>

      {costs.length > 0 && (
        <section className={`${card} space-y-2`}>
          <h2 className="font-heading text-lg font-semibold">Your cost for the top options</h2>
          <p className="text-xs text-muted-foreground">Estimates from {viewer.homeCity}, including travel. Only you see this.</p>
          <ul className="divide-y divide-line">
            {costs.map((c) => (
              <li key={c.optionKey} className="flex justify-between py-2 text-sm">
                <span>{c.name}</span>
                <span className="font-semibold">{c.cost !== null ? `~${formatInr(c.cost)} (estimate)` : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${card} space-y-3 text-sm`}>
        <h2 className="font-heading text-lg font-semibold">Your answers</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">From</dt>
          <dd>{viewer.homeCity}</dd>
          <dt className="text-muted-foreground">Dates</dt>
          <dd>{windows.map((w) => `${w.label}: ${answers[w.id] ?? "—"}`).join(" · ")}</dd>
          <dt className="text-muted-foreground">Budget</dt>
          <dd>
            {viewer.budgetComfort !== null && viewer.budgetMax !== null
              ? `${formatInr(viewer.budgetComfort)} comfortable, ${formatInr(viewer.budgetMax)} max`
              : "—"}
          </dd>
          <dt className="text-muted-foreground">Vibe</dt>
          <dd>{VIBES.map((v) => `${VIBE_LABELS[v]} ${viewer.vibes?.[v] ?? "—"}`).join(" · ")}</dd>
          <dt className="text-muted-foreground">Hard no&apos;s</dt>
          <dd>{viewer.hardNoTags.length ? viewer.hardNoTags.map((t) => HARD_NO_TAGS[t as HardNoTag]).join(", ") : "None"}</dd>
        </dl>
        {!editable && (
          <p className="text-muted-foreground">Answers are closed. Only a veto can reopen the decision.</p>
        )}
      </section>
    </div>
    </Shell>
  );
}
