import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", reducedMotion: "reduce", launchOptions: { args: ["--disable-gpu"], executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } }],
  webServer: { command: "node node_modules/next/dist/bin/next start --hostname localhost", url: "http://localhost:3000", reuseExistingServer: false, timeout: 60000 },
});
