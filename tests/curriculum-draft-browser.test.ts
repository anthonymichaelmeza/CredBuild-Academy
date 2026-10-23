// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoQuestions } from "@/demo/questions";
vi.mock("@/content/chst/draft-bank", async () => {
  const { demoQuestions } = await import("@/demo/questions");
  return {
    browserDraftQuestions: [
      {
        ...demoQuestions[0],
        id: "curriculum-qa",
        choices: [
          { id: "a", text: "First QA choice", rationale: "QA explanation" },
          { id: "b", text: "Second QA choice", rationale: "QA explanation" },
          { id: "c", text: "Third QA choice", rationale: "QA explanation" },
          { id: "d", text: "Fourth QA choice", rationale: "QA explanation" },
        ],
        correctChoice: "b",
        blueprint: {
          version: "2022.04.12",
          objective: "CHST5-2022.04.12-D1-K01",
        },
      },
    ],
  };
});
import {
  browserPracticeAction,
  browserSessionView,
  browserSnapshot,
  createBrowserSession,
  parseBrowserSnapshot,
  BROWSER_DEMO_STORAGE_KEY,
} from "@/demo/browser-store";
const read = () => parseBrowserSnapshot(browserSnapshot());
afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe("explicit curriculum draft browser bank", () => {
  it("keeps legacy selection at twelve items and isolates the new bank behind browser-demo opt-in", () => {
    expect(() =>
      createBrowserSession({ count: 25, mode: "learning", domain: "all" }),
    ).toThrow("Only 12");
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    expect(() =>
      createBrowserSession({
        count: 1,
        mode: "learning",
        domain: "all",
        bank: "curriculum_drafts",
      }),
    ).toThrow(/explicitly enabled/);
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    const id = createBrowserSession({
      count: 1,
      mode: "learning",
      domain: "all",
      bank: "curriculum_drafts",
    });
    expect(read().sessions[0]).toMatchObject({
      id,
      bank: "curriculum_drafts",
      questionIds: ["curriculum-qa"],
    });
    expect(
      browserSessionView(read().sessions[0]).questions[0].reviewStatus,
    ).toBe("draft");
  });
  it("persists actual draft choices/bookmarks and refuses tampered bank identities", () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    const id = createBrowserSession({
      count: 1,
      mode: "learning",
      domain: "all",
      bank: "curriculum_drafts",
    });
    browserPracticeAction(
      {
        action: "answer",
        sessionId: id,
        input: {
          questionId: "curriculum-qa",
          choiceId: "b",
          confidence: "medium",
          responseMs: 1000,
        },
      },
      0,
    );
    expect(read().sessions[0].answers["curriculum-qa"].correct).toBe(true);
    browserPracticeAction(
      {
        action: "bookmark",
        sessionId: id,
        questionId: "curriculum-qa",
        enabled: true,
      },
      1,
    );
    expect(read().bookmarks).toEqual(["curriculum-qa"]);
    const state = read();
    state.sessions[0].questionIds = [demoQuestions[0].id];
    localStorage.setItem(BROWSER_DEMO_STORAGE_KEY, JSON.stringify(state));
    expect(read).toThrow(/cannot be read/);
  });
});
