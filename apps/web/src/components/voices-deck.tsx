"use client";

import { useEffect, useRef, useState } from "react";
import { OrbitMark } from "@kinos/ui";

/**
 * VoicesDeck — a hand of family stories, stacked and tilted like photos
 * on a kitchen table. The deck slowly deals itself (top card slides to
 * the back every few seconds); hovering rests it, a click deals the next.
 * Reduced motion — and no JS — reads as a calm static fan.
 */

const VOICES = [
  {
    quote:
      "For the first time in three years, I went a whole day without texting “did Mum eat?” — because I already knew.",
    name: "Tari",
    role: "daughter · London, six time zones away",
    accent: "var(--halo)",
  },
  {
    quote:
      "I used to be the family's memory. Every appointment, every tablet, every receipt — in my head. Now it's in ours.",
    name: "Sarah",
    role: "sister · the one holding it down at home",
    accent: "var(--calm)",
  },
  {
    quote:
      "It doesn't feel like being monitored. It feels like being held. One tap, and everyone who loves me relaxes.",
    name: "Gogo",
    role: "the centre of the orbit · Harare",
    accent: "var(--ember)",
  },
  {
    quote:
      "The evening brief reads like a letter from home. Thirty seconds, and I know exactly what tomorrow needs from me.",
    name: "Kuda",
    role: "son · Cape Town",
    accent: "var(--dusk-3)",
  },
  {
    quote:
      "When the clinic asked when the dizziness started, we didn't guess. We looked. It was all there, in our own words.",
    name: "Grace",
    role: "carer · four families, one calm phone",
    accent: "var(--calm)",
  },
] as const;

const N = VOICES.length;

export function VoicesDeck() {
  const [top, setTop] = useState(0);
  const [reduced, setReduced] = useState(false);
  const restRef = useRef(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      if (!restRef.current) setTop((t) => (t + 1) % N);
    }, 4600);
    return () => clearInterval(id);
  }, [reduced]);

  if (reduced) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {VOICES.map((v) => (
          <figure
            key={v.name}
            className="rounded-[20px] border border-line-2 bg-paper-3 p-6 shadow-card"
          >
            <blockquote className="font-serif text-[17px] leading-[1.55] text-ink">“{v.quote}”</blockquote>
            <figcaption className="mt-4 flex items-center gap-2.5 text-[13px] text-ink-soft">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: v.accent }} />
              <b className="font-semibold text-ink">{v.name}</b> · {v.role}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto h-[340px] max-w-[560px] cursor-pointer select-none sm:h-[300px]"
      onMouseEnter={() => (restRef.current = true)}
      onMouseLeave={() => (restRef.current = false)}
      onClick={() => setTop((t) => (t + 1) % N)}
      role="group"
      aria-label="What families say — click to read the next voice"
      aria-live="polite"
    >
      {VOICES.map((v, i) => {
        const order = (i - top + N) % N; // 0 = front of the deck
        const behind = Math.min(order, 3);
        const side = i % 2 === 0 ? 1 : -1;
        const tilt = order === 0 ? 0 : side * (2.2 + behind * 1.6);
        const shiftX = order === 0 ? 0 : side * (8 + behind * 10);
        return (
          <figure
            key={v.name}
            aria-hidden={order !== 0}
            className="absolute inset-x-0 top-0 mx-auto max-w-[520px] rounded-[22px] border border-line-2 bg-paper-3 p-7 will-change-transform"
            style={{
              zIndex: N - order,
              opacity: order > 3 ? 0 : 1 - behind * 0.16,
              transform: `translate(${shiftX}px, ${behind * 17}px) scale(${1 - behind * 0.05}) rotate(${tilt}deg)`,
              boxShadow:
                order === 0
                  ? "0 2px 4px rgba(33,29,25,.05), 0 30px 70px -30px rgba(53,51,95,.45)"
                  : "0 1px 2px rgba(33,29,25,.04), 0 10px 30px -18px rgba(33,29,25,.25)",
              transition: "transform .65s cubic-bezier(.22,1,.36,1), opacity .5s ease, box-shadow .65s ease",
            }}
          >
            <OrbitMark size={18} className="text-dusk opacity-60" />
            <blockquote className="mt-4 font-serif text-[clamp(17px,2vw,21px)] font-light leading-[1.55] text-ink">
              “{v.quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-2.5 text-[13.5px] text-ink-soft">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: v.accent }} />
              <b className="font-semibold text-ink">{v.name}</b>
              <span className="text-ink-faint">·</span> {v.role}
            </figcaption>
          </figure>
        );
      })}

      {/* deal dots */}
      <div className="absolute -bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
        {VOICES.map((v, i) => (
          <span
            key={v.name}
            aria-hidden
            className="h-[6px] w-[6px] rounded-full transition-all duration-300"
            style={{
              background: i === top ? "var(--halo)" : "rgba(169,167,224,.3)",
              transform: i === top ? "scale(1.25)" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
