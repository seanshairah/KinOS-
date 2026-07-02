"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * OrbitPricing — plans as expanding Orbit rings, not cards. The family
 * grows outward from one free Orbit; hover or tap a ring (or a row) to
 * read it. The diagram and the list are the same data — the list is
 * always present so mobile and screen readers lose nothing.
 */

const PLANS = [
  { name: "Free", blurb: "One Orbit, basic check-ins, emergency contacts.", price: "$0" },
  { name: "Family Core", blurb: "Daily Brief, medication, appointments, duties, record.", price: "$9" },
  { name: "Family Plus", blurb: "Multiple members, Money Pot, receipts, patterns.", price: "$19" },
  { name: "Family Premium", blurb: "Multiple Orbits, caregiver access, document vault.", price: "$29" },
  { name: "Diaspora Care", blurb: "Caregiver proof, shared fund, cross-border briefs.", price: "$39" },
  { name: "Caregiver Pro", blurb: "Multiple client Orbits, visit logs, invoices.", price: "$49" },
  { name: "Care Home", blurb: "Resident dashboards, family portals, incident logs.", price: "Custom" },
] as const;

const SIZE = 480;
const C = SIZE / 2;
const INNER = 36;
const STEP = (C - INNER - 16) / (PLANS.length - 1);

export function OrbitPricing() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
      {/* the rings — hidden on small screens, the list carries everything */}
      <div className="relative hidden max-w-full md:block" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          <circle cx={C} cy={C} r={10} fill="#FEFCF9" />
          <circle cx={C} cy={C} r={26} fill="rgba(237,235,246,.1)" />
          {PLANS.map((plan, i) => {
            const r = INNER + STEP * i;
            const on = i === active;
            return (
              <g key={plan.name}>
                <circle
                  cx={C}
                  cy={C}
                  r={r}
                  fill="none"
                  stroke={on ? "rgba(237,235,246,.85)" : "rgba(169,167,224,.28)"}
                  strokeWidth={on ? 1.6 : 1}
                  style={{ transition: "stroke .4s ease, stroke-width .4s ease" }}
                />
                {/* generous invisible hit ring */}
                <circle
                  cx={C}
                  cy={C}
                  r={r}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={Math.min(STEP, 26)}
                  className="cursor-pointer"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                />
                <circle
                  cx={C + Math.cos(-0.9 + i * 0.35) * r}
                  cy={C + Math.sin(-0.9 + i * 0.35) * r}
                  r={on ? 5 : 3.5}
                  fill={on ? "#EDEBF6" : "#A9A7E0"}
                  className="pointer-events-none"
                  style={{ transition: "r .3s ease, fill .3s ease" }}
                />
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="max-w-[200px] pb-2 text-center">
            <div className="font-serif text-[22px] font-light text-white">{PLANS[active]!.name}</div>
            <div className="mt-1 font-mono text-[12px] text-halo">
              {PLANS[active]!.price}
              {PLANS[active]!.price.startsWith("$") ? " / month" : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[420px]">
        <ol className="flex flex-col">
          {PLANS.map((plan, i) => {
            const on = i === active;
            return (
              <li key={plan.name}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-expanded={on}
                  className={`w-full border-t border-halo/15 px-1 py-3.5 text-left transition-colors first:border-t-0 ${
                    on ? "text-white" : "text-[#b9b6da] hover:text-dusk-ink"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-[10.5px] text-halo">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-serif text-[18px]">{plan.name}</span>
                    </span>
                    <span className="font-mono text-[12px] text-halo">{plan.price}</span>
                  </span>
                  <span
                    className="block overflow-hidden pl-[34px] text-[13px] leading-[1.55] text-[#c9c6e4] transition-all duration-500"
                    style={{ maxHeight: on ? 48 : 0, opacity: on ? 1 : 0 }}
                  >
                    {plan.blurb}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href="/sign-in"
            className="lift rounded-pill bg-white px-6 py-3 text-[14px] font-semibold text-dusk no-underline"
          >
            Start your first Orbit
          </Link>
          <Link
            href="/pricing"
            className="font-mono text-[12.5px] text-halo underline decoration-halo/40 underline-offset-4 hover:text-white"
          >
            Full pricing →
          </Link>
        </div>
      </div>
    </div>
  );
}
