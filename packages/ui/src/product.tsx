import type { HTMLAttributes, ReactNode } from "react";
import { cx, Pill, StatusBadge, type OrbitStatus, type PillTone } from "./primitives";

/**
 * Product components — Orbit cards, the Daily Brief block, Attention
 * items and Signal rows, matching §06 of the brand system.
 */

/* ---------- orbit card (Orbit View) ---------- */

const AVATAR_GRADIENTS = [
  "linear-gradient(150deg,#5a5798,#3a3866)",
  "linear-gradient(150deg,#c98a4e,#a9682f)",
  "linear-gradient(150deg,#5b9c81,#3f7860)",
  "linear-gradient(150deg,#4e4b90,#35335f)",
];

export function OrbitAvatar({
  name,
  index = 0,
  size = 46,
}: {
  name: string;
  index?: number;
  size?: number;
}) {
  return (
    <div
      aria-hidden
      className="grid flex-none place-items-center rounded-full font-serif text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.43,
        background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export interface OrbitSignalPill {
  label: string;
  tone: PillTone;
}

export function OrbitCard({
  name,
  subline,
  status,
  signals,
  avatarIndex = 0,
  href,
  className,
}: {
  name: string;
  subline: string;
  status: OrbitStatus;
  signals: OrbitSignalPill[];
  avatarIndex?: number;
  href?: string;
  className?: string;
}) {
  const inner = (
    <div
      className={cx(
        "relative flex items-center gap-3.5 rounded-card border border-line bg-paper-3 p-4 transition-shadow hover:shadow-card",
        className,
      )}
    >
      <span className="absolute -right-px -top-px">
        <StatusBadge status={status} />
      </span>
      <OrbitAvatar name={name} index={avatarIndex} />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {name}
        </div>
        <div className="mt-0.5 text-[12.5px] text-ink-soft">{subline}</div>
        {signals.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {signals.map((s) => (
              <Pill key={s.label} tone={s.tone}>
                {s.label}
              </Pill>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block no-underline">
      {inner}
    </a>
  ) : (
    inner
  );
}

/* ---------- daily brief ---------- */

export function BriefBlock({
  meta,
  children,
  actions,
}: {
  meta: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
        {meta}
      </div>
      <p className="font-serif text-[19px] leading-[1.62] text-ink">{children}</p>
      {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/* ---------- attention item ---------- */

export function AttentionItem({
  icon,
  title,
  detail,
  owner,
  action,
  urgent = false,
}: {
  icon?: ReactNode;
  title: string;
  detail?: string;
  owner?: string;
  action?: ReactNode;
  urgent?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex gap-3 rounded-card border p-4",
        urgent
          ? "border-urgent/40 bg-[#fdf1ee]"
          : "border-ember-soft bg-[#fdf7ee]",
      )}
    >
      <div
        aria-hidden
        className={cx(
          "grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px]",
          urgent ? "bg-[#f2d3cb] text-[#8a2f1e]" : "bg-ember-soft text-[#8a531b]",
        )}
      >
        {icon ?? <ClockIcon />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">{title}</div>
        {detail ? <div className="mt-0.5 text-[12.5px] text-ink-soft">{detail}</div> : null}
        {owner ? (
          <div className="mt-2 font-mono text-[11px] text-dusk-2">→ {owner}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ---------- signal row (Life Signals feed) ---------- */

export function SignalRow({
  time,
  children,
  meta,
}: {
  time: string;
  children: ReactNode;
  meta?: string;
}) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3.5 border-t border-line py-3.5 first:border-t-0">
      <div className="pt-0.5 font-mono text-[11px] text-ink-faint">{time}</div>
      <div>
        <div className="text-sm leading-[1.45] text-ink">{children}</div>
        {meta ? (
          <div className="mt-1 font-mono text-[10.5px] tracking-[0.04em] text-ink-faint">
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SignalValue({ children }: { children: ReactNode }) {
  return <span className="font-medium text-dusk-2">{children}</span>;
}

/* ---------- device frame (marketing mockups + app panels) ---------- */

export function DeviceFrame({
  title,
  right,
  icon,
  children,
  className,
}: {
  title: string;
  right?: string;
  icon?: ReactNode;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-[22px] border border-line-2 bg-paper-3 shadow-float",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line bg-paper-3 px-4 py-3.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em] text-ink">
          {icon}
          {title}
        </div>
        {right ? <div className="font-mono text-[11px] text-ink-faint">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ---------- icons (1.6px strokes, rounded, calm — no surveillance metaphors) ---------- */

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ClockIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3v9l5 3" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

export function HeartIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10Z" transform="scale(.82) translate(2.4 1.6)" />
    </svg>
  );
}

export function ListIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 7h16M4 12h10M4 17h13" />
    </svg>
  );
}

export function PersonIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
    </svg>
  );
}
