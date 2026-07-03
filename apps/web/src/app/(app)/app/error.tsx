"use client";

import { useEffect } from "react";

/** A room failed to load. Stay calm, offer the way back. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app room error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-serif text-[26px] font-light italic text-ink">
        This room didn&apos;t open. Nothing is lost.
      </p>
      <p className="max-w-[44ch] text-[13.5px] text-ink-soft">
        The family record is safe. Try again, or head back to Today.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-pill bg-dusk px-5 py-2.5 text-[13px] font-medium text-white hover:bg-dusk-2"
        >
          Try again
        </button>
        <a
          href="/app"
          className="rounded-pill border border-line bg-paper-2 px-5 py-2.5 text-[13px] font-medium text-ink no-underline"
        >
          Back to Today
        </a>
      </div>
    </div>
  );
}
