"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PHOTOS } from "@/lib/photos";
import { SplitFlap } from "./board/SplitFlap";
import { BoardingPass } from "./pass/BoardingPass";
import { btn } from "./styles";

const SLIDES = [
  { id: "udaipur", place: "Udaipur", region: "Rajasthan", code: "UDA", line: "Palaces on the lake" },
  { id: "goa", place: "Goa", region: "Konkan coast", code: "GOA", line: "Beach huts & long nights" },
  { id: "munnar", place: "Munnar", region: "Kerala", code: "MUN", line: "Tea hills in the clouds" },
  { id: "manali", place: "Manali", region: "Himachal", code: "MAN", line: "Snow peaks at the window" },
  { id: "hampi", place: "Hampi", region: "Karnataka", code: "HAM", line: "Ruins at golden hour" },
  { id: "varkala", place: "Varkala", region: "Kerala", code: "VAR", line: "Cliffs over the sea" },
  { id: "rishikesh", place: "Rishikesh", region: "Uttarakhand", code: "RIS", line: "Rapids & river temples" },
];

const SLIDE_MS = 3200;
const PROOF = ["3-minute check-in", "Budgets stay private", "Everyone gets a say"];

export function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Always autoplays; picking a destination restarts the timer from there.
  useEffect(() => {
    const timer = setTimeout(() => setActive((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [active]);

  const slide = SLIDES[active];
  const upNext = [1, 2, 3].map((n) => SLIDES[(active + n) % SLIDES.length]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Destinations"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 10, y: ((e.clientY - r.top) / r.height - 0.5) * -8 });
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative isolate overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-black/40"
    >
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          aria-hidden={i !== active}
          className={`absolute inset-0 -z-20 transition-opacity duration-[900ms] ease-out ${i === active ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            src={PHOTOS[s.id].src}
            alt={i === active ? PHOTOS[s.id].alt : ""}
            fill
            priority={i === 0}
            // Every slide loads up front, so a cross-fade never lands on a blank frame.
            loading={i === 0 ? undefined : "eager"}
            sizes="(min-width: 1152px) 1088px, 100vw"
            className={`object-cover ${i === active ? "ken-burns" : ""}`}
          />
        </div>
      ))}
      <div aria-hidden className="photo-scrim absolute inset-0 -z-10" />

      {/* Story-style progress: one bar per destination, the active one filling. */}
      <div className="absolute inset-x-6 top-5 flex gap-1.5 sm:inset-x-12">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Show ${s.place}`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <span
              key={i === active ? `on-${active}` : "off"}
              className="block h-full origin-left rounded-full bg-amber"
              style={
                i === active
                  ? { animation: `progress ${SLIDE_MS}ms linear both` }
                  : { transform: `scaleX(${i < active ? 1 : 0})` }
              }
            />
          </button>
        ))}
      </div>

      <div className="grid min-h-[620px] items-end gap-10 p-6 pt-14 sm:p-12 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rise flex flex-wrap items-center gap-3">
            <span className="font-ticket text-[0.65rem] tracking-[0.2em] text-white/70 uppercase">Now departing</span>
            <SplitFlap text={slide.place} length={9} className="text-base sm:text-lg" />
          </div>
          <h1 className="rise font-heading text-[clamp(3.2rem,6.4vw,5.4rem)] leading-[0.95] font-extrabold tracking-tight [animation-delay:60ms] lg:whitespace-nowrap">
            <span className="block lg:inline">Trip </span>
            <span className="together block lg:inline">Together</span>
          </h1>
          <p className="rise font-heading text-xl font-semibold text-white sm:text-2xl [animation-delay:100ms]">
            One link. One trip. Everyone on board.
          </p>
          <p className="rise max-w-lg text-lg leading-relaxed text-white/80 [animation-delay:140ms]">
            Because the best trips are the ones you actually take together. Friends check in in three minutes — we find
            the trip that works for everyone.
          </p>
          <div className="rise flex flex-wrap items-center gap-x-6 gap-y-4 [animation-delay:180ms]">
            <a href="#create" className={btn.primary}>
              Start boarding <span aria-hidden>→</span>
            </a>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["R", "A", "K", "S", "P"].map((initial, i) => (
                  <span
                    key={initial}
                    className="flex size-8 items-center justify-center rounded-full border-2 border-[#0e1a24] text-xs font-bold text-[#0e1a24]"
                    style={{ background: ["#f3d9c9", "#cfe6e3", "#e6d6e2", "#efe1bf", "#d9dfe8"][i] }}
                  >
                    {initial}
                  </span>
                ))}
              </div>
              <span className="text-sm text-white/80">5 friends · 1 trip</span>
            </div>
          </div>
          <div className="rise [animation-delay:220ms]">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
              {PROOF.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span aria-hidden className="text-amber">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-5">
            <p aria-live="polite" className="text-sm text-white/80">
              <span key={slide.id} className="pop-in inline-block">
                <strong className="font-heading text-white">{slide.place}</strong>
                <span className="text-white/60"> · {slide.region} — </span>
                {slide.line}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <span className="font-ticket text-[0.6rem] tracking-[0.2em] text-white/55 uppercase">Up next</span>
              {upNext.map((s, i) => (
                <button
                  key={`${s.id}-${active}`}
                  type="button"
                  aria-label={`Show ${s.place}`}
                  onClick={() => setActive(SLIDES.indexOf(s))}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="pop-in relative size-12 overflow-hidden rounded-xl ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:ring-amber"
                >
                  <Image src={PHOTOS[s.id].src} alt="" fill loading="eager" sizes="48px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="rise hidden [animation-delay:260ms] lg:block"
          style={{ perspective: "900px" }}
        >
          <div
            className="transition-transform duration-300 ease-out"
            style={{ transform: `rotate(2deg) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` }}
          >
            <BoardingPass
              data={{
                tripName: "Goa? Hills? Help.",
                passenger: "You",
                from: "BLR",
                to: slide.code,
                dates: [
                  { label: "Diwali", answer: "yes" },
                  { label: "Christmas", answer: "maybe" },
                ],
                budgetClass: { label: "COMFORT", marks: "₹₹" },
                noFly: ["Night buses"],
                live: true,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
