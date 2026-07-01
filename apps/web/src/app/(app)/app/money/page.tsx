import {
  addExpenseForm,
  contributeForm,
  createPotForm,
} from "@/lib/actions/forms";
import { formatMoney } from "@kinos/config";
import { EmptyState, Eyebrow, Panel, Pill } from "@kinos/ui";

import { requireFamilyContext } from "@/lib/data/context";
import { getPotDetail, listPots } from "@/lib/data/money";
import { listSubjects } from "@/lib/data/record";

const inputClass =
  "rounded-card border border-line bg-paper px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-dusk-2";

export default async function MoneyPage() {
  const ctx = await requireFamilyContext();
  const pots = await listPots(ctx.userId);
  const subjects = await listSubjects(ctx.userId);
  const detail = pots[0] ? await getPotDetail(ctx.userId, pots[0].id) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Money Pot</Eyebrow>
        <h1 className="mt-1 font-serif text-[28px] tracking-[-0.01em]">
          Shared support, fully accounted for
        </h1>
      </div>

      {pots.length === 0 ? (
        <>
          <EmptyState
            title="Start the family's care fund."
            hint="Contributions in, expenses out — every receipt attached, every cent visible to the family. No more 'where did the money go?'"
          />
          <Panel>
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
              <button className="rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white sm:col-span-3 sm:justify-self-start">
                Create the pot
              </button>
            </form>
          </Panel>
        </>
      ) : (
        detail && (
          <>
            <Panel dusk>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-halo">
                    {detail.pot.name}
                  </div>
                  <div className="mt-2 font-serif text-[44px] leading-none">
                    {formatMoney(Number(detail.pot.balance), detail.pot.currency)}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-halo">
                  {detail.contributions.length} in · {detail.expenses.length} out
                </span>
              </div>
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  Add a contribution
                </h2>
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
                      className="rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white hover:bg-dusk-2"
                    >
                      Record it
                    </button>
                    <button
                      name="method"
                      value="stripe"
                      className="rounded-pill border border-line bg-paper-3 px-4 py-2 text-[13px] font-medium text-ink hover:border-line-2"
                    >
                      Pay by card
                    </button>
                  </div>
                </form>
              </Panel>

              <Panel className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  Log an expense
                </h2>
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
                  <input name="receipt" type="file" accept="image/*" className="text-[12.5px] text-ink-soft" aria-label="Receipt photo" />
                  <button className="self-start rounded-pill bg-dusk px-4 py-2 text-[13px] font-medium text-white hover:bg-dusk-2">
                    Log expense
                  </button>
                </form>
              </Panel>
            </div>

            <Panel>
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                Recent movement
              </h2>
              <div className="flex flex-col">
                {[...detail.contributions.map((c) => ({ ...c, kind: "in" as const })), ...detail.expenses.map((e) => ({ ...e, kind: "out" as const }))]
                  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .slice(0, 20)
                  .map((row) => (
                    <div
                      key={`${row.kind}-${row.id}`}
                      className="flex items-center justify-between border-t border-line py-3 first:border-t-0"
                    >
                      <div className="min-w-0">
                        <span className="text-[14px] text-ink">
                          {row.kind === "in"
                            ? `Contribution${row.note ? ` — ${row.note}` : ""}`
                            : `${"category" in row ? row.category : "expense"}${row.note ? ` — ${row.note}` : ""}`}
                        </span>
                        <div className="mt-0.5 font-mono text-[11px] text-ink-faint">
                          {row.member_name ?? "family"} ·{" "}
                          {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(row.at))}
                          {"receipt_url" in row && row.receipt_url ? (
                            <>
                              {" · "}
                              <a href={row.receipt_url} className="text-dusk-2" target="_blank" rel="noreferrer">
                                receipt
                              </a>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <Pill tone={row.kind === "in" ? "ok" : "neutral"}>
                        {row.kind === "in" ? "+" : "−"}
                        {formatMoney(Number(row.amount), row.currency)}
                      </Pill>
                    </div>
                  ))}
              </div>
            </Panel>
          </>
        )
      )}
    </div>
  );
}
