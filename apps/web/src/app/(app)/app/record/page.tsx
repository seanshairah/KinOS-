import {
  addRecordItemForm,
} from "@/lib/actions/forms";
import { EmptyState, Eyebrow, Panel, Pill } from "@kinos/ui";

import { AskMemory } from "@/components/ask-memory";
import { requireFamilyContext } from "@/lib/data/context";
import { listRecordItems, listSubjects } from "@/lib/data/record";

const inputClass =
  "rounded-card border border-line bg-paper px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-dusk-2";

const KIND_LABEL: Record<string, string> = {
  note: "note",
  decision: "decision",
  incident: "incident",
  question: "question",
  document: "document",
  summary: "summary",
};

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await requireFamilyContext();
  const [items, subjects] = await Promise.all([
    listRecordItems(ctx.userId, q),
    listSubjects(ctx.userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Family Record</Eyebrow>
        <h1 className="mt-1 font-serif text-[28px] tracking-[-0.01em]">
          The memory that doesn&apos;t fade
        </h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Decisions, notes, incidents and documents — searchable in plain words, years later.
        </p>
      </div>

      <AskMemory subjects={subjects.map((s) => ({ id: s.id, name: s.display_name }))} />

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search the record…"
          className={`${inputClass} flex-1`}
        />
        <button className="rounded-pill border border-line bg-paper-3 px-4 py-2 text-[13px] font-medium text-ink">
          Search
        </button>
      </form>

      <Panel className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Add to the record
        </h2>
        <form action={addRecordItemForm} className="grid gap-2 sm:grid-cols-2">
          <select name="subjectId" required className={inputClass}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                About {s.display_name}
              </option>
            ))}
          </select>
          <select name="kind" className={inputClass} defaultValue="note">
            <option value="note">A note</option>
            <option value="decision">A decision the family made</option>
            <option value="incident">Something that happened</option>
            <option value="question">A question to remember</option>
          </select>
          <input name="title" required placeholder="Title" className={`${inputClass} sm:col-span-2`} />
          <textarea
            name="body"
            rows={3}
            placeholder="The details, in plain words."
            className={`${inputClass} sm:col-span-2`}
          />
          <label className="flex items-center gap-2 text-[13px] text-ink-soft sm:col-span-2">
            <input type="checkbox" name="privacy" value="medical_private" /> Keep this
            health-private (admins, the person, and health-consented members only)
          </label>
          <button className="justify-self-start rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white">
            Save to the record
          </button>
        </form>
      </Panel>

      {items.length === 0 ? (
        <EmptyState
          title={q ? "Nothing in the record matches that." : "The record is ready for its first entry."}
          hint={q ? "Try different words — or ask the Family Memory above." : "Start with the decisions you keep re-explaining: which pharmacy, who handles transport, what the doctor said."}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-card border border-line bg-paper-3 p-4">
              <div className="flex items-center gap-2">
                <Pill tone={item.kind === "decision" ? "data" : "neutral"}>
                  {KIND_LABEL[item.kind] ?? item.kind}
                </Pill>
                {item.privacy_level === "medical_private" && <Pill tone="attn">health-private</Pill>}
                <span className="font-mono text-[11px] text-ink-faint">
                  {item.subject_name} ·{" "}
                  {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.at))}
                </span>
              </div>
              <h3 className="mt-2 font-serif text-[18px] leading-snug">{item.title}</h3>
              {item.body && (
                <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-soft">
                  {item.body.length > 400 ? `${item.body.slice(0, 400)}…` : item.body}
                </p>
              )}
              {item.author_name && (
                <p className="mt-2 font-mono text-[10.5px] text-ink-faint">by {item.author_name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
