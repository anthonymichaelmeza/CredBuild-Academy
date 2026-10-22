import { expect, type Page, type Browser } from "@playwright/test";
export async function plannerFlow({
  page,
  browser,
}: {
  page: Page;
  browser: Browser;
}) {
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "Build a study routine that fits." }),
  ).toBeVisible();
  for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
    await page.getByRole("checkbox", { name: day, exact: true }).check();
  await page.getByLabel("Minutes per study day", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Save study preferences", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Your study preferences are saved",
  );
  const first = page
    .getByRole("checkbox", {
      name: "Mark lesson done (self-reported)",
      exact: true,
    })
    .first();
  // The controlled checkbox reflects confirmed persistence. The server save is
  // asynchronous, so click once and wait for the confirmed checked state.
  await first.click();
  await expect(
    page.getByRole("checkbox", { name: "Marked done by you", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("checkbox", { name: "Marked done by you", exact: true }),
  ).toBeChecked();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Save study preferences", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Marked done by you", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Edit study preferences", exact: true })
    .click();
  await expect(
    page.getByLabel("Minutes per study day", { exact: true }),
  ).toHaveValue("10");
  await page
    .getByRole("button", { name: "Close preferences", exact: true })
    .click();
  await page.locator(".planner-task").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/learn\//);
  // Completing the assigned lesson must update its original calendar slot,
  // rather than silently substituting another lesson into the saved plan.
  for (let index = 0; index < 3; index++) {
    await page
      .getByRole("button", { name: "Mark section read", exact: true })
      .click();
    await expect(
      page.getByText(`${index + 1} / 3 sections marked read`, { exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("radio", {
      name: "Walk through the work with the crew and discuss what could cause harm.",
      exact: true,
    })
    .check();
  await page
    .locator("form.lesson-check")
    .nth(0)
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
  await page
    .getByRole("radio", {
      name: "Pause the affected work and reassess hazards with the responsible team.",
      exact: true,
    })
    .check();
  await page
    .locator("form.lesson-check")
    .nth(1)
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete lesson", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lesson completed", exact: true }),
  ).toBeDisabled();
  await page.goto("/planner");
  await expect(
    page.getByRole("checkbox", {
      name: "Completed in lesson reader",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "Completed in lesson reader",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.locator(".planner-task").first().getByRole("link"),
  ).toHaveAttribute("href", "/learn/recognize-hazards");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const stranger = await browser.newContext();
  const other = await stranger.newPage();
  await other.goto(new URL("/planner", page.url()).toString());
  await expect(
    other.getByRole("button", { name: "Save study preferences", exact: true }),
  ).toBeVisible();
  await expect(
    other.getByRole("checkbox", { name: "Marked done by you", exact: true }),
  ).toHaveCount(0);
  await stranger.close();
}
