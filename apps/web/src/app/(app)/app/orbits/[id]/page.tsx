import {
  addAppointmentForm,
  addMedicationForm,
  completeDutyForm,
  confirmTransportForm,
  createDutyForm,
  logDoseForm,
  resolveAttentionForm,
  setHealthSharingForm,
} from "@/lib/actions/forms";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withUser } from "@kinos/db";
import { formatSignalTime } from "@kinos/config";
import {
  AttentionItem,
  ButtonLink,
  Eyebrow,
  Panel,
  Pill,
  SignalRow,
  SignalValue,
} from "@kinos/ui";

import { VoiceCapture } from "@/components/voice-capture";
import { OrbitSystem, type SatelliteSpec } from "@/components/orbit/orbit-system";
import { CalmEmpty, PaperBrief, StatusWord } from "@/components/rooms";
import { requireFamilyContext } from "@/lib/data/context";
import { getOrbitDetail, type OrbitDetail } from "@/lib/data/orbits";
import { hasDeviceLink } from "@/lib/health";

const inputClass =
  "rounded-card border border-line bg-[#211f42]/60 px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-halo/60 focus:outline-none";

/**
 * The living Orbit at the top of the room — the loved one's real state
 * as lights. Satellites come from data, not decoration: check-ins,
 * medication, the next appointment, open duties, the latest brief.
 * Ember appears only where something needs someone.
 */
function buildOrbitSatellites(
  detail: OrbitDetail,
  takenToday: Set<string>,
): readonly SatelliteSpec[] {
  const { subject, signals, medications, appointments, duties, attention, brief } = detail;
  const sats: SatelliteSpec[] = [];
  const lastCheckin = signals.find((s) => s.signal_type === "checkin");
  if (lastCheckin) {
    sats.push({
      id: "checkin",
      ring: 0,
      angle: 0.6,
      speed: 0.07,
      size: 9,
      hue: "calm",
      lines: [
        "Check-in",
        formatSignalTime(new Date(lastCheckin.occurred_at).toISOString(), subject.timezone),
      ],
    });
  }
  if (medications.length > 0) {
    const allTaken = medications.every((m) => takenToday.has(m.id));
    sats.push({
      id: "medication",
      ring: 0,
      angle: 2.4,
      speed: 0.07,
      size: 8,
      hue: allTaken ? "calm" : "ink",
      lines: ["Medication", allTaken ? "Today's doses taken" : "A dose is still open today"],
    });
  }
  const appt = appointments[0];
  if (appt) {
    sats.push({
      id: "appointment",
      ring: 1,
      angle: -0.9,
      speed: -0.05,
      size: 10,
      hue: appt.transport_confirmed ? "halo" : "ember",
      lines: [
        appt.title,
        new Intl.DateTimeFormat("en-GB", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: subject.timezone,
        }).format(new Date(appt.starts_at)),
        appt.transport_confirmed
          ? `Transport ✓ ${appt.transport_owner_name ?? ""}`.trim()
          : "Transport not confirmed",
      ],
    });
  }
  if (duties.length > 0) {
    sats.push({
      id: "duties",
      ring: 1,
      angle: 1.8,
      speed: -0.05,
      size: 9,
      hue: "ink",
      lines: ["Duties", `${duties.length} in someone's hands`],
    });
  }
  attention.slice(0, 1).forEach((event) => {
    sats.push({
      id: "attention",
      ring: 2,
      angle: 3.4,
      speed: 0.045,
      size: 11,
      hue: event.severity === "urgent" ? "ember" : "ember",
      lines: ["Attention", event.title],
    });
  });
  if (brief) {
    sats.push({
      id: "brief",
      ring: 2,
      angle: 0.2,
      speed: 0.045,
      size: 9,
      hue: "halo",
      lines: ["Daily Brief", `the ${brief.kind}, in family words`],
    });
  }
  return sats;
}

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
  const canManageHealth = ["admin", "care_recipient"].includes(ctx.member.role);
  const deviceLinked = canManageHealth ? await hasDeviceLink(subject.id) : false;
  // Observations and dials pass through RLS — each viewer sees exactly what
  // the consent dial allows, and nothing here re-decides that.
  const { healthObservations, healthDials } = await withUser(ctx.userId, async (db) => {
    const obs = await db.query(
      `select id, summary, detail, created_at from health_observation
       where subject_id = $1 order by created_at desc limit 3`,
      [subject.id],
    );
    const dials = canManageHealth
      ? await db.query(
          `select metric, level from health_share_scope where subject_id = $1`,
          [subject.id],
        )
      : { rows: [] };
    return {
      healthObservations: obs.rows as { id: string; summary: string; detail: string | null; created_at: Date }[],
      healthDials: new Map((dials.rows as { metric: string; level: string }[]).map((r) => [r.metric, r.level])),
    };
  });
  const HEALTH_METRICS: { metric: string; label: string }[] = [
    { metric: "blood_pressure", label: "Blood pressure" },
    { metric: "heart_rate", label: "Heart rate" },
    { metric: "sleep_minutes", label: "Sleep" },
    { metric: "steps", label: "Movement" },
    { metric: "weight", label: "Weight" },
  ];
  const status = attention.some((a) => a.severity === "urgent")
    ? ("urgent" as const)
    : attention.length > 0
      ? ("attention" as const)
      : ("steady" as const);

  const takenToday = new Set(
    dosesToday.filter((d) => d.status === "taken").map((d) => d.medication_id),
  );

  const lastCheckinSignal = signals.find((s) => s.signal_type === "checkin");
  const nextAppt = appointments[0];

  return (
    <div className="flex flex-col gap-6">
      {/* ——— the room's sky: one person, calmly organized ——— */}
      <section className="room-enter relative overflow-hidden rounded-orbit border border-line bg-paper-2 shadow-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 100% at 85% 0%, rgba(140,138,214,.16), transparent 60%), radial-gradient(50% 70% at 8% 100%, rgba(217,138,61,.05), transparent 60%)",
          }}
        />
        <div className="relative grid items-center gap-2 p-6 md:grid-cols-[1fr_auto] md:p-8">
          <div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-halo">
              {subject.display_name}&apos;s Orbit
            </span>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-[clamp(30px,4vw,40px)] font-light leading-none tracking-[-0.01em] text-ink">
                {subject.display_name}
              </h1>
              <StatusWord status={status} />
            </div>
            <p className="mt-3 font-mono text-[11.5px] leading-[1.8] text-ink-faint">
              {lastCheckinSignal
                ? `last check-in · ${formatSignalTime(new Date(lastCheckinSignal.occurred_at).toISOString(), subject.timezone)}`
                : "no check-in yet today"}
              {nextAppt && (
                <>
                  <br />
                  next · {nextAppt.title} ·{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: subject.timezone,
                  }).format(new Date(nextAppt.starts_at))}
                </>
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <ButtonLink href={`/app/orbits/${subject.id}/check-in`} className="lift no-underline">
                Check in
              </ButtonLink>
              <Link
                href={`/app/emergency?subject=${subject.id}`}
                className="rounded-pill border border-line-2 px-4 py-2.5 text-[13px] font-medium text-ink-soft no-underline hover:text-ink"
              >
                Emergency layer
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[240px] md:max-w-[280px]">
            <OrbitSystem
              size={280}
              satellites={buildOrbitSatellites(detail, takenToday)}
              assemble
            />
            <p className="mt-1 text-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-halo/60">
              hover a light
            </p>
          </div>
        </div>
      </section>

      {/* brief */}
      {brief && (
        <PaperBrief
          meta={`Daily Brief · ${brief.kind} · ${new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date(brief.for_date))}`}
          body={brief.body}
        />
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
                  <button className="rounded-pill bg-calm-soft px-3.5 py-1.5 text-[12.5px] font-medium text-calm-text hover:brightness-95">
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
                      <button className="rounded-pill bg-ember-soft px-3.5 py-1.5 text-[12.5px] font-medium text-ember-text hover:brightness-95">
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
                <button className="rounded-pill bg-calm-soft px-3.5 py-1.5 text-[12.5px] font-medium text-calm-text hover:brightness-95">
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
<select name="repeat" className={inputClass} defaultValue="none">
              <option value="none">Doesn&apos;t repeat</option>
              <option value="day">Repeats daily</option>
              <option value="week">Repeats weekly</option>
              <option value="month">Repeats monthly</option>
            </select>
            <button className="self-start rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">Assign</button>
          </form>
        </details>
      </Panel>

      {/* health — quiet notes for those the dial allows; controls for those who hold it */}
      {(canManageHealth || healthObservations.length > 0) && (
        <Panel className="flex flex-col gap-3">
          <Eyebrow>Health</Eyebrow>
          {healthObservations.length > 0 && (
            <div className="flex flex-col gap-2">
              {healthObservations.map((o) => (
                <p key={o.id} className="border-t border-line pt-2 font-serif text-[15.5px] leading-relaxed first:border-t-0 first:pt-0">
                  {o.summary}
                  {o.detail && (
                    <span className="mt-0.5 block font-mono text-[11px] normal-case text-ink-faint">{o.detail}</span>
                  )}
                </p>
              ))}
            </div>
          )}
          {canManageHealth && (
            <>
              {deviceLinked ? (
                <p className="text-[13.5px] leading-relaxed text-ink-soft">
                  A device is connected. Readings flow into {subject.display_name}&apos;s
                  orbit on their own — the family only hears about them when a pattern is
                  genuinely worth a check.
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-ink-soft">
                    Link a blood-pressure cuff or scale and readings arrive without anyone
                    typing a number. Who sees what stays under {subject.display_name}&apos;s
                    consent.
                  </p>
                  <a
                    href={`/api/integrations/withings/connect?subject=${subject.id}`}
                    className="lift rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk no-underline"
                  >
                    Link a device
                  </a>
                </div>
              )}
              <details>
                <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
                  Who sees what
                </summary>
                <p className="mt-2 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-faint">
                  Per measurement, choose what health-consented family members see:
                  the numbers themselves, quiet notes only, or nothing beyond
                  &quot;needs attention&quot;. {subject.display_name} and admins hold this dial.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {HEALTH_METRICS.map(({ metric, label }) => (
                    <form
                      key={metric}
                      action={setHealthSharingForm}
                      className="flex items-center justify-between gap-3 border-t border-line pt-2 first:border-t-0 first:pt-0"
                    >
                      <input type="hidden" name="subjectId" value={subject.id} />
                      <input type="hidden" name="metric" value={metric} />
                      <span className="text-[13.5px]">{label}</span>
                      <span className="flex items-center gap-2">
                        <select
                          name="level"
                          defaultValue={healthDials.get(metric) ?? "observations"}
                          className={inputClass}
                          aria-label={`${label} sharing level`}
                        >
                          <option value="readings">The numbers</option>
                          <option value="observations">Quiet notes only</option>
                          <option value="status">Status only</option>
                        </select>
                        <button className="rounded-pill bg-dusk px-3.5 py-1.5 text-[12.5px] font-medium text-white">
                          Save
                        </button>
                      </span>
                    </form>
                  ))}
                </div>
              </details>
            </>
          )}
        </Panel>
      )}

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
          <Link
            href={`/app/orbits/${subject.id}/timeline`}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-dusk-2 no-underline hover:text-ink"
          >
            the whole story →
          </Link>
        </div>
        {signals.length === 0 ? (
          <CalmEmpty
            title="The record starts with a first signal."
            hint="A check-in, a note, a receipt — anything that helps the family know how things are."
            action={
              <Link href={`/app/orbits/${subject.id}/check-in`} className="lift rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk no-underline">
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
