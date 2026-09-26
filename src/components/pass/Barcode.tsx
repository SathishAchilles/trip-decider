// Decorative barcode derived from the pass contents, so it changes as answers change.
export function Barcode({ seed, className = "" }: { seed: string; className?: string }) {
  let h = 2166136261;
  const bars: number[] = [];
  for (let i = 0; i < 44; i++) {
    h ^= seed.charCodeAt(i % Math.max(1, seed.length)) + i;
    h = Math.imul(h, 16777619) >>> 0;
    bars.push((h % 3) + 1);
  }
  let x = 0;
  return (
    <svg aria-hidden viewBox="0 0 132 40" preserveAspectRatio="none" className={className}>
      {bars.map((w, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={x} y="0" width={w} height="40" fill="currentColor" /> : null;
        x += w;
        return rect;
      })}
    </svg>
  );
}
