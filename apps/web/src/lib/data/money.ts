import { withUser } from "@kinos/db";
import type { ContributionRow, ExpenseRow, MoneyPotRow } from "@kinos/db";

export interface PotDetail {
  pot: MoneyPotRow;
  contributions: (ContributionRow & { member_name: string | null })[];
  expenses: (ExpenseRow & { member_name: string | null })[];
}

export async function listPots(userId: string): Promise<MoneyPotRow[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(`select * from money_pot order by created_at`);
    return res.rows;
  });
}

export async function getPotDetail(
  userId: string,
  potId: string,
): Promise<PotDetail | null> {
  return withUser(userId, async (db) => {
    const pot = await db.query(`select * from money_pot where id = $1`, [potId]);
    if (!pot.rows[0]) return null;
    const contributions = await db.query(
      `select c.*, m.display_name as member_name
       from contribution c left join family_member m on m.id = c.member_id
       where c.pot_id = $1 order by c.at desc limit 50`,
      [potId],
    );
    const expenses = await db.query(
      `select e.*, m.display_name as member_name
       from expense e left join family_member m on m.id = e.member_id
       where e.pot_id = $1 order by e.at desc limit 50`,
      [potId],
    );
    return {
      pot: pot.rows[0],
      contributions: contributions.rows,
      expenses: expenses.rows,
    };
  });
}
