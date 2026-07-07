import { expect, test } from "@playwright/test";
import pg from "pg";
import { randomUUID } from "node:crypto";

/**
 * The activation flow, end to end against a real database:
 * sign in → create the family space → first Orbit → invite → first
 * check-in → first duty → Orbit View shows the living record.
 *
 * Runs when E2E_DATABASE_URL points at a migrated Postgres.
 */

const dbUrl = process.env.E2E_DATABASE_URL;
test.skip(!dbUrl, "E2E_DATABASE_URL not set — see README (db-policy CI job runs this)");

async function signInAs(email: string, browserContext: { addCookies: (c: unknown[]) => Promise<void> }) {
  const pool = new pg.Pool({ connectionString: dbUrl });
  const user = await pool.query(
    `insert into app_user (name, email, email_verified) values ($1, $2, now())
     on conflict (email) do update set email_verified = now()
     returning id`,
    ["E2E Tester", email],
  );
  const token = randomUUID();
  await pool.query(
    `insert into auth_session (session_token, user_id, expires)
     values ($1, $2, now() + interval '1 day')`,
    [token, user.rows[0]!.id],
  );
  await pool.end();
  await browserContext.addCookies([
    {
      name: "authjs.session-token",
      value: token,
      url: "http://localhost:3211",
      httpOnly: true,
      sameSite: "Lax" as const,
    },
  ]);
}

test("a family activates: workspace → orbit → invite → check-in → duty", async ({ page, context }) => {
  const email = `e2e+${Date.now()}@kinos.test`;
  await signInAs(email, context);

  // Landing in the app without a family goes to onboarding.
  await page.goto("/app");
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByText("Five small moments", { exact: false })).toBeVisible();

  // Chapter 1 — the family space.
  await page.getByPlaceholder("What do you call yourselves", { exact: false }).fill("E2E Family");
  await page.getByPlaceholder("Your first name").fill("Alex");
  await page.getByRole("button", { name: "Name the space" }).click();
  await expect(page.getByText("Who sits at the centre", { exact: false })).toBeVisible();

  // Chapter 2 — the first Orbit.
  await page
    .getByPlaceholder("What the family calls them — Mum, Baba, Gogo…")
    .fill("Gogo");
  await page.getByRole("button", { name: "Place them at the centre" }).click();
  await expect(page.getByText("An orbit needs more than one light.")).toBeVisible();

  // Chapter 3 — invite a second member.
  await page.getByPlaceholder("Their email", { exact: false }).fill(`invitee+${Date.now()}@kinos.test`);
  await page.getByRole("button", { name: "Send the invitation" }).click();
  await expect(page.getByRole("link", { name: "Open Gogo's check-in" })).toBeVisible();

  // Chapter 4 — first check-in, big and simple.
  await page.getByRole("link", { name: "Open Gogo's check-in" }).click();
  await expect(page.getByText("How is Gogo today?")).toBeVisible();
  await page.getByText("Doing well").click();
  await page.getByRole("button", { name: "Send today's check-in" }).click();

  // The check-in lands on the Orbit; the Story view holds the Life Signal.
  await expect(page).toHaveURL(/\/app\/orbits\//);
  await page.getByRole("link", { name: "Story" }).click();
  await expect(page.getByText("Life Signals")).toBeVisible();
  await expect(page.getByText("feeling").first()).toBeVisible();

  // Step 5 — the first duty, assigned from the Orbit's Care view.
  await page.getByRole("link", { name: "Care", exact: true }).click();
  await page.getByText("Assign a duty").click();
  await page.getByPlaceholder("e.g. Buy the week's groceries").fill("Buy groceries for the week");
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  // The duty is created via a server action; assert it *persisted* by loading
  // the Orbit fresh. This avoids a race on the live re-render (the action
  // succeeds, but its client revalidation can arrive after a still-settling
  // navigation), while still proving the duty was really written.
  await page.reload();
  await expect(page.getByText("Buy groceries for the week")).toBeVisible();

  // The Today Room shows the living record, calmly.
  await page.goto("/app");
  await expect(page.getByText("E2E Family").first()).toBeVisible();
  await expect(page.getByText("Gogo").first()).toBeVisible();

  // And still: no machine language anywhere in the product.
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/\bAI\b/);
});
