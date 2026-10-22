import { chromium, devices, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Run only against a disposable browser-demo preview. Every result below is
// produced through the interface in a fresh browser context, never seeded stats.
const origin = process.env.CAPTURE_ORIGIN || "http://127.0.0.1:3000";
const output = path.resolve(process.argv[2] || "/tmp/credbuilt-preview");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
const captures = [];
page.on("pageerror", (error) => errors.push(error.message));
async function visit(route) {
  await page.goto(new URL(route, origin).href);
}
async function capture(name) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, name), fullPage: true });
  captures.push(name);
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error(`Horizontal overflow in ${name}`);
}
try {
  await visit("/learn");
  await expect(
    page.getByRole("heading", { name: /Understand it. Apply it. Build on it/ }),
  ).toBeVisible();
  await capture("academy-desktop.png");
  await visit("/learn/recognize-hazards");
  await page
    .getByRole("button", { name: "Mark section read", exact: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await capture("lesson-reader.png");
  await visit("/onboarding");
  for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
    await page.getByRole("checkbox", { name: day, exact: true }).check();
  await page.getByLabel("Minutes per study day", { exact: true }).fill("30");
  await page
    .getByRole("button", { name: "Save study preferences", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Your study preferences are saved",
  );
  await visit("/planner");
  await expect(
    page.getByRole("button", { name: "Refresh next seven days", exact: true }),
  ).toBeVisible();
  await capture("study-planner-desktop.png");
  for (const correct of [false, false, true]) {
    await visit("/practice?domain=1&topic=Hazard%20recognition&count=1");
    await page
      .getByRole("button", { name: "Start session", exact: true })
      .click();
    await expect(
      page.getByText("QUESTION 1 OF 1", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("radio", {
        name: correct
          ? /Walk through the work with/
          : /Assume the previous crew/,
      })
      .check();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(page.locator("section.feedback")).toBeVisible();
    if (correct) await capture("practice-feedback.png");
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Submit session", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: /You put in the work/ }),
    ).toBeVisible();
  }
  await visit("/performance");
  await expect(
    page.getByText("2 misses / 3 attempts", { exact: true }),
  ).toBeVisible();
  await capture("performance.png");
  await visit("/exam");
  await page
    .getByRole("button", { name: "Start demo rehearsal", exact: true })
    .click();
  await page.getByRole("radio").first().check();
  await expect(page.getByText("1 / 5 answered", { exact: true })).toBeVisible();
  await expect(page.locator(".session-clock")).toContainText(/\d{2}:\d{2}/);
  await capture("exam-rehearsal.png");
  const mobile = await browser.newContext({ ...devices["Pixel 7"] });
  const small = await mobile.newPage();
  for (const [route, name] of [
    ["/learn", "academy-mobile.png"],
    ["/onboarding", "onboarding-mobile.png"],
  ]) {
    await small.goto(new URL(route, origin).href);
    await small.getByRole("heading", { level: 1 }).waitFor();
    await small.screenshot({ path: path.join(output, name), fullPage: true });
    captures.push(name);
    if (
      await small.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error(`Mobile overflow in ${name}`);
  }
  await mobile.close();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    JSON.stringify(
      { output, captures, pageErrors: errors, horizontalOverflow: false },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
