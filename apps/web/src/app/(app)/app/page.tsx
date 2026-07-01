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

  // The person being cared for gets a big, simple home: check in, reach
  // the family, read today's words. Supported — never dashboarded.
  if (ctx.member.role === "care_recipient" && orbits.length > 0) {
    const mine = orbits[0]!;
    const myBrief = await withUser(userId, async (db) => {
      const res = await db.query(
        `select body from daily_brief where subject_id = $1 order by created_at desc limit 1`,
        [mine.subject.id],
      );
      return res.rows[0]?.body as string | undefined;
    });
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-8 pt-4">
        <div className="text-center">
          <Eyebrow>Good day</Eyebrow>
          <h1 className="mt-2 font-serif text-[38px] font-light leading-[1.15]">
            Hello{ctx.member.display_name ? `, ${ctx.member.display_name}` : ""}.
          </h1>
          <p className="mt-2 text-[17px] text-ink-soft">Your family is thinking of you.</p>
        </div>
        <Link
          href={`/app/orbits/${mine.subject.id}/check-in`}
          className="rounded-orbit bg-dusk px-8 py-7 text-center text-[22px] font-semibold text-white no-underline shadow-float hover:bg-dusk-2"
        >
          Check in for today
        </Link>
        <Link
          href={`/app/emergency?subject=${mine.subject.id}`}
          className="rounded-orbit border-2 border-urgent/50 bg-paper-3 px-8 py-6 text-center text-[19px] font-semibold text-urgent no-underline hover:bg-[#fdf1ee]"
        >
          I need the family now
        </Link>
        {myBrief && (
          <Panel>
            <BriefBlock meta="Today, in the family's words">{myBrief}</BriefBlock>
          </Panel>
        )}
      </div>
    );
  }

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
