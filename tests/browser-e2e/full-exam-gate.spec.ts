import { expect, test } from "@playwright/test";

test("demonstration availability is separate from the protected production exam bank", async ({
  page,
}) => {
  await page.goto("/exam");
  const overview = page.getByRole("region", {
    name: "CHST Full-Length Exam Simulation",
  });
  await expect(overview).toBeVisible();
  await expect(
    overview.getByRole("button", {
      name: "Start 200-question demonstration exam",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    overview.getByText(/Production.*Not Ready/i).first(),
  ).toBeVisible();
  await expect(
    overview.getByText(/Demonstration.*Available/i).first(),
  ).toBeVisible();
  await expect(
    overview.getByText(
      /unverified.*duration|duration.*unverified|not a verified official duration/i,
    ),
  ).toHaveCount(0);
  await expect(overview.getByLabel("Local QA duration (seconds)")).toHaveCount(
    0,
  );
  const get = await page.request.get("/api/exams?view=availability");
  expect(get.status()).toBe(403);
  expect(get.headers()["cache-control"]).toContain("no-store");
  const start = await page.request.post("/api/exams", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: { action: "start", developmentFixture: true, durationSeconds: 1 },
  });
  expect(start.status()).toBe(403);
  await overview
    .getByRole("link", { name: "Exam History", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Exam History/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/browser.*demonstration|browser-only/i).first(),
  ).toBeVisible();
  await page.goto("/studio/exams");
  await expect(
    page.getByRole("heading", { name: /Exam management is protected/ }),
  ).toBeVisible();
  for (const path of [
    "/studio/questions",
    "/studio/questions/production",
    "/studio/references",
    "/studio/research",
    "/studio/curriculum",
    "/studio/questions/quality",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /protected|access/i,
    );
    await expect(
      page.getByRole("button", { name: "Preview 50 Domain 1 drafts" }),
    ).toHaveCount(0);
  }
  for (const path of [
    "/api/studio/questions/drafts",
    "/api/studio/references",
    "/api/studio/research",
    "/api/studio/curriculum",
    "/api/studio/questions/quality",
    "/api/studio/drafting-jobs",
  ]) {
    const response = await page.request.get(path);
    expect([401, 403]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
