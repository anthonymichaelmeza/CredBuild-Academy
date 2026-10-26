// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserFullExamQuestions } from "@/demo/full-exam-questions";
import {
  BROWSER_DEMO_STORAGE_KEY,
  browserFullExamAction,
  browserFullExamHistory,
  browserFullExamView,
  browserPracticeAction,
  browserSessionView,
  browserSnapshot,
  createBrowserFullExam,
  createBrowserSession,
  parseBrowserSnapshot,
} from "@/demo/browser-store";
import type { SessionView } from "@/modules/practice/types";

const now = Date.parse("2026-10-26T18:00:00.000Z");
const state = () => parseBrowserSnapshot(browserSnapshot());
function act(
  id: string,
  revision: number,
  command: Record<string, unknown>,
): SessionView {
  const result = browserFullExamAction({ ...command, sessionId: id }, revision);
  if (!("questions" in result))
    throw new Error("Expected a saved examination view.");
  return result;
}
function choiceFor(id: string, correct: boolean) {
  const question = browserFullExamQuestions.find((item) => item.id === id)!;
  return correct
    ? question.correctChoice
    : question.choices.find((choice) => choice.id !== question.correctChoice)!
        .id;
}
beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
  vi.stubEnv("NODE_ENV", "production");
  vi.spyOn(Date, "now").mockReturnValue(now);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("complete browser demonstration examinations", () => {
  it("starts 200 distinct unreviewed samples in the exact canonical distribution and resumes the same deadline/order", () => {
    const id = createBrowserFullExam();
    const initial = browserFullExamView(id);
    expect(initial.questionIds).toHaveLength(200);
    expect(new Set(initial.questionIds).size).toBe(200);
    expect(
      ["1", "2", "3", "4"].map(
        (domain) =>
          initial.questions.filter((question) => question.domain === domain)
            .length,
      ),
    ).toEqual([73, 40, 45, 42]);
    expect(
      Date.parse(initial.deadlineAt!) - Date.parse(initial.createdAt),
    ).toBe(14_400_000);
    expect(initial).toMatchObject({
      developmentFixture: true,
      examKind: "chst_full_length",
      bank: "demonstration",
      durationSeconds: 14400,
    });
    expect(
      initial.questions.every(
        (question) =>
          question.contentKind === "demonstration" &&
          question.reviewStatus === "draft",
      ),
    ).toBe(true);
    expect(
      browserFullExamQuestions.every(
        (question) => question.reference.verifiedAt === null,
      ),
    ).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(now + 5000);
    expect(createBrowserFullExam()).toBe(id);
    const restored = browserFullExamView(id);
    expect(restored.questionIds).toEqual(initial.questionIds);
    expect(restored.deadlineAt).toBe(initial.deadlineAt);
    expect(state().sessions).toHaveLength(1);
  });

  it("saves answer changes, explicit flags and current position while withholding active teaching feedback", () => {
    const id = createBrowserFullExam();
    const questionId = browserFullExamView(id).questionIds[0];
    let saved = act(id, 0, {
      action: "answer",
      questionId,
      choiceId: choiceFor(questionId, false),
      responseMs: 1000,
    });
    saved = act(id, saved.revision, {
      action: "answer",
      questionId,
      choiceId: choiceFor(questionId, true),
      responseMs: 500,
    });
    saved = act(id, saved.revision, {
      action: "flag",
      questionId,
      enabled: true,
    });
    const revision = saved.revision;
    saved = act(id, saved.revision, {
      action: "flag",
      questionId,
      enabled: true,
    });
    expect(saved.revision).toBe(revision);
    saved = act(id, saved.revision, { action: "navigate", index: 199 });
    const restored = browserFullExamView(id);
    expect(restored.currentQuestionIndex).toBe(199);
    expect(restored.flags).toEqual([questionId]);
    expect(restored.answers[questionId]).toMatchObject({
      choiceId: choiceFor(questionId, true),
      responseMs: 1500,
    });
    expect(restored.answers[questionId]).not.toHaveProperty("correct");
    expect(restored.feedback).toEqual({});
    for (const question of restored.questions) {
      expect(question).not.toHaveProperty("correctChoice");
      expect(question).not.toHaveProperty("explanation");
      expect(question).not.toHaveProperty("reference");
      expect(
        question.choices.every((choice) => !Object.hasOwn(choice, "rationale")),
      ).toBe(true);
    }
    const history = browserFullExamHistory()[0];
    expect(history).not.toHaveProperty("correct");
    expect(history).not.toHaveProperty("percentage");
    expect(() => act(id, 0, { action: "navigate", index: 0 })).toThrow(
      /another tab/,
    );
    expect(() =>
      browserPracticeAction(
        { action: "submit", sessionId: id },
        saved.revision,
      ),
    ).toThrow(/full-length.*workspace/);
  });

  it("grades all 200 answers, preserves immutable completed results, and creates actual missed-question practice", () => {
    const id = createBrowserFullExam();
    let saved = browserFullExamView(id);
    for (const [index, questionId] of saved.questionIds.entries())
      saved = act(id, saved.revision, {
        action: "answer",
        questionId,
        choiceId: choiceFor(questionId, index < 190),
        responseMs: 1000,
      });
    expect(saved.status).toBe("in_progress");
    expect(Object.keys(saved.answers)).toHaveLength(200);
    expect(saved.feedback).toEqual({});
    const beforeSubmit = saved.revision;
    saved = act(id, saved.revision, { action: "submit" });
    expect(saved.status).toBe("submitted");
    expect(
      Object.values(saved.answers).filter((answer) => answer.correct),
    ).toHaveLength(190);
    expect(Object.keys(saved.feedback)).toHaveLength(200);
    const completed = browserFullExamHistory()[0];
    expect(completed).toMatchObject({
      answered: 200,
      correct: 190,
      percentage: 95,
      developmentFixture: true,
    });
    expect(completed.domains?.map((domain) => domain.total)).toEqual([
      73, 40, 45, 42,
    ]);
    vi.spyOn(Date, "now").mockReturnValue(now + 1000);
    const repeated = act(id, beforeSubmit, { action: "submit" });
    expect(repeated.submittedAt).toBe(saved.submittedAt);
    expect(repeated.revision).toBe(saved.revision);
    expect(state().sessions).toHaveLength(1);
    const practice = browserFullExamAction(
      { action: "study_missed", sessionId: id },
      saved.revision,
    );
    if (!("id" in practice))
      throw new Error("Expected missed-question practice.");
    const learning = state().sessions.find(
      (session) => session.id === practice.id,
    )!;
    expect(learning.mode).toBe("learning");
    expect(learning.developmentFixture).toBe(true);
    expect(learning.questionIds).toHaveLength(10);
    expect(new Set(learning.questionIds).size).toBe(10);
    expect(
      learning.questionIds.every(
        (questionId) => !saved.answers[questionId].correct,
      ),
    ).toBe(true);
    const questionId = learning.questionIds[0];
    browserPracticeAction(
      {
        action: "answer",
        sessionId: learning.id,
        input: {
          questionId,
          choiceId: choiceFor(questionId, true),
          confidence: "medium",
          responseMs: 1000,
        },
      },
      0,
    );
    const reviewed = browserSessionView(
      state().sessions.find((session) => session.id === learning.id)!,
    );
    expect(reviewed.answers[questionId].correct).toBe(true);
    expect(reviewed.feedback[questionId].explanation).toBeTruthy();
  });

  it("finalizes expiry at the saved deadline without accepting late answers and does not extend time on reopen", () => {
    vi.stubEnv("NODE_ENV", "development");
    const id = createBrowserFullExam({ durationSeconds: 5 });
    const initial = browserFullExamView(id);
    vi.spyOn(Date, "now").mockReturnValue(now + 6000);
    const expired = act(id, 0, {
      action: "answer",
      questionId: initial.questionIds[0],
      choiceId: "a",
      responseMs: 10,
    });
    expect(expired.answers).toEqual({});
    expect(expired.submissionReason).toBe("expired");
    expect(expired.submittedAt).toBe(initial.deadlineAt);
    expect(browserFullExamView(id).revision).toBe(expired.revision);
    expect(browserFullExamHistory()[0].submittedAt).toBe(initial.deadlineAt);
    const next = createBrowserFullExam();
    expect(next).not.toBe(id);
    expect(
      state().sessions.find((session) => session.id === id)?.submittedAt,
    ).toBe(initial.deadlineAt);
  });

  it("keeps legacy practice, curriculum attempts and bookmarks intact in the same version-one storage", () => {
    const legacyId = createBrowserSession({
      count: 1,
      mode: "learning",
      domain: "all",
    });
    const legacy = structuredClone(state().sessions[0]);
    browserPracticeAction(
      {
        action: "bookmark",
        sessionId: legacyId,
        questionId: legacy.questionIds[0],
        enabled: true,
      },
      0,
    );
    const curriculumId = createBrowserSession({
      count: 1,
      mode: "learning",
      domain: "all",
      bank: "curriculum_drafts",
    });
    const curriculum = structuredClone(
      state().sessions.find((session) => session.id === curriculumId),
    );
    createBrowserFullExam();
    expect(state().version).toBe(1);
    expect(state().sessions.find((session) => session.id === legacyId)).toEqual(
      legacy,
    );
    expect(
      state().sessions.find((session) => session.id === curriculumId),
    ).toEqual(curriculum);
    expect(state().bookmarks).toEqual(legacy.questionIds);
    expect(state().sessions).toHaveLength(3);
  });

  it("rejects disabled mode, short timers in production builds, and client-selected publication or owner claims", () => {
    expect(() => createBrowserFullExam({ durationSeconds: 60 })).toThrow(
      /only in local development/,
    );
    expect(state().sessions).toHaveLength(0);
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    expect(createBrowserFullExam).toThrow(/explicitly enabled/);
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    const id = createBrowserFullExam();
    for (const extra of [
      { durationSeconds: 1 },
      { ownerId: "someone-else" },
      { bank: "published" },
      { developmentFixture: false },
    ])
      expect(() =>
        browserFullExamAction({ action: "submit", sessionId: id, ...extra }, 0),
      ).toThrow();
    expect(browserFullExamView(id).status).toBe("in_progress");
  });

  it("rejects corrupted identities, domain duplication, revision pins and shortened persisted timers", () => {
    const id = createBrowserFullExam();
    const initial = browserSnapshot()!;
    const variations: ((data: ReturnType<typeof state>) => void)[] = [
      (data) => {
        data.sessions[0].questionIds[1] = data.sessions[0].questionIds[0];
      },
      (data) => {
        data.sessions[0].questionVersions![data.sessions[0].questionIds[0]] = 2;
      },
      (data) => {
        data.sessions[0].deadlineAt = new Date(now + 1).toISOString();
      },
      (data) => {
        data.sessions[0].durationSeconds = 60;
        data.sessions[0].deadlineAt = new Date(now + 60_000).toISOString();
      },
      (data) => {
        data.sessions[0].developmentFixture = false;
      },
    ];
    for (const mutate of variations) {
      const data = parseBrowserSnapshot(initial);
      mutate(data);
      localStorage.setItem(BROWSER_DEMO_STORAGE_KEY, JSON.stringify(data));
      expect(() => browserFullExamView(id)).toThrow(/cannot be read/);
    }
  });

  it("reports storage failures without pretending to save and cannot read an attempt from another browser origin", () => {
    const id = createBrowserFullExam();
    const original = browserSnapshot();
    const storage = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });
    expect(() => act(id, 0, { action: "navigate", index: 50 })).toThrow(
      /could not be saved/,
    );
    expect(browserSnapshot()).toBe(original);
    storage.mockRestore();
    localStorage.clear();
    expect(() => browserFullExamView(id)).toThrow(/not stored in this browser/);
    expect(browserFullExamHistory()).toEqual([]);
    localStorage.setItem(BROWSER_DEMO_STORAGE_KEY, original!);
    expect(browserFullExamView(id).currentQuestionIndex).toBe(0);
  });
});
