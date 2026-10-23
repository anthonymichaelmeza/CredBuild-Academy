import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const identities = {
  author: "11111111-1111-4111-8111-111111111111",
  reviewer: "22222222-2222-4222-8222-222222222222",
  administrator: "33333333-3333-4333-8333-333333333333",
} as const;
async function identify(page: Page, role: keyof typeof identities) {
  await page.context().addCookies([
    {
      name: "credbuilt_demo",
      value: identities[role],
      url: "http://127.0.0.1:3300",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function screenshot(page: Page, name: string) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => window.scrollY === 0);
  const directory =
    process.env.CREDBUILT_SCREENSHOT_DIR || "test-results/studio-screenshots";
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: `${directory}/${name}.png`,
    fullPage: true,
  });
}

test("author creates an immutable draft, independent reviewer requests changes, author revises", async ({
  page,
}, info) => {
  await identify(page, "author");
  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: /Build knowledge with a clear record/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Isolated development identity.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New question", exact: true }).click();
  const title = `Original interface QA draft ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Content title", { exact: true }).fill(title);
  await page
    .getByLabel("Topic", { exact: true })
    .fill("Editorial interface QA");
  await page
    .getByLabel("Question text", { exact: true })
    .fill(
      "Which interface control records a draft without publishing it? This is a software test, not technical instruction.",
    );
  for (const [index, letter] of ["A", "B", "C", "D"].entries()) {
    await page
      .getByLabel(`Choice ${letter} text`, { exact: true })
      .fill(["Save draft", "Publish", "Retire", "Submit review"][index]);
    await page
      .getByLabel(`Choice ${letter} explanation`, { exact: true })
      .fill("Original software test explanation; not safety instruction.");
  }
  await page
    .getByLabel("Correct-answer explanation", { exact: true })
    .fill(
      "Saving a draft does not publish material. This is a software interface test.",
    );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Draft saved. Independent technical review is required before publication.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit for technical review", exact: true })
    .click();
  await expect(
    page.getByText(
      "You authored this revision. A different authorized reviewer must record the technical decision.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record review decision", exact: true }),
  ).toHaveCount(0);
  await screenshot(page, `studio-author-${info.project.name}`);
  const snapshot = await (await page.request.get("/api/studio")).json();
  const item = snapshot.items.find(
    (entry: { data: { title: string } }) => entry.data.title === title,
  );
  expect(item.status).toBe("technical_review");

  await identify(page, "reviewer");
  await page.goto("/studio");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await page
    .getByLabel("Technical findings and required changes", { exact: true })
    .fill(
      "Software QA review only. Add supporting sources and a verified blueprint objective before this can be educational material.",
    );
  await page
    .getByRole("checkbox", { name: /These are my own independent findings/ })
    .check();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Record review decision", exact: true })
    .click();
  await expect(
    page.locator(
      '.studio-item-heading .studio-status[data-status="changes_requested"]',
    ),
  ).toBeVisible();
  await screenshot(page, `studio-reviewer-${info.project.name}`);
  await identify(page, "author");
  await page.goto("/studio");
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await page
    .getByRole("button", { name: "Create a new draft revision", exact: true })
    .click();
  await page
    .getByLabel("Content title", { exact: true })
    .fill(`${title} revised`);
  await page
    .getByRole("button", { name: "Save new draft revision", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `${title} revised`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Revision 1 · changes requested", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Revision 2 · draft", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: new RegExp(`${title} revised`) })
    .click();
  await expect(
    page.getByText("Revision 2 · draft", { exact: true }),
  ).toBeVisible();
});

test("import previews errors, confirms draft-only records, and rejects duplicates", async ({
  page,
}, info) => {
  await identify(page, "author");
  await page.goto("/studio");
  await page
    .getByRole("button", { name: "Question import", exact: true })
    .click();
  const response = await page.request.get("/api/studio?template=questions");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain("attachment");
  const template = await response.json();
  const record = structuredClone(template[0]);
  record.title = `Original import QA ${info.project.name} ${Date.now()}`;
  record.origin = "ai_generated";
  record.body.stem = `${record.title}: this tests draft import, not safety knowledge.`;
  const field = page.getByLabel("Question import JSON", { exact: true });
  await field.fill(JSON.stringify([{ ...record, status: "published" }]));
  await page
    .getByRole("button", { name: "Preview and validate import", exact: true })
    .click();
  await expect(
    page.getByText(/0 valid records · 1 validation errors/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Confirm draft-only import",
      exact: true,
    }),
  ).toBeDisabled();
  await field.fill(JSON.stringify([record]));
  await page
    .getByRole("button", { name: "Preview and validate import", exact: true })
    .click();
  await expect(
    page.getByText(/1 valid records · 0 validation errors · 0 duplicates/),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Confirm draft-only import", exact: true })
    .click();
  await expect(
    page.getByText(
      "1 records imported as drafts. No content was approved or published.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Preview and validate import", exact: true })
    .click();
  await expect(
    page.getByText(/1 valid records · 0 validation errors · 1 duplicates/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Confirm draft-only import",
      exact: true,
    }),
  ).toBeDisabled();
  await screenshot(page, `studio-import-${info.project.name}`);
  const state = await (await page.request.get("/api/studio")).json();
  const imported = state.items.find(
    (entry: { data: { title: string } }) => entry.data.title === record.title,
  );
  expect(imported.status).toBe("draft");
  expect(imported.data.origin).toBe("ai_generated");
  expect(
    imported.events.some(
      (event: { event: string }) => event.event === "import_ingested",
    ),
  ).toBe(true);
});

test("learner cannot access Studio and author cannot escalate or publish drafts", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: /Editorial access is protected/ }),
  ).toBeVisible();
  expect((await page.request.get("/api/studio")).status()).toBe(401);
  await page.goto("/practice?count=1");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+/);
  expect((await page.request.get("/api/studio")).status()).toBe(403);
  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: /Editorial access is protected/ }),
  ).toBeVisible();
  await identify(page, "author");
  const snapshot = await (await page.request.get("/api/studio")).json();
  const item = snapshot.items[0];
  expect(item).toBeTruthy();
  const result = await page.request.post("/api/studio", {
    headers: { Origin: "http://127.0.0.1:3300" },
    data: {
      action: "publish",
      id: item.id,
      revision: item.revision,
      rowVersion: item.rowVersion,
    },
  });
  expect(result.status()).toBe(403);
  const forged = await page.request.post("/api/studio", {
    headers: { Origin: "http://127.0.0.1:3300" },
    data: {
      action: "grant_role",
      role: "administrator",
      actorId: snapshot.access.actorId,
    },
  });
  expect(forged.status()).toBe(400);
  await page.goto("/studio");
  await expect(
    page.getByRole("button", { name: "Blueprint source review", exact: true }),
  ).toHaveCount(0);
});
