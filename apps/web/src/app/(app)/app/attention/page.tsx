import {
  resolveAttentionForm,
} from "@/lib/actions/forms";
import { AttentionItem, EmptyState, Eyebrow } from "@kinos/ui";

import { requireFamilyContext } from "@/lib/data/context";
import { listOpenAttention } from "@/lib/data/attention";

export default async function AttentionPage() {
  const ctx = await requireFamilyContext();
  const events = await listOpenAttention(ctx.userId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <div>
          <Eyebrow>Attention Needed</Eyebrow>
          <h1 className="mt-1 font-serif text-[28px] tracking-[-0.01em]">
            {events.length === 0
              ? "All quiet."
              : `${events.length} thing${events.length === 1 ? "" : "s"} that can't wait`}
          </h1>
        </div>
        <span className="font-mono text-[11px] text-ink-faint">{events.length} open</span>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="Nothing needs attention right now."
          hint="When something genuinely can't be ignored — a missed dose, unconfirmed transport, a bill — it appears here with an owner and a one-tap resolution."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <AttentionItem
              key={event.id}
              title={event.title}
              detail={`${event.subject_name}${event.detail ? ` · ${event.detail}` : ""}`}
              owner={
                event.owner_name
                  ? `owner: ${event.owner_name}${event.escalate_at ? ` · escalates ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.escalate_at))}` : ""}`
                  : undefined
              }
              urgent={event.severity === "urgent"}
              action={
                <div className="flex flex-none flex-col gap-2">
                  <form action={resolveAttentionForm}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="mode" value="resolved" />
                    <button className="w-full rounded-pill bg-dusk px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-dusk-2">
                      Handled
                    </button>
                  </form>
                  <form action={resolveAttentionForm}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="mode" value="snoozed" />
                    <button className="w-full rounded-pill border border-line bg-paper-3 px-3.5 py-1.5 text-[12px] font-medium text-ink-soft hover:text-ink">
                      Later today
                    </button>
                  </form>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
