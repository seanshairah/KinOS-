/**
 * RoomLoading — the room settles instead of flashing a spinner.
 * Breathing orbit rings, one quiet line, and glass skeletons where the
 * content will land. Pure CSS; reduced motion renders it still.
 */

export function RoomLoading({ line = "The room is settling…" }: { line?: string }) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <div>
        <div className="skeleton h-[11px] w-36" />
        <div className="mt-4 flex items-center gap-4">
          <span aria-hidden className="relative inline-block h-[52px] w-[52px] flex-none">
            <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(169,167,224,.3)" strokeWidth="1" />
              <circle cx="32" cy="32" r="16" fill="none" stroke="rgba(169,167,224,.4)" strokeWidth="1" />
              <circle cx="32" cy="32" r="9" fill="rgba(237,235,246,.16)" className="breathe" />
              <circle cx="32" cy="32" r="4" fill="#FEFCF9" />
              <g className="spin-med" style={{ transformOrigin: "32px 32px" }}>
                <circle cx="48" cy="32" r="2.4" fill="#A9A7E0" />
              </g>
            </svg>
          </span>
          <p className="font-serif text-[20px] font-light text-ink-soft">{line}</p>
        </div>
      </div>
      <div className="rounded-orbit border border-line bg-paper-2 p-6">
        <div className="skeleton h-[11px] w-28" />
        <div className="mt-4 flex flex-col gap-3">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </div>
      <div className="rounded-orbit border border-line bg-paper-2 p-6">
        <div className="flex items-center gap-4">
          <div className="skeleton h-12 w-12 rounded-full" />
          <div className="flex-1">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton mt-2 h-3 w-56" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
