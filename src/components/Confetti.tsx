"use client";

import { useEffect, useState } from "react";

const GLYPHS = ["✈", "★", "●", "✦", "▲"];
const COLORS = ["#ffc53d", "#4fc3a1", "#e58a9a", "#4a6fb0", "#f4f7fa"];

// One celebratory burst on mount; renders nothing on the server or for reduced-motion users.
export function Confetti() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = setTimeout(() => setShow(true), 250);
    const stop = setTimeout(() => setShow(false), 2400);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, []);

  if (!show) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center">
      {Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const distance = 140 + ((i * 53) % 220);
        const style = {
          "--dx": `${Math.cos(angle) * distance}px`,
          "--dy": `${Math.sin(angle) * distance + 180}px`,
          "--rot": `${(i * 97) % 540}deg`,
          color: COLORS[i % COLORS.length],
          animation: `confetti ${1400 + (i % 5) * 150}ms cubic-bezier(0.1, 0.7, 0.3, 1) forwards`,
          animationDelay: `${(i % 6) * 25}ms`,
        } as React.CSSProperties;
        return (
          <span key={i} className="absolute text-lg" style={style}>
            {GLYPHS[i % GLYPHS.length]}
          </span>
        );
      })}
    </div>
  );
}
