"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * OrbitPricing — plans as expanding Orbit rings, not cards. The family
 * grows outward from one free Orbit. Hovering a ring (or a row) lights
 * it; clicking any ring or row opens that tier as a quiet paper card
 * over the sky — nothing is written at the centre until you ask.
 */

const PLANS = [
  {
    name: "Free",
    blurb: "One Orbit, basic check-ins, emergency contacts.",
    price: "$0",
    details: ["One loved one at the centre", "Daily check-ins, one tap", "Emergency contacts, always reachable"],
  },
  {
    name: "Family Core",
    blurb: "Daily Brief, medication, appointments, duties, record.",
    price: "$8",
    details: ["The Daily Brief, every evening", "Medication rhythms and appointments", "Duties with names on them", "The Family Record begins"],
  },
  {
    name: "Family Plus",
    blurb: "Multiple members, Money Pot, receipts, patterns.",
    price: "$19",
    details: ["The whole family joins", "Money Pot with receipts, to the cent", "Patterns noticed gently over weeks"],
  },
  {
    name: "Family Premium",
    blurb: "Multiple Orbits, caregiver access, document vault.",
    price: "$39",
    details: ["More than one loved one", "Caregivers with consent-scoped access", "A vault for the documents that matter"],
  },
  {
    name: "Diaspora Care",
    blurb: "Caregiver proof, shared fund, cross-border briefs.",
    price: "$22",
    details: ["Proof of care across borders", "A shared fund the family can see", "Briefs that land in every timezone"],
  },
  {
    name: "Caregiver Pro",
    blurb: "Multiple client Orbits, visit logs, invoices.",
    price: "$49",
    details: ["Care for several families", "Visit logs the family can trust", "Invoices without the awkwardness"],
  },
  {
    name: "Care Home",
    blurb: "Resident dashboards, family portals, incident logs.",
    price: "Custom",
    details: ["A dashboard for every resident", "A window for every family", "Incident logs, calm and complete"],
  },
] as const;

const SIZE = 480;
const C = SIZE / 2;
const INNER = 36;
const STEP = (C - INNER - 16) / (PLANS.length - 1);

export function OrbitPricing() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const plan = open !== null ? PLANS[open]! : null;

  return (
    <div className="relative flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
      {/* the rings — hidden on small screens, the list carries everything */}
      <div className="relative hidden max-w-full md:block" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          <circle cx={C} cy={C} r={10} fill="#FEFCF9" />
          <circle cx={C} cy={C} r={26} fill="rgba(237,235,246,.1)" />
          {/* one small satellite rides the chosen plan's ring */}
          <g
            className="spin-med pointer-events-none"
            style={{ transformOrigin: `${C}px ${C}px`, transformBox: "view-box" }}
          >
            <circle
              cx={C + INNER + STEP * active}
              cy={C}
              r={4}
              fill="#EDEBF6"
              style={{ transition: "cx .5s ease" }}
            />
          </g>
          {PLANS.map((p, i) => {
            const r = INNER + STEP * i;
            const on = i === active;
            return (
              <g key={p.name}>
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
                  onClick={() => {
                    setActive(i);
                    setOpen(i);
                  }}
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
        <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-halo/70">
          tap a ring to read it
        </p>
      </div>

      <div className="w-full max-w-[420px]">
        <ol className="flex flex-col">
          {PLANS.map((p, i) => {
            const on = i === active;
            return (
              <li key={p.name}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    setActive(i);
                    setOpen(i);
                  }}
                  aria-haspopup="dialog"
                  className={`w-full border-t border-halo/15 px-1 py-3.5 text-left transition-colors first:border-t-0 ${
                    on ? "text-white" : "text-[#b9b6da] hover:text-dusk-ink"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-[10.5px] text-halo">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-serif text-[18px]">{p.name}</span>
                    </span>
                    <span className="font-mono text-[12px] text-halo">{p.price}</span>
                  </span>
                  <span
                    className="block overflow-hidden pl-[34px] text-[13px] leading-[1.55] text-[#c9c6e4] transition-all duration-500"
                    style={{ maxHeight: on ? 48 : 0, opacity: on ? 1 : 0 }}
                  >
                    {p.blurb}
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

      {/* ——— the tier, read up close: a paper card over the sky ——— */}
      {plan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${plan.name} plan`}
          className="absolute inset-0 z-30 grid place-items-center p-4"
        >
          {/* the sky dims, gently */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="absolute inset-0 cursor-default bg-[#191733]/55 backdrop-blur-[2px]"
            style={{ animation: "reveal-fade .35s ease both" }}
          />
          <div
            className="relative w-full max-w-[360px] rounded-orbit border border-halo/25 bg-paper-3 p-6 text-left shadow-float"
            style={{ animation: "card-pop .45s cubic-bezier(.2,.9,.3,1.1) both" }}
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border border-line-2 text-[13px] text-ink-soft hover:text-ink"
            >
              ×
            </button>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-dusk-2">
              ring {String((open ?? 0) + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-1.5 font-serif text-[26px] font-light leading-tight text-ink">{plan.name}</h3>
            <p className="mt-1 font-mono text-[13px] text-dusk-2">
              {plan.price}
              {plan.price.startsWith("$") ? " / month" : " — let's talk"}
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {plan.details.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5] text-ink-soft">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-halo" />
                  {d}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-in"
              className="lift mt-5 inline-block rounded-pill bg-dusk px-5 py-2.5 text-[13.5px] font-semibold text-white no-underline hover:bg-dusk-2"
            >
              Start with {plan.name}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
