import Link from "next/link";
import { OrbitMark, Wordmark } from "@kinos/ui";
import { RevealOnScroll } from "@/components/reveal";

const SAFETY_LINE =
  "KinOS is a family coordination and life-awareness platform. It is not a medical device, diagnosis tool, emergency service, or replacement for healthcare professionals. If something seems urgent, contact local emergency or medical services.";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RevealOnScroll />
      <nav className="sticky top-0 z-50 border-b border-line/40 bg-paper/10 backdrop-blur-md">
        <div className="mx-auto flex h-[62px] max-w-[1120px] items-center justify-between px-7">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <OrbitMark size={24} className="text-dusk" />
            <Wordmark size={18} />
          </Link>
          <div className="hidden gap-6 text-[13.5px] text-ink-soft md:flex">
            <Link href="/#product" className="no-underline hover:text-dusk-2">Product</Link>
            <Link href="/#families" className="no-underline hover:text-dusk-2">Families</Link>
            <Link href="/pricing" className="no-underline hover:text-dusk-2">Pricing</Link>
            <Link href="/privacy" className="no-underline hover:text-dusk-2">Privacy</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-pill border border-line bg-paper-3 px-4 py-2 text-[13.5px] font-medium text-ink no-underline hover:border-line-2"
            >
              Sign in
            </Link>
            <Link
              href="/sign-in"
              className="hidden rounded-pill bg-dusk px-4 py-2 text-[13.5px] font-medium text-white no-underline hover:bg-dusk-2 sm:block"
            >
              Start your family space
            </Link>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="relative overflow-hidden bg-dusk pb-12 pt-20 text-dusk-ink">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 120% at 85% 0%, rgba(140,138,214,.3), transparent 55%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[1120px] px-7">
          <p className="max-w-[26ch] font-serif text-[clamp(22px,3.2vw,34px)] font-light leading-[1.3] tracking-[-0.01em]">
            A <b className="font-medium italic text-white">trust company</b>, not a gimmick.
            A family infrastructure company, not a reminder app. The value is{" "}
            <b className="font-medium italic text-white">peace, memory, and action</b>.
          </p>
          <div className="mt-12 flex flex-wrap items-end justify-between gap-5">
            <div className="flex items-center gap-3">
              <OrbitMark size={30} className="text-halo" />
              <Wordmark size={24} onDusk />
            </div>
            <div className="text-right font-mono text-[11px] leading-[1.7] tracking-[0.06em] text-halo">
              The private operating system
              <br />
              for the people you love.
            </div>
          </div>
          <p className="mt-10 max-w-[90ch] border-t border-halo/20 pt-6 text-[12px] leading-relaxed text-halo">
            {SAFETY_LINE}
          </p>
          <div className="mt-4 flex flex-wrap gap-5 text-[12px] text-halo">
            <Link href="/privacy" className="no-underline hover:text-white">Privacy &amp; consent</Link>
            <Link href="/pricing" className="no-underline hover:text-white">Pricing</Link>
            <span>© {new Date().getFullYear()} KinOS</span>
          </div>
        </div>
      </footer>
    </>
  );
}
