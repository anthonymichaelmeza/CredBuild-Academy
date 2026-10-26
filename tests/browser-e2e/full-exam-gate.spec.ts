import { expect, test } from "@playwright/test";

test("full-length examination stays locked in the credential-free browser demo", async ({
  page,
}) => {
  await page.goto("/exam");
  const overview = page.getByRole("region", {
    name: "CHST Full-Length Exam Simulation",
  });
  await expect(overview).toBeVisible();
  await expect(
    overview.getByRole("button", {
      name: "Start full-length exam",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    overview.getByText(/zero approved, published exam questions/),
  ).toBeVisible();
  await expect(
    overview.getByText(/not a verified official duration/),
  ).toBeVisible();
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
