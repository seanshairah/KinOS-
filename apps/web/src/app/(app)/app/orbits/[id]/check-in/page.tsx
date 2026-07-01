import { notFound, redirect } from "next/navigation";
import { withUser } from "@kinos/db";
import { Eyebrow, OrbitAvatar } from "@kinos/ui";
import { submitCheckinAction } from "@/lib/actions/signals";
import { requireFamilyContext } from "@/lib/data/context";

/**
 * The check-in — dead simple by design, sized for elderly hands.
 * Four big moods, one optional note, done.
 */

const MOODS = [
  { value: "good", label: "Doing well", emoji: "🌤" },
  { value: "okay", label: "Okay", emoji: "🌥" },
  { value: "low", label: "A little low", emoji: "🌦" },
  { value: "unwell", label: "Not feeling well", emoji: "🌧" },
] as const;

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireFamilyContext();
  const subject = await withUser(ctx.userId, async (db) => {
    const res = await db.query(`select * from care_subject where id = $1`, [id]);
    return res.rows[0] ?? null;
  });
  if (!subject) notFound();

  async function submit(formData: FormData) {
    "use server";
    const result = await submitCheckinAction(formData);
    if (result.ok) redirect(`/app/orbits/${id}`);
    redirect(`/app/orbits/${id}/check-in?error=1`);
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="flex items-center gap-4">
        <OrbitAvatar name={subject.display_name} size={52} />
        <div>
          <Eyebrow>Check-in</Eyebrow>
          <h1 className="mt-1 font-serif text-[30px] font-light leading-tight">
            How is {subject.display_name} today?
          </h1>
        </div>
      </div>

      <form action={submit} className="mt-8 flex flex-col gap-6">
        <input type="hidden" name="subjectId" value={subject.id} />

        <fieldset>
          <legend className="sr-only">How are they feeling?</legend>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map((mood) => (
              <label
                key={mood.value}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-orbit border border-line bg-paper-3 px-4 py-6 text-center shadow-card transition-colors has-[:checked]:border-dusk-2 has-[:checked]:bg-paper-2"
              >
                <input
                  type="radio"
                  name="mood"
                  value={mood.value}
                  required
                  className="sr-only"
                />
                <span aria-hidden className="text-[34px] leading-none">{mood.emoji}</span>
                <span className="text-[16px] font-medium text-ink">{mood.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Eaten today?
          </legend>
          <div className="flex gap-3">
            {[
              { value: "yes", label: "Yes, eaten" },
              { value: "no", label: "Not yet" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex-1 cursor-pointer rounded-card border border-line bg-paper-3 px-4 py-3.5 text-center text-[15px] font-medium has-[:checked]:border-dusk-2 has-[:checked]:bg-paper-2"
              >
                <input type="radio" name="ate" value={opt.value} className="sr-only" />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="note"
            className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint"
          >
            Anything to add? (optional)
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            placeholder="A few words is plenty."
            className="w-full rounded-card border border-line bg-paper-3 px-4 py-3 text-[16px] leading-relaxed placeholder:text-ink-faint focus:border-dusk-2"
          />
        </div>

        <button className="rounded-pill bg-dusk px-6 py-4 text-[17px] font-semibold text-white hover:bg-dusk-2">
          Send today&apos;s check-in
        </button>
      </form>
    </div>
  );
}
