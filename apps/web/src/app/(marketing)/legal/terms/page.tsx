import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@kinos/ui";

export const metadata: Metadata = { title: "Terms of Service" };

const EFFECTIVE_DATE = "2 July 2026";

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-[22px] font-light tracking-[-0.01em]">
        {n}. {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-[1.7] text-ink-soft">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <section className="pb-16 pt-28">
      <div className="mx-auto max-w-[820px] px-7">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(30px,4.5vw,44px)] font-light leading-[1.1] tracking-[-0.02em]">
          Terms of Service
        </h1>
        <p className="mt-3 font-mono text-[12px] text-ink-faint">Effective {EFFECTIVE_DATE}</p>

        <Section n={1} title="The service">
          <p>
            KinOS is a private space where a family coordinates care: check-ins, notes,
            duties, appointments, money, documents, and — where the family chooses —
            health readings from connected devices and apps. These terms are an
            agreement between you and KinOS. By creating an account or joining a family
            space, you accept them.
          </p>
        </Section>

        <Section n={2} title="Your family's space">
          <p>
            The family that creates a space owns its content. Admins decide who joins
            and with what role; each person controls consent over their own information
            as described in the{" "}
            <Link href="/legal/privacy-policy" className="text-dusk-2">
              Privacy Policy
            </Link>
            . You are responsible for adding only people and content you have the right
            to add — including recording another person&apos;s health information only
            with their agreement.
          </p>
        </Section>

        <Section n={3} title="Not medical care">
          <p>
            KinOS notices patterns and prompts family conversations. It is not a medical
            device, does not provide medical advice or diagnosis, and must not be relied
            on for emergencies. If someone may be in danger, contact local emergency
            services first.
          </p>
        </Section>

        <Section n={4} title="Acceptable use">
          <p>
            Don&apos;t use KinOS to harm, harass, or surveil anyone; don&apos;t attempt
            to access another family&apos;s data; don&apos;t probe or disrupt the
            service. We may suspend accounts that put other families&apos; data at risk.
          </p>
        </Section>

        <Section n={5} title="Plans and payment">
          <p>
            Free and paid plans are described at{" "}
            <Link href="/pricing" className="text-dusk-2">
              /pricing
            </Link>
            . Paid plans renew until cancelled; cancelling keeps your space on the free
            plan&apos;s terms. Payments are processed by Stripe or Paynow — we never
            hold card or wallet details.
          </p>
        </Section>

        <Section n={6} title="Leaving, export, deletion">
          <p>
            A family can export its record at any time and can delete its space, which
            removes content as described in the Privacy Policy. Individuals can leave a
            space at any time; their consent grants end when they do.
          </p>
        </Section>

        <Section n={7} title="Our responsibilities and their limits">
          <p>
            We provide the service with care and skill and protect your data as the
            Privacy Policy describes. To the extent the law allows, we are not liable
            for indirect losses, and our total liability is limited to the amounts you
            paid us in the twelve months before a claim. Nothing in these terms limits
            liability that cannot lawfully be limited.
          </p>
        </Section>

        <Section n={8} title="Changes and contact">
          <p>
            We may update these terms; material changes will be announced in the product
            or by email before they take effect. Questions:{" "}
            <a href="mailto:hello@kinos.family" className="text-dusk-2">
              hello@kinos.family
            </a>
            .
          </p>
        </Section>
      </div>
    </section>
  );
}
