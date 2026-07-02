import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow, Panel } from "@kinos/ui";
import { CalmEmpty } from "@/components/rooms";
import { requireFamilyContext } from "@/lib/data/context";
import { getOrbitTimeline, type TimelineTone } from "@/lib/data/timeline";

/**
 * The story so far — one person's record, day by day. Every viewer sees
 * their own consented version of the same timeline; RLS decides, not this
 * page.
 */

const TONE_TEXT: Record<TimelineTone, string> = {
  calm: "text-ink",
  ember: "text-ember-text",
  halo: "text-ink-soft",
  paper: "text-ink",
};

export default async function OrbitTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireFamilyContext();
  const timeline = await getOrbitTimeline(ctx.userId, id);
  if (!timeline) notFound();

  const { subject, days, total } = timeline;

  return (
    <div className="flex flex-col gap-6">
      <section className="room-enter relative overflow-hidden rounded-orbit border border-line bg-paper-2 p-6 shadow-card md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 100% at 85% 0%, rgba(140,138,214,.14), transparent 60%)",
          }}
        />
        <div className="relative">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-halo">
            {subject.display_name}&apos;s Orbit · the story so far
          </span>
          <h1 className="mt-3 font-serif text-[clamp(28px,4vw,38px)] font-light leading-[1.1] tracking-[-0.01em] text-ink">
            Thirty days, kept.
          </h1>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink-soft">
            Check-ins, quiet notes, things settled and things done — the record the
            family never has to scroll a group chat to find.
          </p>
          <Link
            href={`/app/orbits/${subject.id}`}
            className="mt-4 inline-block font-mono text-[11.5px] uppercase tracking-[0.14em] text-dusk-2 no-underline hover:text-ink"
          >
            ← back to the orbit
          </Link>
        </div>
      </section>

      {total === 0 ? (
        <Panel>
          <CalmEmpty
            title="The story starts with a first signal."
            hint="Once check-ins, notes, and duties begin, this page becomes the family's memory of the month."
            action={
              <Link
                href={`/app/orbits/${subject.id}/check-in`}
                className="lift rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk no-underline"
              >
                Do the first check-in
              </Link>
            }
          />
        </Panel>
      ) : (
        days.map((day) => (
          <Panel key={day.key} className="room-enter">
            <Eyebrow>{day.label}</Eyebrow>
            <div className="mt-3 flex flex-col">
              {day.entries.map((entry, i) => (
                <div
                  key={`${entry.at}-${i}`}
                  className={
                    entry.tone === "paper"
                      ? "mt-3 rounded-card border border-line bg-paper-3 p-4 first:mt-0"
                      : "flex items-baseline gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0"
                  }
                >
                  {entry.tone === "paper" ? (
                    <>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-faint">
                        {entry.kind} ·{" "}
                        {new Intl.DateTimeFormat("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: subject.timezone,
                        }).format(new Date(entry.at))}
                      </span>
                      <p className="mt-2 font-serif text-[16px] leading-relaxed text-ink">
                        {entry.text}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="w-[46px] shrink-0 font-mono text-[11px] text-ink-faint">
                        {new Intl.DateTimeFormat("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: subject.timezone,
                        }).format(new Date(entry.at))}
                      </span>
                      <span className="w-[86px] shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
                        {entry.kind}
                      </span>
                      <span className={`text-[14px] leading-relaxed ${TONE_TEXT[entry.tone]}`}>
                        {entry.text}
                        {entry.detail && (
                          <span className="block font-mono text-[11px] text-ink-faint">
                            {entry.detail}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        ))
      )}
    </div>
  );
}
