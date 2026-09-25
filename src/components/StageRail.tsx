export const TRIP_STAGES = ["Answers", "Results", "Commit", "Decided"] as const;

const STATE_INDEX = { OPEN: 0, SCORED: 1, COMMIT: 2, LOCKED: 3 } as const;

export function stageIndex(state: keyof typeof STATE_INDEX): number {
  return STATE_INDEX[state];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function StageRail({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <nav aria-label="Progress" className="lg:sticky lg:top-8 lg:self-start">
      {/* Phone and tablet: horizontal stepper. */}
      <ol className="mb-6 flex items-center gap-2 lg:hidden">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span className={`h-1 rounded-full ${i <= current ? "bg-brand" : "bg-line"}`} />
            <span className={`text-[0.7rem] ${i === current ? "font-semibold text-ink" : "text-muted-foreground"}`}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {/* Laptop: vertical rail. */}
      <div className="hidden flex-col items-center gap-0 lg:flex">
        <ol className="relative flex flex-col items-center gap-10 py-2">
          <span aria-hidden className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-line" />
          {steps.map((label, i) => (
            <li key={label} className="relative flex flex-col items-center" title={label}>
              <span
                aria-current={i === current ? "step" : undefined}
                className={`flex items-center justify-center rounded-full font-heading text-[0.65rem] font-semibold transition ${
                  i === current
                    ? "size-8 bg-ink text-paper ring-4 ring-brand/40"
                    : i < current
                      ? "size-3 bg-brand"
                      : "size-3 bg-line"
                }`}
              >
                {i === current ? i + 1 : ""}
              </span>
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 font-heading text-[0.7rem] font-semibold tracking-widest text-muted-foreground [writing-mode:vertical-rl]">
          {pad(current + 1)}/{pad(steps.length)} · {steps[current]}
        </p>
      </div>
    </nav>
  );
}
