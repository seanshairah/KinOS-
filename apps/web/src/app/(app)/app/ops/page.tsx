import { notFound } from "next/navigation";
import { withService } from "@kinos/db";
import { Eyebrow, Panel } from "@kinos/ui";
import { requireUserId } from "@/lib/data/context";

export const dynamic = "force-dynamic";

/**
 * The ops room — for whoever runs KinOS itself, not for families.
 * Gated by OPS_EMAILS (comma-separated). To everyone else this page
 * pretends not to exist. Reads are service-side aggregates: counts and
 * queues, never family content.
 */

function allowed(email: string | null): boolean {
  const list = (process.env.OPS_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && list.includes(email.toLowerCase()));
}

export default async function OpsPage() {
  const userId = await requireUserId();

  const data = await withService(async (db) => {
    const me = await db.query(`select email from app_user where id = $1`, [userId]);
    if (!allowed(me.rows[0]?.email ?? null)) return null;

    const counts = await db.query(`
      select
        (select count(*)::int from family_workspace) as workspaces,
        (select count(*)::int from app_user) as users,
        (select count(*)::int from care_subject) as orbits,
        (select count(*)::int from life_signal where occurred_at > now() - interval '24 hours') as signals_24h,
        (select count(*)::int from attention_event where status = 'open') as attention_open,
        (select count(*)::int from health_reading where created_at > now() - interval '7 days') as readings_7d,
        (select count(*)::int from health_source_link where status = 'active') as device_links`);
    const plans = await db.query(
      `select plan_id, count(*)::int as n from family_workspace group by plan_id order by n desc`,
    );
    const signups = await db.query(
      `select w.name, w.created_at,
         (select count(*)::int from family_member m where m.workspace_id = w.id) as members
       from family_workspace w order by w.created_at desc limit 8`,
    );
    const dead = await db.query(
      `select stage, count(*)::int as n, max(created_at) as latest
       from pipeline_dead_letter group by stage order by n desc limit 10`,
    );
    return {
      counts: counts.rows[0] as Record<string, number>,
      plans: plans.rows as { plan_id: string; n: number }[],
      signups: signups.rows as { name: string; created_at: Date; members: number }[],
      dead: dead.rows as { stage: string; n: number; latest: Date }[],
    };
  });

  if (!data) notFound();

  const stat = (label: string, value: number | undefined) => (
    <div key={label} className="rounded-card border border-line bg-paper-2 px-4 py-3">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">{label}</div>
      <div className="mt-1 font-serif text-[26px] font-light text-ink">{value}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Ops</Eyebrow>
        <h1 className="mt-1 font-serif text-[28px] tracking-[-0.01em]">The engine room</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Counts and queues only — family content stays behind consent.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("families", data.counts.workspaces)}
        {stat("people", data.counts.users)}
        {stat("orbits", data.counts.orbits)}
        {stat("signals · 24h", data.counts.signals_24h)}
        {stat("attention open", data.counts.attention_open)}
        {stat("readings · 7d", data.counts.readings_7d)}
        {stat("device links", data.counts.device_links)}
      </div>

      <Panel className="flex flex-col gap-2">
        <Eyebrow>Plans</Eyebrow>
        {data.plans.map((p) => (
          <div key={p.plan_id} className="flex justify-between border-t border-line pt-2 text-[13.5px] first:border-t-0 first:pt-0">
            <span>{p.plan_id}</span>
            <span className="font-mono text-[12px] text-ink-faint">{p.n}</span>
          </div>
        ))}
      </Panel>

      <Panel className="flex flex-col gap-2">
        <Eyebrow>Latest families</Eyebrow>
        {data.signups.map((s, i) => (
          <div key={i} className="flex justify-between gap-3 border-t border-line pt-2 text-[13.5px] first:border-t-0 first:pt-0">
            <span>{s.name}</span>
            <span className="font-mono text-[11.5px] text-ink-faint">
              {s.members} member{s.members === 1 ? "" : "s"} ·{" "}
              {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(s.created_at))}
            </span>
          </div>
        ))}
      </Panel>

      <Panel className="flex flex-col gap-2">
        <Eyebrow>Pipeline queues</Eyebrow>
        {data.dead.length === 0 ? (
          <p className="text-[13.5px] text-ink-soft">Nothing parked. The pipes are clear.</p>
        ) : (
          data.dead.map((d) => (
            <div key={d.stage} className="flex justify-between gap-3 border-t border-line pt-2 text-[13.5px] first:border-t-0 first:pt-0">
              <span className="font-mono text-[12px]">{d.stage}</span>
              <span className="font-mono text-[11.5px] text-ink-faint">
                {d.n} · latest{" "}
                {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d.latest))}
              </span>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
