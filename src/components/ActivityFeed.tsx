import type { ActivityRow } from "@/server/trips";
import { formatDateTime } from "@/lib/format";

export function ActivityFeed({ items, limit = 12 }: { items: ActivityRow[]; limit?: number }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-heading text-lg font-semibold">What changed</h2>
      <ol className="space-y-2">
        {items.slice(0, limit).map((item) => (
          <li key={item.id} className="rounded-xl border border-line bg-card px-3 py-2 text-sm">
            <p className={item.kind === "veto" ? "font-medium text-veto" : undefined}>{item.message}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
