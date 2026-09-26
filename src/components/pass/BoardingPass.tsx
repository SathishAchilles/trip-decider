import type { AvailabilityAnswer } from "@/lib/types";
import { Barcode } from "./Barcode";

export type PassData = {
  tripName: string;
  passenger: string;
  from: string;
  to: string;
  dates: { label: string; answer?: AvailabilityAnswer }[];
  budgetClass?: { label: string; marks: string } | null;
  noFly: string[];
  persona?: { emoji: string; title: string; line: string } | null;
  personaPending?: boolean;
  stamped?: boolean;
  animateStamp?: boolean;
  // Live form: briefly highlight each value as it changes.
  live?: boolean;
};

const DATE_CHIP: Record<AvailabilityAnswer | "none", { mark: string; className: string }> = {
  yes: { mark: "✓", className: "bg-[#1f8a6c]/12 text-[#1f6e57]" },
  maybe: { mark: "~", className: "bg-[#a86a0c]/12 text-[#8a5608]" },
  no: { mark: "✕", className: "bg-pass-ink/5 text-pass-ink/40 line-through" },
  none: { mark: "·", className: "border border-dashed border-pass-ink/25 text-pass-ink/45" },
};

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-ticket text-[0.62rem] tracking-[0.16em] text-pass-ink/50 uppercase">{children}</p>;
}

function Chip({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

export function BoardingPass({ data }: { data: PassData }) {
  // In the live form, re-keyed values replay a highlight whenever they change.
  const flash = data.live ? "flash" : "";
  const seed = [data.passenger, data.from, data.noFly.join(), data.dates.map((d) => d.answer).join()].join("|");
  return (
    <article
      aria-label={`Boarding pass for ${data.passenger}`}
      className="@container relative overflow-hidden rounded-3xl bg-pass text-pass-ink shadow-2xl shadow-black/40"
    >
      <header className="flex items-center justify-between gap-3 bg-brand px-6 py-3 text-white">
        <p className="font-ticket text-[0.65rem] font-semibold tracking-[0.22em] uppercase">Boarding pass</p>
        <p className="truncate font-heading text-sm font-semibold">{data.tripName}</p>
      </header>

      <div className="flex flex-col @lg:flex-row">
        <div className="flex-1 space-y-5 p-6">
          <div>
            <Label>Passenger</Label>
            <p className="mt-1 font-heading text-2xl font-bold">{data.passenger}</p>
          </div>

          <div>
            <Label>Departures</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.dates.map((d) => {
                const chip = DATE_CHIP[d.answer ?? "none"];
                return (
                  <Chip key={`${d.label}-${d.answer}`} className={`${chip.className} ${data.live && d.answer ? "pop-in" : ""}`}>
                    <span aria-hidden>{chip.mark}</span>
                    {d.label}
                  </Chip>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Class</Label>
              <p key={data.budgetClass?.label ?? "-"} className={`mt-1 font-heading text-base font-semibold whitespace-nowrap ${flash}`}>
                {data.budgetClass ? (
                  <>
                    {data.budgetClass.label.charAt(0) + data.budgetClass.label.slice(1).toLowerCase()}{" "}
                    <span className="text-stamp">{data.budgetClass.marks}</span>
                  </>
                ) : (
                  <span className="text-pass-ink/40">—</span>
                )}
              </p>
            </div>
            <div>
              <Label>No-fly</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {data.noFly.length ? (
                  data.noFly.map((n) => (
                    <Chip key={n} className={`bg-stamp/10 text-stamp ${data.live ? "pop-in" : ""}`}>
                      {n}
                    </Chip>
                  ))
                ) : (
                  <span className="text-sm text-pass-ink/45">None</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label>Travel persona</Label>
            {data.persona ? (
              <div className="mt-1">
                <p className="font-heading text-base font-semibold">
                  {data.persona.emoji} {data.persona.title}
                </p>
                <p className="text-sm text-pass-ink/65">{data.persona.line}</p>
              </div>
            ) : data.personaPending ? (
              <p className="mt-1 animate-pulse text-sm font-medium text-brand">✨ Reading your answers…</p>
            ) : (
              <p className="mt-1 text-sm text-pass-ink/45">🔒 Revealed at check-in</p>
            )}
          </div>
        </div>

        <div aria-hidden className="perforation h-3 w-full bg-repeat-x @lg:h-auto @lg:w-3 @lg:bg-repeat-y" />

        <div className="flex items-center justify-between gap-4 p-6 @lg:w-40 @lg:flex-col @lg:items-start @lg:justify-between">
          <div className="flex items-end gap-4 @lg:flex-col @lg:items-start @lg:gap-1">
            <div>
              <Label>From</Label>
              <p key={data.from} className={`mt-1 font-heading text-3xl leading-none font-bold ${flash}`}>
                {data.from}
              </p>
            </div>
            <p aria-hidden className="pb-1 text-stamp @lg:py-1">
              ✈
            </p>
            <div>
              <Label>To</Label>
              <p key={data.to} className={`mt-1 font-heading text-3xl leading-none font-bold ${flash}`}>
                {data.to}
              </p>
            </div>
          </div>
          <Barcode seed={seed} className="h-12 w-24 text-pass-ink @lg:w-full" />
        </div>
      </div>

      {data.stamped && (
        <div
          aria-label="Checked in"
          className={`pointer-events-none absolute right-5 bottom-5 flex size-24 -rotate-12 flex-col items-center justify-center rounded-full border-4 border-double border-stamp bg-pass/60 text-center font-heading text-sm leading-tight font-extrabold tracking-wide text-stamp uppercase opacity-90 @lg:top-40 @lg:right-7 @lg:bottom-auto ${
            data.animateStamp ? "stamp-in" : ""
          }`}
        >
          Checked
          <br />
          in ✈
        </div>
      )}
    </article>
  );
}
