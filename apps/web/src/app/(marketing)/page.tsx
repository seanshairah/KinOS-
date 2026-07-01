import Link from "next/link";
import { Eyebrow, OrbitMark, Pill } from "@kinos/ui";
import { DuskField } from "@/components/dusk-field";
import { ScrollStory } from "@/components/scroll-story";

/**
 * The KinOS landing page — a story, not a grid. A living dusk sky, one
 * evening with a family told by scrolling, and flowing editorial sections
 * underneath. Calm, but alive.
 */

/** The hero Orbit — the loved one as a lamplight heart, family circling. */
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
    pills: ["morning check-in ✓", "receipt filed · USD 23.50", "brief at your 07:00"],
  },
  {
    n: "02",
    who: "For the one holding it down at home",
    line: "Duties with owners, instead of a phone that never stops.",
    body: "Assign it once and stop chasing. Appointments carry their own transport plans. What's done, late, or missing is simply visible — to everyone, without a single nagging message.",
    pills: ["transport ✓ Sarah", "groceries · due Friday", "duty settled, family saw it"],
  },
  {
    n: "03",
    who: "For the person being cared for",
    line: "Supported like family. Never watched like a patient.",
    body: "A check-in that takes one tap. A voice note instead of a form. One button that reaches everyone who loves them — and a say in exactly who sees what.",
    pills: ["one-tap check-in", "big, readable type", "consent, always theirs"],
  },
] as const;

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

export default function LandingPage() {
  return (
    <>
      {/* ————— hero: a living dusk sky ————— */}
      <header className="relative isolate overflow-hidden bg-dusk text-dusk-ink">
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(120% 90% at 78% 18%, rgba(140,138,214,.42), transparent 55%)," +
              "radial-gradient(90% 70% at 12% 92%, rgba(217,138,61,.14), transparent 60%)," +
              "linear-gradient(180deg,#3d3b6b, #2c2a4f)",
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

      {/* ————— thesis ————— */}
      <section className="border-b border-t border-line bg-paper-2 py-20">
        <div data-reveal className="mx-auto max-w-[1120px] px-7">
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
                className="rounded-pill border border-line-2 px-3 py-[7px] font-mono text-[12px] text-ink-faint line-through decoration-ember"
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

      {/* ————— the story ————— */}
      <section id="story" className="relative">
        <div data-reveal className="mx-auto max-w-[1120px] px-7 pt-20">
          <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">01</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              One evening, two cities, one family
            </h2>
            <p className="max-w-[34ch] text-[14.5px] leading-[1.5] text-ink-soft">
              Tari in London. Mum, Sarah and Grace in Harare. Scroll through the evening
              KinOS was built for.
            </p>
          </div>
        </div>
        <ScrollStory />
      </section>

      {/* ————— how it stays calm — flowing, no boxes ————— */}
      <section className="border-t border-line bg-paper-2 py-20">
        <div data-reveal className="mx-auto max-w-[1120px] px-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">02</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              Built calm. Built private.
            </h2>
          </div>
          <div className="mt-12 flex flex-col">
            {PRINCIPLES.map((p) => (
              <div
                key={p.n}
                data-reveal
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

      {/* ————— for each of you — alternating editorial ————— */}
      <section className="py-20">
        <div className="mx-auto max-w-[1120px] px-7">
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
                className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
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
                <div
                  className={`flex flex-wrap content-center gap-2.5 ${i % 2 === 1 ? "md:justify-start" : "md:justify-end"}`}
                >
                  {p.pills.map((pill, j) => (
                    <Pill
                      key={pill}
                      tone={j === 0 ? "ok" : j === 1 ? "data" : "neutral"}
                      className="px-3.5 py-2 text-[12px]"
                    >
                      {pill}
                    </Pill>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— closing CTA ————— */}
      <section className="relative overflow-hidden border-t border-line bg-dusk py-24 text-dusk-ink">
        <div aria-hidden className="aurora aurora-a z-0" />
        <DuskField density={70} />
        <div data-reveal className="relative z-10 mx-auto max-w-[1120px] px-7 text-center">
          <OrbitMark size={56} className="mx-auto text-halo" />
          <h2 className="mx-auto mt-6 max-w-[22ch] font-serif text-[clamp(26px,3.6vw,40px)] font-light leading-[1.2] tracking-[-0.01em]">
            Know what is happening. Know who is responsible. Never forget what matters.
          </h2>
          <div className="mt-9 flex justify-center gap-3">
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
