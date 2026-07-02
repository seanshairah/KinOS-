import { addExpenseForm, contributeForm, createPotForm } from "@/lib/actions/forms";
import { formatMoney } from "@kinos/config";
import { requireFamilyContext } from "@/lib/data/context";
import { getPotDetail, listPots } from "@/lib/data/money";
import { listSubjects } from "@/lib/data/record";
import { CalmEmpty, RoomDrawer, RoomHeader, RoomSection } from "@/components/rooms";

/**
 * The Money Room — care money with memory and proof, never a bank app.
 * The balance is the headline; every movement links to a person, a
 * note, and where possible a receipt. Especially for families caring
 * across borders, this room is where trust lives.
 */

const inputClass =
  "rounded-card border border-line bg-[#211f42]/60 px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-halo/60 focus:outline-none";

export default async function MoneyRoomPage() {
  const ctx = await requireFamilyContext();
  const pots = await listPots(ctx.userId);
  const subjects = await listSubjects(ctx.userId);
  const detail = pots[0] ? await getPotDetail(ctx.userId, pots[0].id) : null;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const movement = detail
    ? [
        ...detail.contributions.map((c) => ({ ...c, kind: "in" as const })),
        ...detail.expenses.map((e) => ({ ...e, kind: "out" as const })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    : [];
  const thisWeek = movement.filter((m) => new Date(m.at).getTime() > weekAgo);

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader
        room="Money Pot"
        meta={detail ? `${detail.contributions.length} in · ${detail.expenses.length} out` : undefined}
        headline={
          detail
            ? `${formatMoney(Number(detail.pot.balance), detail.pot.currency)} is holding the care together.`
            : "Care money, with memory and proof."
        }
        sub={
          detail
            ? "Every contribution and every expense stays linked to the care it paid for — visible to the family, to the cent."
            : "Contributions in, expenses out — every receipt attached, every cent visible to the family."
        }
      />

      {pots.length === 0 || !detail ? (
        <>
          <CalmEmpty
            title="The family's care fund starts here."
            hint="One shared pot: who gave, what it paid for, and the receipt to prove it. No more 'where did the money go?'"
          />
          <RoomDrawer label="Create the pot">
            <form action={createPotForm} className="grid gap-2 sm:grid-cols-3">
              <input name="name" required placeholder="e.g. Mum's care fund" className={inputClass} />
              <select name="subjectId" className={inputClass} defaultValue="">
                <option value="">For the whole family</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    For {s.display_name}
                  </option>
                ))}
              </select>
              <select name="currency" className={inputClass} defaultValue="USD">
                {["USD", "ZWG", "ZAR", "GBP", "EUR"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button className="lift rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk sm:col-span-3 sm:justify-self-start">
                Create the pot
              </button>
            </form>
          </RoomDrawer>
        </>
      ) : (
        <>
          {/* ——— the balance, glowing quietly ——— */}
          <section className="room-enter relative overflow-hidden rounded-orbit border border-halo/25 bg-paper-2 p-6 shadow-float md:p-8" style={{ animationDelay: "60ms" }}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(70% 90% at 15% 0%, rgba(169,167,224,.14), transparent 60%), radial-gradient(50% 70% at 90% 100%, rgba(217,138,61,.07), transparent 60%)",
              }}
            />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-halo">
                  {detail.pot.name}
                </div>
                <div className="mt-2 font-serif text-[clamp(38px,5vw,52px)] font-light leading-none text-ink">
                  {formatMoney(Number(detail.pot.balance), detail.pot.currency)}
                </div>
                <div className="mt-2 font-mono text-[11px] text-ink-faint">available for care</div>
              </div>
              <div className="min-w-[190px]">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">
                  this week
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {thisWeek.length === 0 ? (
                    <span className="text-[13px] text-ink-soft">quiet — nothing moved</span>
                  ) : (
                    thisWeek.slice(0, 3).map((m) => (
                      <div key={`${m.kind}-${m.id}`} className="flex items-baseline justify-between gap-4 font-mono text-[12px]">
                        <span className="truncate text-ink-soft">
                          {m.kind === "in" ? (m.member_name ?? "family") : (("category" in m && m.category) || "expense")}
                        </span>
                        <span className={m.kind === "in" ? "text-calm-text" : "text-ink"}>
                          {m.kind === "in" ? "+" : "−"}
                          {formatMoney(Number(m.amount), m.currency)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <RoomDrawer label="Add a contribution">
              <form action={contributeForm} className="flex flex-col gap-2">
                <input type="hidden" name="potId" value={detail.pot.id} />
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder={`Amount in ${detail.pot.currency}`}
                  className={inputClass}
                />
                <input name="note" placeholder="Note — e.g. July support" className={inputClass} />
                <div className="flex gap-2">
                  <button
                    name="method"
                    value="record"
                    className="lift rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk"
                  >
                    Record it
                  </button>
                  <button
                    name="method"
                    value="stripe"
                    className="rounded-pill border border-line-2 px-4 py-2 text-[13px] font-medium text-ink hover:border-halo/50"
                  >
                    Pay by card
                  </button>
                </div>
              </form>
            </RoomDrawer>

            <RoomDrawer label="Log an expense">
              <form action={addExpenseForm} className="flex flex-col gap-2">
                <input type="hidden" name="potId" value={detail.pot.id} />
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder={`Amount in ${detail.pot.currency}`}
                  className={inputClass}
                />
                <select name="category" className={inputClass} defaultValue="groceries">
                  {["medication", "groceries", "transport", "utilities", "school", "care", "medical", "other"].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
                <input name="note" placeholder="What it was for" className={inputClass} />
                <input
                  name="receipt"
                  type="file"
                  accept="image/*"
                  className="text-[12.5px] text-ink-soft"
                  aria-label="Receipt photo"
                />
                <button className="lift self-start rounded-pill bg-white px-4 py-2 text-[13px] font-semibold text-dusk">
                  Log expense
                </button>
              </form>
            </RoomDrawer>
          </div>

          <RoomSection title="Every movement, linked to care" delay={140}>
            {movement.length === 0 ? (
              <p className="py-1 text-[13.5px] text-ink-soft">
                The first contribution or expense will appear here, with its proof.
              </p>
            ) : (
              <div className="flex flex-col">
                {movement.slice(0, 20).map((row) => (
                  <div
                    key={`${row.kind}-${row.id}`}
                    className="flex items-center justify-between gap-4 border-t border-line py-3 first:border-t-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden
                        className={`h-[7px] w-[7px] flex-none rounded-full ${
                          row.kind === "in" ? "bg-calm shadow-[0_0_8px_rgba(78,158,126,.5)]" : "bg-halo/70"
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="block truncate text-[14px] text-ink">
                          {row.kind === "in"
                            ? `Contribution${row.note ? ` — ${row.note}` : ""}`
                            : `${("category" in row && row.category) || "expense"}${row.note ? ` — ${row.note}` : ""}`}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10.5px] text-ink-faint">
                          {row.member_name ?? "family"} ·{" "}
                          {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(row.at))}
                          {"receipt_url" in row && row.receipt_url ? (
                            <>
                              {" · "}
                              <a href={row.receipt_url} className="text-halo underline decoration-halo/40" target="_blank" rel="noreferrer">
                                receipt ✓
                              </a>
                            </>
                          ) : null}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`flex-none font-mono text-[13px] ${row.kind === "in" ? "text-calm-text" : "text-ink"}`}
                    >
                      {row.kind === "in" ? "+" : "−"}
                      {formatMoney(Number(row.amount), row.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </RoomSection>
        </>
      )}
    </div>
  );
}
