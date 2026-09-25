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
      className={`flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 ${locked ? "border-primary ring-2 ring-primary/30" : "border-line"}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">#{rank}</p>
          <h3 className="font-heading text-2xl font-semibold leading-tight">{option.destinationName}</h3>
          <p className="text-sm text-muted-foreground">{option.vibes.join(" · ")}</p>
        </div>
        <span className="stamp shrink-0 text-center">
          {option.windowLabel}
          <br />
          {option.windowDates}
        </span>
      </header>

      <p className="text-sm">
        Group <strong>{option.meanScore.toFixed(2)}</strong> · no one below <strong>{option.minScore.toFixed(2)}</strong>
      </p>
      {option.miserable && (
        <p className="rounded-lg border border-veto/40 px-2 py-1 text-xs font-semibold text-veto">
          ▼ Below the fairness floor for someone
        </p>
      )}
      {locked && <p className="text-sm font-semibold text-primary">✔ Decided</p>}

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
    </article>
  );
}
