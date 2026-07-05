import Link from "next/link";
import { redirect } from "next/navigation";
import { formatSignalTime } from "@kinos/config";
import { withUser } from "@kinos/db";
import { requireUserId, getFamilyContext } from "@/lib/data/context";
import { listOrbits, type OrbitSummary } from "@/lib/data/orbits";
import { listOpenAttention } from "@/lib/data/attention";
import { listDuties } from "@/lib/data/duties";
import { listRecentSignals, listPatterns, describeSignal } from "@/lib/data/signals";
import { getFamilyRhythm, getTomorrowPrep } from "@/lib/data/operating";
import { MiniOrbit, type OrbitStatus } from "@/components/mini-orbit";
import {
  CalmEmpty,
  PaperBrief,
  RoomHeader,
  RoomSection,
  SignalRow,
  StatusWord,
} from "@/components/rooms";

/**
 * The Today Room — the first screen after sign-in. It answers, in five
 * seconds: is everyone okay, and what needs attention today? Hierarchy
 * is fixed: status → attention → duties → orbits → latest signals.
 * Deep detail is always one tap away, never on this surface.
 */

function dayPart(tz: string): { greeting: string; word: string; tone: string } {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(
      new Date(),
    ),
  );
  if (hour < 12)
    return { greeting: "Good morning", word: "today", tone: "Here is what needs attention today." };
  if (hour < 18)
    return { greeting: "Good afternoon", word: "this afternoon", tone: "Here is what changed." };
  return { greeting: "Good evening", word: "tonight", tone: "Here is where things stand tonight." };
}

function orbitStatus(orbit: OrbitSummary): OrbitStatus {
  if (orbit.status === "urgent") return "urgent";
  if (orbit.status === "attention") return "attention";
  const recent =
    orbit.lastCheckin && Date.now() - new Date(orbit.lastCheckin).getTime() < 2 * 3600_000;
  return recent ? "signal" : "steady";
}

function orbitLine(orbit: OrbitSummary): string {
  const parts: string[] = [];
  parts.push(
    orbit.lastCheckin
      ? `checked in ${formatSignalTime(new Date(orbit.lastCheckin).toISOString(), orbit.subject.timezone)}`
      : "no check-in yet today",
  );
  if (orbit.nextAppointment) {
    const when = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: orbit.subject.timezone,
    }).format(new Date(orbit.nextAppointment.starts_at));
    parts.push(`${orbit.nextAppointment.title} · ${when}`);
    if (!orbit.nextAppointment.transport_confirmed) parts.push("transport open");
  }
  return parts.join(" · ");
}

export default async function TodayRoomPage({
  searchParams,
}: {
  searchParams?: Promise<{ withings?: string }>;
}) {
  const withingsStatus = (await searchParams)?.withings;
  const userId = await requireUserId();
  const ctx = await getFamilyContext(userId);
  if (!ctx) redirect("/app/onboarding");

  const orbits = await listOrbits(userId);
  const tz = orbits[0]?.subject.timezone ?? "Africa/Harare";
  const day = dayPart(tz);
  const firstName = ctx.member.display_name?.split(" ")[0];

  // The person being cared for gets a big, simple home — never a dashboard.
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
        <div className="room-enter text-center">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-halo">
            {day.greeting}
          </span>
          <h1 className="mt-3 font-serif text-[38px] font-light leading-[1.15] text-ink">
            Hello{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-2 text-[17px] text-ink-soft">Your family is thinking of you.</p>
        </div>
        <Link
          href={`/app/orbits/${mine.subject.id}/check-in`}
          className="room-enter lift rounded-orbit bg-dusk px-8 py-7 text-center text-[22px] font-semibold text-white no-underline shadow-float hover:bg-dusk-2"
        >
          Check in for today
        </Link>
        <Link
          href={`/app/emergency?subject=${mine.subject.id}`}
          className="room-enter rounded-orbit border-2 border-urgent/50 bg-urgent-bg px-8 py-6 text-center text-[19px] font-semibold text-urgent no-underline"
        >
          I need the family now
        </Link>
        {myBrief && <PaperBrief meta="Today, in the family's words" body={myBrief} />}
      </div>
    );
  }

  const hourNow = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(
      new Date(),
    ),
  );
  const [attention, openDuties, signals, patterns, latestBrief, prep, rhythm] = await Promise.all([
    listOpenAttention(userId),
    listDuties(userId, "open"),
    listRecentSignals(userId, 8),
    listPatterns(userId, 3),
    withUser(userId, async (db) => {
      const res = await db.query(
        `select b.*, s.display_name as subject_name from daily_brief b
         join care_subject s on s.id = b.subject_id
         order by b.created_at desc limit 1`,
      );
      return res.rows[0] ?? null;
    }),
    getTomorrowPrep(userId),
    getFamilyRhythm(userId),
  ]);
  // Tomorrow steps forward in the afternoon — or the moment it has a gap.
  const prepVisible = prep.filter((p) => !p.prep.ready || p.prep.plan.length > 0);
  const showPrep = hourNow >= 15 ? prepVisible : prepVisible.filter((p) => !p.prep.ready);

  // The five-second answer, computed from the family's real state.
  const steady = attention.length === 0;
  const names = orbits.map((o) => o.subject.display_name);
  const headline =
    orbits.length === 0
      ? "Your first Orbit is waiting."
      : steady
        ? names.length === 1
          ? `${names[0]} is steady ${day.word}.`
          : `Everyone is steady ${day.word}.`
        : attention.length === 1
          ? `One thing needs the family ${day.word}.`
          : `${attention.length} things need the family ${day.word}.`;
  const subline =
    orbits.length === 0
      ? "Add the person at the centre of the family's care, and the sky starts watching."
      : steady
        ? `Nothing needs attention. ${day.tone}`
        : attention[0]!.title;

  const now = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date());

  const topDuties = openDuties.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room={`Today · ${ctx.workspace.name}`}
        meta={now}
        headline={
          <>
            {day.greeting}
            {firstName ? `, ${firstName}` : ""}.{" "}
            <span className="text-ink-soft">{headline}</span>
          </>
        }
        sub={subline}
      />

      {withingsStatus && (
        <div
          className={`room-enter rounded-card border px-4 py-3 text-[13px] ${
            withingsStatus === "connected"
              ? "border-calm-text/25 bg-calm-soft text-calm-text"
              : "border-line bg-paper-2 text-ink-soft"
          }`}
        >
          {withingsStatus === "connected"
            ? "Device linked. Readings will arrive on their own — the family only hears when something is worth a check."
            : withingsStatus === "declined"
              ? "The device link was cancelled. Nothing was connected."
              : "The device link didn't finish. Try again from the orbit page."}
        </div>
      )}

      {orbits.length === 0 && (
        <CalmEmpty
          title="The room is ready — it just needs its first person."
          hint="An Orbit is a loved one at the centre of the family's care: a parent, a child, someone recovering."
          action={
            <Link
              href="/app/onboarding"
              className="lift inline-block rounded-pill bg-white px-5 py-2.5 text-[13.5px] font-semibold text-dusk no-underline"
            >
              Add a loved one
            </Link>
          }
        />
      )}

      {/* ——— attention, first and honest ——— */}
      {attention.length > 0 && (
        <RoomSection title="Attention needed" delay={60}>
          <div className="flex flex-col gap-2.5">
            {attention.slice(0, 3).map((event) => (
              <Link
                key={event.id}
                href="/app/attention"
                className="group flex items-center gap-3.5 rounded-card border border-ember-soft bg-attn-bg px-4 py-3.5 no-underline transition-colors hover:border-ember/50"
              >
                <span className="orbit-pulse h-2 w-2 flex-none rounded-full bg-ember shadow-[0_0_10px_rgba(217,138,61,.6)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium leading-snug text-ink">
                    {event.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10.5px] text-ink-faint">
                    {event.subject_name}
                    {event.owner_name ? ` · ${event.owner_name} holds it` : " · unowned"}
                    {event.escalate_at
                      ? ` · escalates ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(event.escalate_at))}`
                      : ""}
                  </span>
                </span>
                <span className="flex-none font-mono text-[11px] text-ember-text transition-transform duration-300 group-hover:translate-x-0.5">
                  open →
                </span>
              </Link>
            ))}
          </div>
        </RoomSection>
      )}

      {/* ——— the day, in the family's words ——— */}
      {latestBrief && (
        <PaperBrief
          meta={`Daily Brief · ${latestBrief.subject_name} · ${latestBrief.kind}`}
          body={latestBrief.body as string}
          action={
            <Link
              href={`/app/orbits/${latestBrief.subject_id}`}
              className="rounded-pill bg-dusk px-3.5 py-2 text-[12.5px] font-medium text-white no-underline hover:bg-dusk-2"
            >
              Open {latestBrief.subject_name}&apos;s Orbit
            </Link>
          }
        />
      )}

      {/* ——— tomorrow, checked while there's still evening left ——— */}
      {showPrep.length > 0 && (
        <RoomSection title="Tomorrow" delay={90}>
          <div className="flex flex-col gap-4">
            {showPrep.map((p) => (
              <div key={p.subjectId} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <p className="flex flex-wrap items-center gap-2 font-serif text-[16.5px] font-light leading-snug text-ink">
                  <span
                    aria-hidden
                    className={`inline-block h-[7px] w-[7px] rounded-full ${
                      p.prep.ready
                        ? "bg-calm-text/80"
                        : "bg-ember shadow-[0_0_8px_rgba(217,138,61,.55)]"
                    }`}
                  />
                  {p.prep.headline}
                </p>
                {p.prep.gaps.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1 pl-4">
                    {p.prep.gaps.map((gap) => (
                      <li key={gap} className="list-disc text-[13.5px] leading-relaxed text-ink-soft">
                        <Link href={`/app/orbits/${p.subjectId}`} className="text-ink-soft no-underline hover:text-ink">
                          {gap}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {p.prep.gaps.length === 0 && p.prep.plan.length > 0 && (
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
                    {p.prep.plan.join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </RoomSection>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* ——— the orbits: each loved one, at a glance ——— */}
        <div className="flex flex-col gap-3">
          {orbits.map((orbit, i) => {
            const status = orbitStatus(orbit);
            return (
              <Link
                key={orbit.subject.id}
                href={`/app/orbits/${orbit.subject.id}`}
                className="room-enter lift group flex items-center gap-4 rounded-orbit border border-line bg-paper-2 p-4 no-underline shadow-card md:p-5"
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <MiniOrbit status={status} size={58} seed={i} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2.5">
                    <span className="font-serif text-[19px] font-normal text-ink">
                      {orbit.subject.display_name}
                    </span>
                    <StatusWord status={status} />
                  </span>
                  <span className="mt-1 block truncate font-mono text-[11px] leading-relaxed text-ink-faint">
                    {orbitLine(orbit)}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {orbit.dosesToday.taken > 0 && (
                      <span className="rounded-pill border border-calm-soft px-2 py-0.5 font-mono text-[10px] text-calm-text">
                        doses ✓ {orbit.dosesToday.taken}
                      </span>
                    )}
                    {orbit.openDuties > 0 && (
                      <span className="rounded-pill border border-line-2 px-2 py-0.5 font-mono text-[10px] text-ink-soft">
                        {orbit.openDuties} dut{orbit.openDuties === 1 ? "y" : "ies"}
                      </span>
                    )}
                    {orbit.openAttention > 0 && (
                      <span className="rounded-pill border border-ember-soft px-2 py-0.5 font-mono text-[10px] text-ember-text">
                        {orbit.openAttention} needs attention
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex-none text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-6">
          {/* ——— today's duties, top three only ——— */}
          <RoomSection
            title="Today's duties"
            delay={160}
            action={
              <Link href="/app/duties" className="font-mono text-[11px] text-halo no-underline hover:text-ink">
                all duties →
              </Link>
            }
          >
            {topDuties.length === 0 ? (
              <p className="py-1 text-[13.5px] leading-relaxed text-ink-soft">
                Nothing is waiting on anyone. The list is clear.
              </p>
            ) : (
              <div className="flex flex-col">
                {topDuties.map((duty) => (
                  <div key={duty.id} className="flex items-baseline gap-3 border-t border-line py-2.5 first:border-t-0">
                    <span
                      aria-hidden
                      className={`relative top-[-2px] h-[6px] w-[6px] flex-none rounded-full ${duty.status === "late" || duty.priority === "high" ? "bg-ember" : "bg-halo"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-snug text-ink">{duty.title}</span>
                      <span className="mt-0.5 block font-mono text-[10.5px] text-ink-faint">
                        {duty.owner_name ?? "unassigned"}
                        {duty.due_at
                          ? ` · due ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(duty.due_at))}`
                          : ""}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </RoomSection>

          {/* ——— patterns: noticed gently, over weeks ——— */}
          {patterns.length > 0 && (
            <RoomSection title="Patterns · gentle, over weeks" delay={190}>
              <div className="flex flex-col gap-3">
                {patterns.map((p) => (
                  <p key={p.id} className="border-t border-line pt-3 font-serif text-[15.5px] font-light leading-relaxed text-ink first:border-t-0 first:pt-0">
                    {p.summary}
                    <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">
                      {p.subject_name} · against their own rhythm, never a rulebook
                    </span>
                  </p>
                ))}
              </div>
            </RoomSection>
          )}

          {/* ——— the family's rhythm: the usual, said out loud ——— */}
          {rhythm.length > 0 && (
            <RoomSection title="Family rhythm" delay={205}>
              <div className="flex flex-col gap-2.5">
                {rhythm.flatMap((r) =>
                  r.lines.slice(0, 2).map((line) => (
                    <p
                      key={`${r.subjectId}:${line.topic}`}
                      className="border-t border-line pt-2.5 text-[13.5px] leading-relaxed text-ink-soft first:border-t-0 first:pt-0"
                    >
                      {line.state === "shifting" && (
                        <span
                          aria-hidden
                          className="mr-2 inline-block h-[6px] w-[6px] rounded-full bg-ember/80 align-middle"
                        />
                      )}
                      {line.text}
                    </p>
                  )),
                )}
              </div>
            </RoomSection>
          )}

          {/* ——— latest life signals, quiet mono rows ——— */}
          <RoomSection
            title="Latest life signals"
            delay={220}
            action={
              <Link href="/app/signals" className="font-mono text-[11px] text-halo no-underline hover:text-ink">
                all signals →
              </Link>
            }
          >
            {signals.length === 0 ? (
              <p className="py-1 text-[13.5px] leading-relaxed text-ink-soft">
                The first check-in, note or receipt will appear here.
              </p>
            ) : (
              <div className="flex flex-col">
                {signals.slice(0, 6).map((s) => {
                  const d = describeSignal(s);
                  return (
                    <SignalRow
                      key={s.id}
                      time={new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(s.occurred_at))}
                      text={d.text}
                      tone={d.tone}
                    />
                  );
                })}
              </div>
            )}
          </RoomSection>
        </div>
      </div>
    </div>
  );
}
