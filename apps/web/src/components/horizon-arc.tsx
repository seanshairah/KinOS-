"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HorizonArc — the boundary between night and day drawn as what it
 * really is in this world: an orbit. A gently curved horizon separates
 * the two skies; a fine glowing arc marks the edge, and a few small
 * lights travel slowly along it — satellites riding the line between
 * one part of the family's day and the next. The colours above and
 * below are exactly the sections they touch, so the page stays one
 * continuous canvas with one beautiful, visible seam.
 */

type Variant = "dawn" | "nightfall";

const NIGHT = "#2C2A4F";
const DAY = "#FBF8F3";

const SKY: Record<Variant, { gradient: string; fill: string; captionColor: string }> = {
  // the story's night opening into warm morning paper
  dawn: {
    gradient: `linear-gradient(180deg, ${NIGHT} 0%, #3A3765 36%, #5D5786 64%, #8F8299 84%, #B4A6A6 100%)`,
    fill: DAY,
    captionColor: "rgba(255,255,255,.72)",
  },
  // daylight settling back into the closing dusk
  nightfall: {
    gradient: `linear-gradient(180deg, ${DAY} 0%, #D2C6B4 30%, #8F81A0 64%, #4A4677 100%)`,
    fill: NIGHT,
    captionColor: "rgba(255,255,255,.72)",
  },
};

/* The travellers: offset along the arc, pace (crossings per second),
   size, and light. Slow, uneven, calm. */
const ORBS = [
  { offset: 0.16, speed: 0.012, r: 4, color: "#EDEBF6", glow: 0.5 },
  { offset: 0.52, speed: -0.008, r: 3, color: "#A9A7E0", glow: 0.45 },
  { offset: 0.82, speed: 0.0095, r: 3.4, color: "#D9A05B", glow: 0.35 },
] as const;

/**
 * The horizon line is organic, not geometric: two gentle sine waves of
 * different frequencies laid over a soft crest, so no two stretches of
 * the curve repeat. Deterministic phases keep it stable across renders;
 * each variant gets its own character.
 */
function wavePath(phase: number): string {
  const points: string[] = [];
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const x = -20 + (1480 * i) / N;
    const t = i / N;
    const crest = 42 * Math.sin(Math.PI * t); // the broad lift of a horizon
    const wave1 = 16 * Math.sin(t * Math.PI * 2 * 1.7 + phase);
    const wave2 = 9 * Math.sin(t * Math.PI * 2 * 3.3 + phase * 2.1 + 1.2);
    const y = 150 - crest - wave1 - wave2;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

const ARCS: Record<Variant, string> = {
  dawn: wavePath(0.7),
  nightfall: wavePath(2.3),
};

export function HorizonArc({ variant, caption }: { variant: Variant; caption?: string }) {
  const sky = SKY[variant];
  const arc = ARCS[variant];
  const pathRef = useRef<SVGPathElement>(null);
  const orbRefs = useRef<(SVGCircleElement | null)[]>([]);
  const glowRefs = useRef<(SVGCircleElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();

    const place = (i: number, frac: number, twinkle = 1) => {
      const p = path.getPointAtLength(((frac % 1) + 1) % 1 * total);
      const orb = orbRefs.current[i];
      const glow = glowRefs.current[i];
      if (orb) {
        orb.setAttribute("cx", String(p.x));
        orb.setAttribute("cy", String(p.y));
        orb.setAttribute("opacity", String(0.9 * twinkle));
      }
      if (glow) {
        glow.setAttribute("cx", String(p.x));
        glow.setAttribute("cy", String(p.y));
        glow.setAttribute("opacity", String(ORBS[i]!.glow * twinkle));
      }
    };

    if (reduced) {
      ORBS.forEach((o, i) => place(i, o.offset));
      return;
    }

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    if (rootRef.current) io.observe(rootRef.current);

    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      if (visible) {
        const secs = (t - start) / 1000;
        ORBS.forEach((o, i) => {
          const twinkle = 0.72 + 0.28 * Math.sin(secs * 0.9 + i * 2.4);
          place(i, o.offset + o.speed * secs, twinkle);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reduced]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="relative h-72 w-full overflow-hidden md:h-96"
      style={{ background: sky.gradient }}
    >
      {/* a breath of warmth where the skies meet */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(46% 34% at 50% ${variant === "nightfall" ? "72%" : "58%"}, rgba(217,138,61,.10), transparent 70%)`,
        }}
      />

      <svg
        className="absolute inset-x-0 bottom-0 h-[64%] w-full"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`arc-line-${variant}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#A9A7E0" stopOpacity=".15" />
            <stop offset=".32" stopColor="#A9A7E0" stopOpacity=".7" />
            <stop offset=".5" stopColor="#EDEBF6" stopOpacity=".9" />
            <stop offset=".68" stopColor="#D9A05B" stopOpacity=".6" />
            <stop offset="1" stopColor="#D9A05B" stopOpacity=".12" />
          </linearGradient>
          <filter id={`arc-soften-${variant}`} x="-20%" y="-120%" width="140%" height="340%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* the next part of the day, rising to meet you */}
        <path d={`${arc} L 1460 240 L -20 240 Z`} fill={sky.fill} />

        {/* the orbit's soft light, then its fine visible line */}
        <path
          d={arc}
          fill="none"
          stroke={`url(#arc-line-${variant})`}
          strokeWidth="9"
          opacity=".28"
          filter={`url(#arc-soften-${variant})`}
        />
        <path
          ref={pathRef}
          d={arc}
          fill="none"
          stroke={`url(#arc-line-${variant})`}
          strokeWidth="1.3"
          opacity=".85"
        />

        {/* the travellers */}
        {ORBS.map((o, i) => (
          <g key={i}>
            <circle
              ref={(el) => {
                glowRefs.current[i] = el;
              }}
              r={o.r * 3.4}
              fill={o.color}
              opacity="0"
              filter={`url(#arc-soften-${variant})`}
            />
            <circle
              ref={(el) => {
                orbRefs.current[i] = el;
              }}
              r={o.r}
              fill={o.color}
              opacity="0"
            />
          </g>
        ))}
      </svg>

      {caption && (
        <p
          className="absolute inset-x-0 top-[22%] text-center font-mono text-[11.5px] uppercase tracking-[0.22em]"
          style={{ color: sky.captionColor }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}
