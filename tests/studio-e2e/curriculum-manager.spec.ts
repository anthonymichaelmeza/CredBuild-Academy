import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  CHST_BLUEPRINT_ID,
  chstObjectives,
} from "../../src/modules/curriculum/catalog";
const origin = "http://127.0.0.1:3300";
async function identify(page: Page, admin: boolean) {
  await page.context().addCookies([
    {
      name: "credbuilt_demo",
      value: admin
        ? "33333333-3333-4333-8333-333333333333"
        : "11111111-1111-4111-8111-111111111111",
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function capture(page: Page, name: string) {
  const directory =
    process.env.CREDBUILT_SCREENSHOT_DIR ||
    "/workspace/artifacts/chst-research";
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: `${directory}/${name}.png`,
    fullPage: false,
    scale: "css",
    caret: "initial",
  });
}

test("curriculum management preserves all statements and saves an unverified source relationship behind administrator access", async ({
  page,
}, info) => {
  await identify(page, false);
  await page.goto("/studio/curriculum");
  await expect(
    page.getByRole("heading", {
      name: "Curriculum management is protected.",
      exact: true,
    }),
  ).toBeVisible();
  expect((await page.request.get("/api/studio/curriculum")).status()).toBe(403);
  expect(
    (
      await page.request.get(
        "/api/studio/curriculum?brief=chst5-lesson-brief-excavations",
      )
    ).status(),
  ).toBe(403);
  await identify(page, true);
  await page.goto("/studio/curriculum");
  await expect(
    page.getByRole("heading", {
      name: "CHST5 Curriculum Manager.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".curriculum-objective")).toHaveCount(78);
  await page.getByLabel("Curriculum domain", { exact: true }).selectOption("1");
  await expect(page.locator(".curriculum-objective")).toHaveCount(36);
  await page
    .getByLabel("Search curriculum statements", { exact: true })
    .fill("excavations");
  const objective = page.locator(".curriculum-objective");
  await expect(objective).toHaveCount(1);
  await objective.locator(":scope > summary").click();
  await expect(
    objective.getByRole("heading", {
      name: "CredBuilt learning objective",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    objective.getByText(
      "Common hazards and controls associated with excavations",
      { exact: true },
    ),
  ).toBeVisible();
  const title = `Synthetic curriculum link QA ${info.project.name} ${Date.now()}`;
  const created = await page.request.post("/api/studio/research", {
    headers: { Origin: origin },
    data: {
      action: "register",
      source: {
        originalUrl: "",
        title,
        publisher: "Isolated software test, not a technical authority",
        classification: "credbuilt_instruction",
        access: "user_supplied",
        license: "public_metadata_only",
        publicationDate: null,
        licensedIdentifier: "",
        rightsNotes:
          "Synthetic metadata only; no technical content was examined.",
      },
    },
  });
  expect(created.status()).toBe(200);
  const body = await created.json();
  const source = body.sources.find(
    (item: { title: string }) => item.title === title,
  );
  expect(source).toBeTruthy();
  await objective
    .getByText("Link an existing research source", { exact: true })
    .click();
  const objectiveId = chstObjectives.find(
    (row) => row.domain === "1" && row.kind === "knowledge" && row.number === 3,
  )!.id;
  await page
    .getByLabel(`Source ID for ${objectiveId}`, { exact: true })
    .fill(source.id);
  await page
    .getByLabel(`Relationship notes for ${objectiveId}`, { exact: true })
    .fill(
      "Candidate relationship for engineering QA only. No source content or technical support is claimed.",
    );
  await objective
    .getByRole("button", { name: "Save source relationship", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No source or instructional content was verified or approved.",
  );
  await expect(objective.getByText(title, { exact: true })).toBeVisible();
  const snapshot = await (
    await page.request.get("/api/studio/curriculum")
  ).json();
  expect(snapshot.objectives).toHaveLength(78);
  expect(snapshot.totals.withVerifiedEvidence).toBe(0);
  expect(snapshot.totals.sourceGaps).toBe(78);
  const row = snapshot.objectives.find(
    (item: { id: string }) => item.id === objectiveId,
  );
  expect(
    row.sources.some(
      (item: { sourceId: string; verified: boolean }) =>
        item.sourceId === source.id && !item.verified,
    ),
  ).toBe(true);
  expect(row.coverageScore).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, `curriculum-manager-${info.project.name}`);
});

test("a source-blocked lesson brief opens the existing editor and saves only an unpublished authoring record", async ({
  page,
}, info) => {
  await identify(page, true);
  await page.goto("/studio/curriculum");
  const brief = page
    .getByRole("link", { name: "Open lesson authoring", exact: true })
    .first();
  await brief.click();
  await expect(
    page.getByRole("heading", { name: "Lesson editor", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Content title", { exact: true })).toHaveValue(
    "Excavation planning: conditions, responsibilities and evidence",
  );
  const screenshotName = `source-blocked-lesson-editor-${info.project.name}`;
  await capture(page, screenshotName);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("status").filter({
      hasText:
        "Draft saved. Independent technical review is required before publication.",
    }),
  ).toBeVisible();
  const snapshot = await (
    await page.request.get("/api/studio/curriculum")
  ).json();
  expect(snapshot.blueprint.id).toBe(CHST_BLUEPRINT_ID);
  const row = snapshot.objectives.find(
    (item: { id: string }) => item.id === "CHST5-2022.04.12-D1-K03",
  );
  expect(row.counts.sourceBlockedLessonBriefs).toBeGreaterThanOrEqual(1);
  expect(row.counts.approvedLessons).toBe(0);
  expect(row.counts.publishedLessons).toBe(0);
  expect(row.coverageScore).toBe(0);
  expect(snapshot.totals.withApprovedLessons).toBe(0);
});
