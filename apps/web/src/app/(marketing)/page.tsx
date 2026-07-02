import Link from "next/link";
import { Eyebrow, OrbitMark } from "@kinos/ui";
import { DuskField } from "@/components/dusk-field";
import { ScrollStory } from "@/components/scroll-story";
import { VoicesDeck } from "@/components/voices-deck";

/**
 * The KinOS landing page — one day with a family, told as a sky.
 * Night (the worry) → dawn (what KinOS is) → evening (the story, pinned
 * under living stars) → daylight (how it stays calm, who it's for) →
 * dusk again (belonging, and the invitation). No hard borders, no dead
 * scroll: the sections blend through horizon gradients, and the light
 * sections breathe with drifting light and paper grain.
 */

const NIGHT = "#2c2a4f";
const DAY = "#fbf8f3";

/** A horizon between night and day — the seam the whole page turns on. */
function SkyBridge({ to }: { to: "day" | "night" }) {
  const gradient =
    to === "day"
      ? `linear-gradient(180deg, ${NIGHT} 0%, #454273 30%, #8b7da4 56%, #ddcab7 79%, ${DAY} 100%)`
      : `linear-gradient(180deg, ${DAY} 0%, #ddcab7 21%, #8b7da4 44%, #454273 70%, ${NIGHT} 100%)`;
  return (
    <div aria-hidden className="relative h-40 w-full overflow-hidden md:h-52" style={{ background: gradient }}>
      {/* a breath of ember at the horizon line */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(52% 58% at 50% ${to === "day" ? "64%" : "36%"}, rgba(217,138,61,.16), transparent 70%)`,
        }}
      />
    </div>
  );
}

/** Slow pools of light that keep daylight sections alive. */
function AmbientLight({ variant = 0 }: { variant?: 0 | 1 }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {variant === 0 ? (
        <>
          <div
            className="orb orb-a"
            style={{ width: 520, height: 520, top: "-18%", right: "-8%", background: "radial-gradient(circle, rgba(169,167,224,.22), transparent 65%)" }}
          />
          <div
            className="orb orb-b"
            style={{ width: 420, height: 420, bottom: "-22%", left: "-6%", background: "radial-gradient(circle, rgba(217,138,61,.13), transparent 65%)" }}
          />
        </>
      ) : (
        <>
          <div
            className="orb orb-b"
            style={{ width: 560, height: 560, top: "-14%", left: "-10%", background: "radial-gradient(circle, rgba(169,167,224,.18), transparent 65%)" }}
          />
          <div
            className="orb orb-a"
            style={{ width: 440, height: 440, bottom: "-18%", right: "-4%", background: "radial-gradient(circle, rgba(78,158,126,.12), transparent 65%)" }}
          />
        </>
      )}
      <div className="grain" />
    </div>
  );
}

/** The hero Orbit — the loved one as a lamplight centre, family circling. */
function HeroOrbit() {
  return (
    <div aria-hidden className="grid min-h-[320px] place-items-center md:min-h-[380px]">
      <svg width="400" height="400" viewBox="0 0 380 380" className="max-w-full text-halo">
        <defs>
          <radialGradient id="core-glow">
            <stop offset="0%" stopColor="#EDEBF6" stopOpacity=".9" />
            <stop offset="35%" stopColor="#A9A7E0" stopOpacity=".38" />
            <stop offset="100%" stopColor="#A9A7E0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ember-glow">
            <stop offset="0%" stopColor="#D98A3D" stopOpacity=".55" />
            <stop offset="100%" stopColor="#D98A3D" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="calm-glow">
            <stop offset="0%" stopColor="#4E9E7E" stopOpacity=".5" />
            <stop offset="100%" stopColor="#4E9E7E" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="190" cy="190" r="168" fill="none" stroke="rgba(169,167,224,.16)" strokeWidth="1" />
        <g className="spin-slow">
          <circle
            cx="190" cy="190" r="168" fill="none"
            stroke="rgba(169,167,224,.45)" strokeWidth="1.2" strokeLinecap="round"
            strokeDasharray="70 986"
          />
        </g>
        <circle cx="190" cy="190" r="120" fill="none" stroke="rgba(169,167,224,.24)" strokeWidth="1" />
        <g className="spin-med">
          <circle
            cx="190" cy="190" r="120" fill="none"
            stroke="rgba(217,138,61,.35)" strokeWidth="1.2" strokeLinecap="round"
            strokeDasharray="52 702"
          />
        </g>
        <circle cx="190" cy="190" r="72" fill="none" stroke="rgba(169,167,224,.34)" strokeWidth="1" />

        {/* the loved one: a steady centre node in lamplight, per the mark */}
        <circle cx="190" cy="190" r="52" fill="url(#core-glow)" className="breathe" />
        <circle cx="190" cy="190" r="27" fill="rgba(237,235,246,.16)" />
        <circle cx="190" cy="190" r="11" fill="#FEFCF9" />

        <g className="spin-fast">
          <circle cx="262" cy="190" r="13" fill="url(#calm-glow)" />
          <circle cx="262" cy="190" r="6.5" fill="var(--calm)" />
          <circle cx="118" cy="190" r="5" fill="var(--dusk-ink)" opacity=".85" />
        </g>
        <g className="spin-med">
          <circle cx="190" cy="70" r="14" fill="url(#ember-glow)" />
          <circle cx="190" cy="70" r="7" fill="var(--ember)" />
          <circle cx="296" cy="248" r="5.5" fill="var(--dusk-ink)" opacity=".75" />
          <circle cx="96" cy="252" r="4.5" fill="var(--halo)" />
        </g>
        <g className="spin-slow">
          <circle cx="358" cy="190" r="5" fill="var(--dusk-ink)" opacity=".6" />
          <circle cx="120" cy="52" r="4" fill="var(--halo)" opacity=".85" />
          <circle cx="250" cy="336" r="4.5" fill="var(--dusk-ink)" opacity=".55" />
        </g>
      </svg>
    </div>
  );
}

const PERSONAS = [
  {
    n: "01",
    who: "For the child abroad",
    line: "Six time zones away, and still the first to know she's okay.",
    body: "Daily proof instead of daily worry. Every dollar of support visible, receipt by receipt. The clinic visit you can see was handled — from another continent.",
    feed: [
      { dot: "calm", text: "morning check-in ✓", meta: "07:12 her time" },
      { dot: "data", text: "receipt filed · USD 23.50", meta: "Money Pot" },
      { dot: "halo", text: "evening brief", meta: "read at your 07:00" },
    ],
  },
  {
    n: "02",
    who: "For the one holding it down at home",
    line: "Duties with owners, instead of a phone that never stops.",
    body: "Assign it once and stop chasing. Appointments carry their own transport plans. What's done, late, or missing is simply visible — to everyone, without a single nagging message.",
    feed: [
      { dot: "calm", text: "transport ✓ Sarah", meta: "clinic · 10:00" },
      { dot: "halo", text: "groceries · due Friday", meta: "repeats weekly" },
      { dot: "calm", text: "duty settled", meta: "the family saw it" },
    ],
  },
  {
    n: "03",
    who: "For the person being cared for",
    line: "Supported like family. Never watched like a patient.",
    body: "A check-in that takes one tap. A voice note instead of a form. One button that reaches everyone who loves them — and a say in exactly who sees what.",
    feed: [
      { dot: "calm", text: "one-tap check-in", meta: "big, readable type" },
      { dot: "halo", text: "voice note, not a form", meta: "she talks, it listens" },
      { dot: "ember", text: "consent — always hers", meta: "revoke any time" },
    ],
  },
] as const;

const DOT_COLOR: Record<string, string> = {
  calm: "var(--calm)",
  ember: "var(--ember)",
  data: "var(--dusk-3)",
  halo: "var(--halo)",
};

const PRINCIPLES = [
  {
    n: "01",
    title: "Ember means something, or it never appears.",
    body: "When nothing is wrong, the screen is warm and quiet. Attention is judged against your person's own rhythm — her usual sleep, her usual check-in time — never a generic threshold. Thin evidence stays silent.",
  },
  {
    n: "02",
    title: "Consent lives in the database, not a settings page.",
    body: "Every member sees exactly what their role and explicit consent allow — enforced by the database on every single query. Revoke access and it's gone on the very next request. The family's record belongs to the family.",
  },
  {
    n: "03",
    title: "A memory that answers in plain words.",
    body: "“When did Dad first mention leg pain?” “Which pharmacy do we use now?” Decisions, documents and moments stay findable years later — the Family Record never forgets what the group chat scrolled past.",
  },
] as const;

/* The river of moments — a family's quiet life drifting by. */
const FAQS = [
  {
    q: "Is KinOS a medical device?",
    a: "No — and it never pretends to be. KinOS is family coordination and life-awareness: it notices changes against your person's own rhythm and helps the right family member act. It never diagnoses. If something seems urgent, contact local emergency or medical services.",
  },
  {
    q: "Who decides who sees what?",
    a: "The family does — and above everyone, the person at the centre. Health details, money, location: each is shared by explicit consent, enforced by the database on every single query. Revoke access and it's gone on the very next request, not the next app update.",
  },
  {
    q: "Does the person being cared for need a smartphone?",
    a: "A check-in is one tap in big, readable type — but it isn't required. A carer's voice note, a family member's quick log, even a paper receipt photographed later: KinOS listens however the family already talks, and the record stays whole.",
  },
  {
    q: "Will it flood us with alerts?",
    a: "It's built calm. When nothing is wrong, the screen is warm and quiet. Ember appears only when something genuinely needs someone — one item, one owner, quiet hours respected. No streaks, no badges, no group panic.",
  },
  {
    q: "What does it cost?",
    a: "One Orbit — one person at the centre, the whole family around them — is free, with no card needed. Growing families add more orbits and the shared Money Pot on the family plan.",
  },
  {
    q: "Whose data is this?",
    a: "The family's. All of it — every check-in, voice note, receipt and brief — exportable in plain, readable form whenever you ask. It is never sold, never shown to advertisers, and never used for anything but your own family's awareness.",
  },
] as const;

const MOMENTS_A = [
  "Gogo checked in · one tap · 07:12",
  "evening tablet ✓ · on time",
  "receipt filed · groceries · $23.50",
  "Sarah took transport ✓ · clinic 10:00",
  "voice note → three signals",
  "brief read in London · 07:04",
  "duty settled · everyone saw it",
  "nothing needs attention tonight",
] as const;
const MOMENTS_B = [
  "dizziness · worth a check · Thursday",
  "consent updated · Mum's choice",
  "sleep · back to her usual",
  "Money Pot balanced · to the cent",
  "appointment carries its own plan",
  "pattern noticed · gentle, not alarming",
  "“which pharmacy do we use?” · answered",
  "the record remembers · three years on",
] as const;

function MomentPill({ text }: { text: string }) {
  const tone = text.includes("worth a check")
    ? "border-ember-soft text-[#8a5a28]"
    : text.includes("✓") || text.includes("settled") || text.includes("nothing needs")
      ? "border-calm-soft text-[#2f6a52]"
      : "border-line text-ink-soft";
  return (
    <span
      className={`mx-1.5 inline-flex flex-none items-center gap-2 rounded-pill border bg-paper-3 px-4 py-2 font-mono text-[12px] shadow-card ${tone}`}
    >
      {text}
    </span>
  );
}

function MomentLane({ items, reverse = false }: { items: readonly string[]; reverse?: boolean }) {
  return (
    <div className="marquee py-1.5">
      <div className={`marquee-track ${reverse ? "reverse" : ""}`}>
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex flex-none">
            {items.map((m) => (
              <MomentPill key={`${copy}-${m}`} text={m} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* ————— night: the hero, a living dusk sky ————— */}
      <header className="relative isolate overflow-hidden text-dusk-ink">
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(120% 90% at 78% 18%, rgba(140,138,214,.42), transparent 55%)," +
              "radial-gradient(90% 70% at 12% 92%, rgba(217,138,61,.14), transparent 60%)," +
              `linear-gradient(180deg,#3d3b6b, ${NIGHT})`,
          }}
        />
        <div aria-hidden className="aurora aurora-a z-0" />
        <div aria-hidden className="aurora aurora-b z-0" />
        <DuskField />

        <div className="relative z-10 mx-auto grid max-w-[1120px] items-center gap-12 px-7 pb-10 pt-14 md:grid-cols-[1.05fr_.95fr] md:pt-20">
          <div>
            <Eyebrow className="text-halo">Private family operating system</Eyebrow>
            <h1 className="mt-5 font-serif text-[clamp(38px,6.2vw,72px)] font-normal leading-[1.02] tracking-[-0.02em]">
              The people you
              <br />
              love, in <em className="italic text-white">one</em>
              <br />
              calm orbit.
            </h1>
            <p className="mt-6 max-w-[30ch] text-[clamp(16px,1.7vw,19px)] leading-[1.5] text-[#d7d5ee]">
              KinOS turns scattered life updates — check-ins, receipts, medications,
              appointments — into quiet awareness. The intelligence stays invisible.
              The peace of mind doesn&apos;t.
            </p>
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-pill border border-halo/30 px-4 py-2 font-mono text-[12px] tracking-[0.02em] text-halo">
              <span
                className="h-[7px] w-[7px] rounded-full bg-calm"
                style={{ boxShadow: "0 0 0 4px rgba(78,158,126,.22)" }}
              />
              Know what matters before it becomes a crisis
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="lift rounded-pill bg-white px-6 py-3 text-[14px] font-semibold text-dusk no-underline hover:bg-dusk-ink"
              >
                Start your family space
              </Link>
              <Link
                href="#story"
                className="lift rounded-pill border border-halo/40 px-6 py-3 text-[14px] font-medium text-dusk-ink no-underline hover:border-halo"
              >
                Live one evening with it
              </Link>
            </div>
          </div>
          <HeroOrbit />
        </div>

        <div className="relative z-10 pb-7 text-center">
          <div className="scroll-cue inline-flex flex-col items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-halo">
            <span>scroll · one evening with a family</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </header>

      {/* ————— dawn ————— */}
      <SkyBridge to="day" />

      {/* ————— morning: the thesis ————— */}
      <section id="product" className="relative bg-paper-2 py-20">
        <AmbientLight variant={0} />
        <div data-reveal className="relative mx-auto max-w-[1120px] px-7">
          <Eyebrow className="mb-6">The category</Eyebrow>
          <p className="max-w-[24ch] font-serif text-[clamp(24px,3.6vw,40px)] font-light leading-[1.24] tracking-[-0.01em]">
            Not another app to check. A <b className="font-medium italic">living record</b> of
            the people you&apos;re responsible for — that notices what changed, and tells you
            who needs to act.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {[
              "a health tracker",
              "a medical diagnosis app",
              "a caregiver checklist",
              "a family group chat",
            ].map((not) => (
              <span
                key={not}
                className="rounded-pill border border-line-2 bg-paper-3 px-3 py-[7px] font-mono text-[12px] text-ink-faint line-through decoration-ember"
              >
                {not}
              </span>
            ))}
          </div>
          <p className="mt-5 text-[16px] font-semibold text-dusk-2">
            KinOS is the operating layer that connects all of them.
          </p>
        </div>
      </section>

      {/* ————— nightfall, and the story ————— */}
      <SkyBridge to="night" />
      <section
        id="story"
        className="relative text-dusk-ink"
        style={{ background: `linear-gradient(180deg, ${NIGHT}, #322f5a 50%, ${NIGHT})` }}
      >
        <div data-reveal className="relative z-10 mx-auto max-w-[1120px] px-7 pt-16">
          <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-halo">01</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              One evening, two cities, one family
            </h2>
            <p className="max-w-[34ch] text-[14.5px] leading-[1.5] text-[#c9c6e4]">
              Tari in London. Mum, Sarah and Grace in Harare. Scroll through the evening
              KinOS was built for.
            </p>
          </div>
        </div>
        <ScrollStory />
      </section>
      <SkyBridge to="day" />

      {/* ————— daylight: how it stays calm ————— */}
      <section className="relative bg-paper-2 py-20">
        <AmbientLight variant={1} />
        <div className="relative mx-auto max-w-[1120px] px-7">
          <div data-reveal className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">02</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              Built calm. Built private.
            </h2>
          </div>
          <div className="mt-12 flex flex-col">
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.n}
                data-reveal
                data-reveal-delay={i * 110}
                className="grid gap-4 border-t border-line py-10 first:border-t-0 first:pt-0 md:grid-cols-[80px_1fr_1.1fr] md:gap-8"
              >
                <span className="font-mono text-[12px] tracking-[0.1em] text-ink-faint">{p.n}</span>
                <h3 className="font-serif text-[clamp(20px,2.4vw,27px)] font-normal leading-[1.2] tracking-[-0.01em]">
                  {p.title}
                </h3>
                <p className="text-[15px] leading-[1.65] text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— afternoon: for each of you ————— */}
      <section id="families" className="relative bg-paper py-20">
        <AmbientLight variant={0} />
        <div className="relative mx-auto max-w-[1120px] px-7">
          <div data-reveal className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">03</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              Every family runs a hidden operation
            </h2>
            <p className="max-w-[34ch] text-[14.5px] leading-[1.5] text-ink-soft">
              Today it lives in group chats, phone calls, memory and scattered receipts.
              KinOS gives each of you a home in it.
            </p>
          </div>

          <div className="mt-14 flex flex-col gap-16">
            {PERSONAS.map((p, i) => (
              <div
                key={p.n}
                data-reveal
                data-reveal-delay={i * 80}
                className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <div className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-dusk-2">
                    {p.who}
                  </div>
                  <h3 className="mt-3 max-w-[24ch] font-serif text-[clamp(22px,2.8vw,30px)] font-light leading-[1.2] tracking-[-0.01em]">
                    {p.line}
                  </h3>
                  <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.65] text-ink-soft">{p.body}</p>
                </div>

                {/* their corner of KinOS — a small lit window, tilted like a photo */}
                <div className="relative">
                  <div
                    aria-hidden
                    className="orb orb-a"
                    style={{
                      width: 300,
                      height: 300,
                      top: "-10%",
                      [i % 2 === 1 ? "left" : "right"]: "5%",
                      background: "radial-gradient(circle, rgba(169,167,224,.2), transparent 65%)",
                    }}
                  />
                  <div
                    className="lift relative mx-auto w-full max-w-[350px] rounded-[22px] border border-line-2 bg-paper-3 p-5 shadow-float"
                    style={{ transform: `rotate(${i % 2 === 1 ? 1.4 : -1.4}deg)` }}
                  >
                    <div className="mb-3 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
                      <span>their KinOS</span>
                      <OrbitMark size={15} className="text-dusk" />
                    </div>
                    <div className="flex flex-col">
                      {p.feed.map((f) => (
                        <div
                          key={f.text}
                          className="flex items-center justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-1 last:pb-1"
                        >
                          <span className="flex items-center gap-2.5 text-[13.5px] text-ink">
                            <span
                              aria-hidden
                              className="h-[7px] w-[7px] flex-none rounded-full"
                              style={{ background: DOT_COLOR[f.dot] }}
                            />
                            {f.text}
                          </span>
                          <span className="flex-none font-mono text-[10px] text-ink-faint">{f.meta}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— golden hour: voices ————— */}
      <section className="relative bg-paper-2 py-20">
        <AmbientLight variant={1} />
        <div className="relative mx-auto max-w-[1120px] px-7">
          <div data-reveal className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">04</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              The Moyo family, in their own words
            </h2>
            <p className="max-w-[34ch] text-[14.5px] leading-[1.5] text-ink-soft">
              One orbit, five people, five different kinds of relief. The deck deals
              itself — or tap it.
            </p>
          </div>
          <div data-reveal className="mt-14 pb-10">
            <VoicesDeck />
          </div>
        </div>
      </section>

      {/* ————— early evening: belonging ————— */}
      <section className="relative bg-paper pb-24 pt-20">
        <AmbientLight variant={1} />
        <div className="relative">
          <div data-reveal className="mx-auto max-w-[1120px] px-7 text-center">
            <Eyebrow className="mb-5">The feeling we&apos;re building</Eyebrow>
            <h2 className="mx-auto max-w-[22ch] font-serif text-[clamp(26px,3.6vw,40px)] font-light leading-[1.2] tracking-[-0.01em]">
              Somewhere right now, a family just exhaled.
            </h2>
            <p className="mx-auto mt-5 max-w-[58ch] text-[15.5px] leading-[1.7] text-ink-soft">
              Not because an app buzzed — because it didn&apos;t need to. KinOS is for the
              space between check-ins: the quiet confidence that someone you love is okay,
              that someone owns tomorrow, and that nothing important will be forgotten.
              Open it, and you&apos;re not opening software. You&apos;re stepping into the
              room where your family keeps what matters.
            </p>
          </div>
          {/* the family's day, drifting by */}
          <div data-reveal className="mt-12 flex flex-col gap-3">
            <MomentLane items={MOMENTS_A} />
            <MomentLane items={MOMENTS_B} reverse />
          </div>
        </div>
      </section>

      {/* ————— dusk: the questions families actually ask ————— */}
      <section className="relative bg-paper-2 py-20">
        <AmbientLight variant={0} />
        <div className="relative mx-auto grid max-w-[1120px] gap-10 px-7 md:grid-cols-[1fr_1.6fr] md:gap-16">
          <div data-reveal>
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">05</span>
            <h2 className="mt-2 max-w-[16ch] font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.12] tracking-[-0.02em]">
              The questions families actually ask
            </h2>
            <p className="mt-4 max-w-[36ch] text-[14.5px] leading-[1.6] text-ink-soft">
              Asked by real families, answered without fine print. Anything else —
              the privacy page says it all in plain words.
            </p>
            <Link
              href="/privacy"
              className="mt-5 inline-block font-mono text-[12.5px] text-dusk-2 underline decoration-line-2 underline-offset-4 hover:text-dusk"
            >
              Read the privacy promise →
            </Link>
          </div>
          <div className="flex flex-col gap-3.5">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                data-reveal
                data-reveal-delay={i * 70}
                className="group rounded-[18px] border border-line-2 bg-paper-3 px-6 py-5 shadow-card transition-shadow hover:shadow-float"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-[17.5px] text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid h-7 w-7 flex-none place-items-center rounded-full border border-line-2 text-[15px] text-dusk-2 transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[70ch] text-[14.5px] leading-[1.7] text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ————— night falls again: the invitation ————— */}
      <SkyBridge to="night" />
      <section
        className="relative overflow-hidden pb-24 pt-16 text-dusk-ink"
        style={{ background: `linear-gradient(180deg, ${NIGHT}, #35335f)` }}
      >
        <div aria-hidden className="aurora aurora-a z-0" />
        <DuskField density={70} />
        <div data-reveal className="relative z-10 mx-auto max-w-[1120px] px-7 text-center">
          <OrbitMark size={56} className="mx-auto text-halo" />
          <h2 className="mx-auto mt-6 max-w-[22ch] font-serif text-[clamp(26px,3.6vw,40px)] font-light leading-[1.2] tracking-[-0.01em]">
            Know what is happening. Know who is responsible. Never forget what matters.
          </h2>

          {/* three quiet steps from here to the first brief */}
          <div className="mx-auto mt-10 grid max-w-[760px] gap-6 text-left sm:grid-cols-3">
            {[
              { n: "01", t: "Open your family space", d: "Two minutes. No card, no setup call." },
              { n: "02", t: "Invite the family", d: "Set consent together — everyone sees their part." },
              { n: "03", t: "By evening, it's working", d: "The first brief arrives like a letter from home." },
            ].map((s) => (
              <div key={s.n} className="border-t border-halo/25 pt-4">
                <div className="font-mono text-[11px] tracking-[0.14em] text-halo">{s.n}</div>
                <div className="mt-1.5 font-serif text-[17px] text-white">{s.t}</div>
                <p className="mt-1 text-[13px] leading-[1.55] text-[#c9c6e4]">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-in"
              className="lift rounded-pill bg-white px-7 py-3.5 text-[14.5px] font-semibold text-dusk no-underline"
            >
              Start your family space
            </Link>
            <Link
              href="/pricing"
              className="lift rounded-pill border border-halo/40 px-7 py-3.5 text-[14.5px] font-medium text-dusk-ink no-underline hover:border-halo"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-5 font-mono text-[12px] text-halo">
            Free for one Orbit · no card needed
          </p>
        </div>
      </section>
    </>
  );
}
