import { expect, test } from "@playwright/test";
test("production browser demo works without account, database, or progress API", async ({
  page,
  browser,
}) => {
  const progressRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/practice"))
      progressRequests.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Welcome to your workspace/ }),
  ).toBeVisible();
  await expect(page.getByRole("note")).toContainText(
    "Browser-only demonstration",
  );
  await page
    .getByRole("main")
    .getByRole("link", { name: "Start practicing", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Only 12",
  );
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+/);
  const url = page.url();
  await page
    .getByRole("button", { name: "Bookmark question", exact: true })
    .click();
  await page.getByRole("button", { name: "Flag for review" }).click();
  await expect(
    page.getByRole("button", { name: "Flag for review" }),
  ).toHaveAttribute("aria-pressed", "true");
  for (let i = 0; i < 10; i++) {
    if (i) await page.getByRole("button", { name: "Next question" }).click();
    await page.getByRole("radio").first().check();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(page.getByText(`${i + 1} / 10 answered`)).toBeVisible();
    if (!i) {
      await page.reload();
      await expect(page.getByText("1 / 10 answered")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Remove bookmark", exact: true }),
      ).toBeVisible();
    }
  }
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Submit session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /You put in the work/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review missed questions" }).click();
  await expect(
    page.getByRole("heading", { name: "Learn from every answer." }),
  ).toBeVisible();
  await page.goto("/performance");
  await expect(
    page.getByRole("link", { name: /Adaptive practice · demo/ }),
  ).toBeVisible();
  const stranger = await browser.newContext();
  const other = await stranger.newPage();
  await other.goto(url);
  await expect(
    other.getByRole("heading", { name: /isn’t stored in this browser/ }),
  ).toBeVisible();
  await stranger.close();
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: /Browser demo settings/ }),
  ).toBeVisible();
  await expect(page.getByText("1 / 100", { exact: true })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset browser demo" }).click();
  await expect(page.getByText("0 / 100", { exact: true })).toBeVisible();
  expect(progressRequests).toEqual([]);
  expect(
    (await page.context().cookies()).filter((c) => c.name === "credbuilt_demo"),
  ).toHaveLength(0);
  expect(
    (
      await page.request.post("/api/practice", { data: { action: "start" } })
    ).status(),
  ).toBe(403);
  expect((await page.request.post("/api/admin", { data: {} })).status()).toBe(
    403,
  );
});
test("all navigation destinations render and blocked site storage is explained", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/",
    "/learn",
    "/practice",
    "/exam",
    "/performance",
    "/flashcards",
    "/reference",
    "/planner",
    "/settings",
    "/admin",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "We couldn’t load this workspace." }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Learn", exact: true }).click();
    await expect(page).toHaveURL(/\/learn/);
  }
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "storage is unavailable",
  );
  expect(errors).toEqual([]);
});
