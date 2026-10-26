import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const origin = "http://127.0.0.1:3300";
test("quality checks and editorial decisions stay separate from unreviewed AI drafts", async ({
  page,
}, info) => {
  await page.context().addCookies([
    {
      name: "credbuilt_demo",
      value: "11111111-1111-4111-8111-111111111111",
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/studio/questions/quality");
  await expect(
    page.getByRole("heading", {
      name: "Editorial review is protected.",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (await page.request.get("/api/studio/questions/quality")).status(),
  ).toBe(403);
  await page.context().addCookies([
    {
      name: "credbuilt_demo",
      value: "22222222-2222-4222-8222-222222222222",
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/studio/questions/quality");
  await expect(
    page.getByRole("heading", {
      name: /Examine the wording. Record the decision/,
    }),
  ).toBeVisible();
  const response = await page.request.get("/api/studio/questions/quality");
  expect(response.status()).toBe(200);
  const snapshot = await response.json();
  expect(snapshot.quality.inspected).toBeGreaterThanOrEqual(100);
  expect(
    snapshot.quality.results.every((row: { issues: { code: string }[] }) =>
      row.issues.some((issue) => issue.code === "source_unverified"),
    ),
  ).toBe(true);
  await page.locator(".studio-list button").first().click();
  await expect(
    page.getByRole("heading", {
      name: "Complete the preceding review stages.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Record human editorial decision",
      exact: true,
    }),
  ).toHaveCount(0);
  const first = snapshot.items[0];
  const blocked = await page.request.post("/api/studio/questions/quality", {
    headers: { Origin: origin },
    data: {
      id: first.id,
      revision: first.revision,
      rowVersion: first.rowVersion,
      editorialEvent: null,
      decision: "approved",
      findings:
        "Synthetic browser software QA attempt must be blocked before technical approval.",
      checks: {
        clarity: true,
        originality: true,
        distractors: true,
        answerClues: true,
        rights: true,
      },
      humanAttestation: true,
    },
  });
  expect(blocked.status()).toBe(409);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const directory =
    process.env.CREDBUILT_SCREENSHOT_DIR ||
    "/workspace/artifacts/chst-research/screenshots";
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: `${directory}/quality-${info.project.name}.png`,
    fullPage: false,
    scale: "css",
    caret: "initial",
  });
});
