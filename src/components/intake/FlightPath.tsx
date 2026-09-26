export const STAGES = ["Dream it", "Find your way", "Pack it", "Take off"] as const;

export function FlightPath({ progress, stage }: { progress: number; stage: number }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="space-y-2" aria-label={`Step ${stage + 1} of ${STAGES.length}: ${STAGES[stage]}`}>
      <div className="relative h-8">
        <svg aria-hidden viewBox="0 0 100 10" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d="M1 8 Q 50 -4 99 8" fill="none" stroke="var(--line)" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
        </svg>
        <span
          aria-hidden
          className="absolute top-0 -translate-x-1/2 text-xl text-amber transition-[left] duration-500 ease-out"
          style={{ left: `${Math.min(97, Math.max(3, pct))}%`, animation: "fly 2.4s ease-in-out infinite" }}
        >
          ✈
        </span>
      </div>
      <ol className="flex justify-between font-ticket text-[0.65rem] tracking-[0.18em] uppercase">
        {STAGES.map((label, i) => (
          <li key={label} className={i === stage ? "font-semibold text-amber" : i < stage ? "text-ink" : "text-muted-foreground"}>
            {i < stage ? "✓ " : ""}
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
