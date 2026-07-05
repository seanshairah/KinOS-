import type { ReactNode } from "react";
import { MiniOrbit, type OrbitStatus } from "@/components/mini-orbit";

/**
 * Room primitives — the operating surfaces are calm rooms, not
 * dashboards. Every room opens the same way: a quiet mono room name,
 * then one serif status statement a person can read in five seconds.
 * Sections are glass; empty states reassure instead of apologising;
 * signals stay human even in mono.
 */

export function RoomHeader({
  room,
  meta,
  headline,
  sub,
  children,
}: {
  room: string;
  meta?: string;
  headline: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="room-enter">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-halo">
          {room}
        </span>
        {meta && <span className="font-mono text-[10.5px] text-ink-faint">{meta}</span>}
      </div>
      <h1 className="mt-2.5 max-w-[26ch] font-serif text-[clamp(26px,3.4vw,34px)] font-light leading-[1.15] tracking-[-0.01em] text-ink">
        {headline}
      </h1>
      {sub && <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.6] text-ink-soft">{sub}</p>}
      {children}
      <div
        aria-hidden
        className="mt-5 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(169,167,224,.35), rgba(169,167,224,.08) 55%, transparent)",
        }}
      />
    </div>
  );
}

export function RoomSection({
  title,
  action,
  className = "",
  delay = 0,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <section
      className={`room-enter top-light glass-lift rounded-orbit border border-line bg-gradient-to-b from-paper-3 to-paper-2 p-5 shadow-card backdrop-blur-[6px] md:p-6 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {(title || action) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title && (
            <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-halo">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A quiet form drawer: rooms lead with state, forms wait behind intent. */
export function RoomDrawer({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="room-enter group rounded-orbit border border-dashed border-line-2 open:border-solid open:bg-paper-2 open:shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-3.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="grid h-5 w-5 flex-none place-items-center rounded-full border border-line-2 text-[13px] text-halo transition-transform duration-300 group-open:rotate-45">
          +
        </span>
        {label}
      </summary>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </details>
  );
}

/**
 * The calm empty state — nothing wrong, and the room says so.
 * A still, softly-lit orbit and one reassuring line.
 */
export function CalmEmpty({
  title,
  hint,
  status = "steady",
  action,
}: {
  title: string;
  hint?: string;
  status?: OrbitStatus;
  action?: ReactNode;
}) {
  return (
    <div className="room-enter top-light relative flex flex-col items-center gap-4 overflow-hidden rounded-orbit border border-line bg-gradient-to-b from-paper-3 to-paper-2 px-6 py-12 text-center backdrop-blur-[6px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, rgba(169,167,224,.09), transparent 70%)",
        }}
      />
      <MiniOrbit status={status} size={74} />
      <p className="relative max-w-[38ch] font-serif text-[19px] font-light leading-snug text-ink">
        {title}
      </p>
      {hint && <p className="relative max-w-[46ch] text-[13px] leading-[1.6] text-ink-soft">{hint}</p>}
      {action && <div className="relative mt-1">{action}</div>}
    </div>
  );
}

const SIGNAL_TONE: Record<string, string> = {
  ember: "#D98A3D",
  calm: "#4E9E7E",
  halo: "#A9A7E0",
};

/** One life signal, human even in mono: time — what happened. */
export function SignalRow({
  time,
  text,
  tone = "halo",
  meta,
}: {
  time: string;
  text: string;
  tone?: "ember" | "calm" | "halo";
  meta?: string;
}) {
  return (
    <div className="-mx-2 flex items-baseline gap-3 rounded-card border-t border-line px-2 py-2.5 transition-colors duration-300 first:border-t-0 hover:bg-halo/[.05]">
      <span
        aria-hidden
        className="relative top-[-2px] h-[6px] w-[6px] flex-none rounded-full"
        style={{ background: SIGNAL_TONE[tone], boxShadow: `0 0 8px ${SIGNAL_TONE[tone]}66` }}
      />
      <span className="flex-none font-mono text-[11px] text-ink-faint">{time}</span>
      <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">{text}</span>
      {meta && <span className="hidden flex-none font-mono text-[10.5px] text-ink-faint sm:block">{meta}</span>}
    </div>
  );
}

/** The Daily Brief as a warm paper letter — the one bright thing in the night. */
export function PaperBrief({
  meta,
  body,
  action,
  delay = 100,
}: {
  meta: string;
  body: string;
  action?: ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="room-enter relative overflow-hidden rounded-orbit p-6 shadow-float md:p-7"
      style={{
        background: "linear-gradient(160deg, #FDFBF7 0%, #FBF8F3 55%, #F8F4EC 100%)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(80% 60% at 85% 0%, rgba(169,167,224,.16), transparent 60%)" }}
      />
      <div className="grain" aria-hidden />
      <div className="paper-sheen" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-ember/80" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5a534b]">
            {meta}
          </span>
        </div>
        <p className="mt-3 max-w-[62ch] font-serif text-[clamp(17px,1.9vw,20px)] font-light leading-[1.6] text-[#211d19]">
          {body}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </section>
  );
}

/** The status vocabulary — one word, one hue, never a siren. */
export function StatusWord({ status }: { status: OrbitStatus }) {
  const map: Record<OrbitStatus, { word: string; cls: string }> = {
    steady: { word: "steady", cls: "border-calm-soft bg-calm-soft/60 text-calm-text" },
    signal: { word: "recent signal", cls: "border-halo/30 bg-halo/10 text-halo" },
    attention: { word: "attention", cls: "border-ember-soft bg-attn-bg text-ember-text" },
    urgent: { word: "act now", cls: "border-urgent/40 bg-urgent-bg text-urgent" },
  };
  const dot: Record<OrbitStatus, string> = {
    steady: "#4E9E7E",
    signal: "#A9A7E0",
    attention: "#D98A3D",
    urgent: "#E07A66",
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] ${s.cls}`}
    >
      <span
        aria-hidden
        className="status-dot inline-block h-[5px] w-[5px] rounded-full"
        style={{ background: dot[status], boxShadow: `0 0 6px ${dot[status]}` }}
      />
      {s.word}
    </span>
  );
}
