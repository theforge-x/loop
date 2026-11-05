import { test, expect } from "@playwright/test";
test("public foundation renders without horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your people.");
  await expect(page.getByRole("link", { name: "Enter your workspace" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("loop-home.png"), fullPage: true });
});
test("anonymous visitors cannot enter admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
});
test("unknown routes offer a way home", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await page.getByRole("link", { name: "Back to Loop" }).click();
  await expect(page).toHaveURL("/");
});

test("invalid credentials remain outside the workspace", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("not-an-account@example.test");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("We couldn’t sign you in");
  await expect(page).toHaveURL(/\/sign-in$/);
});
