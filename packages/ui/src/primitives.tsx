import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- buttons ---------- */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-sans font-medium text-[13.5px] px-4 py-2 transition-colors disabled:opacity-50 disabled:pointer-events-none";

const BUTTON_VARIANTS = {
  primary: "bg-dusk text-white hover:bg-dusk-2",
  ghost: "border border-line bg-paper-3 text-ink hover:border-line-2 hover:bg-paper-2",
  calm: "bg-calm-soft text-[#2f6a52] hover:brightness-95",
  urgent: "bg-urgent text-white hover:brightness-110",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant }) {
  return (
    <a className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], className)} {...props} />
  );
}

/* ---------- surfaces ---------- */

export function Panel({
  className,
  dusk = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { dusk?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-orbit border p-6 shadow-card",
        dusk
          ? "border-transparent bg-dusk text-dusk-ink"
          : "border-line bg-paper-3",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-card border border-line bg-paper-3 p-4", className)}
      {...props}
    />
  );
}

/* ---------- type ---------- */

/** Mono eyebrow label — the signals-engine voice. */
export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "font-mono text-[11.5px] uppercase tracking-[0.18em] text-ink-faint",
        className,
      )}
      {...props}
    />
  );
}

/** Serif section heading — the human voice. */
export function SectionTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cx(
        "font-serif text-[26px] font-normal leading-[1.08] tracking-[-0.02em] text-ink",
        className,
      )}
      {...props}
    />
  );
}

/* ---------- pills & badges ---------- */

export type PillTone = "neutral" | "ok" | "attn" | "data";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "border-line text-ink-soft bg-paper",
  ok: "border-calm-soft text-[#3d7d63] bg-paper",
  attn: "border-ember-soft text-[#9a641f] bg-[#fdf6ec]",
  data: "border-line text-dusk-2 bg-paper",
};

export function Pill({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: PillTone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-pill border px-2 py-[3px] font-mono text-[10.5px]",
        PILL_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export type OrbitStatus = "steady" | "attention" | "urgent";

export function StatusBadge({ status }: { status: OrbitStatus }) {
  const styles: Record<OrbitStatus, string> = {
    steady: "bg-calm-soft text-[#2f6a52]",
    attention: "bg-ember-soft text-[#8a531b]",
    urgent: "bg-urgent text-white",
  };
  const labels: Record<OrbitStatus, string> = {
    steady: "Steady",
    attention: "Attention",
    urgent: "Urgent",
  };
  return (
    <span
      className={cx(
        "rounded-bl-card rounded-tr-card px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em]",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

/* ---------- states ---------- */

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-orbit border border-dashed border-line-2 bg-paper-2 px-6 py-12 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      {hint ? <p className="max-w-[42ch] text-sm text-ink-soft">{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: ReactNode }) {
  return (
    <div className="rounded-card border border-ember-soft bg-[#fdf7ee] p-4 text-sm text-ink">
      <p className="font-medium">Something didn't go through.</p>
      <p className="mt-1 text-ink-soft">{message}</p>
      {retry}
    </div>
  );
}

export { cx };
