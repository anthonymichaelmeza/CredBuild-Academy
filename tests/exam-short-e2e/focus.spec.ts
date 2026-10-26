import { expect, test, type Page } from "@playwright/test";
import type { SessionView } from "../../src/modules/practice/types";

const origin = "http://127.0.0.1:3450";
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

test("explicit local ten-second fixture mode finalizes from the server deadline", async ({
  page,
}, info) => {
  // Warm the route with an already-expired separate-owner fixture before timing starts.
  await identify(page, "99999999-1111-4111-8111-111111111111");
  await page.goto("/exam/a1111111-1111-4111-8111-111111111111");
  await expect(
    page.getByRole("heading", { name: /^Your exam results/ }),
  ).toBeVisible();
  await identify(
    page,
    info.project.name === "desktop"
      ? "bbbbbbbb-1111-4111-8111-111111111111"
      : "bbbbbbbb-2222-4222-8222-222222222222",
  );
  const availability = await page.request.get("/api/exams?view=availability");
  expect((await availability.json()).durationSeconds).toBe(10);
  const forged = await page.request.post("/api/exams", {
    headers: { Origin: origin },
    data: { action: "start", durationSeconds: 1 },
  });
  expect(forged.status()).toBe(400);
  const created = await page.request.post("/api/exams", {
    headers: { Origin: origin },
    data: { action: "start" },
  });
  expect(created.ok()).toBe(true);
  const { id } = await created.json();
  const response = await page.request.get(`/api/exams?id=${id}`);
  const initial = (await response.json()) as SessionView;
  expect(initial.questionIds).toHaveLength(200);
  expect(new Set(initial.questionIds).size).toBe(200);
  expect(initial.developmentFixture).toBe(true);
  expect(initial.durationSeconds).toBe(10);
  expect(Date.parse(initial.deadlineAt!) - Date.parse(initial.createdAt)).toBe(
    10_000,
  );
  expect(initial.feedback).toEqual({});
  await page.goto(`/exam/${id}`);
  await expect(
    page.getByText("QUESTION 1 OF 200", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio").first().check();
  await expect(
    page.getByRole("status").filter({ hasText: /All changes saved/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Your exam results/ }),
  ).toBeVisible({ timeout: 20_000 });
  const completed = (await (
    await page.request.get(`/api/exams?id=${id}`)
  ).json()) as SessionView;
  expect(completed.status).toBe("submitted");
  expect(completed.submissionReason).toBe("expired");
  expect(completed.submittedAt).toBe(initial.deadlineAt);
  expect(Object.keys(completed.answers)).toHaveLength(1);
  const retry = await page.request.post("/api/exams", {
    headers: { Origin: origin },
    data: { action: "submit", sessionId: id },
  });
  const repeated = (await retry.json()) as SessionView;
  expect(repeated.revision).toBe(completed.revision);
  expect(repeated.submittedAt).toBe(initial.deadlineAt);
});
