import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser-e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120000,
    // Deliberately deny local DB fallback. No Clerk/database credentials are supplied.
    env: {
      NEXT_PUBLIC_BROWSER_DEMO: "true",
      ALLOW_LOCAL_DEMO: "false",
      LOCAL_DATABASE_PATH: "/proc/credbuilt-no-writes",
      DATABASE_URL: "",
      CLERK_SECRET_KEY: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      APP_ORIGIN: "",
    },
  },
});
