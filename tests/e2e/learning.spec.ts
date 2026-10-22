import { expect, test } from "@playwright/test";

test("lesson progress is saved on the server and isolated from another browser identity", async ({
  page,
  browser,
}) => {
  await page.goto("/learn/recognize-hazards");
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Mark section read", exact: true })
      .click();
    await expect(
      page.getByText(`${i + 1} / 3 sections marked read`, { exact: true }),
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
  await expect(
    page
      .locator("form.lesson-check")
      .nth(0)
      .getByRole("button", { name: "Check complete", exact: true }),
  ).toBeDisabled();
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
  await expect(
    page.getByRole("button", { name: "Complete lesson", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Complete lesson", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lesson completed", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Lesson completed", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("credbuilt.learning-demo.v1"),
    ),
  ).toBeNull();
  const response = await page.request.get("/api/learning");
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(
    (await response.json()).state.progress["recognize-hazards"].completedAt,
  ).toBeTruthy();
  const exported = await page.request.get("/api/account/export");
  expect(exported.status()).toBe(200);
  expect(exported.headers()["cache-control"]).toBe("private, no-store");
  expect(exported.headers()["content-disposition"]).toContain("attachment");
  expect(
    (await exported.json()).learning.state.progress["recognize-hazards"]
      .completedAt,
  ).toBeTruthy();
  const stranger = await browser.newContext();
  const other = await stranger.newPage();
  await other.goto("/learn/recognize-hazards");
  await expect(
    other.getByText("0 / 3 sections marked read", { exact: true }),
  ).toBeVisible();
  await expect(
    other.getByRole("button", { name: "Complete lesson", exact: true }),
  ).toBeDisabled();
  expect(
    (await (await other.request.get("/api/learning")).json()).state.progress,
  ).toEqual({});
  expect((await other.request.get("/api/account/export")).status()).toBe(401);
  await stranger.close();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
