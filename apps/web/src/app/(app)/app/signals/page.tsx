import { requireFamilyContext } from "@/lib/data/context";
import { listRecentSignals, describeSignal } from "@/lib/data/signals";
import { CalmEmpty, RoomHeader, RoomSection } from "@/components/rooms";

/**
 * The Signals Room — what changed, newest first. The engine view of
 * KinOS, kept human: mono for time and metadata, family words for the
 * event itself. Each signal expands to show its source, its person,
 * and who can see it. Never a developer log.
 */

const PRIVACY_LABEL: Record<string, string> = {
  family: "the whole family",
  caregiver_visible: "family + caregivers",
  medical_private: "health access only",
  private: "the person themselves",
};

const SOURCE_LABEL: Record<string, string> = {
  manual_checkin: "check-in",
  receipt_scan: "receipt",
  voice_note: "voice note",
  manual_metric: "logged rhythm",
  duty_update: "duty",
  system: "the system",
};

const TONE_DOT: Record<string, string> = {
  ember: "#D98A3D",
  calm: "#4E9E7E",
  halo: "#A9A7E0",
};

function dayLabel(iso: string, tz: string): string {
  const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: tz });
  const target = day.format(new Date(iso));
  if (target === day.format(new Date())) return "Today";
  if (target === day.format(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return target;
}

export default async function SignalsRoomPage() {
  const ctx = await requireFamilyContext();
  const signals = await listRecentSignals(ctx.userId, 60);
  const tz = "Africa/Harare";

  // group by day so the room reads as a diary, not a feed
  const groups: { label: string; items: typeof signals }[] = [];
  for (const s of signals) {
    const label = dayLabel(s.occurred_at, tz);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(s);
    else groups.push({ label, items: [s] });
  }

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room="Life Signals"
        meta={`${signals.length} recent`}
        headline={
          signals.length === 0
            ? "The family's day will gather here."
            : "Everything that changed, in the family's words."
        }
        sub="Check-ins, voice notes, receipts, doses, duties — each one kept with who saw it and who may see it."
      />

      {signals.length === 0 ? (
        <CalmEmpty
          title="No signals yet — and that's fine."
          hint="The first check-in, voice note or receipt starts the family's living record."
        />
      ) : (
        groups.map((group, gi) => (
          <RoomSection key={group.label} title={group.label} delay={60 + gi * 60}>
            <div className="flex flex-col">
              {group.items.map((s) => {
                const d = describeSignal(s);
                return (
                  <details key={s.id} className="group border-t border-line first:border-t-0">
                    <summary className="flex cursor-pointer list-none items-baseline gap-3 py-2.5 [&::-webkit-details-marker]:hidden">
                      <span
                        aria-hidden
                        className="relative top-[-2px] h-[6px] w-[6px] flex-none rounded-full"
                        style={{ background: TONE_DOT[d.tone], boxShadow: `0 0 8px ${TONE_DOT[d.tone]}66` }}
                      />
                      <span className="flex-none font-mono text-[11px] text-ink-faint">
                        {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(s.occurred_at))}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">
                        {d.text}
                      </span>
                      <span className="flex-none font-mono text-[11px] text-ink-faint transition-transform duration-300 group-open:rotate-90">
                        ›
                      </span>
                    </summary>
                    <div className="mb-3 ml-[52px] flex flex-col gap-1 rounded-card border border-line bg-paper-3 px-4 py-3">
                      <Row k="about" v={s.subject_name} />
                      {s.member_name && <Row k="from" v={s.member_name} />}
                      {s.source && <Row k="came in as" v={SOURCE_LABEL[s.source] ?? s.source.replaceAll("_", " ")} />}
                      <Row k="visible to" v={PRIVACY_LABEL[s.privacy_level] ?? s.privacy_level} />
                    </div>
                  </details>
                );
              })}
            </div>
          </RoomSection>
        ))
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 text-[12.5px]">
      <span className="w-24 flex-none font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">
        {k}
      </span>
      <span className="text-ink-soft">{v}</span>
    </div>
  );
}
