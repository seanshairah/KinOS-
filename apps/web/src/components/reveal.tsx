"use client";

import { useEffect } from "react";

/**
 * Scroll reveal — sections marked with data-reveal fade up as they enter
 * the viewport. Progressive: without JavaScript nothing is ever hidden,
 * and prefers-reduced-motion keeps everything still.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (elements.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("reveal-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) continue; // already on screen
      const delay = Number(el.dataset.revealDelay ?? 0);
      if (delay > 0) el.style.transitionDelay = `${delay}ms`;
      if ("revealBlur" in el.dataset) el.classList.add("reveal-blur");
      el.classList.add("reveal-pending");
      io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return null;
}
