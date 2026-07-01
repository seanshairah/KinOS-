import Link from "next/link";
import { redirect } from "next/navigation";
import { formatSignalTime } from "@kinos/config";
import {
  BriefBlock,
  ButtonLink,
  EmptyState,
  Eyebrow,
  OrbitCard,
  Panel,
  type OrbitSignalPill,
} from "@kinos/ui";
import { withUser } from "@kinos/db";
import { requireUserId, getFamilyContext } from "@/lib/data/context";
import { listOrbits, type OrbitSummary } from "@/lib/data/orbits";

function orbitPills(orbit: OrbitSummary): OrbitSignalPill[] {
  const pills: OrbitSignalPill[] = [];
  if (orbit.dosesToday.taken > 0) {
    pills.push({ label: `doses ✓ ${orbit.dosesToday.taken}`, tone: "ok" });
  }
  if (orbit.nextAppointment && !orbit.nextAppointment.transport_confirmed) {
    pills.push({ label: "transport open", tone: "attn" });
  }
  if (orbit.lastCheckinMood) {
    pills.push({
      label: `mood · ${orbit.lastCheckinMood}`,
      tone: orbit.lastCheckinMood === "good" ? "ok" : "neutral",
    });
  }
  if (orbit.openDuties > 0) {
    pills.push({ label: `${orbit.openDuties} duties`, tone: "neutral" });
  }
  return pills.slice(0, 4);
}

function orbitSubline(orbit: OrbitSummary): string {
  const parts: string[] = [];
  parts.push(
    orbit.lastCheckin
      ? `Checked in ${formatSignalTime(new Date(orbit.lastCheckin).toISOString(), orbit.subject.timezone)}`
      : "No check-in yet today",
  );
  if (orbit.nextAppointment) {
    const when = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: orbit.subject.timezone,
    }).format(new Date(orbit.nextAppointment.starts_at));
    parts.push(`${orbit.nextAppointment.title} ${when}`);
  }
  return parts.join(" · ");
}

export default async function OrbitViewPage() {
  const userId = await requireUserId();
  const ctx = await getFamilyContext(userId);
  if (!ctx) redirect("/app/onboarding");

  const orbits = await listOrbits(userId);

  // The latest brief across orbits, for the home surface.
  const latestBrief = await withUser(userId, async (db) => {
    const res = await db.query(
      `select b.*, s.display_name as subject_name from daily_brief b
       join care_subject s on s.id = b.subject_id
       order by b.created_at desc limit 1`,
    );
    return res.rows[0] ?? null;
  });

  const now = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <Eyebrow>Orbit View</Eyebrow>
          <h1 className="mt-1 font-serif text-[28px] font-normal tracking-[-0.01em]">
            {ctx.workspace.name}
          </h1>
        </div>
        <span className="font-mono text-[11px] text-ink-faint">{now}</span>
      </div>

      {orbits.length === 0 ? (
        <EmptyState
          title="Your first Orbit is waiting."
          hint="An Orbit is a loved one at the centre of the family's care — a parent, a child, someone recovering."
          action={
            <ButtonLink href="/app/onboarding" className="no-underline">
              Add a loved one
            </ButtonLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orbits.map((orbit, i) => (
            <OrbitCard
              key={orbit.subject.id}
              href={`/app/orbits/${orbit.subject.id}`}
              name={orbit.subject.display_name}
              subline={orbitSubline(orbit)}
              status={orbit.status}
              avatarIndex={i}
              signals={orbitPills(orbit)}
            />
          ))}
        </div>
      )}

      {latestBrief && (
        <Panel>
          <BriefBlock
            meta={`Daily Brief · ${latestBrief.subject_name} · ${latestBrief.kind}`}
            actions={
              <Link
                href={`/app/orbits/${latestBrief.subject_id}`}
                className="rounded-pill bg-dusk px-3.5 py-2 text-[12.5px] font-medium text-white no-underline hover:bg-dusk-2"
              >
                Open {latestBrief.subject_name}&apos;s Orbit
              </Link>
            }
          >
            {latestBrief.body}
          </BriefBlock>
        </Panel>
      )}

      {orbits.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <ButtonLink
            href={`/app/orbits/${orbits[0]!.subject.id}/check-in`}
            variant="ghost"
            className="no-underline"
          >
            Check in for {orbits[0]!.subject.display_name}
          </ButtonLink>
          <ButtonLink href="/app/duties" variant="ghost" className="no-underline">
            See all duties
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
