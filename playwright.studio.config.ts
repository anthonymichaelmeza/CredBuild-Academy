import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/studio-e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3300",
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
    command:
      "npx tsx --conditions=react-server scripts/seed-studio-e2e.ts && npm run dev -- --port 3300",
    url: "http://127.0.0.1:3300",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NODE_ENV: "development",
      CREDBUILT_STUDIO_TEST_SEED: "true",
      NEXT_PUBLIC_BROWSER_DEMO: "false",
      ALLOW_LOCAL_DEMO: "true",
      ALLOW_LOCAL_STUDIO: "true",
      LOCAL_DATABASE_PATH: ".local/studio-e2e",
      DATABASE_URL: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
      APP_ORIGIN: "",
      VERCEL: "",
    },
  },
});
