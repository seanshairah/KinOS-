import type { Metadata } from "next";
import { Eyebrow } from "@kinos/ui";

export const metadata: Metadata = { title: "Finish setup" };

/** Shown when the deployment has no database configured yet. */
export default function SetupPage() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-[640px] px-7">
        <Eyebrow>Deployment setup</Eyebrow>
        <h1 className="mt-4 font-serif text-[32px] font-light leading-[1.15]">
          Almost there — connect the database.
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">
          This KinOS deployment doesn&apos;t have its environment configured yet. Three
          steps and the family space opens:
        </p>
        <ol className="mt-6 flex flex-col gap-4 text-[14.5px] leading-[1.6] text-ink">
          <li className="rounded-card border border-line bg-paper-3 p-4">
            <b>1 · Create a Neon project</b>
            <p className="mt-1 text-ink-soft">
              Copy the pooled connection string into <code className="font-mono text-[13px]">DATABASE_URL</code>.
            </p>
          </li>
          <li className="rounded-card border border-line bg-paper-3 p-4">
            <b>2 · Run migrations and seed</b>
            <p className="mt-1 font-mono text-[13px] text-ink-soft">
              pnpm --filter @kinos/db migrate && pnpm db:seed
            </p>
          </li>
          <li className="rounded-card border border-line bg-paper-3 p-4">
            <b>3 · Set the auth secret</b>
            <p className="mt-1 text-ink-soft">
              Generate one with <code className="font-mono text-[13px]">openssl rand -base64 32</code>{" "}
              into <code className="font-mono text-[13px]">AUTH_SECRET</code>. Add{" "}
              <code className="font-mono text-[13px]">RESEND_API_KEY</code> for real magic-link
              emails (dev logs the link to the console).
            </p>
          </li>
        </ol>
        <p className="mt-6 text-[13px] text-ink-faint">
          The full checklist lives in the README and .env.example.
        </p>
      </div>
    </section>
  );
}
