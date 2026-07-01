import Link from "next/link";
import {
  AttentionItem,
  BriefBlock,
  ClockIcon,
  DeviceFrame,
  Eyebrow,
  ListIcon,
  OrbitCard,
  OrbitMark,
  SignalRow,
  SignalValue,
} from "@kinos/ui";

/**
 * The hero Orbit — the loved one as a warm lamplight heart, family and
 * signals circling in calm motion, ambient stars breathing behind.
 */
function HeroOrbit() {
  const stars: [number, number, number, number][] = [
    [42, 84, 1.6, 0], [330, 46, 1.3, 1.8], [356, 132, 1.1, 3.4], [24, 210, 1.4, 2.6],
    [70, 322, 1.2, 4.2], [300, 328, 1.5, 1.2], [222, 22, 1.1, 5.0], [148, 352, 1.2, 2.2],
  ];
  return (
    <div aria-hidden className="grid min-h-[320px] place-items-center md:min-h-[360px]">
      <svg width="380" height="380" viewBox="0 0 380 380" className="max-w-full text-halo">
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

        {/* ambient stars, breathing on their own slow clocks */}
        {stars.map(([x, y, r, delay]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={r}
            fill="var(--dusk-ink)"
            opacity=".45"
            className="breathe"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}

        {/* orbit rings with a faint comet trail on the outer path */}
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

        {/* the loved one: layered lamplight, a paper core, a quiet heart */}
        <circle cx="190" cy="190" r="52" fill="url(#core-glow)" className="breathe" />
        <circle cx="190" cy="190" r="27" fill="rgba(237,235,246,.16)" />
        <circle cx="190" cy="190" r="20" fill="#FEFCF9" />
        <path
          d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10Z"
          transform="translate(177.8, 178.2) scale(1.02)"
          fill="var(--dusk-3)"
          fillOpacity=".22"
          stroke="var(--dusk-2)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* inner orbit — the daily rhythm */}
        <g className="spin-fast">
          <circle cx="262" cy="190" r="13" fill="url(#calm-glow)" />
          <circle cx="262" cy="190" r="6.5" fill="var(--calm)" />
          <circle cx="118" cy="190" r="5" fill="var(--dusk-ink)" opacity=".85" />
        </g>
        {/* mid orbit — the family */}
        <g className="spin-med">
          <circle cx="190" cy="70" r="14" fill="url(#ember-glow)" />
          <circle cx="190" cy="70" r="7" fill="var(--ember)" />
          <circle cx="296" cy="248" r="5.5" fill="var(--dusk-ink)" opacity=".75" />
          <circle cx="96" cy="252" r="4.5" fill="var(--halo)" />
        </g>
        {/* outer orbit — the wider world */}
        <g className="spin-slow">
          <circle cx="358" cy="190" r="5" fill="var(--dusk-ink)" opacity=".6" />
          <circle cx="120" cy="52" r="4" fill="var(--halo)" opacity=".85" />
          <circle cx="250" cy="336" r="4.5" fill="var(--dusk-ink)" opacity=".55" />
        </g>
      </svg>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* ————— hero ————— */}
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
        <div className="relative z-10 mx-auto grid max-w-[1120px] items-center gap-12 px-7 pb-16 pt-14 md:grid-cols-[1.05fr_.95fr] md:pb-24 md:pt-20">
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
                className="rounded-pill bg-white px-6 py-3 text-[14px] font-semibold text-dusk no-underline hover:bg-dusk-ink"
              >
                Start your family space
              </Link>
              <Link
                href="#product"
                className="rounded-pill border border-halo/40 px-6 py-3 text-[14px] font-medium text-dusk-ink no-underline hover:border-halo"
              >
                See how it feels
              </Link>
            </div>
          </div>
          <HeroOrbit />
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

      {/* ————— every family runs a hidden operation ————— */}
      <section id="families" className="py-20">
        <div data-reveal className="mx-auto max-w-[1120px] px-7">
          <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">01</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              Every family already runs a hidden operation
            </h2>
            <p className="max-w-[34ch] text-[14.5px] leading-[1.5] text-ink-soft">
              Today it lives in group chats, phone calls, memory, and scattered receipts.
              KinOS gives it a home.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "For the child abroad",
                body: "Daily proof that Mum is okay. Where the money went, receipt by receipt. The clinic visit you can see was handled — from six time zones away.",
              },
              {
                title: "For the one holding it down at home",
                body: "Duties with owners instead of endless chasing. Appointments with transport confirmed. One place that knows what's done, late, or missing.",
              },
              {
                title: "For the person being cared for",
                body: "A check-in that takes one tap. A voice note instead of a form. One button that reaches the whole family in an emergency. Supported — never watched.",
              },
            ].map((card) => (
              <div key={card.title} className="lift rounded-orbit border border-line bg-paper-3 p-6 shadow-card">
                <h3 className="font-serif text-[20px] leading-snug text-ink">{card.title}</h3>
                <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— the system, in use ————— */}
      <section id="product" className="border-t border-line bg-paper-2 py-20">
        <div data-reveal className="mx-auto max-w-[1120px] px-7">
          <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">02</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              The system, in use
            </h2>
            <p className="max-w-[34ch] text-[14.5px] leading-[1.5] text-ink-soft">
              Orbit View, the Daily Brief, Attention Needed and the Life Signals feed —
              calm surfaces over a system that never sleeps.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-[1.15fr_.85fr]">
            <DeviceFrame
              title="Orbit View"
              right="Tue · 08:10"
              icon={<OrbitMark size={18} className="text-dusk" />}
            >
              <div className="flex flex-col gap-3">
                <OrbitCard
                  name="Mum"
                  subline="Checked in · Clinic tomorrow 10:00"
                  status="attention"
                  avatarIndex={0}
                  signals={[
                    { label: "morning dose ✓", tone: "ok" },
                    { label: "transport open", tone: "attn" },
                    { label: "mood · low", tone: "neutral" },
                  ]}
                />
                <OrbitCard
                  name="Tendai · school"
                  subline="Pickup confirmed · Fees paid"
                  status="steady"
                  avatarIndex={1}
                  signals={[
                    { label: "pickup ✓", tone: "ok" },
                    { label: "homework club", tone: "ok" },
                  ]}
                />
                <OrbitCard
                  name="Baba · recovery"
                  subline="Nurse visit logged 07:40"
                  status="steady"
                  avatarIndex={2}
                  signals={[
                    { label: "wound dressed", tone: "ok" },
                    { label: "sleep · 6h 20m", tone: "neutral" },
                  ]}
                />
              </div>
            </DeviceFrame>

            <DeviceFrame title="Daily Brief" right="Morning">
              <BriefBlock
                meta="Tuesday · for Mum"
                actions={
                  <>
                    <span className="rounded-pill bg-dusk px-3.5 py-2 text-[12.5px] font-medium text-white">
                      Assign transport
                    </span>
                    <span className="rounded-pill border border-line bg-paper-3 px-3.5 py-2 text-[12.5px] font-medium text-ink">
                      Send Sarah a nudge
                    </span>
                  </>
                }
              >
                Mum is <span className="italic text-dusk-2">okay</span> today. Morning
                medication was taken and breakfast eaten. Lunch was light and her mood seems
                a little low.{" "}
                <span className="font-medium italic text-ember">
                  Sarah hasn&apos;t confirmed transport
                </span>{" "}
                for tomorrow&apos;s 10:00 clinic review, and electricity is due in 2 days.
              </BriefBlock>
            </DeviceFrame>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[1.15fr_.85fr]">
            <DeviceFrame title="Attention Needed" right="2 open">
              <div className="flex flex-col gap-4">
                <AttentionItem
                  icon={<ClockIcon />}
                  title="Transport not confirmed"
                  detail="Clinic review tomorrow, 10:00 · no one assigned yet."
                  owner="owner: Sarah · escalates 18:00"
                />
                <AttentionItem
                  icon={<ListIcon />}
                  title="Electricity bill due"
                  detail="USD 41 · due in 2 days · pay from Money Pot."
                  owner="owner: you"
                />
              </div>
            </DeviceFrame>

            <DeviceFrame title="Life Signals" right="today">
              <div>
                <SignalRow time="08:05" meta="manual check-in · steady">
                  Morning medication <SignalValue>taken</SignalValue>
                </SignalRow>
                <SignalRow time="08:00" meta="caregiver voice note · follow-up added">
                  Voice note from caregiver → <SignalValue>appetite low</SignalValue>,
                  dizziness mentioned
                </SignalRow>
                <SignalRow time="07:42" meta="receipt scan · Money Pot updated">
                  Pharmacy receipt · <SignalValue>USD 23.50</SignalValue>
                </SignalRow>
                <SignalRow time="06:30" meta="night rhythm · pattern watch">
                  Sleep <SignalValue>5h 40m</SignalValue> — below her usual week
                </SignalRow>
              </div>
            </DeviceFrame>
          </div>

          <p className="mt-6 text-[13.5px] leading-[1.5] text-ink-soft">
            <b className="font-semibold text-ink">One messy voice note in — clarity out.</b>{" "}
            KinOS reads the note, files the receipt, updates the pot, watches the pattern,
            and surfaces only the transport gap. The family feels understood, not analysed.
          </p>
        </div>
      </section>

      {/* ————— how it stays calm ————— */}
      <section className="py-20">
        <div data-reveal className="mx-auto max-w-[1120px] px-7">
          <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dusk-2">03</span>
            <h2 className="flex-1 font-serif text-[clamp(26px,3.4vw,38px)] font-normal leading-[1.08] tracking-[-0.02em]">
              Built calm. Built private.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="lift rounded-orbit border border-line bg-paper-3 p-6">
              <h4 className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-ink-soft">
                Alerts mean something
              </h4>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">
                When nothing needs attention, the screen is warm and quiet. Ember appearing
                means something — so it never appears for nothing. Attention is judged
                against <i>your person&apos;s</i> normal rhythm, not a generic threshold.
              </p>
            </div>
            <div className="lift rounded-orbit border border-line bg-paper-3 p-6">
              <h4 className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-ink-soft">
                Consent is the foundation
              </h4>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">
                Every member sees only what their role and explicit consent allow — enforced
                in the database itself, not a settings toggle. Revoking access takes effect
                on the very next query. Your family&apos;s record belongs to your family.
              </p>
            </div>
            <div className="lift rounded-orbit border border-line bg-paper-3 p-6">
              <h4 className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-ink-soft">
                A memory that answers
              </h4>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">
                &ldquo;When did Dad first mention leg pain?&rdquo; &ldquo;Which pharmacy do
                we use now?&rdquo; The Family Record keeps decisions, documents and moments —
                searchable in plain words, years later.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ————— closing CTA ————— */}
      <section className="border-t border-line bg-paper-2 py-20">
        <div data-reveal className="mx-auto max-w-[1120px] px-7 text-center">
          <OrbitMark size={56} className="mx-auto text-dusk" />
          <h2 className="mx-auto mt-6 max-w-[22ch] font-serif text-[clamp(26px,3.6vw,40px)] font-light leading-[1.2] tracking-[-0.01em]">
            Know what is happening. Know who is responsible. Never forget what matters.
          </h2>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-pill bg-dusk px-7 py-3.5 text-[14.5px] font-semibold text-white no-underline hover:bg-dusk-2"
            >
              Start your family space
            </Link>
            <Link
              href="/pricing"
              className="rounded-pill border border-line bg-paper-3 px-7 py-3.5 text-[14.5px] font-medium text-ink no-underline hover:border-line-2"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-5 font-mono text-[12px] text-ink-faint">
            Free for one Orbit · no card needed
          </p>
        </div>
      </section>
    </>
  );
}
