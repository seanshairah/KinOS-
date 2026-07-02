"use client";

import { AttentionItem, ClockIcon, OrbitCard, Pill } from "@kinos/ui";
import { ease, span } from "./util";

/**
 * The moments of one family evening. Every animation means something:
 * chat becomes signals, a voice note becomes chips, a receipt becomes
 * the Money Pot, one gap becomes Attention Needed, attention becomes a
 * duty, and the duty resolves. Each moment is driven by a local 0..1
 * progress so the orchestrator can play them by scroll (or pin them at
 * 1 for reduced motion).
 */

/** Paper cards read as lit windows against the evening. */
export const LIT: React.CSSProperties = {
  filter:
    "drop-shadow(0 30px 60px rgba(10,8,30,.5)) drop-shadow(0 0 42px rgba(169,167,224,.14))",
};

/* ————— 5.3 family chat chaos ————— */

const WORRIES = [
  { text: "Has anyone checked on Mum?", x: 8, y: 8, tilt: -2.2 },
  { text: "Grace, did she eat?", x: 56, y: 2, tilt: 1.6 },
  { text: "Sarah, can you confirm transport for tomorrow?", x: 50, y: 66, tilt: -1.4 },
  { text: "I sent money yesterday, what was bought?", x: 4, y: 56, tilt: 2 },
  { text: "No one is replying.", x: 33, y: 32, tilt: -0.8 },
] as const;

export function ChatChaos({ t, dissolve }: { t: number; dissolve: number }) {
  return (
    <div className="relative mx-auto h-[340px] w-full max-w-[640px] sm:h-[300px]">
      {WORRIES.map((w, i) => {
        const arrive = ease(span(t, i * 0.14, i * 0.14 + 0.45));
        const gone = ease(span(dissolve, i * 0.1, i * 0.1 + 0.55));
        // Dissolving worry drifts toward the centre and condenses to a dot.
        const cx = 46 - w.x;
        const cy = 36 - w.y;
        // Worry condenses into a small signal light on its way to the orbit.
        const spark = Math.sin(Math.min(gone, 1) * Math.PI);
        return (
          <div
            key={w.text}
            className="chat-bob absolute"
            style={{
              left: `${w.x}%`,
              top: `${w.y}%`,
              ["--bob-tilt" as string]: `${w.tilt}deg`,
              animationDelay: `${i * 0.7}s`,
              opacity: arrive,
            }}
          >
            <div
              className="max-w-[240px] rounded-card rounded-bl-sm border border-line bg-paper-3 px-4 py-2.5 text-[13px] leading-snug text-ink-soft shadow-card"
              style={{
                opacity: 1 - gone,
                transform: `translate(${cx * gone}%, ${cy * gone}%) scale(${1 - 0.82 * gone})`,
                transition: "transform .1s linear",
              }}
            >
              {w.text}
              <span className="mt-1 block font-mono text-[9.5px] text-ink-faint">delivered · no reply</span>
            </div>
            <span
              aria-hidden
              className="absolute h-2 w-2 rounded-full"
              style={{
                left: `${cx * gone * 2.4}px`,
                top: `${cy * gone * 2.4}px`,
                background: "#A9A7E0",
                boxShadow: "0 0 12px rgba(169,167,224,.8)",
                opacity: spark,
              }}
            />
          </div>
        );
      })}
      <p
        className="absolute inset-x-0 top-[44%] text-center font-mono text-[11.5px] tracking-[0.12em] text-halo"
        style={{ opacity: ease(span(dissolve, 0.55, 1)) }}
      >
        KinOS turns family noise into Life Signals.
      </p>
    </div>
  );
}

/* ————— 5.4 first check-in ————— */

export function CheckInMoment({ t }: { t: number }) {
  const travel = ease(span(t, 0, 0.22));
  const flash = ease(span(t, 0.18, 0.4));
  const card = ease(span(t, 0.3, 0.68));
  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      {/* the check-in leaves Harare and arrives at the family's centre */}
      <span
        aria-hidden
        className="absolute -top-8 h-2.5 w-2.5 rounded-full"
        style={{
          left: `calc(${96 - travel * 46}% )`,
          background: "#EDEBF6",
          boxShadow: "0 0 14px rgba(237,235,246,.85)",
          opacity: t <= 0.01 ? 0 : 0.95 * (1 - ease(span(t, 0.32, 0.46))),
        }}
      />
      <p
        className="mb-3 text-center font-mono text-[12px] tracking-[0.14em] text-halo"
        style={{ opacity: flash }}
      >
        18:58 · Check-in received
      </p>
      <div
        style={{
          ...LIT,
          opacity: card,
          transform: `translateY(${(1 - card) * 26}px) scale(${0.94 + card * 0.06})`,
        }}
      >
        <OrbitCard
          name="Mum"
          subline="Clinic tomorrow · 10:00"
          status="steady"
          signals={[
            { label: "morning dose ✓", tone: "ok" },
            { label: "dinner · light", tone: "neutral" },
            { label: "mood · low", tone: "neutral" },
          ]}
        />
      </div>
      <p
        className="mt-4 text-center text-[13.5px] text-[#c9c6e4]"
        style={{ opacity: ease(span(t, 0.7, 1)) }}
      >
        The first moment of clarity.
      </p>
    </div>
  );
}

/* ————— 5.5 voice note → Life Signals ————— */

const CHIPS = [
  { label: "appetite · light", tone: "neutral" as const },
  { label: "dizziness · worth a check", tone: "attn" as const },
  { label: "new medication mentioned", tone: "neutral" as const },
  { label: "receipt · USD 23.50", tone: "data" as const },
  { label: "follow-up needed", tone: "neutral" as const },
];

export function VoiceNoteTransform({ t }: { t: number }) {
  const bubble = ease(span(t, 0, 0.25));
  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div
        className="rounded-card border border-line bg-paper-3 p-4 shadow-card"
        style={{ ...LIT, opacity: bubble, transform: `translateY(${(1 - bubble) * 20}px)` }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-dusk text-[13px] font-medium text-white">
            G
          </span>
          <div className="flex h-7 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
            {Array.from({ length: 30 }, (_, i) => {
              const heard = span(t, 0, 0.5) * 30 > i;
              const playing = t > 0.03 && t < 0.55;
              return (
                <span
                  key={i}
                  className={`w-[3px] flex-none rounded-pill bg-dusk-3 ${playing && heard ? "wave-playing" : ""}`}
                  style={{
                    height: `${6 + ((i * 37) % 17)}px`,
                    opacity: heard ? 0.9 : 0.3,
                    animationDelay: `${(i % 7) * 0.09}s`,
                  }}
                />
              );
            })}
          </div>
          <span className="font-mono text-[10.5px] text-ink-faint">0:21</span>
        </div>
        <p className="mt-2.5 text-[12.5px] italic leading-relaxed text-ink-soft">
          “She ate a little, but said she felt dizzy after the new tablets. I also bought the
          medicine and uploaded the receipt.”
        </p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {CHIPS.map((chip, i) => {
          const at = ease(span(t, 0.3 + i * 0.11, 0.42 + i * 0.11));
          return (
            <span
              key={chip.label}
              style={{ opacity: at, transform: `translateY(${(1 - at) * 14}px)` }}
            >
              <Pill tone={chip.tone}>{chip.label}</Pill>
            </span>
          );
        })}
      </div>
      <p
        className="mt-4 text-center font-mono text-[11.5px] tracking-[0.14em] text-halo"
        style={{ opacity: ease(span(t, 0.85, 1)) }}
      >
        Life Signals added
      </p>
    </div>
  );
}

/* ————— 5.6 receipt → Money Pot ————— */

const LEDGER = [
  { text: "+ USD 50.00", meta: "Tari · support", tone: "text-[#2f6a52]" },
  { text: "− USD 23.50", meta: "Pharmacy receipt", tone: "text-ink" },
] as const;

export function MoneyPotMoment({ t }: { t: number }) {
  const card = ease(span(t, 0, 0.28));
  // The receipt the family already saw flows down into the pot.
  const flow = ease(span(t, 0.14, 0.44));
  return (
    <div className="relative mx-auto w-full max-w-[400px]" style={LIT}>
      <div className="pointer-events-none absolute inset-x-0 -top-12 flex justify-center" aria-hidden>
        <span
          className="rounded-pill border border-line bg-paper-3 px-3.5 py-1.5 font-mono text-[11.5px] text-ink-soft shadow-card"
          style={{
            opacity: flow > 0 ? 1 - ease(span(flow, 0.82, 1)) : 0,
            transform: `translateY(${flow * 74}px) scale(${1 - flow * 0.25})`,
          }}
        >
          receipt · USD 23.50
        </span>
      </div>
      <div
        className="overflow-hidden rounded-[20px] border border-line-2 bg-paper-3 shadow-float"
        style={{ opacity: card, transform: `translateY(${(1 - card) * 24}px)` }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="text-[13.5px] font-semibold text-ink">Money Pot</span>
          <span className="font-mono text-[10.5px] text-ink-faint">shared · 3 contributors</span>
        </div>
        <div className="px-5 py-2">
          {LEDGER.map((row, i) => {
            const at = ease(span(t, 0.25 + i * 0.18, 0.43 + i * 0.18));
            return (
              <div
                key={row.text}
                className="flex items-center justify-between border-b border-line py-3 last:border-b-0"
                style={{ opacity: at, transform: `translateX(${(1 - at) * 18}px)` }}
              >
                <span className={`font-mono text-[13.5px] ${row.tone}`}>{row.text}</span>
                <span className="font-mono text-[10.5px] text-ink-faint">{row.meta}</span>
              </div>
            );
          })}
          <div
            className="flex items-center justify-between py-3"
            style={{ opacity: ease(span(t, 0.62, 0.8)) }}
          >
            <span className="text-[13px] text-ink-soft">Balance</span>
            <span className="font-mono text-[15px] font-medium text-ink">USD 26.50</span>
          </div>
        </div>
      </div>
      <p
        className="mt-4 text-center font-mono text-[11.5px] leading-[1.6] tracking-[0.06em] text-halo"
        style={{ opacity: ease(span(t, 0.8, 1)) }}
      >
        Receipt attached to Mum&apos;s medication record.
        <br />
        Money memory, proof, and purpose.
      </p>
    </div>
  );
}

/* ————— 5.7 attention needed ————— */

export function AttentionMoment({ t }: { t: number }) {
  const rise = ease(span(t, 0, 0.35));
  const card = ease(span(t, 0.2, 0.55));
  return (
    <div className="mx-auto w-full max-w-[430px]">
      {/* the one satellite that turns ember and rises */}
      <div className="mb-4 flex justify-center" aria-hidden>
        <span
          className="orbit-pulse block h-3.5 w-3.5 rounded-full"
          style={{
            background: "#D98A3D",
            boxShadow: "0 0 22px rgba(217,138,61,.6)",
            opacity: rise,
            transform: `translateY(${(1 - rise) * 44}px)`,
          }}
        />
      </div>
      <div style={{ ...LIT, opacity: card, transform: `translateY(${(1 - card) * 22}px)` }}>
        <div className="overflow-hidden rounded-[20px] border border-line-2 bg-paper-3 p-4 shadow-float">
          <AttentionItem
            icon={<ClockIcon />}
            title="Attention needed: transport not confirmed"
            detail="Tomorrow's clinic review · 10:00 · Avenues Clinic"
            owner="Owner: Sarah · Action: confirm transport · Escalates quietly at 20:00"
          />
          <p className="mt-3 text-center font-mono text-[11px] text-ink-faint">
            one thing. not ten. calm and precise.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ————— 5.8 duty accepted ————— */

export function DutyResolution({ t }: { t: number }) {
  const card = ease(span(t, 0, 0.25));
  const taken = t > 0.38;
  const confirmed = t > 0.68;
  return (
    <div className="mx-auto w-full max-w-[400px]" style={LIT}>
      <div
        className="overflow-hidden rounded-[20px] border border-line-2 bg-paper-3 shadow-float"
        style={{ opacity: card, transform: `translateY(${(1 - card) * 22}px)` }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="text-[13.5px] font-semibold text-ink">Transport · clinic review</span>
          <span className="font-mono text-[10.5px] text-ink-faint">tomorrow · 10:00</span>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] text-ink-soft">
              {confirmed ? "Transport confirmed" : taken ? "Assigned to Sarah · due 19:30" : "Needs an owner"}
            </span>
            <span
              className={`rounded-pill px-3.5 py-1.5 font-mono text-[11px] transition-colors duration-500 ${
                taken
                  ? "bg-calm-soft text-[#2f6a52]"
                  : "bg-dusk text-white"
              }`}
            >
              {confirmed ? "handled ✓" : taken ? "Sarah took it" : "Take duty"}
            </span>
          </div>
          <div
            className="mt-3 rounded-card border border-calm-soft bg-paper px-3.5 py-2.5 text-center text-[12.5px] text-[#2f6a52] transition-opacity duration-500"
            style={{ opacity: confirmed ? 1 : 0 }}
          >
            The ember settles. Nobody chased anybody.
          </div>
        </div>
      </div>
      {/* the duty settles onto Sarah's satellite, and the ember calms */}
      <div className="mt-4 flex items-center justify-center gap-2.5" aria-hidden>
        <span
          className="orbit-pulse block h-3 w-3 rounded-full transition-all duration-700"
          style={{
            background: confirmed ? "#4E9E7E" : "#D98A3D",
            boxShadow: confirmed ? "0 0 18px rgba(78,158,126,.55)" : "0 0 18px rgba(217,138,61,.55)",
            transform: taken ? "none" : "translateX(14px)",
            transition: "transform .7s cubic-bezier(.22,1,.36,1), background .7s ease, box-shadow .7s ease",
          }}
        />
        <span
          className="font-mono text-[10.5px] tracking-[0.1em] text-halo transition-opacity duration-500"
          style={{ opacity: taken ? 1 : 0 }}
        >
          {confirmed ? "settled with Sarah ✓" : "moving to Sarah…"}
        </span>
      </div>
      <p
        className="mt-3 text-center text-[13.5px] text-[#c9c6e4]"
        style={{ opacity: ease(span(t, 0.8, 1)) }}
      >
        Worry became action.
      </p>
    </div>
  );
}
