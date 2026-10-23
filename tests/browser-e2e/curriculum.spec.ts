import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function capture(page: Page, name: string, fullPage = false) {
  const directory =
    process.env.CREDBUILT_SCREENSHOT_DIR ||
    "test-results/curriculum-screenshots";
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage });
}

test("all attached blueprint statements are navigable and objective practice stays an unreviewed demonstration", async ({
  page,
}, info) => {
  await page.goto("/curriculum");
  await expect(
    page.getByText("78 statements · 4 domains", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "78 of 78 statements match",
  );
  await capture(page, `curriculum-${info.project.name}`);
  await page.getByRole("button", { name: /DOMAIN 1 · 36.6%/ }).click();
  await expect(page.getByRole("status")).toHaveText(
    "36 of 78 statements match",
  );
  await page
    .getByRole("textbox", { name: "Search blueprint objectives", exact: true })
    .fill("hot work");
  await expect(page.getByRole("status")).toHaveText("1 of 78 statements match");
  await page
    .getByRole("heading", {
      name: "Common hazards and controls associated with hot work",
      exact: true,
    })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/CHST5-2022\.04\.12-D1-K01/);
  await expect(
    page.getByText("CHST5 V.2022.04.12", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Current official-version confirmation remains pending/),
  ).toBeVisible();
  await capture(page, `objective-${info.project.name}`, true);
  await page
    .getByRole("link", {
      name: "Practice unreviewed draft examples",
      exact: false,
    })
    .click();
  await expect(page).toHaveURL(/bank=curriculum_drafts.*objective=CHST5/);
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByText("QUESTION 1 OF 1", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByText("Technical references and verification", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Candidate reference only/).first(),
  ).toBeVisible();
  await capture(page, `draft-feedback-${info.project.name}`, true);
  await page.reload();
  await expect(
    page.getByText("Technical references and verification", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("bibliography preserves its version without claiming source examination, and Studio coverage remains protected", async ({
  page,
}) => {
  await page.goto("/reference");
  await expect(page.getByText(/V.2021.06.09/).first()).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search references", exact: true })
    .fill("Oakley");
  await expect(page.getByText("1 resources", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Accident Investigation Techniques; 2nd Edition",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Bibliography only · source not reviewed", { exact: true }),
  ).toBeVisible();
  await page.goto("/studio/coverage");
  await expect(
    page
      .getByRole("heading", {
        name: /protected|authorized|unavailable|coverage/i,
      })
      .first(),
  ).toBeVisible();
  expect((await page.request.get("/api/curriculum/coverage")).status()).toBe(
    403,
  );
});

test("a 100-question draft session navigates, saves bookmarks, and opens an actual bookmarked review", async ({
  page,
}) => {
  await page.goto("/practice?bank=curriculum_drafts&count=100");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByText("QUESTION 1 OF 100", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Go to question/ }),
  ).toHaveCount(100);
  const bookmarkedStem = await page.locator("h2.question-stem").innerText();
  await page
    .getByRole("button", { name: "Bookmark question", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Flag for review", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Flag for review", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Go to question 100", exact: true })
    .click();
  await expect(
    page.getByText("QUESTION 100 OF 100", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Go to question 1, flagged/ }).click();
  await expect(page.locator("h2.question-stem")).toHaveText(bookmarkedStem);
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/practice?bank=curriculum_drafts&count=1&review=bookmarked");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByText("QUESTION 1 OF 1", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("h2.question-stem")).toHaveText(bookmarkedStem);
});
