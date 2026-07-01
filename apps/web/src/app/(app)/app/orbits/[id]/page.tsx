import {
  addAppointmentForm,
  addMedicationForm,
  completeDutyForm,
  confirmTransportForm,
  createDutyForm,
  logDoseForm,
  resolveAttentionForm,
} from "@/lib/actions/forms";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatSignalTime } from "@kinos/config";
import {
  AttentionItem,
  BriefBlock,
  ButtonLink,
  EmptyState,
  Eyebrow,
  OrbitAvatar,
  Panel,
  Pill,
  SignalRow,
  SignalValue,
  StatusBadge,
} from "@kinos/ui";

import { VoiceCapture } from "@/components/voice-capture";
import { requireFamilyContext } from "@/lib/data/context";
import { getOrbitDetail } from "@/lib/data/orbits";

const inputClass =
  "rounded-card border border-line bg-paper px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-dusk-2";

function describeSignal(signal: {
  signal_type: string;
  value: unknown;
  interpretation_label: string | null;
}): React.ReactNode {
  const v = (signal.value ?? {}) as Record<string, unknown>;
  switch (signal.signal_type) {
    case "checkin":
      return (
        <>
          Check-in — feeling <SignalValue>{String(v.mood ?? "okay")}</SignalValue>
          {typeof v.note === "string" && v.note ? ` · “${v.note}”` : ""}
        </>
      );
    case "medication_dose":
      return (
        <>
          Medication <SignalValue>{String(v.status ?? "logged")}</SignalValue>
        </>
      );
    case "voice_note":
      return (
        <>
          Note from the family
          {signal.interpretation_label ? (
            <>
              {" "}
              → <SignalValue>{signal.interpretation_label.replace(/_/g, " ").replace("symptom:", "")}</SignalValue>
            </>
          ) : null}
        </>
      );
    case "receipt":
      return (
        <>
          Receipt · <SignalValue>{String(v.currency ?? "USD")} {String(v.amount ?? "")}</SignalValue>
          {typeof v.merchant === "string" ? ` — ${v.merchant}` : ""}
        </>
      );
    case "metric": {
      const metric = String(v.metric ?? "measurement").replace(/_/g, " ");
      return (
        <>
          {metric} · <SignalValue>{String(v.value ?? "")}</SignalValue>
        </>
      );
    }
    case "caregiver_visit":
      return <>Caregiver visit logged</>;
    default:
      return <>{signal.signal_type.replace(/_/g, " ")}</>;
  }
}

export default async function OrbitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireFamilyContext();
  const detail = await getOrbitDetail(ctx.userId, id);
  if (!detail) notFound();

  const { subject, signals, attention, duties, medications, dosesToday, appointments, brief, patterns, members } = detail;
  const status = attention.some((a) => a.severity === "urgent")
    ? ("urgent" as const)
    : attention.length > 0
      ? ("attention" as const)
      : ("steady" as const);

  const takenToday = new Set(
    dosesToday.filter((d) => d.status === "taken").map((d) => d.medication_id),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex items-center gap-4">
        <OrbitAvatar name={subject.display_name} size={56} />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-[28px] tracking-[-0.01em]">{subject.display_name}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {subject.kind === "elder" ? "Elder care" : subject.kind === "child" ? "School & care" : subject.kind === "recovery" ? "Recovery" : "Care"} ·{" "}
            {subject.timezone}
          </p>
        </div>
        <ButtonLink href={`/app/orbits/${subject.id}/check-in`} className="no-underline">
          Check in
        </ButtonLink>
      </div>

      {/* brief */}
      {brief && (
        <Panel>
          <BriefBlock
            meta={`Daily Brief · ${brief.kind} · ${new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(brief.for_date))}`}
          >
            {brief.body}
          </BriefBlock>
        </Panel>
      )}

      {/* attention */}
      {attention.length > 0 && (
        <section aria-label="Attention needed" className="flex flex-col gap-3">
          <Eyebrow>Attention needed</Eyebrow>
          {attention.map((event) => (
            <AttentionItem
              key={event.id}
              title={event.title}
              detail={event.detail ?? undefined}
              urgent={event.severity === "urgent"}
              action={
                <form action={resolveAttentionForm}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="mode" value="resolved" />
                  <button className="self-start rounded-pill border border-line bg-paper-3 px-3 py-1.5 text-[12px] font-medium text-ink hover:border-line-2">
                    Mark handled
                  </button>
                </form>
              }
            />
          ))}
        </section>
      )}

      {/* capture */}
      <VoiceCapture subjectId={subject.id} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* medication */}
        <Panel className="flex flex-col gap-4">
          <Eyebrow>Medication</Eyebrow>
          {medications.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">No medication on record yet.</p>
          ) : (
            medications.map((med) => (
              <div key={med.id} className="flex items-center justify-between gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div>
                  <div className="text-[14px] font-semibold">
                    {med.name} {med.dose && <span className="font-normal text-ink-soft">· {med.dose}</span>}
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    {(med.schedule?.times ?? []).map((t) => (
                      <Pill key={t} tone={takenToday.has(med.id) ? "ok" : "neutral"}>
                        {t}
                      </Pill>
                    ))}
                    {med.refill_at && <Pill tone="data">refill {String(med.refill_at).slice(0, 10)}</Pill>}
                  </div>
                </div>
                <form action={logDoseForm}>
                  <input type="hidden" name="medicationId" value={med.id} />
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <input type="hidden" name="status" value="taken" />
                  <button className="rounded-pill bg-calm-soft px-3.5 py-1.5 text-[12.5px] font-medium text-[#2f6a52] hover:brightness-95">
                    Dose taken
                  </button>
                </form>
              </div>
            ))
          )}
          <details className="mt-1">
            <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">Add a medication</summary>
            <form action={addMedicationForm} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="subjectId" value={subject.id} />
              <input name="name" required placeholder="Name — e.g. Amlodipine" className={inputClass} />
              <input name="dose" placeholder="Dose — e.g. 5mg" className={inputClass} />
              <input name="times" placeholder="Times — e.g. 08:00, 20:00" className={inputClass} />
              <input name="refillAt" type="date" className={inputClass} aria-label="Refill date" />
              <button className="self-start rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">Save</button>
            </form>
          </details>
        </Panel>

        {/* appointments */}
        <Panel className="flex flex-col gap-4">
          <Eyebrow>Appointments</Eyebrow>
          {appointments.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">Nothing scheduled.</p>
          ) : (
            appointments.map((appt) => (
              <div key={appt.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold">{appt.title}</div>
                    <div className="mt-0.5 text-[12.5px] text-ink-soft">
                      {new Intl.DateTimeFormat("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: subject.timezone,
                      }).format(new Date(appt.starts_at))}
                      {appt.location ? ` · ${appt.location}` : ""}
                    </div>
                  </div>
                  {appt.transport_confirmed ? (
                    <Pill tone="ok">transport ✓ {appt.transport_owner_name ?? ""}</Pill>
                  ) : (
                    <form action={confirmTransportForm}>
                      <input type="hidden" name="appointmentId" value={appt.id} />
                      <button className="rounded-pill bg-ember-soft px-3.5 py-1.5 text-[12.5px] font-medium text-[#8a531b] hover:brightness-95">
                        I&apos;ll handle transport
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
          <details>
            <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">Add an appointment</summary>
            <form action={addAppointmentForm} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="subjectId" value={subject.id} />
              <input name="title" required placeholder="e.g. Clinic review" className={inputClass} />
              <select name="kind" className={inputClass} defaultValue="clinic">
                <option value="clinic">Clinic</option>
                <option value="school">School</option>
                <option value="transport">Transport</option>
                <option value="family_call">Family call</option>
                <option value="refill">Refill</option>
                <option value="other">Other</option>
              </select>
              <input name="location" placeholder="Where" className={inputClass} />
              <input name="startsAt" type="datetime-local" required className={inputClass} aria-label="When" />
              <select name="transportOwnerMemberId" className={inputClass} defaultValue="">
                <option value="">Transport owner — decide later</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name ?? m.role}
                  </option>
                ))}
              </select>
              <button className="self-start rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">Save</button>
            </form>
          </details>
        </Panel>
      </div>

      {/* duties */}
      <Panel id="duties" className="flex flex-col gap-4">
        <Eyebrow>Duties</Eyebrow>
        {duties.length === 0 ? (
          <p className="text-[13.5px] text-ink-soft">Nothing open. Calm is allowed.</p>
        ) : (
          duties.map((duty) => (
            <div key={duty.id} className="flex items-center justify-between gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div>
                <div className="text-[14px] font-medium">{duty.title}</div>
                <div className="mt-0.5 font-mono text-[11px] text-ink-faint">
                  {duty.owner_name ? `owner: ${duty.owner_name}` : "unassigned"}
                  {duty.due_at
                    ? ` · due ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(duty.due_at))}`
                    : ""}
                  {duty.status === "late" ? " · late" : ""}
                </div>
              </div>
              <form action={completeDutyForm}>
                <input type="hidden" name="dutyId" value={duty.id} />
                <button className="rounded-pill bg-calm-soft px-3.5 py-1.5 text-[12.5px] font-medium text-[#2f6a52] hover:brightness-95">
                  Done
                </button>
              </form>
            </div>
          ))
        )}
        <details>
          <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">Assign a duty</summary>
          <form action={createDutyForm} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="subjectId" value={subject.id} />
            <input name="title" required placeholder="e.g. Buy the week's groceries" className={inputClass} />
            <select name="ownerMemberId" className={inputClass} defaultValue="">
              <option value="">Unassigned for now</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name ?? m.role}
                </option>
              ))}
            </select>
            <input name="dueAt" type="datetime-local" className={inputClass} aria-label="Due" />
            <select name="priority" className={inputClass} defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <button className="self-start rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">Assign</button>
          </form>
        </details>
      </Panel>

      {/* patterns */}
      {patterns.length > 0 && (
        <Panel className="flex flex-col gap-3">
          <Eyebrow>Patterns</Eyebrow>
          {patterns.map((p) => (
            <p key={p.id} className="border-t border-line pt-3 font-serif text-[16px] leading-relaxed first:border-t-0 first:pt-0">
              {p.summary}
            </p>
          ))}
        </Panel>
      )}

      {/* signals feed */}
      <Panel>
        <div className="mb-2 flex items-baseline justify-between">
          <Eyebrow>Life Signals</Eyebrow>
          <span className="font-mono text-[11px] text-ink-faint">last 40</span>
        </div>
        {signals.length === 0 ? (
          <EmptyState
            title="The record starts with a first signal."
            hint="A check-in, a note, a receipt — anything that helps the family know how things are."
            action={
              <Link href={`/app/orbits/${subject.id}/check-in`} className="rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white no-underline">
                Do the first check-in
              </Link>
            }
          />
        ) : (
          <div>
            {signals.map((signal) => (
              <SignalRow
                key={signal.id}
                time={formatSignalTime(new Date(signal.occurred_at).toISOString(), subject.timezone)}
                meta={`${signal.source.replace(/_/g, " ")}${signal.confidence != null ? ` · ${Number(signal.confidence) >= 0.75 ? "steady" : "worth a check"}` : ""}`}
              >
                {describeSignal(signal)}
              </SignalRow>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
