import { mkdir } from "node:fs/promises";
import { expect, test, type APIResponse, type Page } from "@playwright/test";
import type { SessionView } from "../../src/modules/practice/types";
import type {
  ExamAdminSummary,
  ExamAvailability,
  ExamHistoryItem,
} from "../../src/modules/exams/types";

const origin = "http://127.0.0.1:3400";
const identities = {
  desktop: "44444444-4444-4444-8444-444444444444",
  mobile: "55555555-5555-4555-8555-555555555555",
  tablet: "77777777-7777-4777-8777-777777777777",
  administrator: "66666666-6666-4666-8666-666666666666",
  outsider: "88888888-8888-4888-8888-888888888888",
};
const expired = {
  desktop: "a1111111-1111-4111-8111-111111111111",
  mobile: "a2222222-2222-4222-8222-222222222222",
  tablet: "a3333333-3333-4333-8333-333333333333",
};
const expiredOwners = {
  desktop: "99999999-1111-4111-8111-111111111111",
  mobile: "99999999-2222-4222-8222-222222222222",
  tablet: "99999999-3333-4333-8333-333333333333",
};
type Project = keyof typeof expired;

async function identify(page: Page, id: string) {
  await page.context().addCookies([
    {
      name: "credbuilt_demo",
      value: id,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function post(page: Page, data: Record<string, unknown>) {
  return page.request.post("/api/exams", {
    data,
    headers: { Origin: origin },
  });
}
async function state(page: Page, id: string): Promise<SessionView> {
  const response = await page.request.get(`/api/exams?id=${id}`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return response.json();
}
async function capture(page: Page, name: string, fullPage = false) {
  const directory =
    process.env.CREDBUILT_SCREENSHOT_DIR || "test-results/exam-screenshots";
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage });
}
function fixtureCorrectChoice(id: string) {
  // This documented arithmetic QA convention is not instructional exam content.
  const number = Number(id.split("-").at(-1));
  return String.fromCharCode(97 + ((number - 1) % 4));
}
function noAnswerKeys(value: unknown) {
  const text = JSON.stringify(value);
  for (const key of [
    "correctChoice",
    "explanation",
    "rationale",
    "reference",
    "references",
    "solutionSteps",
  ])
    expect(text).not.toContain(`"${key}":`);
}
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: /All changes saved/ }),
  ).toBeVisible();
}
function assertPrivate(response: APIResponse) {
  expect(response.headers()["cache-control"]).toContain("private");
  expect(response.headers()["cache-control"]).toContain("no-store");
}

test("200-question fixture autosaves, resumes on another browser context, submits and supports complete review", async ({
  page,
  browser,
}, info) => {
  const project = info.project.name as Project;
  await identify(page, identities[project]);
  await page.goto("/exam");
  await expect(
    page.getByRole("heading", { name: "CHST Full-Length Exam Simulation" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start development-only exam", exact: true })
    .click();
  await expect(page).toHaveURL(/\/exam\/[0-9a-f-]{36}$/);
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(
    page.getByText("QUESTION 1 OF 200", { exact: true }),
  ).toBeVisible();
  const initial = await state(page, id);
  expect(initial.questionIds).toHaveLength(200);
  expect(new Set(initial.questionIds).size).toBe(200);
  expect(initial.developmentFixture).toBe(true);
  expect(initial.mode).toBe("exam");
  expect(Date.parse(initial.deadlineAt!) - Date.parse(initial.createdAt)).toBe(
    14_400_000,
  );
  for (const [domain, expected] of Object.entries({
    "1": 73,
    "2": 40,
    "3": 45,
    "4": 42,
  }))
    expect(initial.questions.filter((q) => q.domain === domain)).toHaveLength(
      expected,
    );
  noAnswerKeys(initial);
  expect(initial.feedback).toEqual({});
  const activeHtml = await page.content();
  // The server-rendered payload must be safe too, not just the JSON endpoint.
  expect(activeHtml).not.toContain("Synthetic arithmetic fixture:");
  expect(activeHtml).not.toContain("Development-only test data.");
  expect(activeHtml).not.toContain(
    "Synthetic development fixture; no CHST technical source",
  );
  await expect(
    page.getByRole("button", { name: /^Go to question \d+,/ }),
  ).toHaveCount(200);

  const first = initial.questionIds[0];
  const correct = fixtureCorrectChoice(first);
  const wrong = correct === "a" ? "b" : "a";
  const correctPosition = initial.questions[0].choices.findIndex(
    (choice) => choice.id === correct,
  );
  const wrongPosition = initial.questions[0].choices.findIndex(
    (choice) => choice.id === wrong,
  );
  expect(initial.questionChoiceOrders?.[first]).toEqual(
    initial.questions[0].choices.map((choice) => choice.id),
  );
  // Answers can change before submission; only the final selection is graded.
  await page.getByRole("radio").nth(correctPosition).check();
  await saved(page);
  await page.getByRole("radio").nth(wrongPosition).check();
  await saved(page);
  await page
    .getByRole("button", { name: "Mark for review", exact: true })
    .click();
  await saved(page);
  const active = await state(page, id);
  expect(active.answers[first].choiceId).toBe(wrong);
  expect(active.answers[first]).not.toHaveProperty("correct");
  expect(active.flags).toContain(first);
  noAnswerKeys(active);
  await capture(page, `active-exam-${project}`);

  await page.getByRole("button", { name: /^Go to question 100,/ }).click();
  await saved(page);
  await expect(
    page.getByText("QUESTION 100 OF 200", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("QUESTION 100 OF 200", { exact: true }),
  ).toBeVisible();
  expect((await state(page, id)).deadlineAt).toBe(initial.deadlineAt);
  expect((await state(page, id)).questionIds).toEqual(initial.questionIds);
  expect((await state(page, id)).questions).toEqual(initial.questions);

  const otherDevice = await browser.newContext({
    storageState: await page.context().storageState(),
    baseURL: origin,
  });
  try {
    const second = await otherDevice.newPage();
    await second.goto(`/exam/${id}`);
    await expect(
      second.getByText("QUESTION 100 OF 200", { exact: true }),
    ).toBeVisible();
    await second.getByRole("button", { name: /^Go to question 1,/ }).click();
    await saved(second);
    await expect(second.getByRole("radio").nth(wrongPosition)).toBeChecked();
    await expect(
      second.getByRole("button", { name: "Remove review flag", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await otherDevice.close();
  }
  await page.reload();
  await expect(
    page.getByText("QUESTION 1 OF 200", { exact: true }),
  ).toBeVisible();
  expect((await state(page, id)).deadlineAt).toBe(initial.deadlineAt);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Submit Exam", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Submit your exam?" });
  await expect(confirmation).toBeVisible();
  await confirmation
    .getByRole("button", { name: "Continue exam", exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  expect((await state(page, id)).status).toBe("in_progress");
  await page.getByRole("button", { name: "Submit Exam", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Submit your exam?" })
    .getByRole("button", { name: "Confirm submission", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Your exam results/ }),
  ).toBeVisible();
  const completed = await state(page, id);
  expect(completed.status).toBe("submitted");
  expect(completed.questions).toEqual(initial.questions);
  expect(completed.answers[first].correct).toBe(false);
  expect(Object.keys(completed.answers)).toHaveLength(1);
  expect(Object.keys(completed.feedback)).toHaveLength(200);
  const repeated = await post(page, { action: "submit", sessionId: id });
  expect(repeated.ok()).toBe(true);
  expect((await repeated.json()).submittedAt).toBe(completed.submittedAt);
  await capture(page, `exam-results-${project}`, true);

  await page
    .getByRole("button", { name: "Review all questions", exact: true })
    .click();
  await page
    .getByLabel("Show results", { exact: true })
    .selectOption("flagged");
  await expect(page.locator(".full-exam-review-question h3")).toHaveText(
    initial.questions[0].stem,
  );
  await expect(
    page.getByText(completed.feedback[first].explanation, { exact: true }),
  ).toBeVisible();
  await capture(page, `exam-review-${project}`, true);
  await page
    .getByLabel("Show results", { exact: true })
    .selectOption("unanswered");
  await expect(page.locator(".full-exam-review-question h3")).not.toHaveText(
    initial.questions[0].stem,
  );
  await page.goto("/exam/history");
  await expect(
    page.getByRole("heading", { name: /^Exam History/ }),
  ).toBeVisible();
  const historyResponse = await page.request.get("/api/exams?view=history");
  assertPrivate(historyResponse);
  const history = (await historyResponse.json()) as {
    attempts: ExamHistoryItem[];
  };
  expect(history.attempts.filter((attempt) => attempt.id === id)).toHaveLength(
    1,
  );
  expect(
    history.attempts.find((attempt) => attempt.id === id)?.percentage,
  ).toBe(0);
  await capture(page, `exam-history-${project}`, true);
  await page.goto("/performance");
  const performanceHistoryLink = page.locator(
    `a.history-row[href="/exam/${id}"]`,
  );
  await expect(performanceHistoryLink).toContainText("Full-length exam");
  await performanceHistoryLink.click();
  await expect(page).toHaveURL(`/exam/${id}`);
  await expect(
    page.getByRole("heading", { name: /^Your exam results/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review all questions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review your examination", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Study My Missed Questions", exact: true })
    .click();
  await expect(page).toHaveURL(/\/practice\/[0-9a-f-]{36}$/);
});

test("expired attempts reject late answers and finalize once at the persisted deadline", async ({
  page,
}, info) => {
  const project = info.project.name as Project;
  // A separate owner prevents the normal start/history flow from finalizing
  // this attempt before the late-answer request exercises its deadline guard.
  await identify(page, expiredOwners[project]);
  const id = expired[project];
  // POST the late answer before GET: the mutation itself must enforce expiry.
  const response = await post(page, {
    action: "answer",
    sessionId: id,
    questionId: "dev-full-d1-001",
    choiceId: "a",
    responseMs: 1000,
  });
  expect(response.ok()).toBe(true);
  const finalized = (await response.json()) as SessionView;
  expect(finalized.status).toBe("submitted");
  expect(finalized.revision).toBe(1);
  expect(finalized.submissionReason).toBe("expired");
  expect(finalized.answers).toEqual({});
  expect(finalized.submittedAt).toBe(finalized.deadlineAt);
  await page.goto(`/exam/${id}`);
  await expect(
    page.getByRole("heading", { name: /^Your exam results/ }),
  ).toBeVisible();
  await expect(page.getByText(/Time expired/).first()).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  const again = await state(page, id);
  expect(again.revision).toBe(finalized.revision);
  expect(again.submittedAt).toBe(finalized.deadlineAt);
  const submission = await post(page, { action: "submit", sessionId: id });
  expect((await submission.json()).submittedAt).toBe(finalized.deadlineAt);
});

test("ownership and administrator gates protect attempts and report the real production shortfall", async ({
  page,
}, info) => {
  const project = info.project.name as Project;
  await identify(page, identities[project]);
  expect((await page.request.get("/api/exams?view=admin")).status()).toBe(403);
  const anotherOwnerAttempt = expired[project];
  await identify(page, identities.outsider);
  expect(
    (await page.request.get(`/api/exams?id=${anotherOwnerAttempt}`)).status(),
  ).toBe(404);
  expect(
    (
      await post(page, {
        action: "submit",
        sessionId: anotherOwnerAttempt,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await post(page, {
        action: "navigate",
        sessionId: anotherOwnerAttempt,
        index: 5,
      })
    ).status(),
  ).toBe(404);
  const foreignHistory = await page.request.get("/api/exams?view=history");
  expect((await foreignHistory.json()).attempts).toEqual([]);
  await identify(page, identities.administrator);
  const response = await page.request.get("/api/exams?view=admin");
  expect(response.ok()).toBe(true);
  assertPrivate(response);
  const admin = (await response.json()) as ExamAdminSummary;
  expect(admin.approvedTotal).toBe(0);
  expect(admin.publishedTotal).toBe(0);
  expect(admin.availability.eligibleTotal).toBe(0);
  expect(admin.availability.canStart).toBe(false);
  expect(admin.availability.domains.map((domain) => domain.shortfall)).toEqual([
    73, 40, 45, 42,
  ]);
  await page.goto("/studio/exams");
  await expect(
    page.getByRole("heading", {
      name: "Know when the bank is ready.",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await capture(page, `exam-administration-${project}`, true);
});

test("fixture availability is explicit and malformed exam actions cannot change the fixed policy", async ({
  page,
}, info) => {
  await identify(page, identities[info.project.name as Project]);
  const response = await page.request.get("/api/exams?view=availability");
  assertPrivate(response);
  const available = (await response.json()) as ExamAvailability;
  expect(available.count).toBe(200);
  expect(available.durationSeconds).toBe(14_400);
  expect(available.developmentFixture).toBe(true);
  expect(available.durationBasis).toBe("credbuilt_practice_configuration");
  const invalid = await post(page, {
    action: "navigate",
    sessionId: expired[info.project.name as Project],
    index: 200,
  });
  expect(invalid.status()).toBe(400);
  const crossOrigin = await page.request.post("/api/exams", {
    data: { action: "start" },
    headers: { Origin: "https://another-origin.example" },
  });
  expect(crossOrigin.status()).toBe(403);
});
