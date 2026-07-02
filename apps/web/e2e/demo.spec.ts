import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * The open demo door: /api/demo/visit signs a visitor into the demo
 * family as a viewer — reads work, the banner explains, and the
 * database (not the UI) refuses every write. Requires a demo family
 * (a member with the demo identity's email), which this test seeds.
 */

const dbUrl = process.env.E2E_DATABASE_URL;
test.skip(!dbUrl, "E2E_DATABASE_URL not set — see README (db-policy CI job runs this)");

test("a visitor wanders the demo family, read-only", async ({ page }) => {
  const pool = new pg.Pool({ connectionString: dbUrl });

  // seed the demo identity with its own family (idempotent)
  const demo = await pool.query(
    `insert into app_user (name, email, email_verified) values ('Tari', 'demo@kinos.family', now())
     on conflict (email) do update set email_verified = now() returning id`,
  );
  const demoId = demo.rows[0]!.id;
  const existing = await pool.query(
    `select workspace_id from family_member where user_id = $1 limit 1`,
    [demoId],
  );
  let wsId = existing.rows[0]?.workspace_id as string | undefined;
  if (!wsId) {
    const ws = await pool.query(
      `insert into family_workspace (name, created_by, plan_id) values ('Demo Family', $1, 'family_plus') returning id`,
      [demoId],
    );
    wsId = ws.rows[0]!.id;
    await pool.query(
      `insert into family_member (workspace_id, user_id, display_name, role) values ($1, $2, 'Tari', 'admin')`,
      [wsId, demoId],
    );
    await pool.query(
      `insert into care_subject (workspace_id, display_name, kind, timezone) values ($1, 'Gogo', 'elder', 'Africa/Harare')`,
      [wsId],
    );
  }

  // walk in through the open door
  await page.goto("/api/demo/visit");
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByText("wandering a living demo family", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start your own family space/ })).toBeVisible();

  // the visitor is a viewer: the database refuses writes outright
  const visitor = await pool.query(`select id from app_user where email = 'visitor@kinos.family'`);
  expect(visitor.rows[0]).toBeTruthy();
  const client = await pool.connect();
  try {
    await client.query(`select set_config('app.user_id', $1, false)`, [visitor.rows[0]!.id]);
    await client.query(`set role kinos_app`);
    const readable = await client.query(`select count(*)::int as n from care_subject`);
    expect(readable.rows[0]!.n).toBeGreaterThan(0);
    await expect(
      client.query(
        `insert into life_signal (subject_id, signal_type, source, value, privacy_level)
         select id, 'checkin', 'manual_checkin', '{}', 'family' from care_subject limit 1`,
      ),
    ).rejects.toThrow(/row-level security/);
  } finally {
    client.release();
    await pool.end();
  }
});
