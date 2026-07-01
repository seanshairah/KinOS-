/**
 * The Orbit mark — the product's core idea, drawn. A steady centre node
 * (the loved one), a defining inner ring, and satellites in orbit.
 *
 * Live behaviour: a calm Orbit means all is well; when attention is
 * needed, one satellite warms to ember and drifts to the top of the ring —
 * visible before any words are read.
 */

export interface OrbitMarkProps {
  size?: number;
  /** When true, the top satellite warms to ember. */
  attention?: boolean;
  /** Drop the faint outer ring for small sizes (app icons ≤ 20px). */
  compact?: boolean;
  className?: string;
  title?: string;
}

export function OrbitMark({
  size = 24,
  attention = false,
  compact = false,
  className,
  title,
}: OrbitMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {!compact && (
        <circle
          cx="24"
          cy="24"
          r="21"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".28"
        />
      )}
      <circle
        cx="24"
        cy="24"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="24" cy="24" r="4.4" fill="currentColor" />
      {attention ? (
        <circle cx="24" cy="3" r="3.4" fill="var(--ember)" />
      ) : (
        <circle cx="35.25" cy="12.75" r="3" fill="currentColor" />
      )}
      <circle cx="10.3" cy="30.1" r="2.1" fill="currentColor" opacity=".55" />
    </svg>
  );
}

/** Kin (600) carries the family; OS (500, lighter) holds it together. */
export function Wordmark({
  size = 18,
  onDusk = false,
}: {
  size?: number;
  onDusk?: boolean;
}) {
  return (
    <span
      className="font-sans font-semibold"
      style={{
        fontSize: size,
        letterSpacing: "-0.03em",
        color: onDusk ? "#fff" : "var(--ink)",
      }}
    >
      Kin
      <span
        className="font-medium"
        style={{ color: onDusk ? "var(--halo)" : "var(--dusk-2)" }}
      >
        OS
      </span>
    </span>
  );
}
