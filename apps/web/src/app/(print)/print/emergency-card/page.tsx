import { notFound } from "next/navigation";
import { withUser } from "@kinos/db";
import { requireFamilyContext } from "@/lib/data/context";
import { getEmergencyView } from "@/lib/data/consent";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

/**
 * The fridge card. Everything a stranger needs in the worst ten minutes —
 * conditions, allergies, medication, who to call — on one ink-friendly
 * sheet. Zero new data: it renders exactly what the Emergency Layer holds,
 * under the same RLS the screen version uses. Print it, fold it, stick it
 * where help will look.
 */
export default async function EmergencyCardPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: subjectId } = await searchParams;
  const ctx = await requireFamilyContext();

  const subject = await withUser(ctx.userId, async (db) => {
    const res = subjectId
      ? await db.query(`select * from care_subject where id = $1`, [subjectId])
      : await db.query(`select * from care_subject order by created_at asc limit 1`);
    return res.rows[0] ?? null;
  });
  if (!subject) notFound();

  const view = await getEmergencyView(ctx.userId, subject.id);
  const family = await withUser(ctx.userId, async (db) => {
    const res = await db.query(
      `select display_name, role, phone from family_member
       where workspace_id = $1 and phone is not null
       order by case role when 'admin' then 0 when 'emergency' then 1 else 2 end,
                display_name`,
      [subject.workspace_id],
    );
    return res.rows as { display_name: string | null; role: string; phone: string }[];
  });

  const profile = view.profile;
  const generated = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="mx-auto max-w-[720px] px-8 py-10 font-serif text-black print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 18mm; }`}</style>

      {/* screen-only helper bar */}
      <div className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 font-sans print:hidden">
        <p className="text-[13.5px] leading-relaxed text-neutral-600">
          Print this, fold it, and put it where help would look — the fridge
          door, a wallet, the hallway drawer.
        </p>
        <PrintButton />
      </div>

      <header className="border-b-2 border-black pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-500">
          In an emergency — about
        </p>
        <h1 className="mt-1 text-[40px] leading-tight tracking-[-0.01em]">
          {subject.display_name}
        </h1>
        <p className="mt-1 font-sans text-[13px] text-neutral-600">
          Call local emergency services first. Then call the people below.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-x-10 gap-y-6 font-sans text-[14px] leading-relaxed">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            Blood type
          </h2>
          <p className="mt-1 text-[22px] font-semibold">
            {profile?.blood_type || "Not recorded"}
          </p>
        </div>
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            Allergies
          </h2>
          {profile?.allergies?.length ? (
            <p className="mt-1 text-[16px] font-semibold">{profile.allergies.join(" · ")}</p>
          ) : (
            <p className="mt-1 text-neutral-500">None recorded</p>
          )}
        </div>
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            Conditions
          </h2>
          {profile?.conditions?.length ? (
            <ul className="mt-1 list-none">
              {profile.conditions.map((c: string) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-neutral-500">None recorded</p>
          )}
        </div>
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            Medication
          </h2>
          {profile?.medications?.length ? (
            <ul className="mt-1 list-none">
              {profile.medications.map((m: string) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-neutral-500">None recorded</p>
          )}
        </div>
      </section>

      {profile?.instructions && (
        <section className="mt-6 rounded-lg border-2 border-black p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            Please know
          </h2>
          <p className="mt-1 font-sans text-[15px] leading-relaxed">{profile.instructions}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="border-b border-black pb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
          Who to call
        </h2>
        <table className="mt-2 w-full font-sans text-[15px]" style={{ borderCollapse: "collapse" }}>
          <tbody>
            {view.contacts.map((c) => (
              <tr key={c.id} className="border-b border-neutral-200">
                <td className="py-2 pr-4 font-semibold">{c.name}</td>
                <td className="py-2 pr-4 text-neutral-600">{c.relationship ?? "family"}</td>
                <td className="py-2 font-mono text-[14px]">{c.phone}</td>
              </tr>
            ))}
            {family.map((m) => (
              <tr key={`${m.display_name}-${m.phone}`} className="border-b border-neutral-200">
                <td className="py-2 pr-4 font-semibold">{m.display_name ?? "Family member"}</td>
                <td className="py-2 pr-4 text-neutral-600">
                  {m.role === "admin" ? "family admin" : m.role}
                </td>
                <td className="py-2 font-mono text-[14px]">{m.phone}</td>
              </tr>
            ))}
            {view.contacts.length === 0 && family.length === 0 && (
              <tr>
                <td className="py-2 text-neutral-500" colSpan={3}>
                  No contacts recorded yet — add them in the Emergency Layer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <footer className="mt-10 flex items-center justify-between border-t border-neutral-300 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
        <span>Kept current at kinos.family</span>
        <span>Printed {generated}</span>
      </footer>
    </main>
  );
}
