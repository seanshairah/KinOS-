"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Calm polling: refresh server data on an unhurried interval while the tab
 * is visible. The product philosophy sets the cadence — awareness, not
 * anxiety — and a push channel can replace this without touching pages.
 */
export function AutoRefresh({ seconds = 45 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
