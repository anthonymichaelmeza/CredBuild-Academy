import { expect, test } from "@playwright/test";
test("complete demo practice, save progress, review, and isolate another browser", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Welcome to your workspace/ }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Start practicing", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "25", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Flag for review" }).click();
  await expect(
    page.getByRole("button", { name: "Flag for review" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("1 / 10 answered")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 / 10 answered")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toBeVisible();
  for (let i = 1; i < 10; i++) {
    await page.getByRole("button", { name: "Next question" }).click();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText(`${i + 1} / 10 answered`)).toBeVisible();
  }
  page.once("dialog", (dialog) => dialog.accept());
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
  await expect(other).toHaveURL(/\/settings/);
  await other.goto("/practice");
  await other.getByRole("button", { name: "10", exact: true }).click();
  await other
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(other).toHaveURL(/\/practice\/[a-f0-9-]+/);
  await other.goto(url);
  await expect(
    other.getByRole("heading", { name: "That page isn’t available." }),
  ).toBeVisible();
  await stranger.close();
});
test("reference search and navigation remain usable without horizontal overflow", async ({
  page,
  isMobile,
}) => {
  await page.goto("/reference");
  await page.getByRole("textbox", { name: "Search references" }).fill("NIOSH");
  await expect(page.getByText("1 resources", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Visit publisher" })).toHaveCount(
    1,
  );
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("link", { name: "Exam Simulator", exact: true })
      .click();
  } else
    await page
      .getByRole("link", { name: "Exam Simulator", exact: true })
      .click();
  await expect(
    page.getByRole("heading", { name: "Not available yet" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
