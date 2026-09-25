import Image from "next/image";
import { HERO_PHOTO, PHOTOS } from "@/lib/photos";
import type { PublicOption } from "@/server/ranking";
import { Avatar } from "../Avatar";
import { OptionCard } from "./OptionCard";
import { STANCE_TONE } from "./stance";

export function ResultsBoard({
  options,
  robustness,
  lockedOptionKey,
}: {
  options: PublicOption[];
  robustness: string[];
  lockedOptionKey: string | null;
}) {
  const people = options[0]?.cells ?? [];

  return (
    <>
      {/* Phone: one card per option, swipe between them. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:hidden">
        {options.map((option, i) => (
          <div key={option.optionKey} className="w-[calc(100vw-3rem)] max-w-full shrink-0 snap-center">
            <OptionCard
              option={option}
              rank={i + 1}
              robustness={i === 0 ? robustness : undefined}
              locked={option.optionKey === lockedOptionKey}
            />
          </div>
        ))}
      </div>
      {options.length > 1 && <p className="text-center text-xs text-muted-foreground sm:hidden">Swipe to compare ›</p>}

      {/* Laptop: people as rows, options as columns. */}
      <div className="hidden overflow-hidden rounded-3xl border border-line bg-card sm:block">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-line align-top">
              <th className="w-40 p-3 text-left font-medium text-muted-foreground">Person</th>
              {options.map((option, i) => (
                <th
                  key={option.optionKey}
                  className={`p-3 text-left ${option.optionKey === lockedOptionKey ? "bg-raised" : ""}`}
                >
                  <span className="relative mb-3 block h-20 overflow-hidden rounded-xl">
                    <Image
                      src={(PHOTOS[option.destinationId] ?? HERO_PHOTO).src}
                      alt=""
                      fill
                      sizes="320px"
                      className="object-cover"
                    />
                  </span>
                  <p className="text-xs text-muted-foreground">#{i + 1}{option.optionKey === lockedOptionKey ? " · ✔ Decided" : ""}</p>
                  <p className="font-heading text-lg font-bold uppercase">{option.destinationName}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {option.windowLabel} · {option.windowDates}
                  </p>
                  <p className="mt-1 text-xs font-normal">
                    Group {option.meanScore.toFixed(2)} · no one below {option.minScore.toFixed(2)}
                  </p>
                  {option.miserable && <p className="text-xs font-semibold text-veto">▼ Below fairness floor</p>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((person, row) => (
              <tr key={person.participantId} className="border-b border-line last:border-0">
                <td className="p-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Avatar name={person.displayName} index={row} />
                    {person.displayName}
                  </span>
                </td>
                {options.map((option) => {
                  const cell = option.cells[row];
                  return (
                    <td key={option.optionKey} className="p-3 align-top">
                      <span className={STANCE_TONE[cell.stance]}>
                        <span aria-hidden className="mr-1 font-semibold">
                          {cell.icon}
                        </span>
                        {cell.label}
                      </span>
                      {cell.reason && <span className="mt-0.5 block text-xs text-muted-foreground">{cell.reason}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {robustness.length > 0 && (
          <ul className="space-y-1 border-t border-line p-3 text-xs text-muted-foreground">
            {robustness.map((line) => (
              <li key={line}>
                {line.startsWith("Stays") ? "✔ " : "⚠ "}#1: {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
