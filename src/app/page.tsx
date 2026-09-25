import Image from "next/image";
import { CreateTripForm } from "@/components/CreateTripForm";
import { PhotoCredit } from "@/components/PhotoCredit";
import { Shell } from "@/components/Shell";
import { btn } from "@/components/styles";
import { HERO_PHOTO } from "@/lib/photos";

const STEPS = [
  { n: "01", title: "One link", body: "Everyone taps their name and answers four questions in about three minutes." },
  { n: "02", title: "Best options", body: "Hard limits rule trips out; the rest are ranked for the whole group." },
  { n: "03", title: "One decision", body: "Everyone ticks what they're in for, and the trip locks." },
];

export default function Home() {
  return (
    <Shell>
      <div className="space-y-12">
        <section className="relative isolate overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-black/40">
          <Image
            src={HERO_PHOTO.src}
            alt={HERO_PHOTO.alt}
            fill
            priority
            sizes="(min-width: 1152px) 1088px, 100vw"
            className="-z-20 object-cover"
          />
          <div aria-hidden className="photo-scrim absolute inset-0 -z-10" />
          <div className="flex min-h-[520px] flex-col justify-end gap-6 p-6 sm:p-10">
            <p className="rise font-heading text-xs font-semibold tracking-[0.2em] text-white/75 uppercase">
              For friends who can&apos;t agree on a trip
            </p>
            <h1 className="rise font-heading text-[clamp(2.5rem,8vw,6rem)] font-extrabold uppercase leading-[0.92] tracking-tight [animation-delay:60ms]">
              Stop planning
              <br />
              in the group chat
            </h1>
            <p className="rise max-w-xl text-base text-white/85 [animation-delay:120ms] sm:text-lg">
              Everyone answers once. The app finds the trips that work for the whole group and shows where each person
              stands — then you lock one in.
            </p>
            <div className="rise flex flex-wrap items-end justify-between gap-4 [animation-delay:180ms]">
              <a href="#create" className={btn.primary}>
                Start a trip <span aria-hidden>→</span>
              </a>
              <PhotoCredit photo={HERO_PHOTO} />
            </div>
          </div>
        </section>

        <section id="create" className="scroll-mt-6 gap-10 lg:grid lg:grid-cols-[1fr_1.35fr]">
          <div className="mb-8 space-y-8 lg:sticky lg:top-8 lg:mb-0 lg:self-start">
            <div className="space-y-2">
              <span className="stamp">How it works</span>
              <h2 className="font-heading text-3xl font-bold">Three steps, no 200-message thread</h2>
            </div>
            <ol className="space-y-6">
              {STEPS.map((step) => (
                <li key={step.n} className="flex gap-4">
                  <span className="font-heading text-sm font-bold text-brand">{step.n}</span>
                  <div>
                    <p className="font-heading font-semibold">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <CreateTripForm />
        </section>
      </div>
    </Shell>
  );
}
