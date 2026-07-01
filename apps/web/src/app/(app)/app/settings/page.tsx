import {
  grantConsentForm,
  inviteMemberForm,
  revokeConsentForm,
} from "@/lib/actions/forms";
import { PLANS, type PlanId } from "@kinos/config";
import { Eyebrow, Panel, Pill } from "@kinos/ui";

import { EnableNotifications } from "@/components/enable-notifications";
import { requireFamilyContext } from "@/lib/data/context";
import {
  listAccessLog,
  listConsentGrants,
  listInvitations,
  listMembers,
} from "@/lib/data/consent";
import { listSubjects } from "@/lib/data/record";

const inputClass =
  "rounded-card border border-line bg-paper px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-dusk-2";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  member: "Family member",
  caregiver: "Caregiver",
  care_recipient: "Care recipient",
  viewer: "Viewer",
  emergency: "Emergency contact",
};

export default async function SettingsPage() {
  const ctx = await requireFamilyContext();
  const isAdmin = ctx.member.role === "admin";
  const [members, invitations, grants, subjects, accessLog] = await Promise.all([
    listMembers(ctx.userId),
    isAdmin ? listInvitations(ctx.userId) : Promise.resolve([]),
    listConsentGrants(ctx.userId),
    listSubjects(ctx.userId),
    isAdmin ? listAccessLog(ctx.userId) : Promise.resolve([]),
  ]);

  const planId = (ctx.workspace.plan_id in PLANS ? ctx.workspace.plan_id : "free") as PlanId;
  const plan = PLANS[planId];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Settings</Eyebrow>
        <h1 className="mt-1 font-serif text-[28px] tracking-[-0.01em]">{ctx.workspace.name}</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {plan.name} plan · you are {ROLE_LABEL[ctx.member.role]?.toLowerCase()}
        </p>
      </div>

      {/* notifications */}
      <Panel className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Notifications
        </h2>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Attention items, escalations and the Daily Brief can reach this device. KinOS
          only speaks up when something genuinely needs you — and never during quiet hours
          unless it&apos;s urgent.
        </p>
        <EnableNotifications vapidPublicKey={process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? null} />
      </Panel>

      {/* members */}
      <Panel className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Family members
        </h2>
        <div className="flex flex-col">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0">
              <span className="text-[14px]">{m.display_name ?? "Unnamed"}</span>
              <Pill tone={m.role === "admin" ? "data" : "neutral"}>{ROLE_LABEL[m.role]}</Pill>
            </div>
          ))}
        </div>
        {isAdmin && (
          <details>
            <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
              Invite someone
            </summary>
            <form action={inviteMemberForm} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input name="email" type="email" required placeholder="Their email" className={inputClass} />
              <select name="role" className={inputClass} defaultValue="member">
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-3 text-[13px] text-ink-soft sm:col-span-2">
                {(["health", "money", "documents", "location"] as const).map((scope) => (
                  <label key={scope} className="flex items-center gap-1.5">
                    <input type="checkbox" name="scopes" value={scope} /> {scope}
                  </label>
                ))}
              </div>
              <button className="justify-self-start rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white">
                Send invitation
              </button>
            </form>
            {invitations.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                {invitations.map((inv) => (
                  <div key={inv.id} className="font-mono text-[11.5px] text-ink-faint">
                    pending · {inv.email} as {inv.role}
                  </div>
                ))}
              </div>
            )}
          </details>
        )}
      </Panel>

      {/* consent centre */}
      <Panel className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Consent — who sees what
        </h2>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Family-level updates are visible to every member. Anything beyond that — health
          entries, money, documents, location — needs a consent grant, checked by the
          database on every single query. Revoking takes effect immediately.
        </p>
        {grants.length === 0 ? (
          <p className="text-[13.5px] text-ink-soft">No grants yet — only role defaults apply.</p>
        ) : (
          <div className="flex flex-col">
            {grants.map((g) => {
              const active = !g.revoked_at && (!g.expires_at || new Date(g.expires_at) > new Date());
              return (
                <div key={g.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0">
                  <div className="text-[13.5px]">
                    <b>{g.grantee_name ?? g.grantee_role}</b> may see{" "}
                    <Pill tone={active ? "data" : "neutral"}>{g.scope}</Pill> about{" "}
                    <b>{g.subject_name}</b>
                    {!active && <span className="text-ink-faint"> · revoked</span>}
                  </div>
                  {active && isAdmin && (
                    <form action={revokeConsentForm}>
                      <input type="hidden" name="grantId" value={g.id} />
                      <button className="rounded-pill border border-line bg-paper-3 px-3 py-1.5 text-[12px] font-medium text-urgent hover:border-urgent/40">
                        Revoke
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {isAdmin && (
          <details>
            <summary className="cursor-pointer text-[12.5px] font-medium text-dusk-2">
              Grant access
            </summary>
            <form action={grantConsentForm} className="mt-3 grid gap-2 sm:grid-cols-3">
              <select name="granteeMemberId" required className={inputClass}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name ?? m.role}
                  </option>
                ))}
              </select>
              <select name="subjectId" required className={inputClass}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    about {s.display_name}
                  </option>
                ))}
              </select>
              <select name="scope" required className={inputClass} defaultValue="health">
                {["health", "money", "documents", "location", "full"].map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
              <button className="justify-self-start rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white sm:col-span-3">
                Grant
              </button>
            </form>
          </details>
        )}
      </Panel>

      {/* export + access log (admin) */}
      {isAdmin && (
        <>
          <Panel className="flex flex-col gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Your family&apos;s data
            </h2>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Everything the family can see, as portable JSON. Leaving with your record is a
              right, not a request.
            </p>
            <a
              href="/api/export"
              className="self-start rounded-pill border border-line bg-paper-3 px-4 py-2 text-[13px] font-medium text-ink no-underline hover:border-line-2"
            >
              Download the export
            </a>
          </Panel>

          <Panel className="flex flex-col gap-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Access log
            </h2>
            {accessLog.length === 0 ? (
              <p className="text-[13.5px] text-ink-soft">No sensitive actions recorded yet.</p>
            ) : (
              accessLog.slice(0, 30).map((entry) => (
                <div key={entry.id} className="border-t border-line py-2 font-mono text-[11.5px] text-ink-soft first:border-t-0">
                  {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.at))}
                  {" · "}
                  {entry.action.replace(/_/g, " ")}
                  {entry.target ? ` · ${entry.target}` : ""}
                </div>
              ))
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
