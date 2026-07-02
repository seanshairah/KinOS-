"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AttentionItem,
  BriefBlock,
  ClockIcon,
  DeviceFrame,
  OrbitCard,
  OrbitMark,
  Pill,
  SignalRow,
  SignalValue,
  cx,
} from "@kinos/ui";
import { DuskField } from "@/components/dusk-field";

/**
 * ScrollStory — one evening with a family, told by scrolling, under a
 * living night sky. The section pins to the viewport; each product moment
 * is a lit window in the dark. The sky's mood follows the story (halo →
 * calm → ember → calm), chapters map onto the first 88% of the track, and
 * the final 12% is an epilogue beat — so there is never a dead stretch of
 * scroll. Reduced-motion gets plain stacked content.
 */

const CHAPTERS = [
  {
    time: "19:12 · London",
    title: "The worry that never says its name.",
    body: "Tari is six time zones from home. Did Mum eat today? Did she take the evening tablet? Who's driving her to the clinic tomorrow? The group chat is silent, and silence reads two ways.",
  },
  {
    time: "21:14 · Harare",
    title: "Then, a small light: she checked in.",
    body: "One tap on Mum's side. On Tari's side — the day takes shape. Medication taken, meals eaten, mood a little low. Not data. Relief.",
  },
  {
    time: "21:20 · Harare",
    title: "Grace leaves a voice note, like she always does.",
    body: "“She ate well at lunch, mentioned feeling dizzy again, I bought the tablets — 23.50 at Greenwood.” KinOS listens the way family would: it files the receipt, notes the dizziness as worth a check, and never turns Grace's words into jargon.",
  },
  {
    time: "19:31 · London",
    title: "KinOS notices the one thing that can't wait.",
    body: "Not ten alerts. One: transport for tomorrow's clinic review is still unconfirmed. It knows who owns it, and when to quietly escalate if nothing happens.",
  },
  {
    time: "19:33 · London",
    title: "One tap, and the family moves.",
    body: "Sarah takes transport. The gap closes, the orbit settles, and nobody chased anybody in a group chat. This is what handled feels like.",
  },
  {
    time: "20:00 · Harare",
    title: "The evening brief closes the day like a letter.",
    body: "Written calmly, read in thirty seconds, kept forever in the Family Record. Tomorrow it starts again — and the family already knows what matters.",
  },
] as const;

/* The sky answers the story: quiet halo, then calm, a breath of ember at
   the attention beat, calm again when the family acts. */
const MOODS = [
  "169,167,224",
  "78,158,126",
  "169,167,224",
  "217,138,61",
  "78,158,126",
  "169,167,224",
] as const;

const BRIEF_TEXT =
  "Mum is okay today. Medication was taken and meals were eaten. Grace noted her appetite was good, though dizziness came up again — worth a check at Thursday's visit. Sarah has transport for tomorrow's 10:00 clinic review. Nothing else needs attention tonight.";

/** Chapters live in the first 88% of the track; the epilogue owns the rest. */
const STORY_SPAN = 0.88;

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

/** Scene visibility helper: fade/slide by distance from the active chapter. */
function sceneStyle(index: number, chapter: number, local: number): React.CSSProperties {
  const distance = index - (chapter + local);
  const opacity = Math.max(0, 1 - Math.abs(distance) * 1.6);
  return {
    opacity,
    transform: `translateY(${distance * 34}px) scale(${1 - Math.min(Math.abs(distance) * 0.04, 0.08)})`,
    pointerEvents: opacity > 0.5 ? "auto" : "none",
    transition: "opacity .15s linear, transform .15s linear",
  };
}

/** Lit-window treatment: paper frames glowing softly against the night. */
const WINDOW_GLOW: React.CSSProperties = {
  filter:
    "drop-shadow(0 30px 60px rgba(10,8,30,.55)) drop-shadow(0 0 42px rgba(169,167,224,.16))",
};

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const progress = useScrollProgress(containerRef);
  const scaled = Math.min(progress / STORY_SPAN, 1) * CHAPTERS.length;
  const chapter = Math.min(Math.floor(scaled), CHAPTERS.length - 1);
  const local = Math.min(Math.max(scaled - chapter, 0), 1);
  const epilogue = Math.min(Math.max((progress - STORY_SPAN) / (1 - STORY_SPAN), 0), 1);

  // Chapter-driven details
  const extractCount = chapter === 2 ? Math.floor(local * 4) : chapter > 2 ? 3 : 0;
  const transportHandled = chapter >= 4 && (chapter > 4 || local > 0.35);
  const briefChars = chapter >= 5 ? Math.floor(Math.min(local * 1.6, 1) * BRIEF_TEXT.length) : 0;

  const scenes: React.ReactNode[] = [
    // 0 — the silent group chat
    <div key="worry" className="mx-auto w-full max-w-[430px]" style={WINDOW_GLOW}>
      <DeviceFrame title="The family thread" right="silent">
        <div className="flex flex-col gap-2.5 py-2">
          {["Did Mum eat today?", "Anyone heard from Gogo?", "Who's on clinic duty tomorrow??"].map(
            (line, i) => (
              <div
                key={line}
                className="max-w-[85%] rounded-card rounded-bl-sm border border-line bg-paper px-3.5 py-2.5 text-[13.5px] text-ink-soft"
                style={{ opacity: 0.9 - i * 0.12 }}
              >
                {line}
                <span className="mt-1 block font-mono text-[10px] text-ink-faint">delivered · no reply</span>
              </div>
            ),
          )}
          <div className="mt-1 text-center font-mono text-[11px] text-ink-faint">
            …the worry lives between the messages
          </div>
        </div>
      </DeviceFrame>
    </div>,

    // 1 — the check-in
    <div key="checkin" className="mx-auto w-full max-w-[430px]" style={WINDOW_GLOW}>
      <DeviceFrame
        title="Orbit View"
        right="21:14"
        icon={<OrbitMark size={18} className="text-dusk" />}
      >
        <OrbitCard
          name="Mum"
          subline="Checked in · evening tablet taken"
          status="steady"
          signals={[
            { label: "evening dose ✓", tone: "ok" },
            { label: "ate today ✓", tone: "ok" },
            { label: "mood · a little low", tone: "neutral" },
          ]}
        />
        <div className="mt-3">
          <SignalRow time="21:14" meta="her own check-in · one tap">
            Feeling <SignalValue>okay</SignalValue> — “tired but fine”
          </SignalRow>
        </div>
      </DeviceFrame>
    </div>,

    // 2 — the voice note becomes signals
    <div key="voice" className="mx-auto w-full max-w-[430px]" style={WINDOW_GLOW}>
      <DeviceFrame title="Life Signals" right="21:20">
        <div className="rounded-card border border-line bg-paper p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-dusk text-[13px] font-medium text-white">
              G
            </span>
            <div className="flex h-7 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
              {Array.from({ length: 34 }, (_, i) => (
                <span
                  key={i}
                  className="w-[3px] flex-none rounded-pill bg-dusk-3"
                  style={{ height: `${6 + ((i * 37) % 17)}px`, opacity: 0.35 + ((i * 13) % 10) / 18 }}
                />
              ))}
            </div>
            <span className="font-mono text-[10.5px] text-ink-faint">0:19</span>
          </div>
          <p className="mt-2.5 text-[12.5px] italic leading-relaxed text-ink-soft">
            “She ate well at lunch… mentioned feeling dizzy again… bought the tablets, 23.50 at Greenwood.”
          </p>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {[
            { label: "appetite · good", tone: "ok" as const, meta: "from Grace's note" },
            { label: "dizziness · worth a check", tone: "attn" as const, meta: "second mention this week" },
            { label: "receipt · USD 23.50", tone: "data" as const, meta: "filed to the Money Pot" },
          ].map((item, i) => (
            <div
              key={item.label}
              className="flex items-center justify-between transition-all duration-500"
              style={{
                opacity: reduced || extractCount > i ? 1 : 0,
                transform: reduced || extractCount > i ? "none" : "translateY(10px)",
              }}
            >
              <Pill tone={item.tone}>{item.label}</Pill>
              <span className="font-mono text-[10px] text-ink-faint">{item.meta}</span>
            </div>
          ))}
        </div>
      </DeviceFrame>
    </div>,

    // 3 — attention
    <div key="attention" className="mx-auto w-full max-w-[430px]" style={WINDOW_GLOW}>
      <DeviceFrame title="Attention Needed" right="1 open">
        <AttentionItem
          icon={<ClockIcon />}
          title="Transport not confirmed"
          detail="Clinic review tomorrow, 10:00 · Avenues Clinic"
          owner="owner: Sarah · escalates quietly at 18:00"
        />
        <p className="mt-3 text-center font-mono text-[11px] text-ink-faint">
          one thing. not ten. and it knows who acts.
        </p>
      </DeviceFrame>
    </div>,

    // 4 — the family acts
    <div key="acted" className="mx-auto w-full max-w-[430px]" style={WINDOW_GLOW}>
      <DeviceFrame
        title="Orbit View"
        right="19:33"
        icon={<OrbitMark size={18} attention={!transportHandled} className="text-dusk" />}
      >
        <OrbitCard
          name="Mum"
          subline={transportHandled ? "Clinic tomorrow 10:00 · Sarah driving" : "Clinic tomorrow 10:00"}
          status={transportHandled ? "steady" : "attention"}
          signals={
            transportHandled
              ? [
                  { label: "transport ✓ Sarah", tone: "ok" },
                  { label: "evening dose ✓", tone: "ok" },
                ]
              : [
                  { label: "transport open", tone: "attn" },
                  { label: "evening dose ✓", tone: "ok" },
                ]
          }
        />
        <div
          className="mt-3 rounded-card border border-calm-soft bg-paper p-3 text-center text-[13px] text-[#2f6a52] transition-opacity duration-500"
          style={{ opacity: transportHandled || reduced ? 1 : 0 }}
        >
          Sarah took the duty — the family saw it settle, live.
        </div>
      </DeviceFrame>
    </div>,

    // 5 — the evening brief
    <div key="brief" className="mx-auto w-full max-w-[430px]" style={WINDOW_GLOW}>
      <DeviceFrame title="Daily Brief" right="Evening">
        <BriefBlock meta="Tuesday evening · for Mum">
          <span>
            {reduced ? BRIEF_TEXT : BRIEF_TEXT.slice(0, briefChars)}
            {!reduced && briefChars > 0 && briefChars < BRIEF_TEXT.length && (
              <span className="text-dusk-2">▎</span>
            )}
          </span>
        </BriefBlock>
      </DeviceFrame>
    </div>,
  ];

  if (reduced) {
    // Reduced motion: the story flows as plain sections under the same sky.
    return (
      <div className="mx-auto flex max-w-[1120px] flex-col gap-16 px-7 py-16">
        {CHAPTERS.map((c, i) => (
          <div key={c.time} className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-halo">{c.time}</div>
              <h3 className="mt-3 font-serif text-[28px] font-light leading-[1.15] tracking-[-0.01em] text-dusk-ink">{c.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-[#c9c6e4]">{c.body}</p>
            </div>
            {scenes[i]}
          </div>
        ))}
        <div className="mx-auto max-w-[46ch] pt-4 text-center">
          <OrbitMark size={40} className="mx-auto text-halo" />
          <p className="mt-5 font-serif text-[26px] font-light leading-[1.3] text-dusk-ink">
            That was one evening. KinOS keeps every one of them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: `${CHAPTERS.length * 100}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* the night behind the story */}
        <DuskField density={80} />
        {/* the evening deepens as it passes — 19:12 dusk into true night */}
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{ background: "#0f0d26", opacity: Math.min(progress / STORY_SPAN, 1) * 0.4 }}
        />
        <div aria-hidden className="aurora aurora-a z-0 opacity-70" />

        {/* the sky answers the story — crossfading mood glow */}
        <div
          aria-hidden
          className="absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(56% 62% at 66% 48%, rgba(${MOODS[chapter]},${0.16 * (1 - local)}), transparent 70%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(56% 62% at 66% 48%, rgba(${MOODS[Math.min(chapter + 1, MOODS.length - 1)]},${0.16 * local}), transparent 70%)`,
          }}
        />

        {/* progress thread with chapter stars */}
        <div className="absolute left-7 top-1/2 z-10 hidden h-[52vh] w-px -translate-y-1/2 bg-halo/20 md:block lg:left-12">
          <div
            className="w-px bg-halo transition-[height] duration-150"
            style={{ height: `${Math.min(progress / STORY_SPAN, 1) * 100}%` }}
          />
          {CHAPTERS.map((c, i) => {
            const lit = scaled >= i + 0.5;
            return (
              <span
                key={c.time}
                className="absolute -left-[3px] h-[7px] w-[7px] rounded-full transition-all duration-300"
                style={{
                  top: `${((i + 0.5) / CHAPTERS.length) * 100}%`,
                  background: lit ? "var(--halo)" : "rgba(169,167,224,.25)",
                  boxShadow: lit ? "0 0 10px rgba(169,167,224,.8)" : "none",
                }}
              />
            );
          })}
        </div>

        {/* the six chapters */}
        <div
          className="relative z-10 mx-auto grid w-full max-w-[1120px] items-center gap-10 px-7 md:grid-cols-[1fr_1.05fr] md:gap-16"
          style={{
            opacity: 1 - epilogue,
            transform: `scale(${1 - epilogue * 0.04})`,
            pointerEvents: epilogue > 0.4 ? "none" : "auto",
          }}
        >
          {/* chapter text — crossfading in place */}
          <div className="relative min-h-[300px]">
            {CHAPTERS.map((c, i) => {
              const distance = i - (chapter + local * 0.999);
              const opacity = Math.max(0, 1 - Math.abs(distance) * 1.4);
              return (
                <div
                  key={c.time}
                  className="absolute inset-x-0 top-1/2"
                  style={{
                    opacity,
                    transform: `translateY(calc(-50% + ${distance * 44}px))`,
                    pointerEvents: opacity > 0.5 ? "auto" : "none",
                    transition: "opacity .15s linear, transform .15s linear",
                  }}
                >
                  <div className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-halo">
                    {c.time}
                  </div>
                  <h3 className="mt-3 font-serif text-[clamp(24px,3vw,34px)] font-light leading-[1.15] tracking-[-0.01em] text-dusk-ink">
                    {c.title}
                  </h3>
                  <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.65] text-[#c9c6e4]">{c.body}</p>
                </div>
              );
            })}
          </div>

          {/* the stage — lit windows in the night */}
          <div className="relative h-[430px]">
            {scenes.map((scene, i) => (
              <div
                key={i}
                className={cx("absolute inset-0 flex items-center")}
                style={sceneStyle(i, chapter, local)}
              >
                {scene}
              </div>
            ))}
          </div>
        </div>

        {/* epilogue — the story closes, the invitation opens */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-7"
          style={{
            opacity: epilogue,
            transform: `translateY(${(1 - epilogue) * 28}px)`,
            pointerEvents: epilogue > 0.5 ? "auto" : "none",
            transition: "opacity .15s linear, transform .15s linear",
          }}
        >
          <div className="max-w-[52ch] text-center">
            <OrbitMark size={44} className="mx-auto text-halo" />
            <p className="mt-6 font-serif text-[clamp(26px,3.4vw,40px)] font-light leading-[1.25] tracking-[-0.01em] text-dusk-ink">
              That was <em className="italic text-white">one</em> evening.
              <br />
              KinOS keeps every one of them.
            </p>
            <p className="mx-auto mt-5 max-w-[44ch] text-[15px] leading-[1.65] text-[#c9c6e4]">
              Quietly, for years — so “when did Dad first mention leg pain?” always
              has an answer, and no one carries the family record alone.
            </p>
            <Link
              href="/sign-in"
              className="lift mt-8 inline-block rounded-pill bg-white px-6 py-3 text-[14px] font-semibold text-dusk no-underline"
            >
              Begin your family&apos;s record
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
