import { addRecordItemForm } from "@/lib/actions/forms";
import { uploadDocumentForm } from "@/lib/actions/documents";
import { AskMemory } from "@/components/ask-memory";
import { requireFamilyContext } from "@/lib/data/context";
import { listDocuments, listRecordItems, listSubjects } from "@/lib/data/record";
import { listHandovers, listProofReports } from "@/lib/data/operating";
import { acknowledgeHandoverForm } from "@/lib/actions/forms";
import { CalmEmpty, PaperBrief, RoomDrawer, RoomHeader, RoomSection } from "@/components/rooms";

/**
 * The Record Room — the family's memory, searchable in plain words.
 * Ask first, search second, add third. The timeline reads like a
 * diary; documents are filed once and findable years later. This room
 * proves: KinOS remembers what families forget.
 */

const inputClass =
  "rounded-card border border-line bg-[#211f42]/60 px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-halo/60 focus:outline-none";

const KIND_STYLE: Record<string, { label: string; cls: string }> = {
  note: { label: "note", cls: "border-line-2 text-ink-soft" },
  decision: { label: "decision", cls: "border-halo/40 text-halo" },
  incident: { label: "incident", cls: "border-ember-soft text-ember-text" },
  question: { label: "question", cls: "border-line-2 text-ink-soft" },
  document: { label: "document", cls: "border-line-2 text-ink-soft" },
  summary: { label: "summary", cls: "border-line-2 text-ink-soft" },
};

export default async function RecordRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await requireFamilyContext();
  const [items, subjects, documents, handovers, proofReports] = await Promise.all([
    listRecordItems(ctx.userId, q),
    listSubjects(ctx.userId),
    listDocuments(ctx.userId),
    listHandovers(ctx.userId, undefined, 4),
    listProofReports(ctx.userId, 4),
  ]);
  const weekFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
  const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room="Family Record"
        meta={`${items.length} ${q ? "found" : "kept"}`}
        headline="The memory that doesn't fade."
        sub="Decisions, notes, incidents and documents — kept in plain words, findable years later. Nothing scrolls away."
      />

      <div className="room-enter" style={{ animationDelay: "60ms" }}>
        <AskMemory subjects={subjects.map((s) => ({ id: s.id, name: s.display_name }))} />
      </div>

      <form method="get" className="room-enter flex gap-2" style={{ animationDelay: "100ms" }}>
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search the record — 'pharmacy', 'dizziness', 'transport'…"
          className={`${inputClass} flex-1`}
        />
        <button className="rounded-pill border border-halo/40 px-4 py-2 text-[13px] font-medium text-ink hover:border-halo">
          Search
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <RoomDrawer label="Add to the record">
          <form action={addRecordItemForm} className="flex flex-col gap-2">
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
            <input name="title" required placeholder="Title" className={inputClass} />
            <textarea
              name="body"
              rows={3}
              placeholder="The details, in plain words."
              className={inputClass}
            />
            <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <input type="checkbox" name="privacy" value="medical_private" /> Keep this
              health-private
            </label>
            <button className="lift self-start rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk">
              Save to the record
            </button>
          </form>
        </RoomDrawer>

        <RoomDrawer label="File a document">
          <p className="mb-2 text-[12.5px] leading-relaxed text-ink-soft">
            Prescriptions, reports, IDs, school forms — filed once, findable years later.
          </p>
          <form action={uploadDocumentForm} className="flex flex-col gap-2">
            <select name="subjectId" required className={inputClass}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  For {s.display_name}
                </option>
              ))}
            </select>
            <input name="title" required placeholder="What is it — e.g. Amlodipine prescription" className={inputClass} />
            <input
              name="file"
              type="file"
              required
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              className="text-[12.5px] text-ink-soft"
              aria-label="Document file"
            />
            <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <input type="checkbox" name="privacy" value="medical_private" /> Health-private
            </label>
            <button className="lift self-start rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk">
              Add to the vault
            </button>
          </form>
        </RoomDrawer>
      </div>

      {items.length === 0 ? (
        <CalmEmpty
          title={q ? "Nothing in the record matches that." : "The record is ready for its first entry."}
          hint={
            q
              ? "Try different words — or ask the Family Memory above."
              : "Start with the decisions you keep re-explaining: which pharmacy, who handles transport, what the doctor said."
          }
        />
      ) : (
        <RoomSection title={q ? `Matching "${q}"` : "The record"} delay={140}>
          <div className="relative flex flex-col gap-5 pl-5">
            {/* the thread of memory */}
            <span aria-hidden className="absolute bottom-2 left-[3px] top-2 w-px bg-halo/20" />
            {items.map((item) => {
              const kind = KIND_STYLE[item.kind] ?? KIND_STYLE.note!;
              return (
                <div key={item.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[22px] top-[7px] h-[7px] w-[7px] rounded-full bg-halo shadow-[0_0_8px_rgba(169,167,224,.5)]"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-pill border px-2 py-0.5 font-mono text-[10px] ${kind.cls}`}>
                      {kind.label}
                    </span>
                    {item.privacy_level === "medical_private" && (
                      <span className="rounded-pill border border-ember-soft px-2 py-0.5 font-mono text-[10px] text-ember-text">
                        health-private
                      </span>
                    )}
                    <span className="font-mono text-[10.5px] text-ink-faint">
                      {item.subject_name} · {dateFmt.format(new Date(item.at))}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-serif text-[18px] font-normal leading-snug text-ink">
                    {item.title}
                  </h3>
                  {item.body && (
                    <p className="mt-1 max-w-[70ch] whitespace-pre-line text-[13.5px] leading-relaxed text-ink-soft">
                      {item.body.length > 400 ? `${item.body.slice(0, 400)}…` : item.body}
                    </p>
                  )}
                  {item.author_name && (
                    <p className="mt-1.5 font-mono text-[10.5px] text-ink-faint">
                      kept by {item.author_name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </RoomSection>
      )}

      {/* ——— handovers: one pair of hands to the next ——— */}
      {handovers.length > 0 && (
        <RoomSection title="Handovers" delay={170}>
          <div className="flex flex-col gap-4">
            {handovers.map((h) => (
              <div key={h.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10.5px] text-ink-faint">
                    {h.from_name ?? "family"} {h.to_name ? `→ ${h.to_name}` : "→ whoever comes next"} ·{" "}
                    {dateFmt.format(new Date(h.created_at))}
                    {h.status === "acknowledged" ? " · received ✓" : ""}
                  </span>
                  {h.status === "open" && (
                    <form action={acknowledgeHandoverForm}>
                      <input type="hidden" name="handoverId" value={h.id} />
                      <button className="rounded-pill border border-line px-3 py-1 text-[12px] text-ink-soft hover:text-ink">
                        I have it from here
                      </button>
                    </form>
                  )}
                </div>
                <p className="mt-2 max-w-[70ch] whitespace-pre-line font-serif text-[15.5px] font-light leading-relaxed text-ink">
                  {h.body}
                </p>
                {h.note && (
                  <p className="mt-1.5 text-[13px] italic leading-relaxed text-ink-soft">
                    &ldquo;{h.note}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </RoomSection>
      )}

      {/* ——— proof of care: the week, accounted for ——— */}
      {proofReports.length > 0 && (
        <RoomSection title="Proof of care · one honest page a week" delay={185}>
          <div className="flex flex-col gap-4">
            {proofReports.map((report) => (
              <PaperBrief
                key={report.id}
                meta={`Week of ${weekFmt.format(new Date(report.week_start))}`}
                body={report.body}
              />
            ))}
          </div>
        </RoomSection>
      )}

      {documents.length > 0 && (
        <RoomSection title="Document vault" delay={200}>
          <div className="flex flex-col">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
              >
                <div className="min-w-0">
                  <a
                    href={doc.storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[14px] font-medium text-halo no-underline hover:underline"
                  >
                    {doc.title ?? "Document"}
                  </a>
                  <div className="mt-0.5 font-mono text-[10.5px] text-ink-faint">
                    {doc.subject_name} · {doc.mime?.split("/")[1] ?? "file"} ·{" "}
                    {dateFmt.format(new Date(doc.created_at))}
                  </div>
                </div>
                {doc.privacy_level === "medical_private" && (
                  <span className="flex-none rounded-pill border border-ember-soft px-2 py-0.5 font-mono text-[10px] text-ember-text">
                    health-private
                  </span>
                )}
              </div>
            ))}
          </div>
        </RoomSection>
      )}
    </div>
  );
}
