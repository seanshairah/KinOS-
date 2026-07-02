import { completeDutyForm, createDutyForm } from "@/lib/actions/forms";
import { requireFamilyContext } from "@/lib/data/context";
import { listDuties } from "@/lib/data/duties";
import { listMembers } from "@/lib/data/consent";
import { listSubjects } from "@/lib/data/record";
import { CalmEmpty, RoomDrawer, RoomHeader, RoomSection } from "@/components/rooms";

/**
 * The Duties Room — responsibilities, not tasks. Every duty has a
 * person it's for, someone who holds it, a due time, and a place in
 * the Family Record when it's done. The room leads with the state of
 * the list; the assign form waits quietly behind intent.
 */

const inputClass =
  "rounded-card border border-line bg-[#211f42]/60 px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-halo/60 focus:outline-none";

export default async function DutiesRoomPage() {
  const ctx = await requireFamilyContext();
  const [open, done, members, subjects] = await Promise.all([
    listDuties(ctx.userId, "open"),
    listDuties(ctx.userId, "done"),
    listMembers(ctx.userId),
    listSubjects(ctx.userId),
  ]);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const late = open.filter((d) => d.status === "late").length;

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room="Duties"
        meta={`${open.length} open`}
        headline={
          open.length === 0
            ? "Every duty is settled."
            : late > 0
              ? `${open.length} open — ${late} running late.`
              : `${open.length} ${open.length === 1 ? "duty is" : "duties are"} in someone's hands.`
        }
        sub="A duty is a family responsibility with a name on it — owner, due time, proof, and a place in the Family Record when it's done."
      />

      <RoomDrawer label="Assign a duty">
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
          <select name="repeat" className={inputClass} defaultValue="none">
            <option value="none">Doesn&apos;t repeat</option>
            <option value="day">Repeats daily</option>
            <option value="week">Repeats weekly</option>
            <option value="month">Repeats monthly</option>
          </select>
          <button className="lift rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk sm:justify-self-start">
            Assign duty
          </button>
        </form>
      </RoomDrawer>

      {open.length === 0 ? (
        <CalmEmpty
          title="Nothing is waiting on anyone."
          hint="Assign the next thing that needs doing — groceries, transport, a bill — and KinOS keeps it from falling through."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((duty, i) => (
            <div
              key={duty.id}
              className="room-enter flex items-center justify-between gap-4 rounded-orbit border border-line bg-paper-2 p-4 shadow-card md:p-5"
              style={{ animationDelay: `${80 + i * 60}ms` }}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span
                  aria-hidden
                  className={`orbit-pulse h-2.5 w-2.5 flex-none rounded-full ${
                    duty.status === "late"
                      ? "bg-ember shadow-[0_0_10px_rgba(217,138,61,.6)]"
                      : "bg-halo shadow-[0_0_10px_rgba(169,167,224,.5)]"
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-medium leading-snug text-ink">{duty.title}</span>
                    {duty.status === "late" && (
                      <span className="rounded-pill border border-ember-soft bg-attn-bg px-2 py-0.5 font-mono text-[10px] text-ember-text">
                        running late
                      </span>
                    )}
                    {duty.priority === "high" && (
                      <span className="rounded-pill border border-halo/30 px-2 py-0.5 font-mono text-[10px] text-halo">
                        high
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-ink-faint">
                    for {duty.subject_name} ·{" "}
                    {duty.owner_name ? `${duty.owner_name} holds it` : "no one holds it yet"}
                    {duty.due_at ? ` · due ${fmt.format(new Date(duty.due_at))}` : ""}
                  </div>
                </div>
              </div>
              <form action={completeDutyForm} className="flex-none">
                <input type="hidden" name="dutyId" value={duty.id} />
                <button className="lift rounded-pill border border-calm-soft bg-calm-soft/60 px-4 py-2 text-[12.5px] font-medium text-calm-text">
                  Done
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <RoomSection title={`Settled, and remembered (${done.length})`} delay={200}>
          <div className="flex flex-col">
            {done.map((duty) => (
              <div
                key={duty.id}
                className="flex items-baseline gap-3 border-t border-line py-2.5 text-[13.5px] text-ink-soft first:border-t-0"
              >
                <span className="flex-none text-calm">✓</span>
                <span className="min-w-0 flex-1">{duty.title}</span>
                <span className="flex-none font-mono text-[10.5px] text-ink-faint">
                  {duty.subject_name}
                  {duty.owner_name ? ` · ${duty.owner_name}` : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10.5px] text-ink-faint">
            Completed duties become Life Signals and live on in the Family Record.
          </p>
        </RoomSection>
      )}
    </div>
  );
}
