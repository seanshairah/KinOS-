"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * OrbitSystem — the living Orbit, KinOS's recurring visual anchor.
 *
 * Presence first, meaning second, detail only on intent: satellites are
 * clean pulsing circles by default; a small paper tooltip reveals on
 * desktop hover or mobile tap, and story moments can force one satellite
 * to reveal (`focus`). Motion is a slow requestAnimationFrame drift that
 * pauses while a tooltip is open; reduced-motion renders a still orbit.
 */

export interface SatelliteSpec {
  id: string;
  /** which ring it rides: 0 inner · 1 middle · 2 outer */
  ring: 0 | 1 | 2;
  /** starting angle in radians */
  angle: number;
  /** radians per second — keep well under 0.1 for calm */
  speed: number;
  /** dot diameter in px */
  size: number;
  hue: "halo" | "calm" | "ember" | "ink";
  /** tooltip: first line is the name, the rest are quiet details */
  lines: readonly string[];
}

const HUES: Record<SatelliteSpec["hue"], { dot: string; glow: string }> = {
  halo: { dot: "#A9A7E0", glow: "rgba(169,167,224,.55)" },
  calm: { dot: "#4E9E7E", glow: "rgba(78,158,126,.5)" },
  ember: { dot: "#D98A3D", glow: "rgba(217,138,61,.55)" },
  ink: { dot: "#EDEBF6", glow: "rgba(237,235,246,.35)" },
};

export const FAMILY_SATELLITES: readonly SatelliteSpec[] = [
  { id: "tari", ring: 2, angle: -0.7, speed: 0.045, size: 13, hue: "halo", lines: ["Tari", "London · daughter", "Waiting for tonight's brief"] },
  { id: "sarah", ring: 1, angle: 2.2, speed: -0.06, size: 12, hue: "ink", lines: ["Sarah", "Harare · sister", "Duties up to date"] },
  { id: "grace", ring: 1, angle: 0.4, speed: -0.06, size: 11, hue: "calm", lines: ["Grace", "Caregiver", "Voice note received"] },
  { id: "money", ring: 2, angle: 1.9, speed: 0.045, size: 10, hue: "halo", lines: ["Money Pot", "USD 26.50 available", "Receipt filed 19:06"] },
  { id: "clinic", ring: 0, angle: 3.6, speed: 0.08, size: 9, hue: "ink", lines: ["Clinic", "Tomorrow · 10:00", "Transport confirmed"] },
  { id: "medication", ring: 0, angle: 1.1, speed: 0.08, size: 8, hue: "ink", lines: ["Medication", "Evening dose taken", "21:14 · her own check-in"] },
  { id: "record", ring: 2, angle: 3.9, speed: 0.045, size: 10, hue: "ink", lines: ["Family Record", "Tonight is already saved", "Searchable, years from now"] },
] as const;

export function OrbitSystem({
  size = 430,
  satellites = FAMILY_SATELLITES,
  focus = null,
  states,
  className = "",
  interactive = true,
  assemble = false,
}: {
  size?: number;
  satellites?: readonly SatelliteSpec[];
  /** story-led reveal: id of the satellite whose tooltip is open */
  focus?: string | null;
  /** story-led overrides, e.g. the transport moment turning ember */
  states?: Record<string, Partial<Pick<SatelliteSpec, "hue" | "lines">>>;
  className?: string;
  interactive?: boolean;
  /** on first mount, the family gathers: satellites drift in from the dark */
  assemble?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const holderRefs = useRef(new Map<string, HTMLDivElement>());
  const coreRef = useRef<SVGCircleElement>(null);
  const angles = useRef(new Map<string, number>());
  const pausedRef = useRef(false);
  // The orbit notices presence: pointer position in centre-relative px.
  const pointer = useRef({ x: 0, y: 0, active: false });
  const bornAt = useRef(0);

  const shown = open ?? focus;
  pausedRef.current = shown !== null;

  const radii = useMemo(() => [size * 0.19, size * 0.31, size * 0.435], [size]);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    bornAt.current = performance.now();
  }, []);

  // Position a satellite holder for a given angle (static baseline).
  const place = (el: HTMLDivElement, ring: number, angle: number) => {
    const r = radii[ring]!;
    el.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)`;
  };

  useEffect(() => {
    for (const s of satellites) {
      if (!angles.current.has(s.id)) angles.current.set(s.id, s.angle);
      const el = holderRefs.current.get(s.id);
      if (el) place(el, s.ring, angles.current.get(s.id)!);
    }
    if (reduced) return;
    const easeOut = (v: number) => 1 - Math.pow(1 - v, 3);
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      let i = 0;
      for (const s of satellites) {
        const el = holderRefs.current.get(s.id);
        if (!el) continue;
        let a = angles.current.get(s.id) ?? s.angle;
        if (!pausedRef.current) {
          a += s.speed * dt;
          angles.current.set(s.id, a);
        }
        // The gathering: radius eases in from far dark, staggered.
        const at = assemble
          ? easeOut(Math.min(Math.max((t - bornAt.current - i * 110) / 950, 0), 1))
          : 1;
        const r = radii[s.ring]! * (1.9 - 0.9 * at);
        let x = Math.cos(a - (1 - at) * 0.5) * r;
        let y = Math.sin(a - (1 - at) * 0.5) * r;
        // The orbit leans toward presence — a few px, never a chase.
        if (pointer.current.active && at >= 1) {
          const dx = pointer.current.x - x;
          const dy = pointer.current.y - y;
          const dist = Math.hypot(dx, dy) || 1;
          const pull = Math.max(0, 1 - dist / 240) * 11;
          x += (dx / dist) * pull;
          y += (dy / dist) * pull;
        }
        el.style.opacity = String(0.15 + 0.85 * at);
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        i++;
      }
      // The lamplight centre brightens as the visitor draws near.
      // (brightness, not opacity — the breathe animation owns opacity)
      if (coreRef.current) {
        const near = pointer.current.active
          ? Math.max(0, 1 - Math.hypot(pointer.current.x, pointer.current.y) / (size * 0.62))
          : 0;
        coreRef.current.style.filter = `brightness(${(1 + near * 0.9).toFixed(3)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites, reduced, size, assemble]);

  return (
    <div
      aria-hidden={!interactive}
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        pointer.current = {
          x: e.clientX - rect.left - size / 2,
          y: e.clientY - rect.top - size / 2,
          active: true,
        };
      }}
      onPointerLeave={() => {
        pointer.current.active = false;
      }}
      onMouseLeave={() => setOpen(null)}
    >
      {/* rings + lamplight centre */}
      <svg width={size} height={size} viewBox="0 0 430 430" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="orbit-core">
            <stop offset="0%" stopColor="#EDEBF6" stopOpacity=".9" />
            <stop offset="35%" stopColor="#A9A7E0" stopOpacity=".36" />
            <stop offset="100%" stopColor="#A9A7E0" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[0.19, 0.31, 0.435].map((f, i) => (
          <circle
            key={f}
            cx="215"
            cy="215"
            r={430 * f}
            fill="none"
            stroke={`rgba(169,167,224,${0.34 - i * 0.08})`}
            strokeWidth="1"
          />
        ))}
        <circle ref={coreRef} cx="215" cy="215" r="52" fill="url(#orbit-core)" className="breathe" />
        <circle cx="215" cy="215" r="26" fill="rgba(237,235,246,.16)" />
        <circle cx="215" cy="215" r="10.5" fill="#FEFCF9" />
      </svg>

      {/* the family, drifting */}
      {satellites.map((s) => {
        const state = states?.[s.id];
        const hue = HUES[state?.hue ?? s.hue];
        const lines = state?.lines ?? s.lines;
        const isOpen = shown === s.id;
        // Tooltip flips below the dot when the satellite rides the top arc.
        const a = angles.current.get(s.id) ?? s.angle;
        const below = Math.sin(a) < -0.2;
        return (
          <div
            key={s.id}
            ref={(el) => {
              if (el) {
                holderRefs.current.set(s.id, el);
                place(el, s.ring, angles.current.get(s.id) ?? s.angle);
              } else {
                holderRefs.current.delete(s.id);
              }
            }}
            className="absolute left-1/2 top-1/2"
          >
            <button
              type="button"
              tabIndex={interactive ? 0 : -1}
              aria-expanded={isOpen}
              aria-label={lines[0]}
              className="group relative grid place-items-center rounded-full p-2.5 focus-visible:outline-halo"
              onMouseEnter={() => interactive && setOpen(s.id)}
              onFocus={() => interactive && setOpen(s.id)}
              onBlur={() => setOpen(null)}
              onClick={() => interactive && setOpen((cur) => (cur === s.id ? null : s.id))}
            >
              <span
                className="orbit-pulse block rounded-full transition-[background,box-shadow] duration-500"
                style={{
                  width: s.size,
                  height: s.size,
                  background: hue.dot,
                  boxShadow: `0 0 ${s.size * 1.6}px ${hue.glow}`,
                }}
              />
              {/* the reveal — presence becomes meaning, only on intent */}
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 z-20 w-max min-w-[150px] -translate-x-1/2 rounded-[12px] border border-line-2 bg-paper-3 px-3.5 py-2.5 text-left shadow-float transition-all duration-300"
                style={{
                  [below ? "top" : "bottom"]: "calc(100% + 8px)",
                  opacity: isOpen ? 1 : 0,
                  transform: `translateX(-50%) translateY(${isOpen ? 0 : below ? -6 : 6}px)`,
                }}
              >
                <span className="block text-[13px] font-semibold text-ink">{lines[0]}</span>
                {lines.slice(1).map((l) => (
                  <span key={l} className="mt-0.5 block font-mono text-[10.5px] leading-[1.5] text-ink-soft">
                    {l}
                  </span>
                ))}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
