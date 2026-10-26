import { expect, test, type Page } from "@playwright/test";
import { chstObjectives } from "../../src/modules/curriculum/catalog";
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
function jobResponse(page: Page, action: string) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/studio/drafting-jobs") &&
      response.request().method() === "POST" &&
      response.request().postDataJSON().action === action,
  );
}
test("source-gated drafting jobs preserve actual blocked requests without model output or question creation", async ({
  page,
}, info) => {
  await identify(page, false);
  expect((await page.request.get("/api/studio/drafting-jobs")).status()).toBe(
    403,
  );
  expect(
    (
      await page.request.post("/api/studio/drafting-jobs", {
        headers: { Origin: origin },
        data: {
          action: "create",
          requestKey: crypto.randomUUID(),
          request: {
            objectiveId: chstObjectives[0].id,
            count: 3,
            difficulty: "intermediate",
            sourceIds: ["no-actual-source"],
          },
        },
      })
    ).status(),
  ).toBe(403);
  await identify(page, true);
  const title = `Synthetic drafting UI access gap ${info.project.name} ${Date.now()}`;
  const registration = await page.request.post("/api/studio/research", {
    headers: { Origin: origin },
    data: {
      action: "register",
      source: {
        originalUrl: "",
        title,
        publisher: "Synthetic software workflow QA only",
        classification: "technical_research",
        access: "user_supplied",
        license: "licensed_private",
        licensedIdentifier: title,
        rightsNotes:
          "No source bytes supplied, no technical review, no real construction safety evidence.",
      },
    },
  });
  expect(registration.status()).toBe(200);
  const inventory = await (
    await page.request.get(
      `/api/studio/research?search=${encodeURIComponent(title)}`,
    )
  ).json();
  const source = inventory.sources.find(
    (item: { title: string }) => item.title === title,
  );
  expect(source).toBeTruthy();
  const before = await (
    await page.request.get("/api/studio?kind=question")
  ).json();
  await page.goto("/studio/questions");
  await page.getByRole("button", { name: "AI drafting", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Plan drafts from reviewed evidence.",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Requested draft count", { exact: true }).fill("3");
  await page.getByLabel("Job source IDs", { exact: true }).fill(source.id);
  const savedResponse = jobResponse(page, "create");
  await page
    .getByRole("button", {
      name: "Save source-gated drafting job",
      exact: true,
    })
    .click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(200);
  const job = await saved.json();
  expect(job.status).toBe("blocked_sources");
  expect(job.brief).toBeNull();
  expect(job.sourcePins).toEqual([]);
  expect(job.linkedQuestions).toEqual([]);
  const card = page
    .locator("article.studio-repeated")
    .filter({ hasText: job.id });
  await expect(card).toBeVisible();
  await expect(card).toContainText("0 actual imported drafts linked");
  const preparedResponse = jobResponse(page, "prepare");
  await card
    .getByRole("button", {
      name: "Check sources and prepare brief",
      exact: true,
    })
    .click();
  const prepared = await (await preparedResponse).json();
  expect(prepared.status).toBe("blocked_sources");
  expect(prepared.brief).toBeNull();
  expect(prepared.revision).toBe(job.revision);
  await page.reload();
  await page.getByRole("button", { name: "AI drafting", exact: true }).click();
  await expect(card).toBeVisible();
  await expect(card).toContainText("BLOCKED SOURCES");
  const cancelResponse = jobResponse(page, "cancel");
  await card
    .getByRole("button", { name: "Cancel drafting job", exact: true })
    .click();
  const cancelled = await (await cancelResponse).json();
  expect(cancelled.status).toBe("cancelled");
  expect(cancelled.revision).toBe(job.revision + 1);
  expect(cancelled.linkedQuestions).toEqual([]);
  await expect(card).toContainText("CANCELLED");
  const after = await (
    await page.request.get("/api/studio?kind=question")
  ).json();
  expect(after.pagination.total).toBe(before.pagination.total);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
