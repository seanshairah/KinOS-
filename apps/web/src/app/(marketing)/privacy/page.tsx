import type { Metadata } from "next";
import { Eyebrow } from "@kinos/ui";

export const metadata: Metadata = { title: "Privacy & consent" };

const CATEGORIES: { name: string; why: string; who: string }[] = [
  {
    name: "Check-ins & daily rhythm",
    why: "So the family knows their person is okay, and notices when the rhythm changes.",
    who: "Every family member, by default.",
  },
  {
    name: "Health notes & measurements",
    why: "So patterns can be watched against the person's own normal — never a generic threshold.",
    who: "Admins, the person themselves, and members with explicit health consent.",
  },
  {
    name: "Money, receipts & the care fund",
    why: "So support given is visible, accounted for, and never argued about.",
    who: "Admins and members. Caregivers only with explicit money consent.",
  },
  {
    name: "Documents",
    why: "So prescriptions, IDs and reports are findable years later, not lost in a drawer.",
    who: "Per-document privacy level, enforced per member.",
  },
  {
    name: "Emergency details",
    why: "So the right information reaches the right hands in the worst ten minutes.",
    who: "Emergency contacts see the summary during an alert; admins maintain it.",
  },
];

export default function PrivacyPage() {
  return (
    <section className="pb-16 pt-28">
      <div className="mx-auto max-w-[820px] px-7">
        <Eyebrow>Privacy &amp; consent</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(30px,4.5vw,48px)] font-light leading-[1.1] tracking-[-0.02em]">
          Your family&apos;s record belongs to your family.
        </h1>

        <div className="prose-kinos mt-8 flex flex-col gap-6 text-[15.5px] leading-[1.65] text-ink">
          <p>
            KinOS holds some of the most intimate information a family has. We treat that as
            an engineering constraint, not a marketing line. Three commitments are built into
            the product&apos;s foundations:
          </p>

          <div className="rounded-orbit border border-line bg-paper-3 p-6">
            <h2 className="font-serif text-[20px]">1. Consent is enforced in the database</h2>
            <p className="mt-2 text-ink-soft">
              Who can see what is not an application setting that code might forget to check.
              Every query any member runs passes through row-level security in the database
              itself. A caregiver without health consent cannot read private health entries —
              not because a screen hides them, but because the database will not return them.
              When you revoke consent, it takes effect on the very next query.
            </p>
          </div>

          <div className="rounded-orbit border border-line bg-paper-3 p-6">
            <h2 className="font-serif text-[20px]">2. A shown reason for everything we hold</h2>
            <p className="mt-2 text-ink-soft">
              We collect the minimum a family coordination system needs, and each category
              exists for a reason you can read:
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {CATEGORIES.map((c) => (
                <div key={c.name} className="rounded-card border border-line bg-paper p-4">
                  <div className="text-[14px] font-semibold">{c.name}</div>
                  <p className="mt-1 text-[13.5px] text-ink-soft">{c.why}</p>
                  <p className="mt-1 font-mono text-[11.5px] text-dusk-2">{c.who}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-orbit border border-line bg-paper-3 p-6">
            <h2 className="font-serif text-[20px]">3. Leave with everything, any time</h2>
            <p className="mt-2 text-ink-soft">
              Admins can export the family&apos;s full record as portable data from Settings,
              and deletion removes it — records, files and memory indexes included. An access
              log shows admins every sensitive action taken in the family space. Encryption
              protects data in transit and at rest, and nothing is ever sold or shared for
              advertising. Ever.
            </p>
          </div>

          <p className="border-t border-line pt-6 text-[13px] leading-relaxed text-ink-faint">
            KinOS is a family coordination and life-awareness platform. It is not a medical
            device, diagnosis tool, emergency service, or replacement for healthcare
            professionals. If something seems urgent, contact local emergency or medical
            services.
          </p>
        </div>
      </div>
    </section>
  );
}
