import Image from "next/image";
import { HERO_PHOTO, PHOTOS } from "@/lib/photos";
import type { PublicOption } from "@/server/ranking";
import { Avatar } from "../Avatar";
import { STANCE_TONE } from "./stance";

export function OptionCard({
  option,
  rank,
  robustness,
  locked,
}: {
  option: PublicOption;
  rank: number;
  robustness?: string[];
  locked?: boolean;
}) {
  return (
    <article
      className={`flex h-full flex-col gap-3 overflow-hidden rounded-3xl border bg-card ${locked ? "border-brand ring-2 ring-brand/40" : "border-line"}`}
    >
      <header className="relative h-28 text-white">
        <Image
          src={(PHOTOS[option.destinationId] ?? HERO_PHOTO).src}
          alt=""
          fill
          sizes="(min-width: 640px) 400px, 100vw"
          className="object-cover"
        />
        <div aria-hidden className="photo-scrim absolute inset-0" />
        <div className="relative flex h-full items-end justify-between gap-3 p-4">
          <div>
            <p className="text-[0.7rem] font-semibold tracking-widest text-white/75 uppercase">#{rank}</p>
            <h3 className="font-heading text-2xl font-extrabold uppercase leading-none">{option.destinationName}</h3>
          </div>
          <p className="text-right text-xs text-white/85">
            {option.windowLabel}
            <br />
            {option.windowDates}
          </p>
        </div>
      </header>
      <div className="flex flex-col gap-3 px-4 pb-4">
      <p className="text-sm text-muted-foreground">{option.vibes.join(" · ")}</p>

      <p className="text-sm">
        Group <strong>{option.meanScore.toFixed(2)}</strong> · no one below <strong>{option.minScore.toFixed(2)}</strong>
      </p>
      {option.miserable && (
        <p className="rounded-lg border border-veto/40 px-2 py-1 text-xs font-semibold text-veto">
          ▼ Below the fairness floor for someone
        </p>
      )}
      {locked && <p className="text-sm font-semibold text-brand">✔ Decided</p>}

      <ul className="divide-y divide-line">
        {option.cells.map((cell, index) => (
          <li key={cell.participantId} className="flex items-center gap-3 py-2">
            <Avatar name={cell.displayName} index={index} />
            <span className="w-24 shrink-0 truncate font-medium">{cell.displayName}</span>
            <span className="min-w-0 text-sm">
              <span className={STANCE_TONE[cell.stance]}>
                <span aria-hidden className="mr-1 font-semibold">
                  {cell.icon}
                </span>
                {cell.label}
              </span>
              {cell.reason && <span className="block text-xs text-muted-foreground">{cell.reason}</span>}
            </span>
          </li>
        ))}
      </ul>

      {robustness && robustness.length > 0 && (
        <ul className="mt-auto space-y-1 border-t border-line pt-2 text-xs text-muted-foreground">
          {robustness.map((line) => (
            <li key={line}>{line.startsWith("Stays") ? "✔ " : "⚠ "}{line}</li>
          ))}
        </ul>
      )}
      </div>
    </article>
  );
}
