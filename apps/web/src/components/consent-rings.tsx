"use client";

import { useState } from "react";

/**
 * ConsentRings — privacy drawn, not written. The loved one sits at the
 * centre; access is a set of rings (Health innermost → Emergency
 * outermost); family members sit only on the rings they've been given.
 * The revoke demo closes a ring: the member glides out and the copy
 * says what the database does — gone on the very next request.
 */

const RINGS = ["Health", "Money", "Documents", "Location", "Emergency"] as const;
const RADII = [72, 108, 144, 180, 216];

interface Member {
  id: string;
  name: string;
  role: string;
  ring: number; // index into RINGS
  angle: number; // radians
  hue: string;
}

const MEMBERS: Member[] = [
  { id: "grace", name: "Grace", role: "caregiver updates · receipts", ring: 0, angle: -1.1, hue: "#4E9E7E" },
  { id: "tari", name: "Tari", role: "Daily Brief · Money Pot · Record", ring: 1, angle: 2.5, hue: "#A9A7E0" },
  { id: "sarah", name: "Sarah", role: "duties · appointments", ring: 2, angle: 0.6, hue: "#EDEBF6" },
  { id: "uncle", name: "Uncle T.", role: "emergency profile only", ring: 4, angle: 3.6, hue: "#928A7E" },
];

const SIZE = 470;
const C = SIZE / 2;

export function ConsentRings() {
  const [revoked, setRevoked] = useState(false);

  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-14">
      <div className="relative max-w-full" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          {RADII.map((r, i) => (
            <g key={r}>
              <circle
                cx={C}
                cy={C}
                r={r}
                fill="none"
                stroke={i === 0 && revoked ? "rgba(169,167,224,.14)" : "rgba(169,167,224,.3)"}
                strokeWidth="1"
                strokeDasharray={i === 0 && revoked ? "3 7" : undefined}
                style={{ transition: "stroke .6s ease" }}
              />
              <text
                x={C}
                y={C - r - 6}
                textAnchor="middle"
                className="fill-halo font-mono"
                style={{ fontSize: 10, letterSpacing: "0.14em", opacity: 0.85 }}
              >
                {RINGS[i]!.toUpperCase()}
              </text>
            </g>
          ))}
          {/* the loved one, at the centre of every decision */}
          <circle cx={C} cy={C} r={30} fill="rgba(237,235,246,.12)" />
          <circle cx={C} cy={C} r={10} fill="#FEFCF9" />
          <text
            x={C}
            y={C + 48}
            textAnchor="middle"
            className="fill-[#EDEBF6] font-mono"
            style={{ fontSize: 10.5, letterSpacing: "0.12em" }}
          >
            MUM
          </text>
        </svg>

        {MEMBERS.map((m) => {
          const ring = m.id === "grace" && revoked ? 2 : m.ring;
          const r = RADII[ring]!;
          const x = C + Math.cos(m.angle) * r;
          const y = C + Math.sin(m.angle) * r;
          return (
            <div
              key={m.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
              style={{ left: x, top: y, transition: "left .9s cubic-bezier(.22,1,.36,1), top .9s cubic-bezier(.22,1,.36,1)" }}
            >
              <span
                className="orbit-pulse h-3 w-3 flex-none rounded-full"
                style={{ background: m.hue, boxShadow: `0 0 14px ${m.hue}66` }}
              />
              <span className="rounded-pill border border-halo/25 bg-[#211d19]/25 px-2.5 py-1 font-mono text-[10px] text-dusk-ink backdrop-blur-sm">
                {m.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className="max-w-[360px]">
        <p className="font-serif text-[clamp(20px,2.4vw,26px)] font-light leading-[1.35] text-dusk-ink">
          Every signal has a reason. Every person has a role. Every permission can be
          revoked.
        </p>
        <ul className="mt-6 flex flex-col gap-2.5">
          {MEMBERS.map((m) => (
            <li key={m.id} className="flex items-center gap-3 text-[13px] text-[#c9c6e4]">
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: m.hue }} />
              <b className="font-semibold text-dusk-ink">{m.name}</b>
              <span className="font-mono text-[10.5px] text-halo">
                {m.id === "grace" && revoked ? "receipts only · health closed" : m.role}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setRevoked((v) => !v)}
          className="lift mt-7 rounded-pill border border-halo/40 px-5 py-2.5 font-mono text-[12px] text-dusk-ink hover:border-halo"
        >
          {revoked ? "Restore Grace's health access" : "Revoke Grace's health access"}
        </button>
        <p
          className="mt-3 font-mono text-[11px] leading-[1.6] text-halo transition-opacity duration-500"
          style={{ opacity: revoked ? 1 : 0 }}
        >
          The ring closed. Enforced by the database itself —
          <br />
          gone on the very next request, not the next update.
        </p>
      </div>
    </div>
  );
}
