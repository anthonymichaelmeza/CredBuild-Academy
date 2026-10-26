import { afterEach, describe, expect, it, vi } from "vitest";
import {
  developmentExamFixturesEnabled,
  developmentExamQuestions,
  developmentExamDurationSeconds,
} from "@/modules/exams/development-fixtures";
import { examActionSchema } from "@/modules/exams/requests";
function enabled() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("CREDBUILT_EXAM_FIXTURES", "true");
  vi.stubEnv("ALLOW_LOCAL_DEMO", "true");
  vi.stubEnv("LOCAL_DATABASE_PATH", ".local/exam-e2e");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
}
afterEach(() => vi.unstubAllEnvs());
describe("isolated synthetic full-exam fixture boundary", () => {
  it("requires every explicit local guard before producing any synthetic questions", () => {
    enabled();
    expect(developmentExamFixturesEnabled()).toBe(true);
    const questions = developmentExamQuestions();
    expect(questions).toHaveLength(240);
    expect(new Set(questions.map((question) => question.id)).size).toBe(240);
    expect(
      questions.every(
        (question) =>
          question.reviewStatus === "draft" &&
          question.contentKind === "demonstration" &&
          question.reference.verifiedAt === null,
      ),
    ).toBe(true);
  });
  it.each([
    ["NODE_ENV", "production"],
    ["NODE_ENV", "test"],
    ["CREDBUILT_EXAM_FIXTURES", "false"],
    ["ALLOW_LOCAL_DEMO", "false"],
    ["LOCAL_DATABASE_PATH", ".local/credbuilt"],
    ["DATABASE_URL", "configured-managed-database"],
    ["VERCEL", "1"],
    ["NEXT_PUBLIC_BROWSER_DEMO", "true"],
  ])("denies fixture access when %s=%s", (key, value) => {
    enabled();
    vi.stubEnv(key, value);
    expect(developmentExamFixturesEnabled()).toBe(false);
    expect(() => developmentExamQuestions()).toThrow("fixtures are disabled");
  });
  it("does not accept client-selected fixtures, clocks, bank, owner or publication claims", () => {
    for (const extra of [
      { developmentFixture: true },
      { durationSeconds: 1 },
      { bank: "demonstration" },
      { ownerId: "other" },
      { published: true },
    ]) {
      expect(
        examActionSchema.safeParse({ action: "start", ...extra }).success,
      ).toBe(false);
    }
  });
  it("accepts a bounded local QA clock while keeping the standard timer outside the strict fixture environment", () => {
    enabled();
    expect(developmentExamDurationSeconds()).toBe(14400);
    vi.stubEnv("CREDBUILT_EXAM_TEST_DURATION_SECONDS", "10");
    expect(developmentExamDurationSeconds()).toBe(10);
    vi.stubEnv("NODE_ENV", "production");
    expect(developmentExamDurationSeconds()).toBe(14400);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    expect(developmentExamDurationSeconds()).toBe(14400);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("DATABASE_URL", "configured-managed-database");
    expect(developmentExamDurationSeconds()).toBe(14400);
  });
  it.each([
    "0",
    "4",
    "14401",
    "1.5",
    "invalid",
    "-10",
    "999999999999999999999999",
  ])("rejects an invalid isolated QA timer %s", (duration) => {
    enabled();
    vi.stubEnv("CREDBUILT_EXAM_TEST_DURATION_SECONDS", duration);
    expect(() => developmentExamDurationSeconds()).toThrow(
      "integer from 5 to 14400",
    );
  });
});
