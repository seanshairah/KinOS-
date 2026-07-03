"use client";

import { useState } from "react";

/**
 * The one ask on the marketing site: an email, a quiet confirmation, and
 * the same promise the films make. Two visual variants — on the dusk hero
 * and on the light closing band.
 */
export function WaitlistForm({
  source,
  tone = "dusk",
}: {
  source: string;
  tone?: "dusk" | "light";
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const onDusk = tone === "dusk";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending" || state === "done") return;
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        className={`flex items-center gap-2.5 rounded-pill px-5 py-3 text-[14px] ${
          onDusk ? "bg-white/10 text-white" : "bg-calm-soft text-calm-text"
        }`}
      >
        <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${onDusk ? "bg-calm-soft" : "bg-calm"}`} />
        You&apos;re on the list. We&apos;ll write when there&apos;s a space for your family.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-[440px] flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          aria-label="Your email"
          className={`min-w-0 flex-1 rounded-pill px-5 py-3 text-[14px] outline-none ${
            onDusk
              ? "border border-halo/40 bg-white/5 text-white placeholder:text-halo/70 focus:border-halo"
              : "border border-line bg-paper-3 text-ink placeholder:text-ink-faint focus:border-halo/60"
          }`}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className={`lift shrink-0 rounded-pill px-6 py-3 text-[14px] font-semibold no-underline disabled:opacity-70 ${
            onDusk ? "bg-white text-dusk hover:bg-dusk-ink" : "bg-dusk text-white hover:bg-dusk-2"
          }`}
        >
          {state === "sending" ? "…" : "Join the waitlist"}
        </button>
      </div>
      <p className={`text-[11.5px] ${onDusk ? "text-halo/80" : "text-ink-faint"}`}>
        {state === "error"
          ? "That didn't send — try again in a moment."
          : "One email when your family's space is ready. Nothing else."}
      </p>
    </form>
  );
}
