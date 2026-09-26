import { SplitFlap } from "./SplitFlap";
import { Countdown } from "./Countdown";

export type BoardRow = {
  name: string;
  from: string;
  persona: string;
  status: "CHECKED IN" | "BOARDING" | "AWAITED" | "FLEXIBLE";
  isYou?: boolean;
};

const STATUS_TONE: Record<BoardRow["status"], string> = {
  "CHECKED IN": "text-[#6ee7a8]",
  BOARDING: "text-amber animate-pulse",
  AWAITED: "text-white/45",
  FLEXIBLE: "text-white/45",
};

export function DepartureBoard({
  title,
  rows,
  closesAt,
  compact = false,
}: {
  title: string;
  rows: BoardRow[];
  closesAt?: string;
  // Name and status only, for narrow side panels.
  compact?: boolean;
}) {
  const checkedIn = rows.filter((r) => r.status === "CHECKED IN").length;
  return (
    <section className="overflow-hidden rounded-3xl border border-black/40 bg-[var(--board-bg)] text-white shadow-2xl shadow-black/40">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
        <p className="flex items-center gap-2 font-ticket text-sm font-semibold tracking-[0.2em] text-amber uppercase">
          <span aria-hidden>✈</span> Departures · {title}
        </p>
        <p className="font-ticket text-xs text-white/70">
          {checkedIn}/{rows.length} CHECKED IN
          {closesAt && (
            <>
              {" · "}
              <Countdown until={closesAt} />
            </>
          )}
        </p>
      </header>
      <div className="overflow-x-auto px-3 py-3 sm:px-5">
        <table className={`w-full font-ticket text-sm sm:text-base ${compact ? "" : "min-w-[520px]"}`}>
          <thead>
            <tr className="text-left font-ticket text-[0.65rem] tracking-widest text-white/45">
              <th className="pb-2 font-normal">PASSENGER</th>
              {!compact && <th className="pb-2 font-normal">FROM</th>}
              {!compact && <th className="pb-2 font-normal">PERSONA</th>}
              <th className="pb-2 font-normal">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.name} className={row.isYou ? "bg-white/5" : undefined}>
                <td className="py-1 pr-3">
                  <SplitFlap text={row.name} length={compact ? 8 : 9} delay={i * 120} />
                </td>
                {!compact && (
                  <td className="py-1 pr-3">
                    <SplitFlap text={row.from} length={3} delay={i * 120 + 60} />
                  </td>
                )}
                {!compact && (
                  <td className="py-1 pr-3 font-ticket text-xs tracking-wide text-white/80 uppercase">{row.persona || "—"}</td>
                )}
                <td className={`py-1 font-ticket text-xs font-semibold tracking-widest whitespace-nowrap ${STATUS_TONE[row.status]}`}>
                  {row.status === "BOARDING" ? "▒ BOARDING…" : row.status}
                  {row.isYou && <span className="ml-2 text-white/50">(YOU)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
