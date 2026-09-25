export function DecisionRule({ threshold }: { threshold: number }) {
  return (
    <section className="rounded-2xl border border-dashed border-line p-4 text-sm">
      <h2 className="font-heading text-base font-semibold">How the group decides</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Hard limits come first: if a date, budget or hard no rules an option out for anyone, it&apos;s out.</li>
        <li>
          Among what&apos;s left, trips nobody would hate beat trips most people love; anything leaving someone below{" "}
          {threshold.toFixed(2)} fit is flagged.
        </li>
        <li>Anyone who hasn&apos;t answered by the deadline counts as flexible.</li>
        <li>Everyone ticks which of the top 3 they&apos;re in for; then it locks. Only a veto with a reason reopens it.</li>
      </ul>
    </section>
  );
}
