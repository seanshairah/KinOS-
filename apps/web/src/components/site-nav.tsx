"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OrbitMark, Wordmark } from "@kinos/ui";

/**
 * SiteNav — a floating dusk-glass pill instead of a wall. It never draws
 * a line across the sky: scrolling down into the story it glides out of
 * the way; the first scroll upward brings it back. Dark glass reads
 * clearly over both the night sections and warm paper.
 */
export function SiteNav() {
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setAtTop(y < 60);
        if (y > lastY.current + 8 && y > 160) setHidden(true);
        else if (y < lastY.current - 8 || y < 160) setHidden(false);
        lastY.current = y;
        raf = 0;
      });
    };
    lastY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 transition-transform duration-500 ease-out"
      style={{ transform: hidden ? "translateY(-150%)" : "none" }}
    >
      <nav
        className="flex items-center gap-4 rounded-pill border border-white/10 py-2 pl-4 pr-2 backdrop-blur-md transition-[background,box-shadow] duration-500 md:gap-6 md:pl-5"
        style={{
          background: atTop ? "rgba(38,36,68,.42)" : "rgba(34,32,62,.78)",
          boxShadow: atTop ? "none" : "0 14px 44px -18px rgba(10,8,30,.65)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <OrbitMark size={20} className="text-halo" />
          <Wordmark size={15} onDusk />
        </Link>
        <div className="hidden items-center gap-5 text-[13px] text-[#c3c0e0] md:flex">
          <Link href="/#story" className="no-underline transition-colors hover:text-white">The story</Link>
          <Link href="/pricing" className="no-underline transition-colors hover:text-white">Pricing</Link>
          <Link href="/privacy" className="no-underline transition-colors hover:text-white">Privacy</Link>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/sign-in"
            className="rounded-pill px-3 py-1.5 text-[13px] font-medium text-[#d7d5ee] no-underline transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className="lift rounded-pill bg-white px-4 py-1.5 text-[13px] font-semibold text-dusk no-underline"
          >
            Start your family space
          </Link>
        </div>
      </nav>
    </header>
  );
}
