import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { chstObjectives } from "../../src/modules/curriculum/catalog";
import type { ResearchSnapshot } from "../../src/modules/research/model";

const origin = "http://127.0.0.1:3300";
const identities = {
  author: "11111111-1111-4111-8111-111111111111",
  administrator: "33333333-3333-4333-8333-333333333333",
} as const;
test.setTimeout(90_000);
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
    process.env.CREDBUILT_RESEARCH_SCREENSHOT_DIR ||
    "/workspace/artifacts/chst-research/screenshots";
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await page.screenshot({
    path: `${directory}/${name}.png`,
    fullPage: true,
    scale: "css",
    caret: "initial",
  });
}

test("research source records and documents require connected administrator access", async ({
  page,
}) => {
  await identify(page, "author");
  await page.goto("/studio/research");
  await expect(
    page.getByRole("heading", {
      name: "Research administration is protected.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Parse authorized document",
      exact: true,
    }),
  ).toHaveCount(0);
  const read = await page.request.get("/api/studio/research");
  expect(read.status()).toBe(403);
  expect(read.headers()["cache-control"]).toContain("no-store");
  const write = await page.request.post("/api/studio/research", {
    headers: { Origin: origin },
    data: { action: "enqueue", sourceId: "not-authorized" },
  });
  expect(write.status()).toBe(403);
});

test("an authorized private document is parsed, searchable and linked without automatic source or question approval", async ({
  page,
}, info) => {
  await identify(page, "administrator");
  const stamp = `${info.project.name}-${Date.now()}`;
  const title = `Synthetic research QA ${stamp}`;
  const sourceText = `Original software QA text ${stamp}: processing and objective links do not establish construction-safety accuracy.`;
  const html = `<!doctype html><html><head><title>${title}</title></head><body><nav>Unrelated navigation QA text</nav><main><h1>${title}</h1><section id="scope"><h2>Traceable private section</h2><p>${sourceText}</p></section><section id="table"><h2>Table requiring examination</h2><table><tr><th>Software QA value</th></tr><tr><td>Example only</td></tr></table></section></main></body></html>`;
  await page.goto("/studio/research");
  await expect(
    page.getByRole("heading", { name: "Research Studio.", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Register a source or licensed reference", { exact: true })
    .click();
  await page
    .getByLabel("Research source URL", { exact: true })
    .fill(`https://www.osha.gov/construction?credbuilt-research-qa=${stamp}`);
  await page.getByLabel("Research source title", { exact: true }).fill(title);
  await page
    .getByLabel("Research publisher", { exact: true })
    .fill("CredBuilt isolated software QA author — not an OSHA publication");
  await page
    .getByLabel("Research source classification", { exact: true })
    .selectOption("credbuilt_instruction");
  await page
    .getByLabel("Research access classification", { exact: true })
    .selectOption("user_supplied");
  await page
    .getByLabel("Research licensing classification", { exact: true })
    .selectOption("licensed_private");
  await page
    .getByLabel("Research access and rights notes", { exact: true })
    .fill(
      "Original synthetic software QA HTML, authorized for private processing. The allowlisted source URL exercises queue validation only; this is not retrieved OSHA material or construction instruction.",
    );
  await page
    .getByRole("button", { name: "Register unverified source", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Source registered as unverified." }),
  ).toBeVisible();
  await page
    .locator(".research-source-list button")
    .filter({ hasText: title })
    .click();
  const selected = page.getByRole("region", {
    name: "Selected research source",
  });
  await expect(
    selected.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    selected.getByText("No processed document", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Authorized source content", { exact: true })
    .fill(html);
  const parse = page.getByRole("button", {
    name: "Parse authorized document",
    exact: true,
  });
  await expect(parse).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "I have the right to process this copy privately and the supplied content is accurately identified.",
      exact: true,
    })
    .check();
  await parse.click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Authorized document imported and processed." }),
  ).toBeVisible();
  const processed = page
    .getByRole("heading", { name: "Processed source sections", exact: true })
    .locator("..");
  await expect(
    processed.getByText(sourceText, { exact: false }).first(),
  ).toBeVisible();
  await expect(
    processed.getByText("Unrelated navigation QA text", { exact: true }),
  ).toHaveCount(0);
  const results = (await (
    await page.request.get(
      `/api/studio/research?search=${encodeURIComponent(title)}`,
    )
  ).json()) as ResearchSnapshot;
  const source = results.sources.find((source) => source.title === title)!;
  expect(source).toBeTruthy();
  expect(source.documentHash).toMatch(/^[a-f0-9]{64}$/);
  expect(source.sectionsProcessed).toBeGreaterThan(0);
  expect(source.status).not.toBe("verified");
  const detail = (await (
    await page.request.get(
      `/api/studio/research?sourceId=${encodeURIComponent(source.id)}`,
    )
  ).json()) as ResearchSnapshot;
  expect(
    detail.sections.filter((section) => section.sourceId === source.id).length,
  ).toBeGreaterThan(0);
  expect(detail.sections.some((section) => section.needsManualReview)).toBe(
    true,
  );

  await page
    .getByText("Edit selected source metadata", { exact: true })
    .click();
  await expect(
    page.getByLabel("Metadata original source URL", { exact: true }),
  ).toHaveAttribute("readonly", "");
  await page
    .getByLabel("Metadata publisher", { exact: true })
    .fill("Corrected CredBuilt software QA author — not publisher research");
  await page
    .getByRole("button", {
      name: "Save source metadata correction",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Source metadata corrected." }),
  ).toBeVisible();
  const corrected = (await (
    await page.request.get(
      `/api/studio/research?sourceId=${encodeURIComponent(source.id)}`,
    )
  ).json()) as ResearchSnapshot;
  expect(
    corrected.sources.find((item) => item.id === source.id)?.metadataRevision,
  ).toBeGreaterThan(source.metadataRevision || 1);
  expect(
    corrected.sources.find((item) => item.id === source.id)?.documentHash,
  ).toBe(source.documentHash);
  const flagged = detail.sections.find(
    (section) =>
      section.sourceId === source.id &&
      section.needsManualReview &&
      section.text.trim(),
  );
  expect(flagged).toBeTruthy();
  const flaggedArticle = processed
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: flagged!.title, exact: true }),
    })
    .first();
  await flaggedArticle
    .getByLabel("Section examination outcome", { exact: true })
    .selectOption("resolved");
  await flaggedArticle
    .getByLabel("Section examination findings", { exact: true })
    .fill(
      "The original synthetic software QA table and extracted text were compared for this test. This is not evidence supporting a CHST technical answer.",
    );
  await flaggedArticle
    .getByRole("checkbox", {
      name: "I personally examined this exact original page or section and recorded accurate findings. This is not an AI attestation.",
      exact: true,
    })
    .check();
  await flaggedArticle
    .getByRole("button", { name: "Save section examination", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Section examination recorded" }),
  ).toBeVisible();
  const examined = (await (
    await page.request.get(
      `/api/studio/research?sourceId=${encodeURIComponent(source.id)}`,
    )
  ).json()) as ResearchSnapshot;
  expect(
    examined.sections.find((section) => section.id === flagged!.id)
      ?.needsManualReview,
  ).toBe(true);
  expect(
    examined.sections.find((section) => section.id === flagged!.id)
      ?.manualReviewResolved,
  ).toBe(true);
  expect(
    examined.sources.find((item) => item.id === source.id)?.status,
  ).not.toBe("verified");

  await page
    .getByLabel("Research blueprint objective", { exact: true })
    .selectOption(chstObjectives[0].id);
  await page
    .getByLabel("Research objective relationship notes", { exact: true })
    .fill(
      "Synthetic software-test relevance only; not verified evidence for this safety objective.",
    );
  await page
    .getByRole("button", { name: "Save objective relationship", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Objective relationship saved." }),
  ).toBeVisible();
  await page
    .getByLabel("Research examination findings", { exact: true })
    .fill(
      "This exact synthetic software QA document was examined for test assertions only. It does not support construction-safety instruction; actual authoritative source evidence is still required.",
    );
  await page
    .getByRole("checkbox", {
      name: "I personally examined this exact document and recorded accurate findings. This is not an AI attestation.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Save human source examination", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Human source examination recorded" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Queue source retrieval", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Retrieval job queued." }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByLabel("Search research sources and sections", { exact: true })
    .fill(`Original software QA text ${stamp}`);
  const searched = page.waitForResponse((response) => {
    const destination = new URL(response.url());
    return (
      destination.pathname === "/api/studio/research" &&
      destination.searchParams.get("search") ===
        `Original software QA text ${stamp}`
    );
  });
  await page
    .getByRole("button", { name: "Search research inventory", exact: true })
    .click();
  const searchResponse = await searched;
  expect(searchResponse.status()).toBe(200);
  expect(
    ((await searchResponse.json()) as ResearchSnapshot).sources.map(
      (item) => item.id,
    ),
  ).toContain(source.id);
  await expect(
    page.locator(".research-source-list button").filter({ hasText: title }),
  ).toBeVisible();
  await page
    .locator(".research-source-list button")
    .filter({ hasText: title })
    .click();
  await expect(
    processed.getByText(sourceText, { exact: false }).first(),
  ).toBeVisible();
  const final = (await (
    await page.request.get(
      `/api/studio/research?sourceId=${encodeURIComponent(source.id)}`,
    )
  ).json()) as ResearchSnapshot;
  expect(
    final.sources.find((item) => item.id === source.id)?.objectiveIds,
  ).toContain(chstObjectives[0].id);
  expect(final.sources.find((item) => item.id === source.id)?.status).not.toBe(
    "verified",
  );
  expect(
    final.jobs.some(
      (job) =>
        job.sourceId === source.id && ["queued", "retry"].includes(job.state),
    ),
  ).toBe(true);
  const readiness = await (
    await page.request.get("/api/exams?view=admin")
  ).json();
  expect(readiness.availability.productionEligibleTotal).toBe(0);
  expect(readiness.availability.productionReady).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, `research-document-${info.project.name}`);
});
