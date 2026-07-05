import Link from "next/link";
import { redirect } from "next/navigation";
import { withUser } from "@kinos/db";
import type { NotificationRow } from "@kinos/db";
import { markNotificationsReadAction } from "@/lib/actions/notifications";
import { requireUserId, getFamilyContext } from "@/lib/data/context";
import { CalmEmpty, RoomHeader } from "@/components/rooms";

/**
 * Notifications — the family's doorbell log. Everything that reached out
 * to you, quietly listed; urgent things carry the ember, everything else
 * stays calm. Reading here marks the room visited.
 */
export default async function NotificationsPage() {
  const userId = await requireUserId();
  const ctx = await getFamilyContext(userId);
  if (!ctx) redirect("/app/onboarding");

  const notifications = await withUser(userId, async (db) => {
    const res = await db.query(
      `select * from notification where channel = 'in_app'
       order by sent_at desc limit 60`,
    );
    return res.rows as NotificationRow[];
  });
  const unread = notifications.filter((n) => !n.read_at).length;
  const tz = "Africa/Harare";
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room="Notifications"
        meta={unread ? `${unread} unread` : "all read"}
        headline={
          <>
            What reached out to you.{" "}
            <span className="text-ink-soft">
              {unread === 0 ? "Nothing is waiting." : "A few things asked for you."}
            </span>
          </>
        }
        sub="Duties assigned, receipts uploaded, checks answered — the quiet record of the family talking to you."
      />

      {unread > 0 && (
        <form action={markNotificationsReadAction}>
          <button className="rounded-pill border border-line bg-paper-3 px-4 py-2 text-[12.5px] font-medium text-ink-soft hover:text-ink">
            Mark everything read
          </button>
        </form>
      )}

      {notifications.length === 0 ? (
        <CalmEmpty
          title="Nothing has needed your attention yet."
          hint="When a duty is assigned to you, a receipt arrives, or a check is answered, it lands here."
        />
      ) : (
        <div className="room-enter rounded-orbit border border-line bg-paper-2 shadow-card">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link ?? "/app"}
              className="group flex items-start gap-3.5 border-t border-line px-5 py-3.5 no-underline first:border-t-0"
            >
              <span
                aria-hidden
                className={`relative top-[7px] h-[7px] w-[7px] flex-none rounded-full ${
                  n.priority === "urgent"
                    ? "bg-urgent shadow-[0_0_10px_rgba(200,90,90,.6)]"
                    : n.read_at
                      ? "bg-line-2"
                      : "bg-halo shadow-[0_0_8px_rgba(169,167,224,.7)]"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[14px] leading-snug ${n.read_at ? "text-ink-soft" : "font-medium text-ink"}`}
                >
                  {n.title}
                </span>
                {n.body && (
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-faint">
                    {n.body}
                  </span>
                )}
                <span className="mt-1 block font-mono text-[10px] text-ink-faint">
                  {when(n.sent_at)}
                </span>
              </span>
              <span className="flex-none pt-1 font-mono text-[11px] text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
