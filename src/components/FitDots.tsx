export function FitDots({ value, label }: { value: number; label?: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(value * 5)));
  return (
    <span className="inline-flex items-center gap-1" aria-label={label ?? `Group fit ${filled} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden className={`size-1.5 rounded-full ${i < filled ? "bg-white" : "bg-white/35"}`} />
      ))}
    </span>
  );
}
