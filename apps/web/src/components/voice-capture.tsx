"use client";

import { useRef, useState } from "react";
import { Button } from "@kinos/ui";
import { submitVoiceNoteAction } from "@/lib/actions/signals";

/**
 * Voice note capture — the magic moment. Speech is transcribed in the
 * browser (Web Speech API) when available; typing works everywhere.
 * The transcript flows through the signals pipeline: extracted details,
 * follow-up duties, and a record entry appear without another form.
 */

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function VoiceCapture({ subjectId }: { subjectId: string }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const supported = typeof window !== "undefined" && getRecognition() !== null;

  function toggleListening() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    recognition.current = rec;
    rec.lang = "en-ZW";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i]![0]!.transcript + " ";
      }
      setText((prev) => (prev ? prev + " " : "") + transcript.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  }

  async function submit() {
    if (!text.trim()) return;
    setPending(true);
    setStatus(null);
    const formData = new FormData();
    formData.set("subjectId", subjectId);
    formData.set("text", text.trim());
    formData.set("kind", "voice_note");
    const result = await submitVoiceNoteAction(formData);
    setPending(false);
    if (result.ok) {
      setText("");
      setStatus(result.message ?? "Noted.");
    } else {
      setStatus(result.message ?? "That didn't go through — try again.");
    }
  }

  return (
    <div className="rounded-orbit border border-line bg-paper-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Leave a note about today
        </h3>
        {supported && (
          <button
            type="button"
            onClick={toggleListening}
            className={`rounded-pill border px-3.5 py-1.5 text-[12.5px] font-medium ${
              listening
                ? "border-ember bg-ember-soft text-[#8a531b]"
                : "border-line bg-paper text-ink-soft hover:text-ink"
            }`}
          >
            {listening ? "Listening… tap to stop" : "🎙 Speak instead"}
          </button>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder='e.g. "She ate well at lunch but mentioned feeling dizzy again. I bought the tablets, 23.50 at Greenwood."'
        className="mt-3 w-full rounded-card border border-line bg-paper px-3.5 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-dusk-2"
      />
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={submit} disabled={pending || !text.trim()}>
          {pending ? "Filing it…" : "Add to the record"}
        </Button>
        {status && <span className="text-[13px] text-calm">{status}</span>}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
        KinOS reads the note, files the details, and adds follow-ups where they&apos;re
        needed. Anything uncertain is marked worth a check — never stated as fact.
      </p>
    </div>
  );
}
