import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const identities = {
  author: "11111111-1111-4111-8111-111111111111",
  reviewer: "22222222-2222-4222-8222-222222222222",
};
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

test("coverage reads all 100 persisted drafts and every objective while approvals stay zero", async ({
  page,
}, info) => {
  await identify(page, "reviewer");
  await page.goto("/studio/coverage");
  await expect(
    page.getByRole("heading", { name: /See the gaps. Review the evidence/ }),
  ).toBeVisible();
  const metric = (label: string) =>
    page
      .locator(".coverage-metric")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("strong");
  const state = await (
    await page.request.get("/api/curriculum/coverage")
  ).json();
  // Both projects share the isolated database. Original Studio cases can add
  // an extra unmapped QA draft; the interface must report that actual record.
  expect(state.totals.questions).toBeGreaterThanOrEqual(100);
  await expect(metric("Questions")).toHaveText(String(state.totals.questions));
  await expect(metric("Source verified")).toHaveText("0");
  await expect(metric("Technically approved")).toHaveText("0");
  await expect(metric("Published")).toHaveText("0");
  expect(state.objectives).toHaveLength(78);
  expect(state.totals.objectivesWithoutQuestions).toBe(0);
  for (const [index, expected] of [37, 20, 22, 21].entries())
    expect(state.domains[index].questions).toBeGreaterThanOrEqual(expected);
  await capture(page, `coverage-${info.project.name}`);
  await page.getByLabel("Coverage domain", { exact: true }).selectOption("2");
  await page
    .getByRole("button", { name: "Apply coverage filters", exact: true })
    .click();
  await expect(metric("Questions")).toHaveText("20");
  await identify(page, "author");
  await page.goto("/studio");
  expect((await page.request.get("/api/curriculum/coverage")).status()).toBe(
    403,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("source examination is a separate step and unavailable evidence requests corrections without approval", async ({
  page,
}, info) => {
  const id =
    info.project.name === "mobile" ? "chst5-draft-002" : "chst5-draft-001";
  await identify(page, "author");
  await page.goto(`/studio?search=${id}`);
  await page
    .getByRole("button", { name: "Request source verification", exact: true })
    .click();
  await expect(
    page.locator(
      '.studio-item-heading .studio-status[data-status="source_verification_pending"]',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Publish approved revision",
      exact: true,
    }),
  ).toHaveCount(0);
  await identify(page, "reviewer");
  await page.goto(`/studio?search=${id}`);
  await page
    .getByLabel("Source verification 1 evidence notes", { exact: true })
    .fill(
      "Isolated QA finding: the source text was not available for examination. Supporting edition and section remain unknown.",
    );
  await page
    .getByLabel("Source verification findings", { exact: true })
    .fill(
      "Request actual source access and exact supporting citations. This QA action verifies workflow behavior, not technical content.",
    );
  await page
    .getByRole("checkbox", { name: /These source findings are my own/ })
    .check();
  await capture(page, `source-review-${info.project.name}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Record source verification", exact: true })
    .click();
  await expect(
    page.locator(
      '.studio-item-heading .studio-status[data-status="changes_requested"]',
    ),
  ).toBeVisible();
  const state = await (await page.request.get(`/api/studio?id=${id}`)).json();
  expect(state.status).toBe("changes_requested");
  expect(state.sourceVerifications.at(-1).decision).toBe("changes_requested");
  const coverage = await (
    await page.request.get("/api/curriculum/coverage")
  ).json();
  expect(coverage.totals.sourceVerified).toBe(0);
  expect(coverage.totals.approved).toBe(0);
  expect(coverage.totals.published).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
