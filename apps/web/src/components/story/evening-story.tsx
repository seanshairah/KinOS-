"use client";

import { useEffect, useRef, useState } from "react";
import { DuskField } from "@/components/dusk-field";
import { FAMILY_SATELLITES, OrbitSystem } from "@/components/orbit/orbit-system";
import {
  AttentionMoment,
  ChatChaos,
  CheckInMoment,
  DutyResolution,
  MoneyPotMoment,
  VoiceNoteTransform,
} from "./moments";
import { clockAt, ease, rgba, skyAt, skyRgba, span } from "./util";

/**
 * EveningStory — "One Evening in One Orbit".
 *
 * A single pinned viewport plays one family evening: London and Harare
 * under two skies whose light passes from late afternoon into night as
 * the visitor scrolls; scattered worry dissolves into Life Signals; a
 * receipt becomes the Money Pot; one gap turns ember, becomes a duty,
 * and settles; and finally the two skies merge into one shared Orbit.
 * Reduced motion reads the same evening as calm stacked moments.
 */

/*
 * One sky, two lights. There is no split screen and no boundary: a single
 * shared gradient carries the hour, while a cool London glow (left) and a
 * warm Harare glow (right) feather into each other across the middle. A
 * low sun sets on the Harare side, a faint moon rises over London, and as
 * night falls both glows dissolve into the same dusk — the merge is the
 * two lights literally becoming one.
 */
const BASE_TOP = [[0, "#A9B6D1"], [0.3, "#8E87B4"], [0.55, "#5F5B96"], [0.78, "#3A3766"], [0.88, "#2C2A4F"], [1, "#2C2A4F"]] as const;
const BASE_BOT = [[0, "#D8C2A9"], [0.3, "#B18FA3"], [0.55, "#6E5F91"], [0.78, "#332F59"], [0.88, "#262449"], [1, "#262449"]] as const;
const LONDON_LIGHT = [[0, "#7FA3D8"], [0.4, "#5E6AAE"], [0.75, "#4A4886"], [1, "#4A4886"]] as const;
const HARARE_LIGHT = [[0, "#F2B26B"], [0.4, "#DE8F63"], [0.75, "#8A5F86"], [1, "#8A5F86"]] as const;

/** The whole sky as one layered background — no seams, only light. */
function skyBackground(p: number): string {
  const glowFade = 1 - ease(span(p, 0.5, 0.88));
  const sunSet = ease(span(p, 0.05, 0.45));
  const moonRise = ease(span(p, 0.45, 0.8));
  const layers = [
    // the moon, rising over London as the evening deepens
    `radial-gradient(5% 8% at 13% ${58 - moonRise * 32}%, ${rgba("#EDEBF6", 0.34 * moonRise)}, transparent 100%)`,
    // the sun, setting behind Harare
    `radial-gradient(16% 22% at 84% ${34 + sunSet * 52}%, ${rgba("#FFDCA8", 0.5 * (1 - sunSet))}, transparent 100%)`,
    // two cities as pools of light, feathering through the middle
    `radial-gradient(95% 130% at 8% 34%, ${skyRgba(LONDON_LIGHT, p, 0.5 * glowFade)}, transparent 62%)`,
    `radial-gradient(95% 130% at 92% 36%, ${skyRgba(HARARE_LIGHT, p, 0.55 * glowFade)}, transparent 62%)`,
    // the shared hour
    `linear-gradient(180deg, ${skyAt(BASE_TOP, p)}, ${skyAt(BASE_BOT, p)})`,
  ];
  return layers.join(",");
}

/* The acts of the evening, as fractions of the pinned scroll. */
const ACT = {
  intro: [0.0, 0.09],
  chaos: [0.06, 0.3],
  checkin: [0.3, 0.42],
  voice: [0.42, 0.55],
  money: [0.55, 0.65],
  attention: [0.65, 0.75],
  duty: [0.75, 0.85],
  merge: [0.85, 1.0],
} as const;

function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const passed = Math.min(Math.max(-rect.top, 0), total);
      setProgress(total > 0 ? passed / total : 0);
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);
  return progress;
}

/** Visibility envelope for an act: gentle in, gentle out. */
function act(p: number, [a, b]: readonly [number, number], hold = false) {
  const on = ease(span(p, a, a + 0.03));
  const off = hold ? 1 : 1 - ease(span(p, b - 0.025, b));
  return Math.min(on, off);
}

function Scene({
  visible,
  children,
}: {
  visible: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6"
      style={{
        opacity: visible,
        transform: `translateY(calc(-50% + ${(1 - visible) * 18}px))`,
        pointerEvents: visible > 0.6 ? "auto" : "none",
        transition: "opacity .12s linear",
      }}
    >
      {children}
    </div>
  );
}

export function EveningStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const p = useScrollProgress(containerRef);

  if (reduced) {
    // The same evening, told as calm stacked moments under one night sky.
    return (
      <div
        className="flex flex-col gap-16 px-6 py-16"
        style={{ background: `linear-gradient(180deg, ${skyAt(BASE_TOP, 1)}, ${skyAt(BASE_BOT, 1)})` }}
      >
        <p className="mx-auto max-w-[30ch] text-center font-serif text-[26px] font-light leading-[1.3] text-dusk-ink">
          Different places. Different times. One family responsibility.
        </p>
        <ChatChaos t={1} dissolve={0} />
        <CheckInMoment t={1} />
        <VoiceNoteTransform t={1} />
        <MoneyPotMoment t={1} />
        <AttentionMoment t={1} />
        <DutyResolution t={1} />
        <div className="mx-auto text-center">
          <p className="mb-8 font-serif text-[24px] font-light leading-[1.3] text-dusk-ink">
            Different places. Different times.
            <br />
            One shared family state.
          </p>
          <OrbitSystem size={380} className="mx-auto" />
        </div>
      </div>
    );
  }

  const nightfall = ease(span(p, 0.5, 0.88));
  const mergeT = ease(span(p, 0.85, 0.95));
  const closeT = ease(span(p, 0.955, 1));

  return (
    <div ref={containerRef} style={{ height: "1250vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* one sky, two lights, no boundary */}
        <div aria-hidden className="absolute inset-0" style={{ background: skyBackground(p) }} />
        {/* stars arrive with the night */}
        <div aria-hidden className="absolute inset-0" style={{ opacity: nightfall }}>
          <DuskField density={90} />
        </div>

        {/* where the evening stands — one dot per act */}
        <div className="absolute left-6 top-1/2 z-20 hidden h-[46vh] w-px -translate-y-1/2 bg-white/15 md:block lg:left-10">
          <div
            className="w-px bg-white/70 transition-[height] duration-150"
            style={{ height: `${p * 100}%` }}
          />
          {Object.values(ACT).map(([start], i) => {
            const lit = p >= start + 0.01;
            return (
              <span
                key={i}
                className="absolute -left-[3px] h-[7px] w-[7px] rounded-full transition-all duration-500"
                style={{
                  top: `${start * 100}%`,
                  background: lit ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.25)",
                  boxShadow: lit ? "0 0 9px rgba(237,235,246,.8)" : "none",
                }}
              />
            );
          })}
        </div>

        {/* two clocks, one evening */}
        <div
          className="absolute inset-x-0 top-[70px] z-20 flex items-start justify-between px-6 md:px-12"
          style={{ opacity: 1 - ease(span(p, 0.86, 0.92)) }}
        >
          <div className="text-left">
            <div className="font-mono text-[11.5px] uppercase tracking-[0.2em] text-white/85">
              London · {clockAt(17 * 60 + 42, 20 * 60, p)}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.08em] text-white/55">
              Tari · six time zones away
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[11.5px] uppercase tracking-[0.2em] text-white/85">
              Harare · {clockAt(18 * 60 + 42, 21 * 60, p)}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.08em] text-white/55">
              Mum, Sarah &amp; Grace · home
            </div>
          </div>
        </div>

        {/* the acts */}
        <div className="relative z-10 mx-auto h-full max-w-[760px]">
          <Scene visible={act(p, ACT.intro)}>
            <p className="mx-auto max-w-[24ch] text-center font-serif text-[clamp(26px,4vw,42px)] font-light leading-[1.25] tracking-[-0.01em] text-white">
              Different places. Different times.
              <br />
              <em className="italic">One family responsibility.</em>
            </p>
            <p className="mt-5 text-center font-mono text-[11.5px] tracking-[0.16em] text-white/70">
              scroll · the evening begins
            </p>
          </Scene>

          <Scene visible={act(p, [ACT.chaos[0], ACT.chaos[1]])}>
            <ChatChaos t={span(p, 0.07, 0.19)} dissolve={span(p, 0.2, 0.3)} />
          </Scene>

          <Scene visible={act(p, ACT.checkin)}>
            <CheckInMoment t={span(p, ACT.checkin[0], ACT.checkin[1] - 0.015)} />
          </Scene>

          <Scene visible={act(p, ACT.voice)}>
            <VoiceNoteTransform t={span(p, ACT.voice[0], ACT.voice[1] - 0.015)} />
          </Scene>

          <Scene visible={act(p, ACT.money)}>
            <MoneyPotMoment t={span(p, ACT.money[0], ACT.money[1] - 0.012)} />
          </Scene>

          <Scene visible={act(p, ACT.attention)}>
            <AttentionMoment t={span(p, ACT.attention[0], ACT.attention[1] - 0.012)} />
          </Scene>

          <Scene visible={act(p, ACT.duty)}>
            <DutyResolution t={span(p, ACT.duty[0], ACT.duty[1] - 0.012)} />
          </Scene>

          {/* 5.9 the merge — the signature scene */}
          <Scene visible={mergeT}>
            <div className="text-center">
              <p className="mx-auto max-w-[26ch] font-serif text-[clamp(22px,3vw,32px)] font-light leading-[1.3] tracking-[-0.01em] text-dusk-ink">
                Different places. Different times.
                <br />
                <em className="italic text-white">One shared family state.</em>
              </p>
              <div
                className="mt-6 flex origin-top justify-center max-[500px]:scale-[.78]"
                style={{ transform: `scale(${0.92 + mergeT * 0.08})` }}
              >
                <OrbitSystem size={410} satellites={FAMILY_SATELLITES} />
              </div>
              <p
                className="mt-4 font-mono text-[11px] tracking-[0.14em] text-halo"
                style={{ opacity: mergeT }}
              >
                hover or tap a light — detail only on intent
              </p>
              <p
                className="mt-6 font-serif text-[17px] italic text-[#c9c6e4]"
                style={{ opacity: closeT }}
              >
                20:00 · The evening closes like a letter.
              </p>
            </div>
          </Scene>
        </div>
      </div>
    </div>
  );
}
