import Link from "next/link";
import { Eyebrow, OrbitMark } from "@kinos/ui";
import { ConsentRings } from "@/components/consent-rings";
import { Lamplight } from "@/components/lamplight";
import { Magnetic } from "@/components/magnetic";
import { ScrollThread } from "@/components/scroll-thread";
import { DuskField } from "@/components/dusk-field";
import { HorizonArc } from "@/components/horizon-arc";
import { OrbitPricing } from "@/components/orbit-pricing";
import { FAMILY_SATELLITES, OrbitSystem } from "@/components/orbit/orbit-system";
import { EveningStory } from "@/components/story/evening-story";
import { FaqList } from "@/components/faq-list";
import { VoicesDeck } from "@/components/voices-deck";

/**
 * One Evening in One Orbit — the KinOS landing experience.
 *
 * A full day's cycle, not stacked sections. Dusk hero → rewind to the
 * afternoon → one family evening across London and Harare that darkens
 * into night → the night holds what was earned (Evening Brief, Family
 * Record, Consent Rings) → then morning comes, and the practical,
 * human sections breathe in warm paper light (surfaces, voices,
 * belonging, questions) → dusk falls once more for pricing as Orbit
 * rings and a calm close. The visitor enters with worry, passes
 * through night, and leaves in the calm of the next morning.
 */

const NIGHT = "#2C2A4F";

/** Slow pools of light + paper grain — daylight sections stay alive. */
function AmbientLight({ variant = 0 }: { variant?: 0 | 1 }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {variant === 0 ? (
        <>
          <div
            className="orb orb-a"
            style={{ width: 520, height: 520, top: "-34%", right: "-10%", background: "radial-gradient(circle, rgba(169,167,224,.14), transparent 65%)" }}
          />
          <div
            className="orb orb-b"
            style={{ width: 420, height: 420, bottom: "-22%", left: "-6%", background: "radial-gradient(circle, rgba(217,138,61,.12), transparent 65%)" }}
          />
        </>
      ) : (
        <>
          <div
            className="orb orb-b"
            style={{ width: 560, height: 560, top: "-32%", left: "-12%", background: "radial-gradient(circle, rgba(169,167,224,.12), transparent 65%)" }}
          />
          <div
            className="orb orb-a"
            style={{ width: 440, height: 440, bottom: "-18%", right: "-4%", background: "radial-gradient(circle, rgba(78,158,126,.11), transparent 65%)" }}
          />
        </>
      )}
      <div className="grain" />
    </div>
  );
}

function SectionHead({
  n,
  title,
  sub,
  light = false,
}: {
  n: string;
  title: string;
  sub?: string;
  light?: boolean;
}) {
  return (
    <div data-reveal data-reveal-blur className="relative mx-auto flex max-w-[1060px] flex-col gap-2 px-6 md:flex-row md:items-baseline md:gap-4">
      <span className={`font-mono text-[12px] tracking-[0.1em] ${light ? "text-dusk-2" : "text-halo"}`}>{n}</span>
      <h2
        className={`flex-1 font-serif text-[clamp(25px,3.2vw,36px)] font-normal leading-[1.1] tracking-[-0.02em] ${
          light ? "text-ink" : "text-dusk-ink"
        }`}
      >
        {title}
      </h2>
      {sub && (
        <p className={`max-w-[36ch] text-[14px] leading-[1.55] ${light ? "text-ink-soft" : "text-[#c9c6e4]"}`}>{sub}</p>
      )}
    </div>
  );
}

/* 5.11 — the evening, kept. */
const RECORD_ROWS = [
  ["18:58", "Check-in received"],
  ["19:04", "Voice note from Grace"],
  ["19:05", "Dizziness mentioned · worth a check"],
  ["19:06", "Pharmacy receipt uploaded · USD 23.50"],
  ["19:10", "Transport duty assigned to Sarah"],
  ["19:24", "Transport confirmed"],
  ["20:00", "Evening Brief created"],
] as const;

/* 5.13 — each surface emerges from something the visitor already saw. */
const SURFACES = [
  ["The whole family at a glance", "Orbit View", "Presence first, meaning second, detail on intent."],
  ["The voice note you heard", "Life Signals", "Family words become quiet, structured awareness."],
  ["The gap that turned ember", "Attention Needed", "One thing, one owner, one calm escalation path."],
  ["Sarah taking it", "Duties", "Responsibility with names, due times, and quiet nudges."],
  ["The clinic tomorrow", "Appointments & Medication", "Visits carry their own plans; doses keep their rhythm."],
  ["The receipt Grace uploaded", "Money Pot", "Contributions, expenses, and proof — to the cent."],
  ["The letter at 20:00", "Daily Brief", "The day, written calmly, read in thirty seconds."],
  ["The evening, kept", "Family Record", "Searchable years later. It never scrolls away."],
  ["The rings you closed", "Consent Centre", "Access is granted by the family and enforced by the database."],
  ["The button she hopes to never need", "Emergency Layer", "One tap reaches everyone who loves her."],
] as const;

/* The river of moments — a family's quiet life drifting by, in morning light. */
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
    a: "One Orbit — one person at the centre, the whole family around them — is free, with no card needed. Growing families add more orbits and the shared Money Pot on the family plans.",
  },
  {
    q: "Whose data is this?",
    a: "The family's. All of it — every check-in, voice note, receipt and brief — exportable in plain, readable form whenever you ask. It is never sold, never shown to advertisers, and never used for anything but your own family's awareness.",
  },
] as const;

export default function LandingPage() {
  return (
    <>
      {/* ————— 5.1 dusk hero ————— */}
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
        <Lamplight />
        {/* the hero's stars and aurora settle into flat night before the
            rewind begins — no edge where the canvas ends */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-[5] h-44"
          style={{ background: `linear-gradient(180deg, transparent, ${NIGHT})` }}
        />

        <div className="relative z-10 mx-auto grid max-w-[1120px] items-center gap-10 px-6 pb-8 pt-28 md:grid-cols-[1.02fr_.98fr] md:pt-32">
          <div>
            <Eyebrow className="text-halo">Private family operating system</Eyebrow>
            <h1 className="mt-5 font-serif text-[clamp(38px,6.2vw,72px)] font-normal leading-[1.02] tracking-[-0.02em]">
              The people you
              <br />
              love, in <em className="italic text-white">one</em>
              <br />
              calm orbit.
            </h1>
            <p className="mt-6 max-w-[34ch] text-[clamp(16px,1.7vw,19px)] leading-[1.55] text-[#d7d5ee]">
              KinOS turns scattered family updates into quiet awareness — what happened,
              what needs attention, who is responsible, and what must not be forgotten.
            </p>
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-pill border border-halo/30 px-4 py-2 font-mono text-[12px] tracking-[0.02em] text-halo">
              <span
                className="h-[7px] w-[7px] rounded-full bg-calm"
                style={{ boxShadow: "0 0 0 4px rgba(78,158,126,.22)" }}
              />
              Know what matters before it becomes a crisis
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  href="#story"
                  className="lift rounded-pill bg-white px-6 py-3 text-[14px] font-semibold text-dusk no-underline hover:bg-dusk-ink"
                >
                  Live one evening
                </Link>
              </Magnetic>
              <Magnetic>
                <Link
                  href="/sign-in"
                  className="lift rounded-pill border border-halo/40 px-6 py-3 text-[14px] font-medium text-dusk-ink no-underline hover:border-halo"
                >
                  Start your family space
                </Link>
              </Magnetic>
            </div>
          </div>
          <div className="flex justify-center">
            <OrbitSystem size={430} satellites={FAMILY_SATELLITES} className="max-w-full" assemble />
          </div>
        </div>

        <div className="relative z-10 pb-7 text-center">
          <div className="scroll-cue inline-flex flex-col items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-halo">
            <span>hover a light · then scroll</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </header>

      {/* ————— rewind: one continuous sky, night easing back into
                this afternoon — no boundary at all ————— */}
      <div
        aria-hidden
        className="relative h-72 md:h-96"
        style={{
          background:
            "radial-gradient(80% 85% at 8% 100%, #93A9CC4D, transparent 60%)," +
            "radial-gradient(80% 85% at 92% 100%, #E5B07859, transparent 60%)," +
            `linear-gradient(180deg, ${NIGHT} 0%, #34315C 18%, #454273 36%, #5D5A94 54%, #7E82AC 72%, #93A0C0 86%, #A9B6D1 100%)`,
        }}
      >
        <p className="absolute inset-x-0 top-[34%] text-center font-mono text-[11.5px] uppercase tracking-[0.22em] text-white/70">
          rewind to this afternoon
        </p>
      </div>

      {/* ————— 5.2 → 5.9 the evening itself ————— */}
      <section id="story" aria-label="One evening with a family">
        <EveningStory />
      </section>

      {/* ————— the night holds what the evening earned ————— */}
      <div className="relative" style={{ background: `linear-gradient(180deg, ${NIGHT} 0%, #312E58 45%, ${NIGHT} 100%)` }}>
        <Lamplight />
        {/* ————— 5.10 evening brief ————— */}
        <section className="relative overflow-hidden py-24">
          <DuskField density={60} />
          <div data-reveal className="relative mx-auto max-w-[620px] px-6">
            <p className="text-center font-mono text-[11.5px] uppercase tracking-[0.2em] text-halo">
              20:00 · the Daily Brief
            </p>
            <div
              className="mt-6 rounded-[22px] border border-line-2 bg-paper-3 p-8 shadow-float md:p-10"
              style={{
                filter:
                  "drop-shadow(0 40px 80px rgba(10,8,30,.55)) drop-shadow(0 0 60px rgba(169,167,224,.16))",
              }}
            >
              <div className="mb-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                <span>Tuesday evening · for Mum</span>
                <OrbitMark size={16} className="text-dusk" />
              </div>
              <p className="font-serif text-[clamp(18px,2.2vw,21px)] font-light leading-[1.7] text-ink">
                {[
                  "Mum is okay tonight.",
                  "Her medication was taken, dinner was light, and Grace uploaded the pharmacy receipt.",
                  "Dizziness was mentioned once and is worth checking tomorrow.",
                  "Transport for the 10:00 clinic visit is now confirmed.",
                  "Nothing else needs attention tonight.",
                ].map((line, i) => (
                  <span key={line} data-reveal data-reveal-delay={300 + i * 420}>
                    {line}{" "}
                  </span>
                ))}
              </p>
              <p className="mt-6 border-t border-line pt-4 font-mono text-[11px] text-ink-faint">
                read in thirty seconds · kept forever in the Family Record
              </p>
            </div>
            <p className="mt-6 text-center text-[14.5px] leading-[1.6] text-[#c9c6e4]">
              Like a letter from home — not a log, not a report.
            </p>
          </div>
        </section>

        {/* ————— 5.11 family record ————— */}
        <section className="relative py-20">
          <SectionHead
            n="01"
            title="KinOS remembers what families forget"
            sub="Tonight became a record the moment it happened. Years from now, it still answers."
          />
          <div className="mx-auto mt-12 grid max-w-[1060px] gap-12 px-6 md:grid-cols-[1fr_1.05fr] md:gap-16">
            <div data-reveal className="relative flex flex-col pl-6">
              <ScrollThread className="bottom-3 left-0 top-3" />
              {RECORD_ROWS.map(([time, text], i) => (
                <div
                  key={time}
                  data-reveal
                  data-reveal-delay={i * 70}
                  className="flex items-baseline gap-4 border-t border-halo/15 py-3.5 first:border-t-0"
                >
                  <span className="w-[52px] flex-none font-mono text-[12px] text-halo">{time}</span>
                  <span className="text-[14px] text-dusk-ink">{text}</span>
                </div>
              ))}
            </div>
            <div data-reveal data-reveal-delay={150}>
              <div className="rounded-[18px] border border-halo/25 bg-white/5 px-5 py-4 backdrop-blur-sm">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-halo">
                  Ask the Family Memory
                </div>
                <p className="mt-2 font-serif text-[19px] italic text-dusk-ink">
                  “When did Mum first mention dizziness?”
                </p>
              </div>
              <div className="mt-4 rounded-[18px] border border-line-2 bg-paper-3 px-5 py-4 shadow-float">
                <p className="text-[14.5px] leading-[1.65] text-ink">
                  Tonight at 19:04, in Grace&apos;s voice note. Marked{" "}
                  <b className="font-semibold">worth a check</b>.
                </p>
                <p className="mt-2 font-mono text-[10.5px] text-ink-faint">
                  answered from the Family Record · source kept
                </p>
              </div>
              <p className="mt-6 max-w-[44ch] text-[14.5px] leading-[1.65] text-[#c9c6e4]">
                Decisions, documents, voice notes, receipts — the group chat scrolls past
                them. The Family Record never does.
              </p>
            </div>
          </div>
        </section>

        {/* ————— 5.12 consent rings ————— */}
        <section className="relative pb-24 pt-20">
          <SectionHead
            n="02"
            title="Privacy you can see"
            sub="Not a settings page. Rings around the person — and the family decides who stands on which one."
          />
          <div data-reveal className="mt-12 px-6">
            <ConsentRings />
          </div>
        </section>
      </div>

      {/* ————— morning comes ————— */}
      <HorizonArc variant="dawn" caption="and then — morning" />

      <div className="bg-paper-2">
        {/* ————— 5.13 product surfaces, in daylight ————— */}
        <section className="relative py-20">
          <AmbientLight variant={0} />
          <SectionHead
            n="03"
            light
            title="You already met the product"
            sub="Everything in the story is a surface of KinOS. Nothing was a mock-up."
          />
          <div className="relative mx-auto mt-10 max-w-[1060px] px-6">
            {SURFACES.map(([saw, name, line], i) => (
              <div
                key={name}
                data-reveal
                data-reveal-delay={(i % 5) * 60}
                className="grid gap-1.5 border-t border-line py-5 first:border-t-0 md:grid-cols-[1fr_180px_1.2fr] md:items-baseline md:gap-8"
              >
                <span className="font-mono text-[11px] tracking-[0.06em] text-dusk-2">{saw} →</span>
                <span className="font-serif text-[19px] text-ink">{name}</span>
                <span className="text-[13.5px] leading-[1.6] text-ink-soft">{line}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ————— voices, in morning light ————— */}
        <section className="relative py-20">
          <AmbientLight variant={1} />
          <SectionHead
            n="04"
            light
            title="The Moyo family, in their own words"
            sub="One orbit, five people, five kinds of relief. The deck deals itself — or tap it."
          />
          <div data-reveal className="relative mt-14 px-6 pb-8">
            <VoicesDeck />
          </div>
        </section>

        {/* ————— belonging: the exhale ————— */}
        <section className="relative pb-24 pt-20">
          <AmbientLight variant={0} />
          <div className="relative">
            <div data-reveal className="mx-auto max-w-[1120px] px-6 text-center">
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

        {/* ————— questions, in plain daylight ————— */}
        <section className="relative py-20">
          <AmbientLight variant={1} />
          <div className="relative mx-auto grid max-w-[1060px] gap-10 px-6 md:grid-cols-[1fr_1.6fr] md:gap-16">
            <div data-reveal>
              <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">05</span>
              <h2 className="mt-2 max-w-[16ch] font-serif text-[clamp(25px,3.2vw,36px)] font-normal leading-[1.12] tracking-[-0.02em] text-ink">
                The questions families actually ask
              </h2>
              <p className="mt-4 max-w-[36ch] text-[14.5px] leading-[1.6] text-ink-soft">
                Asked by real families, answered without fine print. Anything else — the
                privacy page says it all in plain words.
              </p>
              <Link
                href="/privacy"
                className="mt-5 inline-block font-mono text-[12.5px] text-dusk-2 underline decoration-line-2 underline-offset-4 hover:text-dusk"
              >
                Read the privacy promise →
              </Link>
            </div>
            <FaqList items={FAQS} />
          </div>
        </section>
      </div>

      {/* ————— dusk falls once more: the invitation ————— */}
      <HorizonArc variant="nightfall" caption="and when evening comes again" />

      <div className="relative" style={{ background: `linear-gradient(180deg, ${NIGHT}, #35335F)` }}>
        <Lamplight />
        {/* ————— 5.14 pricing as orbit rings ————— */}
        <section className="relative py-20">
          <SectionHead
            n="06"
            title="Pricing that grows like a family"
            sub="Every plan is a wider orbit around the same person. Start free — one Orbit, forever."
          />
          <div data-reveal className="mt-12 px-6">
            <OrbitPricing />
          </div>
        </section>

        {/* ————— 5.15 calm night close ————— */}
        <section className="relative overflow-hidden pb-28 pt-10">
          <DuskField density={70} />
          <div data-reveal className="relative mx-auto max-w-[860px] px-6 text-center">
            <div className="flex justify-center">
              <OrbitSystem size={340} satellites={FAMILY_SATELLITES} />
            </div>
            <div className="mx-auto mt-10 flex max-w-[30ch] flex-col gap-1.5 font-serif text-[clamp(21px,2.8vw,30px)] font-light leading-[1.35] text-dusk-ink">
              <span>Tonight, nothing is lost.</span>
              <span className="text-[0.72em] text-[#c9c6e4]">The check-in was recorded.</span>
              <span className="text-[0.72em] text-[#c9c6e4]">The receipt was filed.</span>
              <span className="text-[0.72em] text-[#c9c6e4]">The duty was handled.</span>
              <span className="mt-1 text-white">The family knows.</span>
            </div>
            <div className="mt-10">
              <Magnetic>
                <Link
                  href="/sign-in"
                  className="lift rounded-pill bg-white px-7 py-3.5 text-[14.5px] font-semibold text-dusk no-underline"
                >
                  Start your family space
                </Link>
              </Magnetic>
            </div>
            <p className="mt-5 font-mono text-[12px] text-halo">Free for one Orbit · no card needed</p>
          </div>
        </section>
      </div>
    </>
  );
}
