import type { Metadata } from "next";
import { OrbitMark } from "@kinos/ui";

export const metadata: Metadata = { title: "Check your email" };

export default function SentPage() {
  return (
    <section className="flex min-h-[70vh] items-center py-16">
      <div className="mx-auto w-full max-w-[440px] px-7 text-center">
        <OrbitMark size={44} className="mx-auto text-calm" />
        <h1 className="mt-6 font-serif text-[30px] font-light leading-[1.2]">
          Your link is on its way.
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">
          Check your inbox and open the sign-in link from this device. It works once and
          expires soon — that&apos;s what keeps your family space private.
        </p>
        <p className="mt-6 font-mono text-[12px] text-ink-faint">
          Nothing arriving? Check spam, or request a new link.
        </p>
      </div>
    </section>
  );
}
