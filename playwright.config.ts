import { defineConfig, devices } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "3000";
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("Invalid browser test port");
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  use: { baseURL, trace: "retain-on-failure", reducedMotion: "reduce", launchOptions: { args: ["--disable-gpu"], executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }],
  webServer: { command: `node node_modules/next/dist/bin/next start --hostname localhost --port ${port}`, url: baseURL, reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true", timeout: 60000 },
});
