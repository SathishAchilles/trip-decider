"use client";

import { useEffect, useState } from "react";

const GLYPHS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·-";
const SETTLED = Number.POSITIVE_INFINITY;

function pad(text: string, length: number): string {
  return text.toUpperCase().padEnd(length, " ").slice(0, length);
}

// Letters cycle through the alphabet before settling, like an airport departure board.
export function SplitFlap({ text, length, delay = 0, className = "" }: { text: string; length: number; delay?: number; className?: string }) {
  const target = pad(text, length);
  const [frame, setFrame] = useState(SETTLED);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lastFrame = 4 + length * 1.5;
    let current = 0;
    let timer = setTimeout(function tick() {
      setFrame(current);
      current += 1;
      if (current <= lastFrame) timer = setTimeout(tick, 55);
      else setFrame(SETTLED);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, length, delay]);

  const shown = target
    .split("")
    .map((ch, i) => (frame > 4 + i * 1.5 ? ch : GLYPHS[(frame * 7 + i * 13) % GLYPHS.length]))
    .join("");

  return (
    <span className={`inline-flex ${className}`} aria-label={text}>
      {shown.split("").map((ch, i) => (
        <span key={i} aria-hidden className="flap" data-flipping={ch !== target[i]}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
