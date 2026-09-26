import { CreateTripForm } from "@/components/CreateTripForm";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { Shell } from "@/components/Shell";
import { upcomingLongWeekends } from "@/server/longWeekends";

const STEPS = [
  {
    n: "01",
    title: "Everyone checks in",
    body: "Share one link. Each friend answers a few quick, fun questions — dates, budget, the trip they'd love.",
  },
  {
    n: "02",
    title: "See the trips that work",
    body: "Dealbreakers rule trips out. The rest are ranked for the whole group, with each person's view shown.",
  },
  {
    n: "03",
    title: "Lock it in",
    body: "Everyone ticks what they're in for. The trip locks — no more “let's plan soon”.",
  },
];

// Reads the cached long-weekend list per request, so it is never prerendered at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const weekends = await upcomingLongWeekends();
  return (
    <Shell>
      <div className="space-y-16 sm:space-y-24">
        <HeroSlideshow />

        <section className="space-y-10">
          <div className="space-y-3">
            <span className="stamp">How it works</span>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">Group chat to booked, in three steps</h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step) => (
              <li key={step.n} className="space-y-3 rounded-3xl border border-line bg-card p-6">
                <p className="font-ticket text-sm font-semibold text-amber">{step.n}</p>
                <h3 className="font-heading text-xl font-semibold">{step.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="create" className="scroll-mt-8 space-y-10">
          <div className="space-y-3">
            <span className="stamp">Start boarding</span>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">Set up your group&apos;s trip</h2>
            <p className="text-muted-foreground">Five quick steps. You&apos;ll get one link to drop in the group chat.</p>
          </div>
          <CreateTripForm weekends={weekends} />
        </section>
      </div>
    </Shell>
  );
}
