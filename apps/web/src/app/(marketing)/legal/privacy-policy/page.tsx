import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@kinos/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

/**
 * The formal policy. The plain-language companion lives at /privacy;
 * this page is the one regulators, app stores, and device-cloud partners
 * read. Update EFFECTIVE_DATE on any material change.
 */

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

export default function PrivacyPolicyPage() {
  return (
    <section className="pb-16 pt-28">
      <div className="mx-auto max-w-[820px] px-7">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(30px,4.5vw,44px)] font-light leading-[1.1] tracking-[-0.02em]">
          Privacy Policy
        </h1>
        <p className="mt-3 font-mono text-[12px] text-ink-faint">
          Effective {EFFECTIVE_DATE} · The plain-language version is at{" "}
          <Link href="/privacy" className="text-dusk-2">
            /privacy
          </Link>
          .
        </p>

        <Section n={1} title="Who we are">
          <p>
            KinOS (&quot;we&quot;, &quot;us&quot;) provides a private family operating
            system: a space where a family coordinates the care of the people at its
            centre. We are the data controller for account information, and we process
            family content on behalf of the family that creates it. Contact:{" "}
            <a href="mailto:privacy@kinos.family" className="text-dusk-2">
              privacy@kinos.family
            </a>
            .
          </p>
        </Section>

        <Section n={2} title="What we collect">
          <p>
            <strong className="text-ink">Account data</strong> — your name, email address,
            and sign-in records.
          </p>
          <p>
            <strong className="text-ink">Family content</strong> — what your family puts
            into its space: check-ins, notes, voice-note transcripts, duties,
            appointments, documents, money records, and emergency details.
          </p>
          <p>
            <strong className="text-ink">Health data</strong> — where your family chooses
            to record it or to connect a health device or app (for example a Withings
            blood-pressure cuff, or a phone&apos;s health store): readings such as blood
            pressure, heart rate, sleep, movement, and weight, together with the calm
            observations we derive from them. Health data is special-category data; we
            process it only with the explicit consent of the person it concerns (or
            their legal representative), given in the product.
          </p>
          <p>
            <strong className="text-ink">Technical data</strong> — logs necessary to run
            and secure the service. We do not run third-party advertising or tracking.
          </p>
        </Section>

        <Section n={3} title="How consent works">
          <p>
            Consent is the product&apos;s core mechanic, and it is enforced in the
            database, not by screens. Each person&apos;s data carries a privacy level;
            family members see only what their role and the person&apos;s explicit
            consent grants allow. Health measurements carry an additional per-metric
            dial (numbers, notes only, or status only), controlled by the person
            themselves or a family admin. Revoking consent takes effect on the next
            query. An access log records grants, revocations, and device links.
          </p>
        </Section>

        <Section n={4} title="What we do with data">
          <p>
            We use family content solely to provide the service to that family: keeping
            the record, composing daily briefs, noticing patterns against the
            person&apos;s own baseline, and raising attention events the family has
            asked for. We do not sell personal data, we do not share it with advertisers,
            and we do not use your family&apos;s content to train models.
          </p>
          <p>
            Health-device data is used only to provide these same features. It is never
            used for advertising, and never disclosed except as directed by the family
            or required by law.
          </p>
        </Section>

        <Section n={5} title="Where data lives and who helps us">
          <p>
            Data is stored encrypted at rest with our infrastructure providers: Neon
            (database), Vercel (hosting and file storage), and — when your family
            enables the features — Resend (email delivery), Stripe and Paynow (payments;
            they hold card and wallet details, we do not), and Withings (device data you
            link). Each processes data under its own agreement with us and only to
            provide its service.
          </p>
        </Section>

        <Section n={6} title="Retention">
          <p>
            The family record is kept for as long as the family keeps its space — that
            permanence is the product. Raw health readings expire automatically after
            180 days; the derived observations remain. When a workspace is deleted, its
            content is removed from production within 30 days and from backups within 90.
          </p>
        </Section>

        <Section n={7} title="Your rights">
          <p>
            You may access, export, correct, or delete your data, withdraw any consent,
            and complain to your supervisory authority. Families can export their full
            record from the product. For anything you cannot do in the product, write to{" "}
            <a href="mailto:privacy@kinos.family" className="text-dusk-2">
              privacy@kinos.family
            </a>{" "}
            and we will respond within 30 days.
          </p>
        </Section>

        <Section n={8} title="What KinOS is not">
          <p>
            KinOS notices and nudges; it does not diagnose, treat, or replace medical
            care. Nothing in the product is medical advice, and attention events are
            prompts for a family conversation, not clinical alerts.
          </p>
        </Section>

        <Section n={9} title="Children">
          <p>
            Family spaces are created and administered by adults. Children&apos;s
            information appears only as content a family chooses to keep about the
            people in its care, under the family&apos;s control.
          </p>
        </Section>

        <Section n={10} title="Changes">
          <p>
            If this policy changes materially, we will tell account holders by email or
            in the product before the change takes effect, and update the date above.
          </p>
        </Section>
      </div>
    </section>
  );
}
