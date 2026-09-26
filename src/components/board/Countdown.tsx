"use client";

import { useEffect, useState } from "react";

function remaining(until: string): string {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "GATE CLOSED";
  const minutes = Math.floor(ms / 60000);
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return `GATE CLOSES ${d > 0 ? `${d}D ` : ""}${String(h).padStart(2, "0")}H ${String(m).padStart(2, "0")}M`;
}

export function Countdown({ until, className = "" }: { until: string; className?: string }) {
  // Rendered after mount only, so server and client HTML always match.
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setLabel(remaining(until));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [until]);
  return <span className={className}>{label ?? " "}</span>;
}
