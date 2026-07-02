import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@kinos/config";
import { Eyebrow } from "@kinos/ui";

export const metadata: Metadata = { title: "Pricing" };

const HIGHLIGHTS: Record<string, string[]> = {
  free: ["1 Orbit", "Simple check-ins", "Duties & appointments", "Emergency contacts"],
  family_core: [
    "1 Orbit, up to 5 members",
    "The Daily Brief, morning & evening",
    "Medication rhythm & refills",
    "Family Record",
  ],
  family_plus: [
    "2 Orbits, up to 10 members",
    "Everything in Family Core",
    "Money Pot with receipts",
    "Patterns against personal baselines",
  ],
  family_premium: [
    "Up to 6 Orbits, 20 members",
    "Everything in Family Plus",
    "Caregiver access with consent",
    "Document vault",
  ],
  diaspora_care: [
    "3 Orbits across borders",
    "Caregiver proof of care",
    "Shared care fund, global + EcoCash",
    "Briefs timed to your timezone",
  ],
};

const ORDER = ["free", "family_core", "family_plus", "family_premium", "diaspora_care"] as const;

export default function PricingPage() {
  return (
    <section className="pb-16 pt-28">
      <div className="mx-auto max-w-[1120px] px-7">
        <Eyebrow>Pricing</Eyebrow>
        <h1 className="mt-4 max-w-[22ch] font-serif text-[clamp(30px,4.5vw,48px)] font-light leading-[1.1] tracking-[-0.02em]">
          Less than a phone call home. Worth more than a hundred of them.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.6] text-ink-soft">
          Start free with one loved one. Grow into the plan that matches your family&apos;s
          reality — including caring across borders.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {ORDER.map((planId) => {
            const plan = PLANS[planId];
            const popular = planId === "diaspora_care";
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-orbit border p-6 ${
                  popular
                    ? "border-transparent bg-dusk text-dusk-ink shadow-float"
                    : "border-line bg-paper-3 shadow-card"
                }`}
              >
                {popular && (
                  <span className="mb-3 self-start rounded-pill bg-ember px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white">
                    Made for diaspora
                  </span>
                )}
                <h3 className={`text-[15px] font-semibold ${popular ? "text-white" : "text-ink"}`}>
                  {plan.name}
                </h3>
                <p className={`mt-1 text-[12.5px] ${popular ? "text-halo" : "text-ink-soft"}`}>
                  {plan.audience}
                </p>
                <div className="mt-4 font-serif text-[34px] leading-none">
                  {plan.priceCentsMonthly === 0 ? (
                    "Free"
                  ) : (
                    <>
                      ${(plan.priceCentsMonthly / 100).toFixed(0)}
                      <span className={`text-[14px] ${popular ? "text-halo" : "text-ink-faint"}`}>
                        /mo
                      </span>
                    </>
                  )}
                </div>
                <ul
                  className={`mt-5 flex flex-1 flex-col gap-2 text-[13px] leading-snug ${
                    popular ? "text-[#d7d5ee]" : "text-ink-soft"
                  }`}
                >
                  {(HIGHLIGHTS[plan.id] ?? []).map((h) => (
                    <li key={h} className="flex gap-2">
                      <span className={popular ? "text-calm-soft" : "text-calm"}>◆</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-in"
                  className={`mt-6 rounded-pill px-4 py-2.5 text-center text-[13px] font-medium no-underline ${
                    popular
                      ? "bg-white text-dusk hover:bg-dusk-ink"
                      : "bg-dusk text-white hover:bg-dusk-2"
                  }`}
                >
                  {plan.priceCentsMonthly === 0 ? "Start free" : "Choose plan"}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-14 rounded-orbit border border-line bg-paper-2 p-7">
          <h2 className="font-serif text-[22px]">For caregivers and care homes</h2>
          <p className="mt-2 max-w-[70ch] text-[14.5px] leading-[1.6] text-ink-soft">
            Caregiver Pro (client Orbits, visit logs, professional reporting) and Care Home
            (resident dashboards, family portals, incident logs) are coming. If you run a
            care service, write to{" "}
            <a href="mailto:care@kinos.family" className="text-dusk-2">
              care@kinos.family
            </a>{" "}
            — early partners shape the roadmap.
          </p>
        </div>

        <p className="mt-8 text-[13px] leading-relaxed text-ink-faint">
          Pay by card anywhere in the world, or by EcoCash / Paynow in Zimbabwe. Family
          plans cover every member — the person being cared for never pays.
        </p>
      </div>
    </section>
  );
}
