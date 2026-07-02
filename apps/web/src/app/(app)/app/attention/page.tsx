import { resolveAttentionForm } from "@/lib/actions/forms";
import { requireFamilyContext } from "@/lib/data/context";
import { listOpenAttention } from "@/lib/data/attention";
import { CalmEmpty, RoomHeader } from "@/components/rooms";

/**
 * The Attention Room — the most focused surface in the product. Only
 * what genuinely cannot be ignored, each with an owner, an escalation
 * time, and a one-tap resolution. Ember-soft, never a siren; red is
 * reserved for manually raised emergencies.
 */

export default async function AttentionRoomPage() {
  const ctx = await requireFamilyContext();
  const events = await listOpenAttention(ctx.userId);
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room="Attention Needed"
        meta={`${events.length} open`}
        headline={
          events.length === 0
            ? "All quiet. Nothing needs anyone."
            : events.length === 1
              ? "One thing can't wait."
              : `${events.length} things can't wait.`
        }
        sub={
          events.length === 0
            ? undefined
            : "Each one has an owner and a calm way to settle it. Handle it, or let it wait until later today."
        }
      />

      {events.length === 0 ? (
        <CalmEmpty
          title="Nothing needs attention right now."
          hint="When something genuinely can't be ignored — a missed dose, unconfirmed transport, a bill — it appears here with an owner and a one-tap resolution."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event, i) => {
            const urgent = event.severity === "urgent";
            return (
              <div
                key={event.id}
                className={`room-enter relative overflow-hidden rounded-orbit border p-5 shadow-card ${
                  urgent ? "border-urgent/40 bg-urgent-bg" : "border-ember-soft bg-attn-bg"
                }`}
                style={{ animationDelay: `${60 + i * 70}ms` }}
              >
                {/* the ember edge — attention has a colour, not an alarm */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px]"
                  style={{
                    background: urgent ? "#C25642" : "#D98A3D",
                    boxShadow: `0 0 14px ${urgent ? "rgba(194,86,66,.6)" : "rgba(217,138,61,.55)"}`,
                  }}
                />
                <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`orbit-pulse h-2 w-2 flex-none rounded-full ${urgent ? "bg-urgent" : "bg-ember"}`}
                      />
                      <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${urgent ? "text-urgent" : "text-ember-text"}`}>
                        {urgent ? "act now" : "attention needed"}
                      </span>
                    </div>
                    <h2 className="mt-2 font-serif text-[20px] font-normal leading-snug text-ink">
                      {event.title}
                    </h2>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
                      {event.subject_name}
                      {event.detail ? ` · ${event.detail}` : ""}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-ink-faint">
                      {event.owner_name ? `${event.owner_name} holds this` : "no one holds this yet"}
                      {event.escalate_at
                        ? ` · escalates ${fmt.format(new Date(event.escalate_at))}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-none flex-col gap-2">
                    <form action={resolveAttentionForm}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="mode" value="resolved" />
                      <button className="lift w-full rounded-pill bg-dusk px-4 py-2 text-[12.5px] font-medium text-white hover:bg-dusk-2">
                        Handled
                      </button>
                    </form>
                    <form action={resolveAttentionForm}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="mode" value="snoozed" />
                      <button className="w-full rounded-pill border border-line-2 px-4 py-2 text-[12.5px] font-medium text-ink-soft hover:text-ink">
                        Later today
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
