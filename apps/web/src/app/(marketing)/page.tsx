import Link from "next/link";
import { Eyebrow, OrbitMark } from "@kinos/ui";
import { ConsentRings } from "@/components/consent-rings";
import { DuskField } from "@/components/dusk-field";
import { OrbitPricing } from "@/components/orbit-pricing";
import { FAMILY_SATELLITES, OrbitSystem } from "@/components/orbit/orbit-system";
import { EveningStory } from "@/components/story/evening-story";
import { VoicesDeck } from "@/components/voices-deck";

/**
 * One Evening in One Orbit — the KinOS landing experience.
 *
 * Not stacked sections: one continuous evening. A dusk hero with a
 * living Orbit, a rewind to late afternoon, one family evening across
 * London and Harare that darkens into night as you scroll, and then —
 * without ever leaving that night — the Evening Brief, the Family
 * Record, the Consent Rings, the product surfaces the visitor already
 * met inside the story, pricing as Orbit rings, and a calm close.
 * The visitor enters with worry and leaves with calm.
 */

const NIGHT = "#2C2A4F";

/* The story's first daylight — two skies torn from one dusk. */
const LONDON_DAY = "#93A9CC";
const HARARE_DAY = "#E5B078";

function SectionHead({
  n,
  title,
  sub,
}: {
  n: string;
  title: string;
  sub?: string;
}) {
  return (
    <div data-reveal className="mx-auto flex max-w-[1060px] flex-col gap-2 px-6 md:flex-row md:items-baseline md:gap-4">
      <span className="font-mono text-[12px] tracking-[0.1em] text-halo">{n}</span>
      <h2 className="flex-1 font-serif text-[clamp(25px,3.2vw,36px)] font-normal leading-[1.1] tracking-[-0.02em] text-dusk-ink">
        {title}
      </h2>
      {sub && <p className="max-w-[36ch] text-[14px] leading-[1.55] text-[#c9c6e4]">{sub}</p>}
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

        <div className="relative z-10 mx-auto grid max-w-[1120px] items-center gap-10 px-6 pb-8 pt-14 md:grid-cols-[1.02fr_.98fr] md:pt-20">
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
              <Link
                href="#story"
                className="lift rounded-pill bg-white px-6 py-3 text-[14px] font-semibold text-dusk no-underline hover:bg-dusk-ink"
              >
                Live one evening
              </Link>
              <Link
                href="/sign-in"
                className="lift rounded-pill border border-halo/40 px-6 py-3 text-[14px] font-medium text-dusk-ink no-underline hover:border-halo"
              >
                Start your family space
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <OrbitSystem size={430} satellites={FAMILY_SATELLITES} className="max-w-full" />
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

      {/* ————— rewind: one dusk tears into two afternoons ————— */}
      <div aria-hidden className="relative grid h-44 grid-cols-2 md:h-56">
        <div style={{ background: `linear-gradient(180deg, ${NIGHT}, ${LONDON_DAY})` }} />
        <div style={{ background: `linear-gradient(180deg, ${NIGHT}, ${HARARE_DAY})` }} />
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-[11.5px] uppercase tracking-[0.22em] text-white/80">
          rewind to this afternoon
        </p>
      </div>

      {/* ————— 5.2 → 5.9 the evening itself ————— */}
      <section id="story" aria-label="One evening with a family">
        <EveningStory />
      </section>

      {/* everything after the merge stays in the night the story earned */}
      <div style={{ background: `linear-gradient(180deg, ${NIGHT} 0%, #312E58 24%, ${NIGHT} 52%, #35335F 100%)` }}>
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
                Mum is okay tonight. Her medication was taken, dinner was light, and Grace
                uploaded the pharmacy receipt. Dizziness was mentioned once and is worth
                checking tomorrow. Transport for the 10:00 clinic visit is now confirmed.
                Nothing else needs attention tonight.
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
            <div data-reveal className="flex flex-col">
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
        <section className="relative py-20">
          <SectionHead
            n="02"
            title="Privacy you can see"
            sub="Not a settings page. Rings around the person — and the family decides who stands on which one."
          />
          <div data-reveal className="mt-12 px-6">
            <ConsentRings />
          </div>
        </section>

        {/* ————— 5.13 product surfaces ————— */}
        <section className="relative py-20">
          <SectionHead
            n="03"
            title="You already met the product"
            sub="Everything in the story is a surface of KinOS. Nothing was a mock-up."
          />
          <div className="mx-auto mt-10 max-w-[1060px] px-6">
            {SURFACES.map(([saw, name, line], i) => (
              <div
                key={name}
                data-reveal
                data-reveal-delay={(i % 5) * 60}
                className="grid gap-1.5 border-t border-halo/15 py-5 first:border-t-0 md:grid-cols-[1fr_180px_1.2fr] md:items-baseline md:gap-8"
              >
                <span className="font-mono text-[11px] tracking-[0.06em] text-halo">{saw} →</span>
                <span className="font-serif text-[19px] text-white">{name}</span>
                <span className="text-[13.5px] leading-[1.6] text-[#c9c6e4]">{line}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ————— voices ————— */}
        <section className="relative py-20">
          <SectionHead
            n="04"
            title="The Moyo family, in their own words"
            sub="One orbit, five people, five kinds of relief. The deck deals itself — or tap it."
          />
          <div data-reveal className="mt-14 px-6 pb-8">
            <VoicesDeck />
          </div>
        </section>

        {/* ————— 5.14 pricing as orbit rings ————— */}
        <section className="relative py-20">
          <SectionHead
            n="05"
            title="Pricing that grows like a family"
            sub="Every plan is a wider orbit around the same person. Start free — one Orbit, forever."
          />
          <div data-reveal className="mt-12 px-6">
            <OrbitPricing />
          </div>
        </section>

        {/* ————— questions ————— */}
        <section className="relative py-20">
          <SectionHead n="06" title="The questions families actually ask" />
          <div className="mx-auto mt-10 flex max-w-[760px] flex-col gap-3.5 px-6">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                data-reveal
                data-reveal-delay={i * 60}
                className="group rounded-[18px] border border-line-2 bg-paper-3 px-6 py-5 shadow-card"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-[17px] text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid h-7 w-7 flex-none place-items-center rounded-full border border-line-2 text-[15px] text-dusk-2 transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[64ch] text-[14px] leading-[1.7] text-ink-soft">{f.a}</p>
              </details>
            ))}
            <p className="mt-2 text-center font-mono text-[12px] text-halo">
              Anything else — <Link href="/privacy" className="text-dusk-ink underline decoration-halo/40 underline-offset-4">the privacy promise</Link> says it in plain words.
            </p>
          </div>
        </section>

        {/* ————— 5.15 calm night close ————— */}
        <section className="relative overflow-hidden pb-28 pt-16">
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
              <Link
                href="/sign-in"
                className="lift rounded-pill bg-white px-7 py-3.5 text-[14.5px] font-semibold text-dusk no-underline"
              >
                Start your family space
              </Link>
            </div>
            <p className="mt-5 font-mono text-[12px] text-halo">Free for one Orbit · no card needed</p>
          </div>
        </section>
      </div>
    </>
  );
}
