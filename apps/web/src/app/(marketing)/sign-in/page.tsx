import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDatabaseConfigured } from "@kinos/db";
import { Eyebrow, OrbitMark } from "@kinos/ui";
import { currentUserId } from "@/lib/auth";
import { signIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

async function sendMagicLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/sign-in?error=email");
  // Honour a same-site ?next= target (e.g. an invite link) after sign-in.
  const rawNext = String(formData.get("next") ?? "");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";
  await signIn("resend", { email, redirectTo: next, redirect: false });
  redirect("/sign-in/sent");
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (!isDatabaseConfigured()) redirect("/setup");
  if (await currentUserId()) {
    redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/app");
  }

  return (
    <section className="flex min-h-[70vh] items-center pb-16 pt-28">
      <div className="mx-auto w-full max-w-[440px] px-7">
        <OrbitMark size={44} className="text-dusk" />
        <Eyebrow className="mt-6">Sign in</Eyebrow>
        <h1 className="mt-3 font-serif text-[32px] font-light leading-[1.15] tracking-[-0.01em]">
          Your family space is waiting.
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">
          Enter your email and we&apos;ll send a sign-in link. No passwords to remember —
          calm starts here.
        </p>
        <form action={sendMagicLink} className="mt-7 flex flex-col gap-3">
          <input type="hidden" name="next" value={next ?? ""} />
          <label htmlFor="email" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-card border border-line bg-paper-3 px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-dusk-2"
          />
          <button
            type="submit"
            className="mt-2 rounded-pill bg-dusk px-6 py-3 text-[14px] font-semibold text-white hover:bg-dusk-2"
          >
            Send my sign-in link
          </button>
        </form>
        <p className="mt-5 text-[12.5px] leading-relaxed text-ink-faint">
          First time here? The same link creates your account — then you&apos;ll set up your
          family space in about two minutes.
        </p>
      </div>
    </section>
  );
}
