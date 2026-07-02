import Link from "next/link";
import { redirect } from "next/navigation";

// The family space is always rendered per-request: it depends on the
// session cookie and live signals, never on build-time state.
export const dynamic = "force-dynamic";
import { OrbitMark, Wordmark } from "@kinos/ui";
import { isDatabaseConfigured } from "@kinos/db";
import { AppNav } from "@/components/app-nav";
import { DuskField } from "@/components/dusk-field";
import { AutoRefresh } from "@/components/auto-refresh";
import { RegisterServiceWorker } from "@/components/register-sw";
import { currentUserId, signOut } from "@/lib/auth";
import { getFamilyContext } from "@/lib/data/context";
import { countOpenAttention } from "@/lib/data/attention";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isDatabaseConfigured()) redirect("/setup");
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");

  const ctx = await getFamilyContext(userId);
  const attentionCount = ctx ? await countOpenAttention(userId) : 0;
  const anyAttention = attentionCount > 0;

  const items = [
    { href: "/app", label: "Today" },
    { href: "/app/attention", label: "Attention Needed", badge: attentionCount || undefined },
    { href: "/app/duties", label: "Duties" },
    { href: "/app/signals", label: "Life Signals" },
    { href: "/app/money", label: "Money Pot" },
    { href: "/app/record", label: "Family Record" },
    { href: "/app/emergency", label: "Emergency" },
    { href: "/app/settings", label: "Admin" },
  ];

  return (
    <div className="theme-dusk relative min-h-screen text-ink">
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
