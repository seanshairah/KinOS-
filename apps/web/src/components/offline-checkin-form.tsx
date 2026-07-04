"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { enqueueCheckin, flushCheckins, type QueuedCheckin } from "@/lib/offline-queue";

/**
 * The check-in, made resilient to a dropped connection. It posts to the
 * cookie-authed endpoint; if the network isn't there, the check-in is stored
 * on the device and sent the moment the connection returns — the person
 * tapping never has to know whether they had signal. Calm by default: the
 * offline path is reassuring, not an error.
 */

const MOODS = [
  { value: "good", label: "Doing well", emoji: "🌤" },
  { value: "okay", label: "Okay", emoji: "🌥" },
  { value: "low", label: "A little low", emoji: "🌦" },
  { value: "unwell", label: "Not feeling well", emoji: "🌧" },
] as const;

type Status = "idle" | "sending" | "queued" | "error";

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export function OfflineCheckinForm({
  subjectId,
  subjectName,
}: {
  subjectId: string;
  subjectName: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Send anything left from a previous offline session, now and whenever the
  // connection comes back.
  useEffect(() => {
    void flushCheckins();
    const onOnline = () => void flushCheckins();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const mood = form.get("mood");
    if (mood !== "good" && mood !== "okay" && mood !== "low" && mood !== "unwell") {
      setStatus("error");
      setMessage("Pick how they're doing today.");
      return;
    }
    const ateRaw = form.get("ate");
    const item: QueuedCheckin = {
      id: newId(),
      subjectId,
      subjectName,
      mood,
      ate: ateRaw === "yes" || ateRaw === "no" ? ateRaw : undefined,
      note: (form.get("note") as string)?.trim() || undefined,
      capturedAt: new Date().toISOString(),
    };

    setStatus("sending");
    setMessage(null);

    // Offline up front — don't even try, just hold it.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      await queueAndLeave(item);
      return;
    }

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subjectId: item.subjectId,
          mood: item.mood,
          ate: item.ate,
          note: item.note,
          capturedAt: item.capturedAt,
        }),
      });
      if (res.ok) {
        router.push(`/app/orbits/${subjectId}`);
        router.refresh();
        return;
      }
      if (res.status === 401 || res.status >= 500) {
        // Session hiccup or server wobble — hold it and reassure.
        await queueAndLeave(item);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setMessage(body.error ?? "That didn't send. Try again.");
    } catch {
      // Network dropped mid-send — hold it.
      await queueAndLeave(item);
    }
  }

  async function queueAndLeave(item: QueuedCheckin) {
    const stored = await enqueueCheckin(item);
    if (!stored) {
      setStatus("error");
      setMessage("You're offline and this device can't hold it. Try again when you have signal.");
      return;
    }
    setStatus("queued");
    setMessage(null);
    // Let the reassurance land, then return to the orbit.
    window.setTimeout(() => {
      router.push(`/app/orbits/${subjectId}`);
      router.refresh();
    }, 1600);
  }

  if (status === "queued") {
    return (
      <div className="mt-8 rounded-orbit border border-line bg-paper-2 px-6 py-8 text-center">
        <p className="font-serif text-[22px] font-light italic text-ink">Saved.</p>
        <p className="mx-auto mt-2 max-w-[40ch] text-[14px] leading-relaxed text-ink-soft">
          You&apos;re offline right now — this check-in will send itself the moment
          you&apos;re back on. Nothing more to do.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-6">
      <fieldset>
        <legend className="sr-only">How are they feeling?</legend>
        <div className="grid grid-cols-2 gap-3">
          {MOODS.map((mood) => (
            <label
              key={mood.value}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-orbit border border-line bg-paper-3 px-4 py-6 text-center shadow-card transition-colors has-[:checked]:border-dusk-2 has-[:checked]:bg-paper-2"
            >
              <input type="radio" name="mood" value={mood.value} required className="sr-only" />
              <span aria-hidden className="text-[34px] leading-none">{mood.emoji}</span>
              <span className="text-[16px] font-medium text-ink">{mood.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Eaten today?
        </legend>
        <div className="flex gap-3">
          {[
            { value: "yes", label: "Yes, eaten" },
            { value: "no", label: "Not yet" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex-1 cursor-pointer rounded-card border border-line bg-paper-3 px-4 py-3.5 text-center text-[15px] font-medium has-[:checked]:border-dusk-2 has-[:checked]:bg-paper-2"
            >
              <input type="radio" name="ate" value={opt.value} className="sr-only" />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="note"
          className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint"
        >
          Anything to add? (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="A few words is plenty."
          className="w-full rounded-card border border-line bg-paper-3 px-4 py-3 text-[16px] leading-relaxed placeholder:text-ink-faint focus:border-dusk-2"
        />
      </div>

      {status === "error" && message && (
        <p className="text-[13.5px] text-urgent">{message}</p>
      )}

      <button
        disabled={status === "sending"}
        className="rounded-pill bg-dusk px-6 py-4 text-[17px] font-semibold text-white hover:bg-dusk-2 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send today's check-in"}
      </button>
    </form>
  );
}
