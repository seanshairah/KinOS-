/**
 * MiniOrbit — a loved one's presence as a small living orbit. Pure SVG
 * and CSS (server-renderable): two rings, a breathing centre, and two
 * satellites riding the rings via the shared spin keyframes. Status is
 * the light: calm pulse when steady, lavender for a recent signal,
 * ember only when something needs someone. Reduced motion stills it.
 */

export type OrbitStatus = "steady" | "signal" | "attention" | "urgent";

const STATUS_LIGHT: Record<OrbitStatus, { dot: string; glow: string }> = {
  steady: { dot: "#4E9E7E", glow: "rgba(78,158,126,.5)" },
  signal: { dot: "#A9A7E0", glow: "rgba(169,167,224,.55)" },
  attention: { dot: "#D98A3D", glow: "rgba(217,138,61,.55)" },
  urgent: { dot: "#C25642", glow: "rgba(194,86,66,.55)" },
};

export function MiniOrbit({
  status = "steady",
  size = 64,
  seed = 0,
}: {
  status?: OrbitStatus;
  size?: number;
  seed?: number;
}) {
  const light = STATUS_LIGHT[status];
  const spin = seed % 2 === 0 ? "spin-slow" : "spin-med";
  const a1 = 40 + (seed * 47) % 280;
  const a2 = 180 + (seed * 83) % 140;
  return (
    <span
      aria-hidden
      className="relative inline-block flex-none"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id={`mini-halo-${seed}`}>
            <stop offset="0%" stopColor="#A9A7E0" stopOpacity=".2" />
            <stop offset="100%" stopColor="#A9A7E0" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* the sky pools softly behind the little system */}
        <circle cx="32" cy="32" r="30" fill={`url(#mini-halo-${seed})`} />
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(169,167,224,.28)" strokeWidth="1" />
        <circle cx="32" cy="32" r="16" fill="none" stroke="rgba(169,167,224,.38)" strokeWidth="1" />
        {/* light travelling the outer path */}
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="rgba(237,235,246,.55)"
          strokeWidth="1.2"
          className="ring-shimmer"
          style={{ animationDelay: `${(seed % 5) * -7}s` }}
        />
        {/* breathing centre — the person */}
        <circle cx="32" cy="32" r="10" fill="rgba(237,235,246,.14)" className="breathe" />
        <circle cx="32" cy="32" r="4.5" fill="#FEFCF9" />
        {/* the family, riding the rings */}
        <g className={spin} style={{ transformOrigin: "32px 32px" }}>
          <circle
            cx={32 + 16 * Math.cos((a1 * Math.PI) / 180)}
            cy={32 + 16 * Math.sin((a1 * Math.PI) / 180)}
            r="2.6"
            fill={light.dot}
            className="orbit-pulse"
            style={{ filter: `drop-shadow(0 0 4px ${light.glow})` }}
          />
        </g>
        <g className="spin-slow" style={{ transformOrigin: "32px 32px", animationDirection: "reverse" }}>
          <circle
            cx={32 + 26 * Math.cos((a2 * Math.PI) / 180)}
            cy={32 + 26 * Math.sin((a2 * Math.PI) / 180)}
            r="2.2"
            fill="#EDEBF6"
            opacity=".85"
          />
        </g>
      </svg>
    </span>
  );
}
