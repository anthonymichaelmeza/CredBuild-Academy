import { expect, test } from "@playwright/test";
test("lesson reader persists completion and opens focused practice", async ({
  page,
}) => {
  await page.goto("/learn");
  await expect(
    page.getByRole("heading", { name: /Understand it. Apply it. Build on it/ }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search lessons" })
    .fill("task observation");
  await expect(
    page.getByText("1 lessons · reading times are estimates"),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "See the work. Recognize the risk." })
    .getByRole("link")
    .click();
  await expect(
    page.getByRole("button", { name: "Complete lesson", exact: true }),
  ).toBeDisabled();
  for (let i = 0; i < 3; i++)
    await page
      .getByRole("button", { name: "Mark section read", exact: true })
      .click();
  await page
    .getByRole("radio", {
      name: "Walk through the work with the crew and discuss what could cause harm.",
      exact: true,
    })
    .check();
  await page
    .locator("form.lesson-check")
    .nth(0)
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
  await page
    .getByRole("radio", {
      name: "Pause the affected work and reassess hazards with the responsible team.",
      exact: true,
    })
    .check();
  await page
    .locator("form.lesson-check")
    .nth(1)
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete lesson", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lesson completed", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Lesson completed", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Practice this topic", exact: true })
    .click();
  await expect(page.getByLabel("Focus topic", { exact: true })).toHaveValue(
    "Hazard recognition",
  );
  await expect(
    page.getByRole("button", { name: "1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByText("QUESTION 1 OF 1", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("exam rehearsal autosaves choices, hides feedback, and auto-submits on expiry", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/exam");
  await page.getByLabel("Demo minutes", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Start demo rehearsal", exact: true })
    .click();
  await expect(page).toHaveURL(/\/practice\/[a-f0-9-]+/);
  await page.getByRole("radio", { name: "Low", exact: true }).check();
  await page.getByRole("radio").first().check();
  await expect(page.getByText("1 / 5 answered", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Answer saved in this workspace. You can change it before submission.",
    ),
  ).toBeVisible();
  await expect(page.locator("section.feedback")).toHaveCount(0);
  await expect(page.locator(".answer-option.incorrect")).toHaveCount(0);
  await expect(page.locator(".answer-option.correct")).toHaveCount(0);
  await page.getByRole("radio").nth(1).check();
  await page.reload();
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Low", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Flag for review", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Filter question navigator", exact: true })
    .selectOption("flagged");
  await expect(
    page.getByRole("button", { name: /Go to question/ }),
  ).toHaveCount(1);
  await page.clock.fastForward(61_000);
  await expect(
    page.getByRole("heading", { name: /You put in the work/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Time expired — this session was automatically submitted.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("4 unanswered · counted as incorrect", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review all questions", exact: true })
    .click();
  await expect(page.locator("section.feedback")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /You put in the work/ }),
  ).toBeVisible();
});
test("analytics uses saved misses and review inspector cannot publish content", async ({
  page,
}) => {
  // Two real completed practice sessions produce the repeated-miss evidence.
  for (let i = 0; i < 2; i++) {
    await page.goto("/practice?domain=1&topic=Hazard%20recognition&count=1");
    await page
      .getByRole("button", { name: "Start session", exact: true })
      .click();
    await expect(
      page.getByText("QUESTION 1 OF 1", { exact: true }),
    ).toBeVisible();
    await page.getByRole("radio", { name: /Assume the previous crew/ }).check();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Submit session", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: /You put in the work/ }),
    ).toBeVisible();
  }
  await page.goto("/performance");
  await expect(
    page.getByText("2 misses / 2 attempts", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /See the work. Recognize the risk/ }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Topic", exact: true })
    .selectOption("Control selection");
  await expect(
    page.getByText(
      "No answered questions match these filters. Unattempted topics are not assigned zero accuracy.",
    ),
  ).toBeVisible();
  await page.goto("/admin");
  await page
    .getByLabel("Check a hypothetical gate", { exact: true })
    .selectOption("published");
  await page
    .getByRole("button", { name: "Inspect gate — no changes", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "cannot enter the published bank",
  );
  expect(
    (
      await page.request.post("/api/admin", { data: { action: "publish" } })
    ).status(),
  ).toBe(403);
});
