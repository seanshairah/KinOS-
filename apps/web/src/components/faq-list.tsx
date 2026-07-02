"use client";

import { useState } from "react";

/**
 * FaqList — questions that open like a lamp turning on, not a drawer
 * sliding out. One question holds the light at a time: the card lifts,
 * its edge warms with halo, the answer unfolds smoothly (grid-rows, so
 * the height animates for real) and the words arrive with a soft blur
 * settle. The + becomes × by turning, nothing jumps.
 */

export function FaqList({
  items,
}: {
  items: readonly { q: string; a: string }[];
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((f, i) => {
        const on = open === i;
        return (
          <div
            key={f.q}
            data-reveal
            data-reveal-delay={i * 60}
            className="rounded-[18px] border transition-all duration-500"
            style={{
              borderColor: on ? "rgba(169,167,224,.55)" : "var(--line-2)",
              background: "var(--paper-3)",
              boxShadow: on
                ? "0 2px 4px rgba(33,29,25,.05), 0 24px 60px -28px rgba(53,51,95,.4), 0 0 0 4px rgba(169,167,224,.08)"
                : "var(--shadow)",
              transform: on ? "translateY(-2px)" : "none",
            }}
          >
            <button
              type="button"
              aria-expanded={on}
              onClick={() => setOpen(on ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-serif text-[17px] text-ink"
            >
              <span className="flex items-center gap-3.5">
                {/* a lamp that lights when the question opens */}
                <span
                  aria-hidden
                  className="h-[7px] w-[7px] flex-none rounded-full transition-all duration-500"
                  style={{
                    background: on ? "#6C69B8" : "var(--line-2)",
                    boxShadow: on ? "0 0 10px rgba(108,105,184,.7)" : "none",
                  }}
                />
                {f.q}
              </span>
              <span
                aria-hidden
                className="grid h-7 w-7 flex-none place-items-center rounded-full border text-[15px] transition-all duration-500"
                style={{
                  transform: on ? "rotate(225deg)" : "none",
                  borderColor: on ? "rgba(108,105,184,.6)" : "var(--line-2)",
                  color: on ? "#4E4B90" : "var(--dusk-2)",
                }}
              >
                +
              </span>
            </button>
            {/* real height animation: 0fr → 1fr */}
            <div
              className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.25,.8,.25,1)]"
              style={{ gridTemplateRows: on ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p
                  className="max-w-[64ch] px-6 pb-5 pl-[68px] text-[14px] leading-[1.7] text-ink-soft transition-all delay-100 duration-500"
                  style={{
                    opacity: on ? 1 : 0,
                    transform: on ? "none" : "translateY(-6px)",
                    filter: on ? "none" : "blur(3px)",
                  }}
                >
                  {f.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
