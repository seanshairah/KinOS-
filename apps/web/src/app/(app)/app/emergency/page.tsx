import {
  raiseEmergencyForm,
} from "@/lib/actions/forms";
import { Eyebrow, Panel, Pill } from "@kinos/ui";
import { withUser } from "@kinos/db";

import { requireFamilyContext } from "@/lib/data/context";
import { getEmergencyView } from "@/lib/data/consent";
import { listSubjects } from "@/lib/data/record";

export default async function EmergencyPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: selectedId } = await searchParams;
  const ctx = await requireFamilyContext();
  const subjects = await listSubjects(ctx.userId);
  const subject = subjects.find((s) => s.id === selectedId) ?? subjects[0];
  const view = subject ? await getEmergencyView(ctx.userId, subject.id) : null;

  const recentAlerts = subject
    ? await withUser(ctx.userId, async (db) => {
        const res = await db.query(
          `select * from emergency_alert where subject_id = $1 order by at desc limit 5`,
          [subject.id],
        );
        return res.rows;
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Emergency Layer</Eyebrow>
        <h1 className="mt-1 font-serif text-[28px] tracking-[-0.01em]">
          Ready for the worst ten minutes
        </h1>
      </div>

      <div className="rounded-card border border-urgent/30 bg-urgent-bg p-4 text-[13.5px] leading-relaxed text-ink">
        If something is urgent right now, contact local emergency or medical services first.
        KinOS reaches your family — it is not an emergency service.
      </div>

      {subjects.length > 1 && (
        <div className="flex gap-2">
          {subjects.map((s) => (
            <a
              key={s.id}
              href={`/app/emergency?subject=${s.id}`}
              className={`rounded-pill border px-4 py-2 text-[13px] font-medium no-underline ${
                s.id === subject?.id
                  ? "border-dusk bg-dusk text-white"
                  : "border-line bg-paper-3 text-ink-soft"
              }`}
            >
              {s.display_name}
            </a>
          ))}
        </div>
      )}

      {subject && (
        <>
          <Panel className="border-urgent/40">
            <form action={raiseEmergencyForm} className="flex flex-col gap-3">
              <input type="hidden" name="subjectId" value={subject.id} />
              <input
                name="note"
                placeholder="One line about what's happening (optional)"
                className="rounded-card border border-line bg-paper px-3.5 py-2.5 text-[14px] placeholder:text-ink-faint"
              />
              <button className="rounded-pill bg-urgent px-6 py-4 text-[16px] font-semibold text-white hover:brightness-110">
                Alert the family about {subject.display_name}
              </button>
              <p className="text-center font-mono text-[11px] text-ink-faint">
                Notifies every member immediately, by priority, and opens the medical summary.
              </p>
            </form>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                Medical summary
              </h2>
              {view?.profile ? (
                <div className="flex flex-col gap-3 text-[14px]">
                  {view.profile.blood_type && (
                    <div>
                      <span className="text-ink-soft">Blood type · </span>
                      <b>{view.profile.blood_type}</b>
                    </div>
                  )}
                  {view.profile.conditions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-ink-soft">Conditions ·</span>
                      {view.profile.conditions.map((c) => (
                        <Pill key={c} tone="data">{c}</Pill>
                      ))}
                    </div>
                  )}
                  {view.profile.allergies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-ink-soft">Allergies ·</span>
                      {view.profile.allergies.map((a) => (
                        <Pill key={a} tone="attn">{a}</Pill>
                      ))}
                    </div>
                  )}
                  {view.profile.medications.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-ink-soft">Medication ·</span>
                      {view.profile.medications.map((m) => (
                        <Pill key={m} tone="neutral">{m}</Pill>
                      ))}
                    </div>
                  )}
                  {view.profile.instructions && (
                    <p className="rounded-card border border-line bg-paper p-3 text-[13.5px] leading-relaxed text-ink-soft">
                      {view.profile.instructions}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[13.5px] text-ink-soft">
                  No medical summary yet — an admin can add conditions, allergies and
                  instructions so they&apos;re at hand when it matters. This summary is
                  visible only to those with health access, and to emergency contacts
                  during an alert.
                </p>
              )}
            </Panel>

            <Panel>
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                Who gets called, in order
              </h2>
              {view && view.contacts.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {view.contacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-card border border-line bg-paper p-3">
                      <div>
                        <div className="text-[14px] font-medium">
                          {c.priority}. {c.name}
                        </div>
                        <div className="font-mono text-[11px] text-ink-faint">{c.relationship}</div>
                      </div>
                      <a href={`tel:${c.phone}`} className="rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white no-underline">
                        Call {c.phone}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13.5px] text-ink-soft">No emergency contacts yet.</p>
              )}
            </Panel>
          </div>

          {recentAlerts.length > 0 && (
            <Panel>
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                Past alerts
              </h2>
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="border-t border-line py-2.5 text-[13.5px] first:border-t-0">
                  <span className="font-mono text-[11px] text-ink-faint">
                    {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(alert.at))}
                  </span>
                  {" · "}
                  {alert.note ?? "Alert raised"}
                  {alert.resolved_at ? <span className="text-calm"> · resolved</span> : null}
                </div>
              ))}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
