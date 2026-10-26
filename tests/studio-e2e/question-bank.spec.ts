import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { questionCsvColumns } from "../../src/modules/studio/batch-import";
import {
  CHST_BLUEPRINT_ID,
  chstObjectives,
} from "../../src/modules/curriculum/catalog";
import type { StudioSnapshot } from "../../src/modules/studio/model";

const origin = "http://127.0.0.1:3300";
async function identify(page: Page, administrator: boolean) {
  await page.context().addCookies([
    {
      name: "credbuilt_demo",
      value: administrator
        ? "33333333-3333-4333-8333-333333333333"
        : "11111111-1111-4111-8111-111111111111",
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
function csv(fields: Record<string, string>) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return `${questionCsvColumns.join(",")}\r\n${questionCsvColumns.map((column) => quote(fields[column] || "")).join(",")}\r\n`;
}
async function capture(page: Page, name: string) {
  const directory =
    process.env.CREDBUILT_SCREENSHOT_DIR || "test-results/studio-screenshots";
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
}

test("only an administrator can validate and import CSV drafts, and external IDs remain unique", async ({
  page,
}, info) => {
  const stamp = Date.now();
  const id = `browser-question-bank-${info.project.name}-${stamp}`;
  const title = `Administrator CSV draft ${info.project.name} ${stamp}`;
  const fields: Record<string, string> = {
    id,
    certification: "chst",
    blueprint: CHST_BLUEPRINT_ID,
    objective: chstObjectives[0].id,
    domain: "1",
    topic: "Question Bank browser QA",
    subtopic: "CSV validation and draft boundaries",
    difficulty: "introductory",
    title,
    stem: `Which action saves this unreviewed software QA question without publishing it? ${info.project.name} ${stamp}`,
    choice_a: "Save an unpublished draft",
    choice_b: "Bypass the technical review",
    choice_c: "Treat a bibliography listing as verified evidence",
    choice_d: "Automatically publish the imported batch",
    correct_choice: "a",
    explanation:
      "This isolated interface QA question tests draft ingestion, not construction safety. Saving an import never verifies or publishes it.",
    rationale_a:
      "Saving a draft retains the independent source and technical review requirements.",
    rationale_b: "The source and technical review stages cannot be bypassed.",
    rationale_c:
      "A bibliography listing does not establish technical support for an answer.",
    rationale_d:
      "Import confirmation must create drafts rather than publications.",
    source_title: "Candidate source not examined; isolated software QA only",
    source_classification: "professional_guidance",
    origin: "ai_generated",
    content_kind: "instructional",
  };

  await identify(page, false);
  await page.goto("/studio/questions");
  await expect(
    page.getByRole("heading", {
      name: "Question Bank access is protected.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Question batch content", { exact: true }),
  ).toHaveCount(0);
  expect(
    (await page.request.get("/api/studio/questions?template=csv")).status(),
  ).toBe(403);
  const denied = await page.request.post("/api/studio/questions", {
    headers: { Origin: origin },
    data: { action: "preview", format: "csv", text: csv(fields) },
  });
  expect(denied.status()).toBe(403);

  await identify(page, true);
  await page.goto("/studio/questions");
  await expect(
    page.getByRole("heading", { name: "Question Bank.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", {
      name: "Filter Studio content type",
      exact: true,
    }),
  ).toHaveValue("question");
  await expect(
    page.getByRole("combobox", {
      name: "Filter Studio content type",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Question import", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Import question drafts from CSV or JSON.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Question file format", { exact: true })
    .selectOption("csv");
  await page
    .getByLabel("Question batch content", { exact: true })
    .fill(csv({ ...fields, correct_choice: "z" }));
  await page
    .getByRole("button", { name: "Preview CSV or JSON import", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Question Bank import preview",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/Row 2:.*correct.*choice/i)).toBeVisible();
  const confirm = page.getByRole("button", {
    name: "Confirm draft-only Question Bank import",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await capture(page, `question-bank-validation-${info.project.name}`);

  await page
    .getByLabel("Question batch content", { exact: true })
    .fill(csv(fields));
  await page
    .getByRole("button", { name: "Preview CSV or JSON import", exact: true })
    .click();
  await expect(
    page.getByText("1 valid records · 0 errors · 0 duplicates", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(
    page.getByRole("status").filter({
      hasText:
        "1 questions imported as drafts. No content was approved or published.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Content library", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.studio-item-heading .studio-status[data-status="draft"]'),
  ).toBeVisible();
  const snapshot = (await (
    await page.request.get(
      `/api/studio?kind=question&search=${encodeURIComponent(title)}`,
    )
  ).json()) as StudioSnapshot;
  const item = snapshot.items.find((entry) => entry.data.title === title)!;
  expect(item).toBeTruthy();
  expect(item.status).toBe("draft");
  expect(item.reviews).toEqual([]);
  expect(item.sourceVerifications).toEqual([]);
  await capture(page, `question-bank-draft-${info.project.name}`);

  // Changing the title and wording cannot bypass a previously ingested external ID.
  await page
    .getByRole("button", { name: "Question import", exact: true })
    .click();
  await page.getByLabel("Question batch content", { exact: true }).fill(
    csv({
      ...fields,
      title: `${title} changed`,
      stem: `${fields.stem} The wording was revised for this duplicate test.`,
    }),
  );
  await page
    .getByRole("button", { name: "Preview CSV or JSON import", exact: true })
    .click();
  await expect(
    page.getByText(
      `Row 2: external ID ${id} was already imported as ${item.id}.`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(confirm).toBeDisabled();
  if (item.data.kind !== "question")
    throw new Error("The imported record must remain a question draft.");
  await page
    .getByLabel("Question file format", { exact: true })
    .selectOption("json");
  await page.getByLabel("Question batch content", { exact: true }).fill(
    JSON.stringify([
      {
        id,
        content: {
          ...item.data,
          title: `${title} JSON duplicate`,
          body: {
            ...item.data.body,
            stem: `${fields.stem} This JSON wording is different again.`,
          },
        },
      },
    ]),
  );
  await page
    .getByRole("button", { name: "Preview CSV or JSON import", exact: true })
    .click();
  await expect(
    page.getByText(
      `Row 1: external ID ${id} was already imported as ${item.id}.`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(confirm).toBeDisabled();
  const readiness = await (
    await page.request.get("/api/exams?view=admin")
  ).json();
  expect(readiness.approvedTotal).toBe(0);
  expect(readiness.publishedTotal).toBe(0);
  expect(readiness.availability.eligibleTotal).toBe(0);
  expect(readiness.availability.canStart).toBe(false);
  expect(
    readiness.availability.domains.map(
      (domain: { shortfall: number }) => domain.shortfall,
    ),
  ).toEqual([73, 40, 45, 42]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
