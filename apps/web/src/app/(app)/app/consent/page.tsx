import { redirect } from "next/navigation";
import { withUser } from "@kinos/db";
import type { CareSubjectRow, ConsentGrantRow, MemberRow } from "@kinos/db";
import { Eyebrow, Panel, Pill } from "@kinos/ui";
import { grantConsentForm, revokeConsentForm, setHealthSharingForm } from "@/lib/actions/forms";
import { requireUserId, getFamilyContext } from "@/lib/data/context";
import { listConsentGrants, listMembers } from "@/lib/data/consent";
import { listTrustLog } from "@/lib/data/operating";
import { hasDeviceLink } from "@/lib/health";
import { DevicesPanel } from "@/components/orbit-extras";
import { CalmEmpty, RoomHeader, RoomSection } from "@/components/rooms";

/**
 * The Consent Room — one question, answered visibly: who can see what?
 * Access is drawn as rings around the person; every change lands in the
 * family-visible Trust Log. The database enforces all of it — this room
 * only shows the truth and offers the dials.
 */

const SCOPES = ["health", "money", "documents", "location", "wellness_checks", "full"] as const;
const SCOPE_LABELS: Record<(typeof SCOPES)[number], string> = {
  health: "Health",
  money: "Money",
  documents: "Documents",
  location: "Location",
  wellness_checks: "Wellness checks",
  full: "Everything",
};
const RING_ORDER = ["health", "money", "documents", "location", "wellness_checks"] as const;

const ROLE_WORDS: Record<string, string> = {
  admin: "sees everything, carries the keys",
  member: "family view plus what consent opens",
  caregiver: "what they need to help, nothing more",
  care_recipient: "their own life, always",
  viewer: "the calm surface only",
  emergency: "the emergency profile, when it matters",
};

const CIRCLES: { title: string; roles: string[]; note: string }[] = [
  { title: "Core family", roles: ["admin", "member"], note: "Run the space day to day." },
  { title: "Caregivers", roles: ["caregiver"], note: "Help at the door — see what the family opens to them." },
  { title: "At the centre", roles: ["care_recipient"], note: "The person this is all for. Their consent leads." },
  { title: "View-only relatives", roles: ["viewer"], note: "Kept in the loop, never in the controls." },
  { title: "Emergency contacts", roles: ["emergency"], note: "Reachable when it counts; see the emergency profile only." },
];

const inputClass =
  "rounded-card border border-line bg-[#211f42]/60 px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-halo/60 focus:outline-none";

function liveGrant(g: ConsentGrantRow): boolean {
  return !g.revoked_at && (!g.expires_at || new Date(g.expires_at) > new Date());
}

/** Members placed on the innermost ring their live grants open. */
function ConsentOrbit({
  subjectName,
  members,
  grants,
}: {
  subjectName: string;
  members: MemberRow[];
  grants: ConsentGrantRow[];
}) {
  const placed = members
    .filter((m) => m.role !== "care_recipient")
    .map((m, i) => {
      const mine = grants.filter((g) => g.grantee_member_id === m.id && liveGrant(g));
      const full = m.role === "admin" || mine.some((g) => g.scope === "full");
      const ring = full
        ? 0
        : RING_ORDER.findIndex((scope) => mine.some((g) => g.scope === scope));
      return { member: m, ring: ring === -1 ? RING_ORDER.length : ring, index: i };
    });
  const RADII = [21, 27, 33, 39, 45, 50]; // % of the box
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[500px]">
      {RADII.slice(0, 5).map((r, i) => (
        <div
          key={r}
          aria-hidden
          className="absolute rounded-full border border-halo/25"
          style={{ inset: `${50 - r}%` }}
          title={SCOPE_LABELS[RING_ORDER[i]!]}
        />
      ))}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="block h-3 w-3 mx-auto rounded-full bg-paper shadow-[0_0_18px_rgba(237,235,246,.8)]" />
        <span className="mt-2 block font-serif text-[15px] text-ink">{subjectName}</span>
      </div>
      {placed.map(({ member, ring, index }) => {
        const angle = (index / Math.max(placed.length, 1)) * Math.PI * 2 - Math.PI / 2.6;
        const r = RADII[Math.min(ring, RADII.length - 1)]!;
        const left = 50 + Math.cos(angle) * r;
        const top = 50 + Math.sin(angle) * r;
        return (
          <div
            key={member.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${left}%`, top: `${top}%` }}
            title={`${member.display_name ?? member.role} · ${
              ring >= RING_ORDER.length ? "family surface" : `${SCOPE_LABELS[RING_ORDER[Math.min(ring, RING_ORDER.length - 1)]!]} and outward`
            }`}
          >
            <span
              className={`block h-2.5 w-2.5 mx-auto rounded-full ${
                ring === 0 ? "bg-halo shadow-[0_0_10px_rgba(169,167,224,.9)]" : "bg-ink-soft"
              }`}
            />
            <span className="mt-1 block max-w-[72px] truncate font-mono text-[9.5px] text-ink-faint">
              {member.display_name ?? member.role}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function ConsentRoomPage() {
  const userId = await requireUserId();
  const ctx = await getFamilyContext(userId);
  if (!ctx) redirect("/app/onboarding");

  const [grants, members, trust, subjects] = await Promise.all([
    listConsentGrants(userId),
    listMembers(userId),
    listTrustLog(userId, 25),
    withUser(userId, async (db) => {
      const res = await db.query(`select * from care_subject order by created_at`);
      return res.rows as CareSubjectRow[];
    }),
  ]);
  const healthDials = await withUser(userId, async (db) => {
    const res = await db.query(`select subject_id, metric, level from health_share_scope`);
    return new Map(
      (res.rows as { subject_id: string; metric: string; level: string }[]).map((r) => [
        `${r.subject_id}:${r.metric}`,
        r.level,
      ]),
    );
  });
  const canGrant = ["admin", "care_recipient"].includes(ctx.member.role);
  const deviceLinks = new Map<string, boolean>();
  if (canGrant) {
    for (const s of subjects) deviceLinks.set(s.id, await hasDeviceLink(s.id));
  }
  const tz = "Africa/Harare";
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room="Consent Centre"
        meta={`${members.length} member${members.length === 1 ? "" : "s"}`}
        headline={
          <>
            Who can see what — <span className="text-ink-soft">decided here, enforced underneath.</span>
          </>
        }
        sub="Access isn't a policy page. It's rings around a person, opened and closed by the family — and every change is on the record."
      />

      {subjects.length === 0 ? (
        <CalmEmpty
          title="Consent starts with a person."
          hint="Add a loved one first — then decide, together, who sees what."
        />
      ) : (
        subjects.map((subject) => {
          const subjectGrants = grants.filter((g) => g.subject_id === subject.id);
          return (
            <Panel key={subject.id} className="flex flex-col gap-5">
              <Eyebrow>{subject.display_name}&apos;s rings</Eyebrow>
              <div className="grid items-center gap-8 lg:grid-cols-[minmax(320px,0.95fr)_1.05fr]">
                <ConsentOrbit
                  subjectName={subject.display_name}
                  members={members}
                  grants={subjectGrants}
                />
                <div className="flex flex-col gap-3">
                  <p className="max-w-[52ch] text-[13.5px] leading-relaxed text-ink-soft">
                    Inner rings hold more: health first, then money, documents, location and
                    wellness checks. A member sits on the innermost ring their consent opens.
                    Revoking moves them out — on the very next request, because the database
                    itself refuses, not a setting in an app.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {subjectGrants.filter(liveGrant).length === 0 ? (
                      <p className="text-[13px] text-ink-faint">
                        No extra doors are open. Everyone sees the family surface only.
                      </p>
                    ) : (
                      subjectGrants.filter(liveGrant).map((g) => (
                        <div
                          key={g.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 first:border-t-0 first:pt-0"
                        >
                          <span className="text-[13.5px]">
                            <span className="font-medium">{g.grantee_name ?? g.grantee_role}</span>{" "}
                            <span className="text-ink-soft">holds</span>{" "}
                            <Pill tone="data">{SCOPE_LABELS[g.scope as keyof typeof SCOPE_LABELS] ?? g.scope}</Pill>
                            {g.expires_at && (
                              <span className="ml-2 font-mono text-[10.5px] text-ink-faint">
                                until {when(g.expires_at)}
                              </span>
                            )}
                          </span>
                          {canGrant && (
                            <form action={revokeConsentForm}>
                              <input type="hidden" name="grantId" value={g.id} />
                              <button className="rounded-pill border border-line px-3 py-1 text-[12px] text-ink-soft hover:border-ember/50 hover:text-ember-text">
                                Close this door
                              </button>
                            </form>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {canGrant && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
                        Open a door
                      </summary>
                      <form action={grantConsentForm} className="mt-3 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="subjectId" value={subject.id} />
                        <select name="granteeMemberId" required className={inputClass} defaultValue="">
                          <option value="" disabled>
                            Who
                          </option>
                          {members
                            .filter((m) => m.role !== "care_recipient")
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.display_name ?? m.role}
                              </option>
                            ))}
                        </select>
                        <select name="scope" required className={inputClass} defaultValue="health">
                          {SCOPES.map((scope) => (
                            <option key={scope} value={scope}>
                              {SCOPE_LABELS[scope]}
                            </option>
                          ))}
                        </select>
                        <select name="expiresInDays" className={inputClass} defaultValue="0">
                          <option value="0">Until it&apos;s closed</option>
                          <option value="7">For a week</option>
                          <option value="30">For a month</option>
                          <option value="90">For three months</option>
                        </select>
                        <button className="rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white">
                          Open
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              </div>

              {/* ——— devices & wearables: how readings arrive, and what they share ——— */}
              <div className="border-t border-line pt-5">
                <div className="grid gap-6 lg:grid-cols-2">
                  <DevicesPanel
                    subject={subject}
                    canManage={canGrant || ctx.member.role === "member"}
                    userId={userId}
                  />
                  <HealthSharingCard
                    subject={subject}
                    canManage={canGrant}
                    dials={healthDials}
                    deviceLinked={deviceLinks.get(subject.id) ?? false}
                  />
                </div>
              </div>
            </Panel>
          );
        })
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {/* ——— care circles: the same family, seen as groups ——— */}
      <RoomSection title="Care circles" delay={80}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {CIRCLES.map((circle) => {
            const inCircle = members.filter((m) => circle.roles.includes(m.role));
            if (inCircle.length === 0) return null;
            return (
              <div key={circle.title} className="rounded-card border border-line bg-paper-2 p-4">
                <p className="text-[13.5px] font-semibold text-ink">{circle.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{circle.note}</p>
                <div className="mt-2.5 flex flex-col gap-1">
                  {inCircle.map((m) => (
                    <p key={m.id} className="font-mono text-[11px] text-ink-faint">
                      {m.display_name ?? m.role} · {ROLE_WORDS[m.role] ?? m.role}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </RoomSection>

      {/* ——— trust log: openness is the feature ——— */}
      <RoomSection title="Trust log · who looked, who asked, who changed access" delay={120}>
        {trust.length === 0 ? (
          <p className="py-1 text-[13.5px] text-ink-soft">
            Nothing yet. When someone opens the emergency profile, asks for a check, or changes
            consent, it appears here — for everyone.
          </p>
        ) : (
          <div className="flex flex-col">
            {trust.map((entry) => (
              <div key={entry.id} className="flex items-baseline gap-3 border-t border-line py-2 first:border-t-0">
                <span className="flex-none font-mono text-[10.5px] text-ink-faint">{when(entry.at)}</span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink-soft">
                  <span className="text-ink">{entry.actor_name ?? "Someone"}</span>{" "}
                  {entry.action === "viewed_emergency_profile" && "opened the emergency profile"}
                  {entry.action === "requested_check" && "asked for a wellness check"}
                  {entry.action === "responded_check" &&
                    (entry.detail === "declined"
                      ? "answered a wellness check — chose not to share"
                      : entry.detail === "later"
                        ? "asked to be reminded about a wellness check"
                        : "shared a wellness check")}
                  {entry.action === "changed_consent" && `changed access${entry.detail ? ` — ${entry.detail}` : ""}`}
                  {entry.action === "changed_role" && "changed a member's role"}
                  {entry.action === "exported_records" && "exported the family record"}
                  {entry.action === "downloaded_document" && "downloaded a document"}
                  {entry.action === "raised_alert" && "raised an emergency alert"}
                  {entry.action === "viewed_health" && "looked at health notes"}
                  {entry.action === "changed_quiet_mode" &&
                    (entry.detail === "resumed" ? "ended a rest" : "set a rest")}
                  {entry.subject_name ? ` · ${entry.subject_name}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </RoomSection>
      </div>

      <p className="max-w-[70ch] text-[12px] leading-relaxed text-ink-faint">
        Your family&apos;s data belongs to your family. Export everything any time from Admin;
        deleting the space removes it for good. KinOS is a family coordination and
        life-awareness platform — not a medical device, diagnosis tool, emergency service, or a
        replacement for healthcare professionals.
      </p>
    </div>
  );
}

const HEALTH_METRICS: { metric: string; label: string }[] = [
  { metric: "blood_pressure", label: "Blood pressure" },
  { metric: "heart_rate", label: "Heart rate" },
  { metric: "sleep_minutes", label: "Sleep" },
  { metric: "steps", label: "Movement" },
  { metric: "weight", label: "Weight" },
];

/**
 * What each wearable reading shares, per measurement — the dial the
 * person (or an admin) holds. Readings themselves appear in the orbit's
 * Health panel and inside Request Check answers; this decides how much
 * of them health-consented family may see.
 */
function HealthSharingCard({
  subject,
  canManage,
  dials,
  deviceLinked,
}: {
  subject: CareSubjectRow;
  canManage: boolean;
  dials: Map<string, string>;
  deviceLinked: boolean;
}) {
  return (
    <Panel className="flex flex-col gap-3">
      <Eyebrow>What readings share</Eyebrow>
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Readings land in {subject.display_name}&apos;s orbit (the Health panel) and in answered
        wellness checks. Per measurement, choose what health-consented members see: the numbers,
        quiet notes only, or nothing beyond &ldquo;needs attention&rdquo;.
      </p>
      {canManage ? (
        <div className="flex flex-col gap-2">
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
                  defaultValue={dials.get(`${subject.id}:${metric}`) ?? "observations"}
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
      ) : (
        <p className="text-[12.5px] leading-relaxed text-ink-faint">
          {subject.display_name} and admins hold these dials.
        </p>
      )}
      {canManage && (
        <a
          href={`/api/integrations/withings/connect?subject=${subject.id}`}
          className="self-start rounded-pill border border-line bg-paper-3 px-4 py-2 text-[12.5px] font-medium text-ink no-underline hover:border-halo/50"
        >
          {deviceLinked ? "Withings connected ✓ · relink" : "Link a Withings cuff or scale"}
        </a>
      )}
    </Panel>
  );
}
