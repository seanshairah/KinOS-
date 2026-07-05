import { withUser } from "@kinos/db";
import type { CareSubjectRow, MemberRow } from "@kinos/db";
import {
  CHECK_TYPE_LABELS,
  CONNECTOR_CAPABILITIES,
  describeCheckStatus,
  inQuietMode,
  quietModeLine,
  type CheckStatus,
  type CheckType,
  type ConnectorProvider,
} from "@kinos/engine";
import { Eyebrow, Panel, Pill } from "@kinos/ui";
import {
  addRecordItemForm,
  cancelCheckForm,
  connectDeviceForm,
  createHandoverForm,
  disconnectDeviceForm,
  requestCheckForm,
  respondCheckForm,
  saveCarePlanForm,
  setQuietModeForm,
} from "@/lib/actions/forms";
import { availableChecks, listChecksForSubject } from "@/lib/data/checks";
import { getCarePlan } from "@/lib/data/operating";

const inputClass =
  "rounded-card border border-line bg-[#211f42]/60 px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-halo/60 focus:outline-none";

/**
 * The orbit room's deeper panels: Request Check, the care plan, quiet
 * mode, shared notes, the week's medication rhythm and how readings
 * arrive. Server components — data through RLS, words through the engine.
 */

// ---------- request check ----------

const DEVICE_LABELS: Record<ConnectorProvider, string> = {
  apple_health: "iPhone Health",
  health_connect: "Android Health Connect",
  samsung_health: "Samsung Health",
  withings: "Withings",
  bluetooth_device: "A paired reader",
  manual: "Asking directly",
  caregiver: "A caregiver's word",
};

export async function RequestCheckPanel({
  subject,
  viewerRole,
  viewerMemberId,
  userId,
}: {
  subject: CareSubjectRow;
  viewerRole: string;
  viewerMemberId: string;
  userId: string;
}) {
  const [{ types }, checks] = await Promise.all([
    availableChecks(userId, subject.id),
    listChecksForSubject(userId, subject.id, 5),
  ]);
  const resting = inQuietMode(subject.quiet_until, new Date());
  const isCentre = viewerRole === "care_recipient";
  const openCheck = checks.find((c) => ["pending", "later"].includes(c.status));
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: subject.timezone,
    }).format(new Date(iso));

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Request Check</Eyebrow>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          always {subject.display_name}&apos;s choice
        </span>
      </div>

      {resting && subject.quiet_until && (
        <div className="rounded-card border border-halo/25 bg-halo/[.07] px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
          {quietModeLine(subject.display_name, subject.quiet_until, subject.timezone, subject.quiet_note)}
          <span className="mt-1 block font-mono text-[10.5px] text-ink-faint">
            The Emergency Layer stays open throughout.
          </span>
        </div>
      )}

      {/* the open ask, answered here if you're the centre */}
      {openCheck && (
        <div className="rounded-card border border-line bg-paper-3/40 p-4">
          <p className="text-[14px] leading-snug text-ink">
            {openCheck.requester_name ?? "Family"} asked for{" "}
            <span className="font-medium">
              {CHECK_TYPE_LABELS[openCheck.check_type as CheckType].toLowerCase()}
            </span>
            {openCheck.message ? <> — &ldquo;{openCheck.message}&rdquo;</> : null}
          </p>
          <p className="mt-1 font-mono text-[10.5px] text-ink-faint">
            asked {when(openCheck.created_at)} · {describeCheckStatus(openCheck.status as CheckStatus, subject.display_name)}
          </p>
          {isCentre ? (
            <div className="mt-3 flex flex-col gap-3">
              <form action={respondCheckForm} className="flex flex-col gap-2">
                <input type="hidden" name="requestId" value={openCheck.id} />
                <input type="hidden" name="response" value="shared" />
                <div className="flex flex-wrap gap-2">
                  <input name="heart_rate" inputMode="numeric" placeholder="Heart rate" className={`${inputClass} w-[110px]`} />
                  <input name="systolic" inputMode="numeric" placeholder="Sys" className={`${inputClass} w-[80px]`} />
                  <input name="diastolic" inputMode="numeric" placeholder="Dia" className={`${inputClass} w-[80px]`} />
                  <input name="temperature" inputMode="decimal" placeholder="Temp °C" className={`${inputClass} w-[100px]`} />
                </div>
                <input name="note" placeholder="Or just a few words — that counts too." className={inputClass} />
                <button className="self-start rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk">
                  Share now
                </button>
              </form>
              <div className="flex gap-2">
                <form action={respondCheckForm}>
                  <input type="hidden" name="requestId" value={openCheck.id} />
                  <input type="hidden" name="response" value="later" />
                  <button className="rounded-pill border border-line px-3.5 py-1.5 text-[12.5px] text-ink-soft hover:text-ink">
                    Remind me later
                  </button>
                </form>
                <form action={respondCheckForm}>
                  <input type="hidden" name="requestId" value={openCheck.id} />
                  <input type="hidden" name="response" value="declined" />
                  <button className="rounded-pill border border-line px-3.5 py-1.5 text-[12.5px] text-ink-soft hover:text-ink">
                    Not this time
                  </button>
                </form>
              </div>
            </div>
          ) : openCheck.requested_by === viewerMemberId ? (
            <form action={cancelCheckForm} className="mt-3">
              <input type="hidden" name="requestId" value={openCheck.id} />
              <button className="rounded-pill border border-line px-3.5 py-1.5 text-[12.5px] text-ink-soft hover:text-ink">
                Withdraw the ask
              </button>
            </form>
          ) : null}
        </div>
      )}

      {/* recent answers, calm either way */}
      {checks.filter((c) => !["pending", "later"].includes(c.status)).length > 0 && (
        <div className="flex flex-col gap-1.5">
          {checks
            .filter((c) => !["pending", "later"].includes(c.status))
            .slice(0, 3)
            .map((c) => (
              <p key={c.id} className="border-t border-line pt-2 text-[13px] leading-relaxed text-ink-soft first:border-t-0 first:pt-0">
                {c.status === "shared" && c.result_summary
                  ? c.result_summary
                  : describeCheckStatus(c.status as CheckStatus, subject.display_name)}
                <span className="ml-2 font-mono text-[10px] text-ink-faint">{when(c.created_at)}</span>
                {c.result_worth_a_check && <Pill tone="attn">worth a check</Pill>}
              </p>
            ))}
        </div>
      )}

      {/* the ask itself */}
      {!isCentre && !openCheck && !resting && (
        <form action={requestCheckForm} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="subjectId" value={subject.id} />
          <select name="checkType" className={inputClass} defaultValue="quick">
            {types.map((t) => (
              <option key={t} value={t}>
                {CHECK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <input
            name="message"
            placeholder="A word to go with it (optional)"
            className={`${inputClass} min-w-[200px] flex-1`}
          />
          <button className="lift rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk">
            Ask {subject.display_name}
          </button>
        </form>
      )}
      <p className="max-w-[60ch] text-[12px] leading-relaxed text-ink-faint">
        {subject.display_name} sees who&apos;s asking and chooses: share now, later, or not at
        all — and a &ldquo;no&rdquo; is a complete answer. Only checks their devices or people can
        actually serve are offered.
      </p>
    </Panel>
  );
}

// ---------- devices: how readings arrive ----------

export async function DevicesPanel({
  subject,
  canManage,
  userId,
}: {
  subject: CareSubjectRow;
  canManage: boolean;
  userId: string;
}) {
  const { connections } = await availableChecks(userId, subject.id);
  const connectable: ConnectorProvider[] = ["apple_health", "health_connect", "samsung_health"];
  const notConnected = connectable.filter(
    (p) => !connections.some((c) => c.provider === p && c.status === "active"),
  );
  return (
    <Panel className="flex flex-col gap-3">
      <Eyebrow>How readings arrive</Eyebrow>
      <div className="flex flex-col gap-2">
        {connections.filter((c) => c.status === "active").map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 border-t border-line pt-2 first:border-t-0 first:pt-0">
            <span className="text-[13.5px]">
              {DEVICE_LABELS[c.provider]}
              <span className="ml-2 font-mono text-[10.5px] text-ink-faint">
                {c.permission_status === "pending"
                  ? "waiting for approval on their device"
                  : c.last_synced_at
                    ? `last heard ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: subject.timezone }).format(new Date(c.last_synced_at))}`
                    : "connected"}
              </span>
            </span>
            {canManage && (
              <form action={disconnectDeviceForm}>
                <input type="hidden" name="connectionId" value={c.id} />
                <input type="hidden" name="subjectId" value={subject.id} />
                <button className="rounded-pill border border-line px-3 py-1 text-[12px] text-ink-soft hover:text-ink">
                  Disconnect
                </button>
              </form>
            )}
          </div>
        ))}
        <p className="border-t border-line pt-2 text-[13.5px] text-ink-soft first:border-t-0 first:pt-0">
          Asking directly &amp; a caregiver&apos;s word
          <span className="ml-2 font-mono text-[10.5px] text-ink-faint">always available</span>
        </p>
      </div>
      {canManage && notConnected.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
            Add a source
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {notConnected.map((p) => (
              <form key={p} action={connectDeviceForm}>
                <input type="hidden" name="subjectId" value={subject.id} />
                <input type="hidden" name="provider" value={p} />
                <button className="rounded-pill border border-line bg-paper-3 px-3.5 py-2 text-[12.5px] font-medium text-ink hover:border-halo/50">
                  {DEVICE_LABELS[p]}
                </button>
              </form>
            ))}
          </div>
          <p className="mt-2 max-w-[56ch] text-[12px] leading-relaxed text-ink-faint">
            {subject.display_name} approves each source on their own phone through the KinOS
            app. Not every device can run every check — KinOS only ever offers what a source
            honestly supports ({CONNECTOR_CAPABILITIES.apple_health.supportedMetrics.length} kinds
            for phone health stores today).
          </p>
        </details>
      )}
    </Panel>
  );
}

// ---------- care plan ----------

export async function CarePlanPanel({
  subject,
  canEdit,
  userId,
}: {
  subject: CareSubjectRow;
  canEdit: boolean;
  userId: string;
}) {
  const plan = await getCarePlan(userId, subject.id);
  const FIELDS: { name: string; label: string; value: string | null; long?: boolean }[] = [
    { name: "dailyRoutine", label: "The shape of a good day", value: plan?.daily_routine ?? null, long: true },
    { name: "dietaryNotes", label: "Food", value: plan?.dietary_notes ?? null, long: true },
    { name: "mobilityNotes", label: "Moving about", value: plan?.mobility_notes ?? null, long: true },
    { name: "emergencyInstructions", label: "If something happens", value: plan?.emergency_instructions ?? null, long: true },
    { name: "preferredPharmacy", label: "Pharmacy", value: plan?.preferred_pharmacy ?? null },
    { name: "doctorName", label: "Doctor", value: plan?.doctor_name ?? null },
    { name: "doctorPhone", label: "Doctor's phone", value: plan?.doctor_phone ?? null },
    { name: "familyRules", label: "How this family does things", value: plan?.family_rules ?? null, long: true },
  ];
  const filled = FIELDS.filter((f) => f.value);
  return (
    <Panel className="flex flex-col gap-3">
      <Eyebrow>Care Plan</Eyebrow>
      {filled.length === 0 ? (
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          The standing knowledge about {subject.display_name} — routine, food, mobility, the
          doctor, the pharmacy — so nobody starts from zero at the door.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filled.map((f) => (
            <div key={f.name} className="border-t border-line pt-2.5 first:border-t-0 first:pt-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{f.label}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink">{f.value}</p>
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <details>
          <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
            {filled.length === 0 ? "Write the plan" : "Update the plan"}
          </summary>
          <form action={saveCarePlanForm} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="subjectId" value={subject.id} />
            {FIELDS.map((f) =>
              f.long ? (
                <textarea
                  key={f.name}
                  name={f.name}
                  rows={2}
                  defaultValue={f.value ?? ""}
                  placeholder={f.label}
                  className={inputClass}
                />
              ) : (
                <input
                  key={f.name}
                  name={f.name}
                  defaultValue={f.value ?? ""}
                  placeholder={f.label}
                  className={inputClass}
                />
              ),
            )}
            <button className="self-start rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">
              Keep the plan
            </button>
          </form>
        </details>
      )}
    </Panel>
  );
}

// ---------- quiet mode ----------

export function QuietModePanel({
  subject,
  canSet,
}: {
  subject: CareSubjectRow;
  canSet: boolean;
}) {
  if (!canSet) return null;
  const resting = inQuietMode(subject.quiet_until, new Date());
  return (
    <Panel className="flex flex-col gap-3">
      <Eyebrow>Rest</Eyebrow>
      {resting && subject.quiet_until ? (
        <>
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            {quietModeLine(subject.display_name, subject.quiet_until, subject.timezone, subject.quiet_note)}
          </p>
          <form action={setQuietModeForm}>
            <input type="hidden" name="subjectId" value={subject.id} />
            <input type="hidden" name="hours" value="0" />
            <button className="rounded-pill border border-line px-4 py-2 text-[12.5px] font-medium text-ink-soft hover:text-ink">
              End the rest early
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="max-w-[56ch] text-[13.5px] leading-relaxed text-ink-soft">
            Pause non-urgent requests while {subject.display_name} rests. Check asks wait;
            the Emergency Layer never does.
          </p>
          <form action={setQuietModeForm} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="subjectId" value={subject.id} />
            <select name="hours" className={inputClass} defaultValue="2">
              <option value="2">For 2 hours</option>
              <option value="4">For 4 hours</option>
              <option value="12">Overnight</option>
            </select>
            <input name="note" placeholder="e.g. afternoon nap (optional)" className={inputClass} />
            <button className="rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">
              Let them rest
            </button>
          </form>
        </>
      )}
    </Panel>
  );
}

// ---------- shared notes ----------

export async function SharedNotesPanel({
  subject,
  userId,
}: {
  subject: CareSubjectRow;
  userId: string;
}) {
  const notes = await withUser(userId, async (db) => {
    const res = await db.query(
      `select i.id, i.title, i.body, i.at, i.privacy_level, m.display_name as author_name
       from family_record_item i
       left join family_member m on m.id = i.author_member_id
       where i.subject_id = $1 and i.kind = 'note'
       order by i.at desc limit 5`,
      [subject.id],
    );
    return res.rows as {
      id: string;
      title: string;
      body: string | null;
      at: string;
      privacy_level: string;
      author_name: string | null;
    }[];
  });
  return (
    <Panel className="flex flex-col gap-3">
      <Eyebrow>Shared notes</Eyebrow>
      {notes.length === 0 ? (
        <p className="text-[13.5px] text-ink-soft">
          Small things worth remembering — &ldquo;prefers the blue blanket&rdquo;, &ldquo;the
          gate sticks&rdquo;. They live in the Family Record.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <div key={n.id} className="border-t border-line pt-2.5 first:border-t-0 first:pt-0">
              <p className="font-serif text-[15px] leading-relaxed text-ink">{n.title}</p>
              {n.body && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{n.body}</p>}
              <p className="mt-1 font-mono text-[10px] text-ink-faint">
                {n.author_name ?? "family"} ·{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  timeZone: subject.timezone,
                }).format(new Date(n.at))}
                {n.privacy_level !== "family" ? " · quieter than family" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">Leave a note</summary>
        <form action={addRecordItemForm} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="subjectId" value={subject.id} />
          <input type="hidden" name="kind" value="note" />
          <input name="title" required placeholder="The note, in a line" className={inputClass} />
          <textarea name="body" rows={2} placeholder="More, if it helps (optional)" className={inputClass} />
          <select name="privacy" className={inputClass} defaultValue="family">
            <option value="family">The whole family</option>
            <option value="caregiver_visible">Family &amp; caregivers</option>
            <option value="admin_only">Admins only</option>
          </select>
          <button className="self-start rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">
            Keep it
          </button>
        </form>
      </details>
    </Panel>
  );
}

// ---------- the week's medication rhythm ----------

export async function AdherenceStrip({
  subject,
  userId,
}: {
  subject: CareSubjectRow;
  userId: string;
}) {
  const days = await withUser(userId, async (db) => {
    const res = await db.query(
      `select (dl.at at time zone $2)::date as day,
              count(*) filter (where dl.status = 'taken')::int as taken,
              count(*) filter (where dl.status in ('missed','skipped'))::int as missed
       from dose_log dl
       where dl.subject_id = $1 and dl.at >= now() - interval '7 days'
       group by 1 order by 1`,
      [subject.id, subject.timezone],
    );
    return res.rows as { day: string; taken: number; missed: number }[];
  });
  if (days.length === 0) return null;
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        the week
      </span>
      <div className="flex gap-2">
        {days.map((d) => (
          <span key={String(d.day)} className="flex flex-col items-center gap-1">
            <span
              aria-label={`${d.taken} taken, ${d.missed} missed`}
              className={`h-2.5 w-2.5 rounded-full ${
                d.missed > 0
                  ? "bg-ember shadow-[0_0_8px_rgba(217,138,61,.5)]"
                  : d.taken > 0
                    ? "bg-calm-text/80"
                    : "bg-line-2"
              }`}
            />
            <span className="font-mono text-[8.5px] uppercase text-ink-faint">
              {fmt.format(new Date(d.day))}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- handover, from the orbit ----------

export function HandoverPanel({
  subject,
  members,
  viewerMemberId,
}: {
  subject: CareSubjectRow;
  members: MemberRow[];
  viewerMemberId: string;
}) {
  return (
    <details>
      <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
        Hand today over to someone
      </summary>
      <form action={createHandoverForm} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="subjectId" value={subject.id} />
        <select name="toMemberId" className={inputClass} defaultValue="">
          <option value="">Whoever comes next</option>
          {members
            .filter((m) => m.id !== viewerMemberId && m.role !== "care_recipient")
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name ?? m.role}
              </option>
            ))}
        </select>
        <input
          name="note"
          placeholder="A word of your own (optional)"
          className={`${inputClass} min-w-[200px] flex-1`}
        />
        <button className="rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">
          Write the handover
        </button>
      </form>
      <p className="mt-2 max-w-[56ch] text-[12px] leading-relaxed text-ink-faint">
        KinOS writes it from today&apos;s record — what happened, what&apos;s open, what&apos;s
        worth an eye — and keeps it in the Family Record.
      </p>
    </details>
  );
}
