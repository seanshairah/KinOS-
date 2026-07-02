"use client";

import { useState } from "react";

/**
 * A pending invitation as the thing it really is: a link you paste into
 * the family chat. Origin comes from the browser so links are right on
 * any domain the app is served from.
 */
export function InviteLink({ token, workspace }: { token: string; workspace: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`;
  const message = `You're invited to "${workspace}" on KinOS — the private space where our family coordinates care. Join here: ${link}`;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* clipboard unavailable: the WhatsApp path still works */
          }
        }}
        className="rounded-pill border border-line bg-paper-2 px-3 py-1 text-[11.5px] font-medium text-ink hover:border-halo/60"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-pill bg-calm-soft px-3 py-1 text-[11.5px] font-medium text-calm-text no-underline hover:brightness-95"
      >
        Share on WhatsApp
      </a>
    </span>
  );
}
