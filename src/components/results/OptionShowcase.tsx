"use client";

import Image from "next/image";
import { useState } from "react";
import { HERO_PHOTO, PHOTOS } from "@/lib/photos";
import type { PublicOption } from "@/server/ranking";
import { FitDots } from "../FitDots";
import { PhotoCredit } from "../PhotoCredit";
import { btn } from "../styles";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function OptionShowcase({
  options,
  explanation,
  sourceLabel,
  lockedOptionKey,
  action,
}: {
  options: PublicOption[];
  explanation: string;
  sourceLabel: string;
  lockedOptionKey: string | null;
  action: { href: string; label: string };
}) {
  const [index, setIndex] = useState(() => {
    const locked = options.findIndex((o) => o.optionKey === lockedOptionKey);
    return locked >= 0 ? locked : 0;
  });
  const hero = options[index];
  const photo = PHOTOS[hero.destinationId] ?? HERO_PHOTO;
  const others = options.map((option, i) => ({ option, i })).filter(({ i }) => i !== index);
  const next = options[(index + 1) % options.length];
  const locked = hero.optionKey === lockedOptionKey;

  function go(step: number) {
    setIndex((i) => (i + step + options.length) % options.length);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Top trip options"
      className="relative isolate overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-black/40"
    >
      <Image
        key={photo.src}
        src={photo.src}
        alt={photo.alt}
        fill
        priority
        sizes="(min-width: 1152px) 1088px, 100vw"
        className="rise -z-20 object-cover"
      />
      <div aria-hidden className="photo-scrim absolute inset-0 -z-10" />

      <div className="flex min-h-[620px] flex-col justify-end gap-8 p-6 sm:p-10 lg:min-h-[600px]">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div key={hero.optionKey} aria-live="polite" className="space-y-4">
            <p className="rise flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-xs font-semibold tracking-[0.18em] uppercase text-white/75">
              <span>#{index + 1} of {options.length}</span>
              <span aria-hidden>·</span>
              <span>{locked ? "✔ Decided" : sourceLabel}</span>
            </p>
            <h2 className="display-name rise [animation-delay:60ms]">{hero.destinationName}</h2>
            <p className="rise font-heading text-base font-medium text-white/90 [animation-delay:120ms] sm:text-lg">
              {hero.windowLabel} · {hero.windowDates}
            </p>
            <p className="rise flex flex-wrap items-center gap-3 text-sm text-white/80 [animation-delay:160ms]">
              <FitDots value={hero.meanScore} />
              <span>
                Group {hero.meanScore.toFixed(2)} · no one below {hero.minScore.toFixed(2)}
              </span>
              {hero.miserable && <span className="font-semibold text-veto">▼ below the fairness floor for someone</span>}
            </p>
            <p className="rise max-w-xl text-sm leading-relaxed text-white/85 [animation-delay:200ms] sm:text-base">
              {index === 0 ? explanation : `Ranked #${index + 1} for the group. ${hero.vibes.join(" · ")}.`}
            </p>
            <div className="rise flex flex-wrap gap-3 pt-2 [animation-delay:260ms]">
              <a href={action.href} className={btn.primary}>
                {action.label}
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>

          {others.length > 0 && (
            <ul className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-2 sm:-mx-10 sm:px-10 lg:mx-0 lg:justify-end lg:overflow-visible lg:px-0">
              {others.map(({ option, i }) => {
                const cardPhoto = PHOTOS[option.destinationId] ?? HERO_PHOTO;
                return (
                  <li key={option.optionKey} className="shrink-0 snap-start">
                    <button
                      type="button"
                      onClick={() => setIndex(i)}
                      className="group block text-left"
                      aria-label={`Show #${i + 1}: ${option.destinationName}`}
                    >
                      <span className="block font-heading text-sm font-semibold">{option.destinationName}</span>
                      <span className="mt-1 mb-2 flex items-center gap-2 text-[0.7rem] text-white/70">
                        <FitDots value={option.meanScore} /> #{i + 1} · {option.windowLabel}
                      </span>
                      <span className="relative block h-52 w-36 overflow-hidden rounded-2xl ring-1 ring-white/20 transition duration-300 group-hover:-translate-y-1 group-hover:ring-white/60 sm:h-64 sm:w-44">
                        <Image
                          src={cardPhoto.src}
                          alt={cardPhoto.alt}
                          fill
                          sizes="176px"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                        {option.optionKey === lockedOptionKey && (
                          <span className="absolute top-3 right-3 rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-bold text-[#0e1a24]">
                            ✔ Decided
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-5">
          <p aria-hidden className="hidden font-heading text-4xl font-extrabold uppercase text-white/15 sm:block">
            {options.length > 1 ? next.destinationName : ""}
          </p>
          {options.length > 1 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous option"
                className="flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur transition hover:bg-white/25"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next option"
                className="flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur transition hover:bg-white/25"
              >
                ›
              </button>
            </div>
          )}
          <div className="flex flex-col items-end gap-1">
            <p className="flex items-center gap-3 font-heading text-xs font-semibold text-white/80">
              {pad(index + 1)}
              <span aria-hidden className="h-px w-12 bg-white/40" />
              {pad(options.length)}
            </p>
            <PhotoCredit photo={photo} />
          </div>
        </div>
      </div>
    </section>
  );
}
