// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BROWSER_DEMO_STORAGE_KEY,
  STORAGE_UNAVAILABLE,
  browserSnapshot,
  parseBrowserSnapshot,
  createBrowserSession,
  browserPracticeAction,
  browserSessionView,
  resetBrowserDemo,
} from "@/demo/browser-store";
import { demoQuestions } from "@/demo/questions";
const config = {
  count: 10,
  mode: "adaptive",
  domain: "all",
  prioritizeMissed: false,
};
const read = () => parseBrowserSnapshot(browserSnapshot());
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe("isolated browser demo persistence", () => {
  it("starts a distinct session without a server and rejects the default pool shortage", () => {
    expect(() => createBrowserSession({ ...config, count: 25 })).toThrow(
      "Only 12",
    );
    expect(read().sessions).toHaveLength(0);
    const id = createBrowserSession(config);
    expect(read().sessions[0].id).toBe(id);
    expect(new Set(read().sessions[0].questionIds).size).toBe(10);
    expect(browserSessionView(read().sessions[0]).feedback).toEqual({});
  });
  it("saves grading, confidence, flags, bookmarks, and results across snapshot reloads", () => {
    const id = createBrowserSession(config);
    const questionId = read().sessions[0].questionIds[0];
    const q = demoQuestions.find((q) => q.id === questionId)!;
    browserPracticeAction(
      { action: "bookmark", sessionId: id, questionId, enabled: true },
      0,
    );
    browserPracticeAction({ action: "flag", sessionId: id, questionId }, 0);
    const result = browserPracticeAction(
      {
        action: "answer",
        sessionId: id,
        input: {
          questionId,
          choiceId: q.correctChoice,
          confidence: "low",
          responseMs: 1200,
        },
      },
      1,
    );
    expect(result).toHaveProperty(`answers.${questionId}.correct`, true);
    const restored = read();
    expect(restored.bookmarks).toEqual([questionId]);
    expect(restored.sessions[0].flags).toEqual([questionId]);
    expect(restored.sessions[0].answers[questionId].confidence).toBe("low");
    expect(
      browserSessionView(restored.sessions[0]).feedback[questionId].explanation,
    ).toBe(q.explanation);
    browserPracticeAction({ action: "submit", sessionId: id }, 2);
    expect(read().sessions[0].status).toBe("submitted");
    browserPracticeAction({ action: "submit", sessionId: id }, 3);
    expect(read().sessions[0].revision).toBe(3);
    expect(() =>
      browserPracticeAction({ action: "flag", sessionId: id, questionId }, 3),
    ).toThrow("already submitted");
  });
  it("keeps first checked answers final and rejects stale mutations", () => {
    const id = createBrowserSession(config);
    const questionId = read().sessions[0].questionIds[0];
    browserPracticeAction(
      {
        action: "answer",
        sessionId: id,
        input: {
          questionId,
          choiceId: "c1",
          confidence: "high",
          responseMs: 1,
        },
      },
      0,
    );
    browserPracticeAction(
      {
        action: "answer",
        sessionId: id,
        input: { questionId, choiceId: "c0", confidence: "low", responseMs: 1 },
      },
      1,
    );
    expect(read().sessions[0].answers[questionId].choiceId).toBe("c1");
    expect(() =>
      browserPracticeAction({ action: "flag", sessionId: id, questionId }, 0),
    ).toThrow("another tab");
  });
  it("reports corrupt progress without overwriting it and resets only its namespace", () => {
    localStorage.setItem("unrelated-site-setting", "keep");
    localStorage.setItem(BROWSER_DEMO_STORAGE_KEY, "not json");
    expect(() => createBrowserSession(config)).toThrow("cannot be read");
    expect(localStorage.getItem(BROWSER_DEMO_STORAGE_KEY)).toBe("not json");
    resetBrowserDemo();
    expect(read().sessions).toEqual([]);
    expect(localStorage.getItem("unrelated-site-setting")).toBe("keep");
  });
  it("reports full and blocked storage instead of claiming progress was saved", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota", "QuotaExceededError");
    });
    expect(() => createBrowserSession(config)).toThrow("could not be saved");
    expect(read().sessions).toHaveLength(0);
    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    expect(browserSnapshot()).toBe(STORAGE_UNAVAILABLE);
    expect(() => read()).toThrow("storage is unavailable");
  });
});
