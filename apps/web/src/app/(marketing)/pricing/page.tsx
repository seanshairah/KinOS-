import type { Metadata } from "next";
import Link from "next/link";
import { PLANS, planHasFeature, type FeatureKey, type PlanId } from "@kinos/config";
import { Eyebrow } from "@kinos/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free with one loved one. Grow into the plan that matches your family's reality — including caring across borders.",
};

/**
 * Pricing — the sky you're buying into. Cards carry the feeling; the
 * comparison table is generated from the plan config itself, so the page
 * can never promise something the database doesn't enforce.
 */

const ORDER = ["free", "family_core", "family_plus", "diaspora_care", "family_premium"] as const;

const HIGHLIGHTS: Record<string, string[]> = {
  free: ["One loved one at the centre", "One-tap check-ins", "Duties & appointments", "Emergency contacts"],
  family_core: [
    "The Daily Brief, morning & evening",
    "Medication rhythm & refills",
    "The Family Record begins",
    "Up to 5 members",
  ],
  family_plus: [
    "Everything in Family Core",
    "Money Pot with receipts, to the cent",
    "Patterns against her own baseline",
    "2 Orbits · 10 members",
  ],
  diaspora_care: [
    "Everything in Family Plus",
    "Caregiver proof of care",
    "Global cards + EcoCash in one fund",
    "Briefs timed to every timezone",
  ],
  family_premium: [
    "Everything in Diaspora Care",
    "Up to 6 Orbits, 20 members",
    "Consent-scoped caregiver access",
    "Document vault",
  ],
};

const TABLE_ROWS: { label: string; feature?: FeatureKey; value?: (p: PlanId) => string }[] = [
  { label: "Loved ones (Orbits)", value: (p) => String(PLANS[p].maxOrbits) },
  { label: "Family members", value: (p) => String(PLANS[p].maxMembers) },
  { label: "Duties & appointments", feature: "duties" },
  { label: "The Daily Brief", feature: "daily_brief" },
  { label: "Medication rhythm", feature: "medication" },
  { label: "Family Record", feature: "family_record" },
  { label: "Money Pot & receipts", feature: "money_pot" },
  { label: "Patterns & baselines", feature: "patterns" },
  { label: "Caregiver access", feature: "caregiver_access" },
  { label: "Proof of care", feature: "caregiver_proof" },
  { label: "Document vault", feature: "document_vault" },
];

const FAQS = [
  {
    q: "Who pays — and who never does?",
    a: "One person upgrades and the whole family is covered. The person being cared for never pays and never needs a card.",
  },
  {
    q: "What happens if we stop paying?",
    a: "Your space quietly returns to the Free plan. Nothing is deleted; the record your family built stays yours, and you can export all of it at any time.",
  },
  {
    q: "How do payments work from Zimbabwe?",
    a: "Cards work anywhere in the world through Stripe, and EcoCash works through Paynow. Contributions to the family's care fund accept both, so relatives at home and abroad give into the same pot.",
  },
  {
    q: "Is our family's information used for anything else?",
    a: "No. Consent is enforced by the database itself, we never sell data, and health information carries its own per-measurement sharing dial that the person at the centre controls.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* ——— hero: the sky ——— */}
      <section className="relative overflow-hidden bg-dusk pb-24 pt-32 text-dusk-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 90% at 50% -10%, rgba(140,138,214,.35), transparent 60%), radial-gradient(40% 50% at 85% 80%, rgba(217,138,61,.10), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-340px] h-[720px] w-[720px] -translate-x-1/2 rounded-full border border-halo/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-480px] h-[1000px] w-[1000px] -translate-x-1/2 rounded-full border border-halo/10"
        />
        <div className="relative z-10 mx-auto max-w-[1120px] px-7 text-center">
          <Eyebrow className="text-halo">Pricing</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-[24ch] font-serif text-[clamp(32px,5vw,54px)] font-light leading-[1.08] tracking-[-0.02em] text-white">
            Less than a phone call home.
            <br />
            <span className="text-halo">Worth more than a hundred of them.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-[15.5px] leading-[1.7] text-[#d7d5ee]">
            Start free with one loved one. Grow into the plan that matches your
            family&apos;s reality — including caring across borders.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-halo">
            <span className="rounded-pill border border-halo/30 px-4 py-1.5">Consent enforced in the database</span>
            <span className="rounded-pill border border-halo/30 px-4 py-1.5">Cancel anytime · keep your record</span>
            <span className="rounded-pill border border-halo/30 px-4 py-1.5">The centre never pays</span>
          </div>
        </div>
      </section>

      {/* ——— the tiers ——— */}
      <section className="relative pb-16">
        <div className="mx-auto -mt-14 max-w-[1180px] px-7">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {ORDER.map((planId) => {
              const plan = PLANS[planId];
              const featured = planId === "diaspora_care";
              const perDay =
                plan.priceCentsMonthly > 0
                  ? `about $${(plan.priceCentsMonthly / 100 / 30).toFixed(2)} a day`
                  : "for as long as you like";
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-orbit border p-6 transition-transform duration-300 hover:-translate-y-1 ${
                    featured
                      ? "border-ember/50 bg-dusk text-dusk-ink shadow-float"
                      : "border-line bg-paper-3 shadow-card"
                  }`}
                >
                  {featured && (
                    <>
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-orbit"
                        style={{
                          background:
                            "radial-gradient(80% 60% at 50% 0%, rgba(217,138,61,.14), transparent 65%)",
                        }}
                      />
                      <span className="relative mb-3 self-start rounded-pill bg-ember px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white">
                        Made for diaspora
                      </span>
                    </>
                  )}
                  <div className="relative flex flex-1 flex-col">
                    <h3 className={`text-[15px] font-semibold ${featured ? "text-white" : "text-ink"}`}>
                      {plan.name}
                    </h3>
                    <p className={`mt-1 min-h-[34px] text-[12.5px] leading-snug ${featured ? "text-halo" : "text-ink-soft"}`}>
                      {plan.audience}
                    </p>
                    <div className="mt-4 font-serif text-[38px] font-light leading-none">
                      {plan.priceCentsMonthly === 0 ? (
                        "Free"
                      ) : (
                        <>
                          ${(plan.priceCentsMonthly / 100).toFixed(0)}
                          <span className={`font-sans text-[13px] ${featured ? "text-halo" : "text-ink-faint"}`}>
                            {" "}/month
                          </span>
                        </>
                      )}
                    </div>
                    <p className={`mt-1 font-mono text-[10.5px] uppercase tracking-[0.1em] ${featured ? "text-halo/80" : "text-ink-faint"}`}>
                      {perDay}
                    </p>
                    <ul
                      className={`mt-5 flex flex-1 flex-col gap-2.5 text-[13px] leading-snug ${
                        featured ? "text-[#d7d5ee]" : "text-ink-soft"
                      }`}
                    >
                      {(HIGHLIGHTS[plan.id] ?? []).map((h) => (
                        <li key={h} className="flex gap-2.5">
                          <span aria-hidden className={`mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full ${featured ? "bg-ember" : "bg-halo"}`} />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/sign-in"
                      className={`lift mt-6 rounded-pill px-4 py-2.5 text-center text-[13px] font-semibold no-underline ${
                        featured
                          ? "bg-white text-dusk hover:bg-dusk-ink"
                          : "bg-dusk text-white hover:bg-dusk-2"
                      }`}
                    >
                      {plan.priceCentsMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ——— compare everything: generated from the plan config ——— */}
          <details className="group mt-10 rounded-orbit border border-line bg-paper-2 shadow-card">
            <summary className="flex cursor-pointer items-center justify-between px-7 py-5 text-[14px] font-medium text-dusk-2 [&::-webkit-details-marker]:hidden">
              Compare everything, plainly
              <span aria-hidden className="font-mono text-[12px] text-ink-faint transition-transform duration-300 group-open:rotate-45">＋</span>
            </summary>
            <div className="overflow-x-auto px-4 pb-6">
              <table className="w-full min-w-[680px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
                      What the family gets
                    </th>
                    {ORDER.map((p) => (
                      <th key={p} className="px-3 pb-3 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
                        {PLANS[p].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row) => (
                    <tr key={row.label} className="border-t border-line">
                      <td className="px-3 py-3 text-ink">{row.label}</td>
                      {ORDER.map((p) => (
                        <td key={p} className="px-3 py-3 text-center">
                          {row.value ? (
                            <span className="font-mono text-[12.5px] text-ink-soft">{row.value(p)}</span>
                          ) : planHasFeature(p, row.feature!) ? (
                            <span aria-label="included" className="inline-block h-[7px] w-[7px] rounded-full bg-calm" />
                          ) : (
                            <span aria-label="not included" className="text-ink-faint">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {/* ——— quiet reassurance ——— */}
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                t: "Leave whole",
                d: "Downgrade or cancel anytime. The record stays; export everything whenever you like.",
              },
              {
                t: "One plan, whole family",
                d: "Every member is covered by one subscription. Gogo never sees a paywall.",
              },
              {
                t: "Pay from anywhere",
                d: "Cards worldwide, EcoCash in Zimbabwe — into the same family space.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-orbit border border-line bg-paper-3 p-6">
                <h3 className="font-serif text-[19px]">{c.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{c.d}</p>
              </div>
            ))}
          </div>

          {/* ——— pricing questions ——— */}
          <div className="mt-14">
            <Eyebrow>Questions families ask</Eyebrow>
            <div className="mt-4 flex flex-col gap-3">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-orbit border border-line bg-paper-2 px-6 py-4">
                  <summary className="flex cursor-pointer items-center justify-between text-[14.5px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="font-mono text-[12px] text-ink-faint transition-transform duration-300 group-open:rotate-45">＋</span>
                  </summary>
                  <p className="mt-3 max-w-[72ch] text-[13.5px] leading-[1.7] text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* ——— professionals ——— */}
          <div className="mt-14 overflow-hidden rounded-orbit border border-line bg-paper-2">
            <div className="grid gap-6 p-7 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="font-serif text-[22px]">For caregivers and care homes</h2>
                <p className="mt-2 max-w-[62ch] text-[14.5px] leading-[1.6] text-ink-soft">
                  Caregiver Pro (client Orbits, visit logs, professional reporting) and Care
                  Home (resident dashboards, family portals, incident logs) are coming.
                  Early partners shape the roadmap.
                </p>
              </div>
              <a
                href="mailto:care@kinos.family"
                className="lift justify-self-start rounded-pill border border-line bg-paper-3 px-5 py-2.5 text-[13px] font-semibold text-ink no-underline md:justify-self-end"
              >
                care@kinos.family
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
