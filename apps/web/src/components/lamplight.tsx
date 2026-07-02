"use client";

import { useEffect, useRef } from "react";

/**
 * Lamplight — on the night sections, a soft pool of light follows the
 * pointer, as if the visitor carries a small lamp through the dark.
 * Eased with rAF so it trails gently; invisible on touch devices and
 * under prefers-reduced-motion. Pure atmosphere, zero layout cost.
 */
export function Lamplight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let targetOpacity = 0;
    let opacity = 0;
    let running = false;

    const loop = () => {
      x += (targetX - x) * 0.09;
      y += (targetY - y) * 0.09;
      opacity += (targetOpacity - opacity) * 0.08;
      el.style.background = `radial-gradient(340px circle at ${x}px ${y}px, rgba(199,196,236,${(0.085 * opacity).toFixed(3)}), rgba(169,167,224,${(0.04 * opacity).toFixed(3)}) 45%, transparent 70%)`;
      if (opacity < 0.01 && targetOpacity === 0) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      targetOpacity = 1;
      wake();
    };
    const onLeave = () => {
      targetOpacity = 0;
      wake();
    };

    parent.addEventListener("pointermove", onMove, { passive: true });
    parent.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-[3]" />;
}
