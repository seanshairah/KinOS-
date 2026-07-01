import {
  completeDutyForm,
  createDutyForm,
} from "@/lib/actions/forms";
import { EmptyState, Eyebrow, Panel, Pill } from "@kinos/ui";

import { requireFamilyContext } from "@/lib/data/context";
import { listDuties } from "@/lib/data/duties";
import { listMembers } from "@/lib/data/consent";
import { listSubjects } from "@/lib/data/record";

const inputClass =
  "rounded-card border border-line bg-paper px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-dusk-2";

export default async function DutiesPage() {
  const ctx = await requireFamilyContext();
  const [open, done, members, subjects] = await Promise.all([
    listDuties(ctx.userId, "open"),
    listDuties(ctx.userId, "done"),
    listMembers(ctx.userId),
    listSubjects(ctx.userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Duties</Eyebrow>
        <h1 className="mt-1 font-serif text-[28px] tracking-[-0.01em]">
          Who does what — without the chasing
        </h1>
      </div>

      <Panel className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Assign a duty
        </h2>
        <form action={createDutyForm} className="grid gap-2 sm:grid-cols-2">
          <select name="subjectId" required className={inputClass}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                For {s.display_name}
              </option>
            ))}
          </select>
          <input name="title" required placeholder="What needs doing" className={inputClass} />
          <select name="ownerMemberId" className={inputClass} defaultValue="">
            <option value="">Unassigned for now</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name ?? m.role}
              </option>
            ))}
          </select>
          <input name="dueAt" type="datetime-local" className={inputClass} aria-label="Due date" />
          <select name="priority" className={inputClass} defaultValue="normal">
            <option value="low">Low priority</option>
            <option value="normal">Normal priority</option>
            <option value="high">High priority</option>
          </select>
          <button className="rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white hover:bg-dusk-2">
            Assign duty
          </button>
        </form>
      </Panel>

      {open.length === 0 ? (
        <EmptyState
          title="No open duties."
          hint="Assign the next thing that needs doing — groceries, transport, a bill — and KinOS keeps track of it."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((duty) => (
            <div
              key={duty.id}
              className="flex items-center justify-between gap-3 rounded-card border border-line bg-paper-3 p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-medium text-ink">{duty.title}</span>
                  {duty.status === "late" && <Pill tone="attn">late</Pill>}
                  {duty.priority === "high" && <Pill tone="data">high</Pill>}
                </div>
                <div className="mt-1 font-mono text-[11px] text-ink-faint">
                  {duty.subject_name} · {duty.owner_name ? `owner: ${duty.owner_name}` : "unassigned"}
                  {duty.due_at
                    ? ` · due ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(duty.due_at))}`
                    : ""}
                </div>
              </div>
              <form action={completeDutyForm}>
                <input type="hidden" name="dutyId" value={duty.id} />
                <button className="rounded-pill bg-calm-soft px-4 py-2 text-[12.5px] font-medium text-[#2f6a52] hover:brightness-95">
                  Done
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[13px] font-medium text-dusk-2">
            Recently completed ({done.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {done.map((duty) => (
              <div key={duty.id} className="rounded-card border border-line bg-paper-2 px-4 py-3 text-[13.5px] text-ink-soft">
                <span className="text-calm">✓</span> {duty.title}
                <span className="font-mono text-[11px] text-ink-faint">
                  {" "}
                  · {duty.subject_name}
                  {duty.owner_name ? ` · ${duty.owner_name}` : ""}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
