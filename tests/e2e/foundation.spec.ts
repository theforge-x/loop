import { test, expect } from "@playwright/test";
test("public foundation renders without horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your people.");
  await expect(page.getByRole("link", { name: "Enter your workspace" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("loop-home.png"), fullPage: true, animations: "disabled" });
});
test("anonymous visitors cannot enter admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
});
test("unknown routes offer a way home", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist/unknown/nested-route");
  expect(response?.status()).toBe(404);
  await page.getByRole("link", { name: "Back to Loop" }).click();
  await expect(page).toHaveURL("/");
});

test("invalid credentials remain outside the workspace", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("not-an-account@example.test");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "We couldn’t sign you in" })).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("unknown wedding slugs render a private noindex recovery page", async ({ page }) => {
  await page.goto("/this-wedding-does-not-exist");
  await expect(page.getByRole("heading", { name: "A little out of the way." })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toHaveAttribute('content', /noindex/);
  await page.getByRole("link", { name: "Back to Loop" }).click();
  await expect(page).toHaveURL("/");
});

test("color mode follows the device, persists an override and stays consistent across navigation", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const dark = await page.locator("body").evaluate(element => getComputedStyle(element).backgroundColor);
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => page.locator("body").evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(dark);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Your workspace", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Dark mode", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => localStorage.getItem("loop-theme"))).toBe("light");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
