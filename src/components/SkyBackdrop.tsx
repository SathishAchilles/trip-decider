// Fixed, decorative night sky: dusk glows, faint stars and dashed flight routes with one slow plane.
const ROUTES = [
  "M -80 720 Q 420 360 980 520 T 1560 260",
  "M -60 180 Q 520 40 900 240 T 1520 120",
  "M 120 980 Q 640 620 1160 820 T 1600 640",
];

// Deterministic star field so server and client render identically.
const STARS = Array.from({ length: 70 }, (_, i) => {
  const x = (i * 197) % 1440;
  const y = (i * 131 + (i % 7) * 53) % 900;
  const r = i % 9 === 0 ? 1.4 : i % 3 === 0 ? 1 : 0.7;
  return { x, y, r, o: 0.18 + ((i * 37) % 50) / 100 };
});

export function SkyBackdrop() {
  return (
    <div aria-hidden className="sky pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full text-ink">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="currentColor" opacity={s.o * 0.5} />
        ))}
        {ROUTES.map((d, i) => (
          <path key={d} id={`route-${i}`} d={d} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.2" strokeDasharray="2 10" strokeLinecap="round" />
        ))}
        <g className="motion-reduce:hidden">
          {ROUTES.map((d, i) => (
            <circle key={`pin-${i}`} r="3" fill="var(--board-amber)" opacity="0.35">
              <animateMotion dur={`${60 + i * 25}s`} repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" />
            </circle>
          ))}
        </g>
        <g className="motion-reduce:hidden" opacity="0.5">
          <text fontSize="16" fill="var(--board-amber)" dominantBaseline="middle" textAnchor="middle">
            ✈
            <animateMotion dur="90s" repeatCount="indefinite" rotate="auto" path={ROUTES[0]} />
          </text>
        </g>
      </svg>
    </div>
  );
}
