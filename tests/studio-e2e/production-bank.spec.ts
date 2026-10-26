import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import type {
  ContentDraft,
  StudioSnapshot,
} from "../../src/modules/studio/model";

test.setTimeout(90_000);

const origin = "http://127.0.0.1:3300";
const identities = {
  author: "11111111-1111-4111-8111-111111111111",
  administrator: "33333333-3333-4333-8333-333333333333",
} as const;

async function identify(page: Page, role: keyof typeof identities) {
  await page.context().addCookies([
    {
      name: "credbuilt_demo",
      value: identities[role],
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function capture(page: Page, name: string) {
  const directory =
    process.env.CREDBUILT_SCREENSHOT_DIR ||
    "/workspace/artifacts/question-bank-development";
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
}

async function expectNoProductionQuestions(page: Page) {
  const response = await page.request.get("/api/exams?view=admin");
  expect(response.status()).toBe(200);
  const readiness = await response.json();
  expect(readiness.approvedTotal).toBe(0);
  expect(readiness.publishedTotal).toBe(0);
  expect(readiness.availability.productionEligibleTotal).toBe(0);
  expect(readiness.availability.productionReady).toBe(false);
  expect(
    readiness.availability.productionDomains.map(
      (domain: { shortfall: number }) => domain.shortfall,
    ),
  ).toEqual([73, 40, 45, 42]);
}

async function savedQuestions(page: Page) {
  const saved: StudioSnapshot["items"] = [];
  let pages = 1;
  for (let number = 1; number <= pages; number++) {
    const response = await page.request.get(
      `/api/studio?kind=question&page=${number}`,
    );
    expect(response.status()).toBe(200);
    const snapshot = (await response.json()) as StudioSnapshot;
    saved.push(...snapshot.items);
    pages = snapshot.pagination?.pages || 1;
  }
  return saved;
}

test("the production dashboard reports stored content, targets and shortages behind administrator access", async ({
  page,
}, info) => {
  await identify(page, "author");
  await page.goto("/studio/questions/production");
  await expect(
    page.getByRole("heading", {
      name: "Question production is protected.",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (await page.request.get("/api/studio/questions/drafts")).status(),
  ).toBe(403);
  await page.goto("/studio/references");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /protected|authorized|access/i,
  );

  await identify(page, "administrator");
  await page.goto("/studio/questions/production");
  await expect(
    page.getByRole("heading", { name: /Question production/, level: 1 }),
  ).toBeVisible();
  const active = (await savedQuestions(page)).filter(
    (item) =>
      item.data.certificationId === "chst" &&
      item.data.blueprintRevisionId === "chst5-2022.04.12" &&
      item.data.contentKind === "instructional" &&
      item.status !== "retired",
  );
  expect(active.length).toBeGreaterThanOrEqual(100);
  await expect(
    page.getByTestId("production-metric-total").locator("strong"),
  ).toHaveText(String(active.length));
  await expect(
    page.getByTestId("production-metric-approved").locator("strong"),
  ).toHaveText("0");
  await expect(
    page.getByTestId("production-metric-published").locator("strong"),
  ).toHaveText("0");
  await expect(
    page.getByText("500-question launch target", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("2,000-question bank target", { exact: true }),
  ).toBeVisible();
  const readiness = page.getByRole("region", {
    name: "Full-length examination readiness",
  });
  // This is a real persisted bank of drafts; quantities must not become exam approvals.
  for (const shortage of [73, 40, 45, 42])
    await expect(
      readiness
        .getByRole("cell", {
          name: String(shortage),
          exact: true,
        })
        .last(),
    ).toBeVisible();
  await expectNoProductionQuestions(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, `question-production-${info.project.name}`);
});

test("the initial fifty AI questions can only become unverified drafts, and repeated imports are rejected", async ({
  page,
}, info) => {
  await identify(page, "administrator");
  const download = await page.request.get("/api/studio/questions/drafts");
  expect(download.status()).toBe(200);
  expect(download.headers()["cache-control"]).toContain("no-store");
  const batch = (await download.json()) as {
    id: string;
    content: ContentDraft;
  }[];
  expect(batch).toHaveLength(50);
  expect(new Set(batch.map((record) => record.id)).size).toBe(50);
  for (const { content } of batch) {
    expect(content.domain).toBe("1");
    expect(content.origin).toBe("ai_generated");
    expect(content.kind).toBe("question");
    if (content.kind === "question")
      expect(content.body.choices).toHaveLength(4);
  }
  await page.goto("/studio/questions");
  await page.getByRole("button", { name: "AI drafting", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Preview 50 Domain 1 drafts",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Question Bank import preview",
      exact: true,
    }),
  ).toBeVisible();
  const confirm = page.getByRole("button", {
    name: "Confirm draft-only Question Bank import",
    exact: true,
  });
  const duplicate = page.locator(".studio-import-errors").filter({
    hasText: /already imported|duplicates existing content/,
  });
  // Both viewports share one isolated editorial database. The first view imports
  // the exact shipped batch; subsequent views must exercise persistent deduplication.
  if (await duplicate.count()) {
    await expect(confirm).toBeDisabled();
  } else {
    await expect(
      page.getByText("50 valid records · 0 errors · 0 duplicates", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(
      page.getByRole("status").filter({
        hasText:
          "50 questions imported as drafts. No content was approved or published.",
      }),
    ).toBeVisible();
  }
  const snapshot = (await (
    await page.request.get(
      `/api/studio?kind=question&search=${encodeURIComponent(batch[0].content.title)}`,
    )
  ).json()) as StudioSnapshot;
  const item = snapshot.items.find(
    (entry) => entry.data.title === batch[0].content.title,
  );
  expect(item).toBeTruthy();
  expect(item!.status).toBe("draft");
  expect(item!.reviews).toEqual([]);
  expect(item!.sourceVerifications).toEqual([]);

  const repeated = await page.request.post("/api/studio/questions", {
    headers: { Origin: origin },
    data: { action: "preview", format: "json", text: JSON.stringify(batch) },
  });
  expect(repeated.status()).toBe(200);
  const repeatedPreview = await repeated.json();
  expect(repeatedPreview.duplicates.length).toBeGreaterThanOrEqual(50);
  const denied = await page.request.post("/api/studio/questions", {
    headers: { Origin: origin },
    data: { action: "confirm", previewId: repeatedPreview.id },
  });
  expect(denied.status()).toBe(422);
  expect((await denied.json()).error).toBe(
    "Resolve all import errors and duplicates before importing.",
  );
  await expectNoProductionQuestions(page);
  await page.goto(
    `/studio/questions?search=${encodeURIComponent(batch[0].content.title)}`,
  );
  await expect(
    page.getByRole("heading", {
      name: batch[0].content.title,
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, `domain-one-draft-${info.project.name}`);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("reference metadata and negative review findings persist without granting question approval", async ({
  page,
}, info) => {
  await identify(page, "author");
  expect((await page.request.get("/api/studio/references")).status()).toBe(403);
  await identify(page, "administrator");
  await page.goto("/studio/references");
  await expect(
    page.getByRole("heading", {
      name: "Technical Reference Registry.",
      exact: true,
    }),
  ).toBeVisible();
  const title = `Synthetic reference workflow QA ${info.project.name} ${Date.now()}`;
  await page.getByLabel("Document title", { exact: true }).fill(title);
  await page
    .getByLabel("Issuing organization", { exact: true })
    .fill("Isolated software QA fixture; not a technical authority");
  await page
    .getByLabel("Section or chapter", { exact: true })
    .fill("Synthetic metadata workflow only");
  await page
    .getByLabel("Source URL", { exact: true })
    .fill("https://example.test/synthetic-reference-workflow");
  await page
    .getByLabel("Topics (one per line)", { exact: true })
    .fill("Source review workflow QA");
  await page
    .getByLabel("Rights and access limitations", { exact: true })
    .fill(
      "Synthetic test metadata. No publication or redistribution rights are asserted.",
    );
  await page
    .getByRole("button", {
      name: "Save unverified metadata",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Reference saved as unverified metadata.",
    }),
  ).toBeVisible();
  const article = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
  await expect(article).toContainText("unverified");
  await article.getByRole("button", { name: /^Manage / }).click();
  await expect(
    page.getByLabel("Examination outcome", { exact: true }),
  ).toHaveValue("needs_revision");
  await page
    .getByLabel("Findings, examined edition, sections and access conditions", {
      exact: true,
    })
    .fill(
      "AUTOMATED QA FIXTURE: no authoritative technical source was retrieved or examined. This negative finding tests immutable workflow history only. Obtain real source access before any verification.",
    );
  // This isolated test simulates a review form submission. It deliberately
  // records needs_revision and creates no real human verification evidence.
  await page
    .getByRole("checkbox", {
      name: /I personally examined this source and recorded accurate findings/,
    })
    .check();
  await page
    .getByRole("button", {
      name: "Record human examination",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText:
        "Human source examination recorded for the exact metadata revision.",
    }),
  ).toBeVisible();
  await expect(article).toContainText("needs revision");
  await page.reload();
  await article.getByRole("button", { name: /^Manage / }).click();
  await expect(
    page.getByText(/AUTOMATED QA FIXTURE: no authoritative technical source/),
  ).toBeVisible();
  await expectNoProductionQuestions(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, `reference-registry-${info.project.name}`);
});
