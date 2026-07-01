import Link from "next/link";
import { redirect } from "next/navigation";

// The family space is always rendered per-request: it depends on the
// session cookie and live signals, never on build-time state.
export const dynamic = "force-dynamic";
import { OrbitMark, Wordmark } from "@kinos/ui";
import { isDatabaseConfigured } from "@kinos/db";
import { AppNav } from "@/components/app-nav";
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
    { href: "/app", label: "Orbit View" },
    { href: "/app/attention", label: "Attention Needed", badge: attentionCount || undefined },
    { href: "/app/duties", label: "Duties" },
    { href: "/app/money", label: "Money Pot" },
    { href: "/app/record", label: "Family Record" },
    { href: "/app/emergency", label: "Emergency" },
    { href: "/app/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <AutoRefresh seconds={45} />
      <RegisterServiceWorker />
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-[58px] max-w-[1200px] items-center justify-between px-5">
          <Link href="/app" className="flex items-center gap-2.5 no-underline">
            <OrbitMark size={22} attention={anyAttention} className="text-dusk" />
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
