"use client";

import { useState } from "react";
import { Button } from "@kinos/ui";
import { askMemoryAction, type MemoryAnswer } from "@/lib/actions/memory";

/** Family Memory — ask the record a question in plain words. */
export function AskMemory({
  subjects,
}: {
  subjects: { id: string; name: string }[];
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<MemoryAnswer | null>(null);
  const [pending, setPending] = useState(false);

  async function ask() {
    if (!question.trim() || !subjectId) return;
    setPending(true);
    const formData = new FormData();
    formData.set("subjectId", subjectId);
    formData.set("question", question.trim());
    const result = await askMemoryAction(formData);
    setAnswer(result);
    setPending(false);
  }

  return (
    <div className="rounded-orbit border border-line bg-paper-3 p-5">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
        Ask the Family Memory
      </h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded-card border border-line bg-paper px-3 py-2 text-[13.5px]"
          aria-label="About whom"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              About {s.name}
            </option>
          ))}
        </select>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder='e.g. "When did she first mention leg pain?"'
          className="flex-1 rounded-card border border-line bg-paper px-3 py-2 text-[13.5px] placeholder:text-ink-faint focus:border-dusk-2"
        />
        <Button onClick={ask} disabled={pending || !question.trim()}>
          {pending ? "Looking…" : "Ask"}
        </Button>
      </div>
      {answer && (
        <div className="mt-4 rounded-card border border-line bg-paper p-4">
          <p className="font-serif text-[16px] leading-relaxed text-ink">{answer.answer}</p>
          {answer.sourceIds.length > 0 && (
            <p className="mt-2 font-mono text-[10.5px] text-ink-faint">
              grounded in {answer.sourceIds.length} record entr{answer.sourceIds.length === 1 ? "y" : "ies"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
