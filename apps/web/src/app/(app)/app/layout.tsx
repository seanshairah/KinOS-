import Link from "next/link";
import { redirect } from "next/navigation";

// The family space is always rendered per-request: it depends on the
// session cookie and live signals, never on build-time state.
export const dynamic = "force-dynamic";
import { OrbitMark, Wordmark } from "@kinos/ui";
import { getPool, isDatabaseConfigured } from "@kinos/db";
import { LOCALE_META } from "@kinos/config";
import { AppNav } from "@/components/app-nav";
import { DuskField } from "@/components/dusk-field";
import { AutoRefresh } from "@/components/auto-refresh";
import { RegisterServiceWorker } from "@/components/register-sw";
import { HtmlLang } from "@/components/html-lang";
import { currentUserId, signOut } from "@/lib/auth";
import { getFamilyContext } from "@/lib/data/context";
import { getComfort, getT } from "@/lib/i18n";
import { countOpenAttention } from "@/lib/data/attention";
import { withUser } from "@kinos/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isDatabaseConfigured()) redirect("/setup");
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");

  const ctx = await getFamilyContext(userId);
  const attentionCount = ctx ? await countOpenAttention(userId) : 0;
  const anyAttention = attentionCount > 0;
  const { locale, t } = await getT();
  const comfort = await getComfort();

  // A wandering visitor sees everything and can touch nothing —
  // the database enforces it; this banner just says so, warmly.
  const visitor = await getPool().query(
    `select 1 from app_user where id = $1 and email = 'visitor@kinos.family'`,
    [userId],
  );
  const isVisitor = Boolean(visitor.rows[0]);

  const unread = ctx
    ? await withUser(userId, async (db) => {
        const res = await db.query(
          `select count(*)::int as n from notification where read_at is null and channel = 'in_app'`,
        );
        return (res.rows[0]?.n as number) ?? 0;
      })
    : 0;

  const isCarer = ctx && ["caregiver", "admin"].includes(ctx.member.role);
  const items = [
    { href: "/app", label: t("nav.today") },
    { href: "/app/attention", label: t("nav.attention"), badge: attentionCount || undefined },
    { href: "/app/duties", label: t("nav.duties") },
    { href: "/app/signals", label: t("nav.signals") },
    { href: "/app/money", label: t("nav.money") },
    { href: "/app/record", label: t("nav.record") },
    ...(isCarer ? [{ href: "/app/care", label: t("nav.care") }] : []),
    { href: "/app/consent", label: t("nav.consent") },
    { href: "/app/emergency", label: t("nav.emergency") },
    { href: "/app/notifications", label: t("nav.notifications"), badge: unread || undefined },
    { href: "/app/settings", label: t("nav.admin") },
  ];

  return (
    <div className={`${comfort ? "comfort " : ""}theme-dusk relative min-h-screen text-ink`}>
      <HtmlLang lang={LOCALE_META[locale].htmlLang} />
      {/* the same night the story ends in — the family space lives there */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(110% 70% at 82% -10%, rgba(140,138,214,.28), transparent 55%)," +
            "radial-gradient(80% 60% at 6% 110%, rgba(217,138,61,.08), transparent 60%)," +
            "linear-gradient(180deg, #34315c 0%, #2c2a4f 46%, #262449 100%)",
        }}
      >
        <DuskField density={64} />
      </div>

      <AutoRefresh seconds={45} />
      <RegisterServiceWorker />
      <header className="sticky top-0 z-40 border-b border-line bg-[#2c2a4f]/70 backdrop-blur-md">
        <div className="mx-auto flex h-[58px] max-w-[1200px] items-center justify-between px-5">
          <Link href="/app" className="flex items-center gap-2.5 text-ink no-underline">
            <OrbitMark size={22} attention={anyAttention} className="text-halo" />
            <Wordmark size={16} />
          </Link>
          <div className="flex items-center gap-4">
            {ctx && (
              <span className="hidden font-mono text-[11px] tracking-[0.06em] text-ink-faint sm:block">
                {ctx.workspace.name}
              </span>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="rounded-pill border border-line bg-paper-3 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {isVisitor && (
        <div className="relative z-30 border-b border-halo/20 bg-halo/[.08]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-1.5 px-5 py-2.5">
            <p className="text-[12.5px] text-ink-soft">
              <span className="mr-2 inline-block h-[6px] w-[6px] rounded-full bg-halo align-middle shadow-[0_0_8px_rgba(169,167,224,.8)]" />
              You&apos;re wandering a living demo family. Look anywhere — nothing here can be
              changed.
            </p>
            <Link
              href="/sign-in"
              className="rounded-pill bg-white px-3.5 py-1.5 text-[12px] font-semibold text-dusk no-underline"
            >
              Start your own family space →
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-6 md:flex-row">
        <aside className="md:w-[210px] md:flex-none">
          <div className="overflow-x-auto md:sticky md:top-[76px]">
            <AppNav items={items} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
