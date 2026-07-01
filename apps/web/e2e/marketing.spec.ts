import { expect, test } from "@playwright/test";

test.describe("marketing site", () => {
  test("landing page speaks the KinOS language", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/KinOS/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("calm orbit");
    await expect(page.getByText("Know what matters before it becomes a crisis")).toBeVisible();
    // The product surfaces are drawn on the page.
    await expect(page.getByText("Orbit View").first()).toBeVisible();
    await expect(page.getByText("Daily Brief").first()).toBeVisible();
    await expect(page.getByText("Attention Needed").first()).toBeVisible();
    await expect(page.getByText("Life Signals").first()).toBeVisible();
  });

  test("the word for machine intelligence never renders", async ({ page }) => {
    for (const path of ["/", "/pricing", "/privacy"]) {
      await page.goto(path);
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(/\bAI\b/);
      expect(text).not.toMatch(/machine learning/i);
      expect(text).not.toMatch(/algorithm/i);
    }
  });

  test("pricing shows the family plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Family Core" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Diaspora Care" })).toBeVisible();
    await expect(page.getByText("Made for diaspora")).toBeVisible();
  });

  test("privacy page carries the safety line and consent promise", async ({ page }) => {
    await page.goto("/privacy");
    await expect(
      page.getByText("Consent is enforced in the database"),
    ).toBeVisible();
    await expect(
      page.getByText(/not a medical device, diagnosis tool, emergency service/).first(),
    ).toBeVisible();
  });

  test("the app is gated", async ({ page }) => {
    await page.goto("/app");
    // Signed out (or unconfigured deployment) never reaches the family space.
    await expect(page).not.toHaveURL(/\/app$/);
  });
});
