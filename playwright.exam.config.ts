import { defineConfig, devices } from "@playwright/test";

/** Synthetic local fixtures exercise the engine, never the published CHST bank. */
export default defineConfig({
  testDir: "./tests/exam-e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3400",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "tablet",
      // Exercise an iPad-sized Chromium viewport with the installed executable;
      // this is responsive coverage, not a claim of native Safari validation.
      use: { ...devices["iPad Mini"], browserName: "chromium" },
    },
  ],
  webServer: {
    command:
      "npx tsx --conditions=react-server scripts/seed-exam-e2e.ts && npm run dev -- --port 3400",
    url: "http://127.0.0.1:3400",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      CREDBUILT_EXAM_TEST_SEED: "true",
      CREDBUILT_EXAM_FIXTURES: "true",
      NEXT_PUBLIC_BROWSER_DEMO: "false",
      ALLOW_LOCAL_DEMO: "true",
      ALLOW_LOCAL_STUDIO: "true",
      LOCAL_DATABASE_PATH: ".local/exam-e2e",
      DATABASE_URL: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
      APP_ORIGIN: "",
      VERCEL: "",
    },
  },
});
