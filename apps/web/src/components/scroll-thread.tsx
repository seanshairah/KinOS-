"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollThread — a vertical thread that draws itself as its parent
 * passes through the viewport: the record writing itself. Reduced
 * motion renders it fully drawn.
 */
export function ScrollThread({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    const el = ref.current?.parentElement;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      setProgress(Math.min(Math.max((vh * 0.82 - rect.top) / rect.height, 0), 1));
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className={`pointer-events-none absolute ${className}`}>
      <div className="h-full w-px bg-halo/15" />
      <div
        className="absolute left-0 top-0 w-px bg-halo/70"
        style={{ height: `${progress * 100}%`, boxShadow: "0 0 8px rgba(169,167,224,.5)" }}
      />
    </div>
  );
}
