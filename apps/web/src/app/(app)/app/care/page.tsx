import Link from "next/link";
import { redirect } from "next/navigation";
import { withUser } from "@kinos/db";
import { Eyebrow, Panel, Pill } from "@kinos/ui";
import {
  createHandoverForm,
  endVisitForm,
  logDoseForm,
  raiseAttentionForm,
  startVisitForm,
} from "@/lib/actions/forms";
import { requireUserId, getFamilyContext } from "@/lib/data/context";
import { getCarePlan } from "@/lib/data/operating";
import { VoiceCapture } from "@/components/voice-capture";
import { CalmEmpty, RoomHeader } from "@/components/rooms";

const inputClass =
  "rounded-card border border-line bg-[#211f42]/60 px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-halo/60 focus:outline-none";

/**
 * The Caregiver Console — one calm page for the person at the door.
 * Not everything, deliberately: today's people, the visit, the doses,
 * a note, a word for the family. Help the family stay updated — that's
 * the whole job here.
 */
export default async function CareConsolePage() {
  const userId = await requireUserId();
  const ctx = await getFamilyContext(userId);
  if (!ctx) redirect("/app/onboarding");
  if (!["caregiver", "admin"].includes(ctx.member.role)) redirect("/app");

  const { subjects, openVisits, members } = await withUser(userId, async (db) => {
    const subjectsRes = await db.query(
      `select s.*,
        (select l.occurred_at from life_signal l
          where l.subject_id = s.id and l.signal_type = 'checkin'
          order by l.occurred_at desc limit 1) as last_checkin,
        (select count(*)::int from duty d
          where d.subject_id = s.id and d.status in ('open','late')
            and (d.owner_member_id = $1 or d.owner_member_id is null)) as my_duties
       from care_subject s order by s.created_at`,
      [ctx.member.id],
    );
    const visitsRes = await db.query(
      `select subject_id, check_in from caregiver_visit
       where caregiver_member_id = $1 and check_in is not null and check_out is null`,
      [ctx.member.id],
    );
    const membersRes = await db.query(
      `select id, display_name, role from family_member where role in ('admin','member','caregiver')
       order by created_at`,
    );
    return {
      subjects: subjectsRes.rows,
      openVisits: new Map(visitsRes.rows.map((v) => [v.subject_id as string, v.check_in as string])),
      members: membersRes.rows as { id: string; display_name: string | null; role: string }[],
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room="Care Console"
        meta={ctx.member.display_name ?? "caregiver"}
        headline={
          <>
            Thank you for being here.{" "}
            <span className="text-ink-soft">Help the family stay updated.</span>
          </>
        }
        sub="Start the visit when you arrive, confirm what you did, leave a word. That's all — the family reads the rest."
      />

      {subjects.length === 0 && (
        <CalmEmpty
          title="Nobody is in your care yet."
          hint="When the family adds a loved one, they'll appear here with everything you need at the door."
        />
      )}

      {subjects.map((subject) => (
        <SubjectConsole
          key={subject.id}
          subject={subject}
          visitStart={openVisits.get(subject.id)}
          userId={userId}
          memberId={ctx.member.id}
          members={members}
        />
      ))}
    </div>
  );
}

/** One person's console card — the visit, the doses, the words. */
async function SubjectConsole({
  subject,
  visitStart,
  userId,
  memberId,
  members,
}: {
  subject: {
    id: string;
    display_name: string;
    timezone: string | null;
    last_checkin: string | null;
    my_duties: number;
  };
  visitStart: string | undefined;
  userId: string;
  memberId: string;
  members: { id: string; display_name: string | null; role: string }[];
}) {
  const plan = await getCarePlan(userId, subject.id);
  const { meds, takenToday } = await withUser(userId, async (db) => {
    const medsRes = await db.query(
      `select * from medication where subject_id = $1 and active order by name`,
      [subject.id],
    );
    const dosesRes = await db.query(
      `select medication_id from dose_log
       where subject_id = $1 and status = 'taken' and at >= date_trunc('day', now())`,
      [subject.id],
    );
    return {
      meds: medsRes.rows,
      takenToday: new Set(dosesRes.rows.map((d) => d.medication_id as string)),
    };
  });
  const tz = subject.timezone ?? "Africa/Harare";
  return (
          <Panel key={subject.id} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Eyebrow>{subject.display_name}</Eyebrow>
                <p className="mt-1 font-mono text-[11px] text-ink-faint">
                  {subject.last_checkin
                    ? `last check-in · ${new Intl.DateTimeFormat("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: tz,
                      }).format(new Date(subject.last_checkin))}`
                    : "no check-in yet today"}
                  {subject.my_duties > 0 ? ` · ${subject.my_duties} dut${subject.my_duties === 1 ? "y" : "ies"} open` : ""}
                </p>
              </div>
              {visitStart ? (
                <Pill tone="ok">
                  visiting since{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: tz,
                  }).format(new Date(visitStart))}
                </Pill>
              ) : (
                <form action={startVisitForm}>
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <button className="lift rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk">
                    I&apos;ve arrived — start the visit
                  </button>
                </form>
              )}
            </div>

            {/* the care plan, at the door */}
            {plan && (plan.daily_routine || plan.dietary_notes || plan.mobility_notes) && (
              <div className="rounded-card border border-halo/25 bg-halo/[.07] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-halo">
                  The plan for {subject.display_name}
                </p>
                <div className="mt-2 flex flex-col gap-1.5 text-[13.5px] leading-relaxed text-ink-soft">
                  {plan.daily_routine && <p>{plan.daily_routine}</p>}
                  {plan.dietary_notes && <p>Food: {plan.dietary_notes}</p>}
                  {plan.mobility_notes && <p>Moving about: {plan.mobility_notes}</p>}
                  {plan.preferred_pharmacy && (
                    <p className="font-mono text-[11px] text-ink-faint">
                      Pharmacy: {plan.preferred_pharmacy}
                      {plan.doctor_name ? ` · Doctor: ${plan.doctor_name}${plan.doctor_phone ? ` (${plan.doctor_phone})` : ""}` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* medication confirmation */}
            {meds.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                  Medication today
                </p>
                {meds.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between gap-3 border-t border-line pt-2.5 first:border-t-0 first:pt-0"
                  >
                    <span className="text-[13.5px]">
                      {med.name} {med.dose && <span className="text-ink-soft">· {med.dose}</span>}{" "}
                      {(med.schedule?.times ?? []).map((t: string) => (
                        <Pill key={t} tone={takenToday.has(med.id) ? "ok" : "neutral"}>
                          {t}
                        </Pill>
                      ))}
                    </span>
                    {takenToday.has(med.id) ? (
                      <Pill tone="ok">given ✓</Pill>
                    ) : (
                      <form action={logDoseForm}>
                        <input type="hidden" name="medicationId" value={med.id} />
                        <input type="hidden" name="subjectId" value={subject.id} />
                        <input type="hidden" name="status" value="taken" />
                        <button className="rounded-pill bg-calm-soft px-3.5 py-1.5 text-[12.5px] font-medium text-calm-text hover:brightness-95">
                          Given
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* a word for the family — voice or typed */}
            <VoiceCapture subjectId={subject.id} />

            {/* raise attention, gently */}
            <details>
              <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
                Something the family should look at
              </summary>
              <form action={raiseAttentionForm} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="subjectId" value={subject.id} />
                <input
                  name="title"
                  required
                  placeholder={`e.g. ${subject.display_name} seemed unusually tired`}
                  className={inputClass}
                />
                <textarea
                  name="detail"
                  rows={2}
                  placeholder="What you noticed, in your own words. (optional)"
                  className={inputClass}
                />
                <button className="self-start rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">
                  Tell the family
                </button>
              </form>
            </details>

            {/* end of visit + handover */}
            {visitStart && (
              <form action={endVisitForm} className="flex flex-col gap-2 border-t border-line pt-4">
                <input type="hidden" name="subjectId" value={subject.id} />
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="How the visit went — dinner, mood, anything worth a word."
                  className={inputClass}
                />
                <button className="self-start rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk">
                  Done for today — end the visit
                </button>
              </form>
            )}
            <details>
              <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
                Hand the day to someone
              </summary>
              <form action={createHandoverForm} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="subjectId" value={subject.id} />
                <select name="toMemberId" className={inputClass} defaultValue="">
                  <option value="">Whoever comes next</option>
                  {members
                    .filter((m) => m.id !== memberId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name ?? m.role}
                      </option>
                    ))}
                </select>
                <input
                  name="note"
                  placeholder="Anything to add in your own words (optional)"
                  className={`${inputClass} min-w-[220px] flex-1`}
                />
                <button className="rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">
                  Write the handover
                </button>
              </form>
              <p className="mt-2 max-w-[56ch] text-[12px] leading-relaxed text-ink-faint">
                KinOS writes it from today&apos;s real record — what happened, what&apos;s open,
                what&apos;s worth an eye — and keeps it in the Family Record.
              </p>
            </details>
            <Link
              href={`/app/orbits/${subject.id}`}
              className="self-start font-mono text-[11px] text-halo no-underline hover:text-ink"
            >
              open {subject.display_name}&apos;s full orbit →
            </Link>
          </Panel>
  );
}
