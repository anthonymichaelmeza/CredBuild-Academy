// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoQuestions } from "@/demo/questions";
import {
  BROWSER_DEMO_STORAGE_KEY,
  browserPracticeAction,
  browserSessionView,
  browserSnapshot,
  createBrowserSession,
  parseBrowserSnapshot,
} from "@/demo/browser-store";
import { finalize, recordAnswer } from "@/modules/practice/lifecycle";
import {
  sessionConfigSchema,
  selectQuestions,
  sessionView,
} from "@/modules/practice/engine";
import { fullExamBlockers } from "@/modules/exams/policy";
import type { Session } from "@/modules/practice/types";
const config = { count: 1, mode: "exam", domain: "all", durationSeconds: 60 };
const read = () => parseBrowserSnapshot(browserSnapshot());
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});
describe("timing, exam rehearsal, and backward compatibility", () => {
  it("filters by domain/topic, requires enough distinct content and validates timer configuration", () => {
    const c = sessionConfigSchema.parse({
      ...config,
      topic: "Hazard recognition",
      domain: "1",
    });
    expect(selectQuestions(demoQuestions, c, []).map((q) => q.id)).toEqual([
      "demo-01",
    ]);
    expect(() =>
      selectQuestions(demoQuestions, { ...c, count: 3 }, []),
    ).toThrow("Only 1");
    expect(
      sessionConfigSchema.safeParse({ ...config, durationSeconds: undefined })
        .success,
    ).toBe(false);
    expect(
      sessionConfigSchema.safeParse({ ...config, durationSeconds: 0 }).success,
    ).toBe(false);
  });
  it("autosaves editable exam answers but withholds correctness and explanations until submission", () => {
    const id = createBrowserSession(config);
    const qid = read().sessions[0].questionIds[0];
    browserPracticeAction(
      {
        action: "answer",
        sessionId: id,
        input: {
          questionId: qid,
          choiceId: "c1",
          confidence: "low",
          responseMs: 100,
        },
      },
      0,
    );
    const hidden = browserSessionView(read().sessions[0]);
    expect(hidden.feedback).toEqual({});
    expect(hidden.answers[qid]).not.toHaveProperty("correct");
    browserPracticeAction(
      {
        action: "answer",
        sessionId: id,
        input: {
          questionId: qid,
          choiceId: "c0",
          confidence: "high",
          responseMs: 100,
        },
      },
      1,
    );
    expect(read().sessions[0].answers[qid]).toMatchObject({
      choiceId: "c0",
      responseMs: 200,
    });
    browserPracticeAction({ action: "submit", sessionId: id }, 2);
    expect(browserSessionView(read().sessions[0]).answers[qid].correct).toBe(
      true,
    );
    expect(browserSessionView(read().sessions[0]).feedback[qid]).toBeDefined();
  });
  it("submits expired sessions before accepting any late answer, and keeps finalization idempotent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
    const id = createBrowserSession(config);
    const qid = read().sessions[0].questionIds[0];
    vi.setSystemTime(new Date("2026-10-22T12:01:01Z"));
    browserPracticeAction(
      {
        action: "answer",
        sessionId: id,
        input: {
          questionId: qid,
          choiceId: "c0",
          confidence: "high",
          responseMs: 1,
        },
      },
      0,
    );
    expect(read().sessions[0]).toMatchObject({
      status: "submitted",
      submissionReason: "expired",
      answers: {},
    });
    const s = read().sessions[0];
    expect(finalize(s)).toBe(s);
  });
  it("preserves an actual v0.3-format snapshot without clearing or rewriting history", () => {
    const old: Session = {
      id: crypto.randomUUID(),
      ownerId: "browser-demo",
      mode: "adaptive",
      questionIds: demoQuestions.slice(0, 10).map((q) => q.id),
      answers: {},
      flags: [],
      status: "in_progress",
      revision: 0,
      createdAt: new Date().toISOString(),
      submittedAt: null,
    };
    const raw = JSON.stringify({
      version: 1,
      sessions: [old],
      bookmarks: ["demo-01"],
    });
    localStorage.setItem(BROWSER_DEMO_STORAGE_KEY, raw);
    expect(read().sessions[0]).toEqual(old);
    expect(localStorage.getItem(BROWSER_DEMO_STORAGE_KEY)).toBe(raw);
    expect(browserSessionView(old).questions).toHaveLength(10);
  });
  it("keeps learning answers final and shares deadline rules with server-backed sessions", () => {
    const s: Session = {
      id: "test",
      ownerId: "owner",
      mode: "learning",
      questionIds: ["demo-01"],
      answers: {},
      flags: [],
      status: "in_progress",
      revision: 0,
      createdAt: new Date(0).toISOString(),
      submittedAt: null,
    };
    const first = recordAnswer(
      s,
      demoQuestions,
      {
        questionId: "demo-01",
        choiceId: "c0",
        confidence: "high",
        responseMs: 1,
      },
      0,
    );
    expect(
      recordAnswer(
        first,
        demoQuestions,
        {
          questionId: "demo-01",
          choiceId: "c1",
          confidence: "low",
          responseMs: 1,
        },
        100,
      ),
    ).toBe(first);
    expect(sessionView(first, demoQuestions).feedback["demo-01"]).toBeDefined();
    expect(fullExamBlockers([0, 0, 0, 0], null)).toHaveLength(6);
    expect(fullExamBlockers([73, 40, 45, 42], 1000, true)).toEqual([]);
  });
});
