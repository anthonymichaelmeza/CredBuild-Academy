// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { lessons } from "@/modules/learning/catalog";
import {
  canComplete,
  completedLesson,
  lessonAction,
  learningSnapshot,
  parseLearning,
  resetLearning,
} from "@/demo/learning-store";
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe("versioned learning framework and persistence", () => {
  it("covers four domains with unique versioned demo lessons and valid question mappings", () => {
    expect(new Set(lessons.map((l) => l.id)).size).toBe(8);
    expect([...new Set(lessons.map((l) => l.domain))].sort()).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    for (const l of lessons) {
      expect(l.blueprint.verified).toBe(false);
      expect(l.blueprint.objective).toBeNull();
      expect(l.sections).toHaveLength(3);
      expect(l.checks).toHaveLength(2);
      expect(l.references.every((r) => r.verifiedAt === null)).toBe(true);
    }
  });
  it("requires all sections and successful checks, then persists completion across reads", () => {
    const lesson = lessons[0];
    expect(() => lessonAction(lesson.id, { type: "complete" })).toThrow(
      "Visit every section",
    );
    for (const section of lesson.sections)
      lessonAction(lesson.id, { type: "visit", sectionId: section.id });
    for (const check of lesson.checks)
      lessonAction(lesson.id, {
        type: "check",
        checkId: check.id,
        choiceId: check.correctChoice,
      });
    expect(canComplete(lesson.id, parseLearning(learningSnapshot()))).toBe(
      true,
    );
    lessonAction(lesson.id, { type: "complete" });
    expect(completedLesson(lesson.id, parseLearning(learningSnapshot()))).toBe(
      true,
    );
    const state = parseLearning(learningSnapshot());
    state.progress[lesson.id].lessonVersion = 99;
    expect(completedLesson(lesson.id, state)).toBe(false);
  });
  it("records retries and rejects invalid sections and answer choices", () => {
    const lesson = lessons[0];
    const check = lesson.checks[0];
    expect(() =>
      lessonAction(lesson.id, { type: "visit", sectionId: "invented" }),
    ).toThrow();
    expect(() =>
      lessonAction(lesson.id, {
        type: "check",
        checkId: check.id,
        choiceId: "invalid",
      }),
    ).toThrow();
    const wrong = check.choices.find((c) => c.id !== check.correctChoice)!.id;
    lessonAction(lesson.id, {
      type: "check",
      checkId: check.id,
      choiceId: wrong,
    });
    lessonAction(lesson.id, {
      type: "check",
      checkId: check.id,
      choiceId: check.correctChoice,
    });
    expect(
      parseLearning(learningSnapshot()).progress[lesson.id].checks[check.id],
    ).toMatchObject({ correct: true, attempts: 2 });
  });
  it("does not claim saves on storage failure and leaves practice data during learning reset", () => {
    localStorage.setItem("credbuilt.browser-demo.v1", "retained");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    expect(() =>
      lessonAction(lessons[0].id, { type: "visit", sectionId: "understand" }),
    ).toThrow("could not be saved");
    vi.restoreAllMocks();
    resetLearning();
    expect(localStorage.getItem("credbuilt.browser-demo.v1")).toBe("retained");
  });
});
