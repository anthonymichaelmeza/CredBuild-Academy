import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { browserFullExamQuestions } from "../../src/demo/full-exam-questions";
import type { Session } from "../../src/modules/practice/types";

const storageKey = "credbuilt.browser-demo.v1";
async function stored(page: Page, id: string): Promise<Session> {
  return page.evaluate(
    ({ storageKey, id }) => {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) throw new Error("No demonstration activity was saved.");
      const state = JSON.parse(raw) as { sessions: Session[] };
      const session = state.sessions.find((item) => item.id === id);
      if (!session) throw new Error("The examination was not saved.");
      return session;
    },
    { storageKey, id },
  );
}
async function saved(page: Page) {
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "All changes saved in this browser." }),
  ).toBeVisible();
}
async function start(page: Page) {
  await page.goto("/exam");
  await page
    .getByRole("button", {
      name: "Start 200-question demonstration exam",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/exam\/[0-9a-f-]{36}$/);
  await expect(
    page.getByText("QUESTION 1 OF 200", { exact: true }),
  ).toBeVisible();
  return new URL(page.url()).pathname.split("/").at(-1)!;
}
async function capture(page: Page, name: string, fullPage = false) {
  const directory =
    process.env.CREDBUILT_SCREENSHOT_DIR ||
    "test-results/exam-activation-screenshots";
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage });
}

test("complete all 200 demonstration questions, persist the attempt, and review real results without services", async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  const progressRequests: string[] = [];
  page.on("request", (request) => {
    if (
      /\/api\/(?:exams|practice|learning|profile)(?:\?|$)/.test(
        new URL(request.url()).pathname,
      )
    )
      progressRequests.push(request.url());
  });
  const id = await start(page);
  const initial = await stored(page, id);
  expect(initial.questionIds).toHaveLength(200);
  expect(new Set(initial.questionIds).size).toBe(200);
  expect(initial.examKind).toBe("chst_full_length");
  expect(initial.developmentFixture).toBe(true);
  expect(initial.bank).not.toBe("published");
  expect(Date.parse(initial.deadlineAt!) - Date.parse(initial.createdAt)).toBe(
    14_400_000,
  );
  const fixtureById = new Map(
    browserFullExamQuestions.map((question) => [question.id, question]),
  );
  expect(
    ["1", "2", "3", "4"].map(
      (domain) =>
        initial.questionIds.filter(
          (questionId) => fixtureById.get(questionId)?.domain === domain,
        ).length,
    ),
  ).toEqual([73, 40, 45, 42]);
  await expect(
    page.getByRole("button", { name: /^Go to question \d+,/ }),
  ).toHaveCount(200);
  await expect(page.locator(".full-exam-clock")).toContainText(/0[34]:/);
  await expect(
    page.locator(".full-exam-answers .correct,.full-exam-answers .incorrect"),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Detailed explanation|Answer explanation/, { exact: true }),
  ).toHaveCount(0);
  // The attempted answer is editable, and review flags survive refresh.
  await page.getByRole("radio").nth(1).check();
  await saved(page);
  await page.getByRole("radio").first().check();
  await saved(page);
  await page
    .getByRole("button", { name: "Mark for review", exact: true })
    .click();
  await saved(page);
  await page.getByRole("button", { name: /^Go to question 100,/ }).click();
  await saved(page);
  await page.reload();
  await expect(
    page.getByText("QUESTION 100 OF 200", { exact: true }),
  ).toBeVisible();
  const recovered = await stored(page, id);
  expect(recovered.questionIds).toEqual(initial.questionIds);
  expect(recovered.deadlineAt).toBe(initial.deadlineAt);
  expect(recovered.flags).toContain(initial.questionIds[0]);
  await capture(page, `browser-demo-active-${info.project.name}`);
  await page.getByRole("button", { name: /^Go to question 1,/ }).click();
  await saved(page);
  // Actual interface actions answer all 200; no progress or scores are injected.
  for (let index = 0; index < 200; index++) {
    await expect(
      page.getByText(`QUESTION ${index + 1} OF 200`, { exact: true }),
    ).toBeVisible();
    await page.getByRole("radio").first().check();
    await saved(page);
    if (index < 199) {
      await page
        .getByRole("button", { name: "Next question", exact: true })
        .click();
      await saved(page);
    }
    if (index === 49) {
      await page.reload();
      await expect(
        page.getByText("QUESTION 51 OF 200", { exact: true }),
      ).toBeVisible();
      expect(Object.keys((await stored(page, id)).answers)).toHaveLength(50);
    }
  }
  const answered = await stored(page, id);
  expect(Object.keys(answered.answers)).toHaveLength(200);
  expect(answered.deadlineAt).toBe(initial.deadlineAt);
  const expectedCorrect = initial.questionIds.filter((questionId) => {
    const question = fixtureById.get(questionId)!;
    return question.correctChoice === question.choices[0].id;
  }).length;
  await page.getByRole("button", { name: "Submit Exam", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Submit your exam?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("0 unanswered questions");
  await dialog
    .getByRole("button", { name: "Continue exam", exact: true })
    .click();
  expect((await stored(page, id)).status).toBe("in_progress");
  await page.getByRole("button", { name: "Submit Exam", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Submit your exam?" })
    .getByRole("button", { name: "Confirm submission", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Your exam results/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: `${expectedCorrect} of 200 correct`,
      exact: true,
    }),
  ).toBeVisible();
  const completed = await stored(page, id);
  expect(completed.status).toBe("submitted");
  expect(completed.submissionReason).toBe("manual");
  expect(
    Object.values(completed.answers).filter((answer) => answer.correct),
  ).toHaveLength(expectedCorrect);
  await capture(page, `browser-demo-results-${info.project.name}`, true);
  await page
    .getByRole("button", { name: "Review all questions", exact: true })
    .click();
  await page
    .getByLabel("Show results", { exact: true })
    .selectOption("flagged");
  await expect(page.locator(".full-exam-review-question h3")).toHaveText(
    fixtureById.get(initial.questionIds[0])!.stem,
  );
  await expect(
    page.getByRole("heading", { name: "Answer explanation", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Show results", { exact: true })
    .selectOption("incorrect");
  await expect(
    page.getByRole("status").filter({
      hasText: new RegExp(`${200 - expectedCorrect} of 200 questions match`),
    }),
  ).toBeVisible();
  await capture(page, `browser-demo-review-${info.project.name}`, true);
  await page.goto("/exam/history");
  await expect(
    page.getByRole("heading", { name: /^Exam History/ }),
  ).toBeVisible();
  await expect(
    page
      .locator(`a[href="/exam/${id}"]`)
      .filter({ hasText: /Completed examination/ }),
  ).toBeVisible();
  await capture(page, `browser-demo-history-${info.project.name}`, true);
  await page.reload();
  expect((await stored(page, id)).submittedAt).toBe(completed.submittedAt);
  await page.goto(`/exam/${id}`);
  await page
    .getByRole("button", { name: "Study My Missed Questions", exact: true })
    .click();
  await expect(page).toHaveURL(/\/practice\/[0-9a-f-]{36}$/);
  expect(progressRequests).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("browser demo expiration persists its deadline and another browser cannot read the attempt", async ({
  page,
  browser,
}, info) => {
  await page.clock.install();
  const id = await start(page);
  const initial = await stored(page, id);
  await page.getByRole("radio").first().check();
  await saved(page);
  await page.clock.fastForward(14_401_000);
  await expect(
    page.getByRole("heading", { name: /^Your exam results/ }),
  ).toBeVisible();
  const expired = await stored(page, id);
  expect(expired.submissionReason).toBe("expired");
  expect(expired.submittedAt).toBe(initial.deadlineAt);
  expect(Object.keys(expired.answers)).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /^Your exam results/ }),
  ).toBeVisible();
  expect((await stored(page, id)).revision).toBe(expired.revision);
  const other = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  try {
    const outsider = await other.newPage();
    await outsider.goto(`/exam/${id}`);
    await expect(
      outsider.getByRole("heading", {
        name: "Demonstration progress is unavailable",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      outsider.getByRole("alert").filter({ hasText: /not.*stored.*browser/i }),
    ).toBeVisible();
    expect(
      await outsider.evaluate(
        (key) => window.localStorage.getItem(key),
        storageKey,
      ),
    ).toBeNull();
  } finally {
    await other.close();
  }
  await capture(page, `browser-demo-expired-${info.project.name}`, true);
});
