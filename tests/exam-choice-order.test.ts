import { describe, expect, it } from "vitest";
import { browserFullExamQuestions } from "@/demo/full-exam-questions";
import {
  createExamChoiceOrders,
  sessionQuestionChoices,
} from "@/modules/exams/choice-order";
import { grade, sessionView } from "@/modules/practice/engine";
import type { Session } from "@/modules/practice/types";

function attempt(): Session {
  return {
    id: "choice-order-qa",
    ownerId: "synthetic-qa",
    questionIds: browserFullExamQuestions.map((question) => question.id),
    questionChoiceOrders: createExamChoiceOrders(
      browserFullExamQuestions,
      () => 0,
    ),
    answers: {},
    flags: [],
    mode: "exam",
    status: "in_progress",
    createdAt: "2026-10-26T12:00:00Z",
    submittedAt: null,
    revision: 0,
  };
}

describe("pinned full-exam answer ordering", () => {
  it("pins distinct permutations without mutating the question pool or answer keys", () => {
    const pool = structuredClone(browserFullExamQuestions);
    const before = structuredClone(pool);
    const orders = createExamChoiceOrders(pool, () => 0);
    expect(Object.keys(orders)).toHaveLength(200);
    for (const question of pool) {
      expect(orders[question.id]).toEqual(["b", "c", "d", "a"]);
      expect(new Set(orders[question.id]).size).toBe(4);
      expect(grade(question, question.correctChoice)).toBe(true);
    }
    expect(pool).toEqual(before);
    expect(createExamChoiceOrders(pool, () => 0.999)).not.toEqual(orders);
  });

  it("retains the same visible choice order through storage roundtrips and submission", () => {
    const session = attempt();
    const initial = sessionView(session, browserFullExamQuestions);
    const restored = sessionView(
      JSON.parse(JSON.stringify(session)),
      browserFullExamQuestions,
    );
    expect(restored.questions).toEqual(initial.questions);
    expect(restored.feedback).toEqual({});
    expect(initial.questions[0].choices.map((choice) => choice.id)).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
    const question = browserFullExamQuestions[0];
    const completed = sessionView(
      {
        ...session,
        status: "submitted",
        submittedAt: "2026-10-26T12:01:00Z",
        answers: {
          [question.id]: {
            choiceId: question.correctChoice,
            confidence: "medium",
            correct: true,
            responseMs: 500,
            answeredAt: "2026-10-26T12:00:01Z",
          },
        },
      },
      browserFullExamQuestions,
    );
    expect(completed.questions).toEqual(initial.questions);
    expect(completed.feedback[question.id].correctChoice).toBe(
      question.correctChoice,
    );
    expect(completed.answers[question.id].correct).toBe(true);
    expect(completed.questions[0].choices[3].id).toBe(question.correctChoice);
  });

  it("preserves old snapshots without a choice map and rejects a corrupted partial or forged map", () => {
    const question = browserFullExamQuestions[0];
    expect(sessionQuestionChoices({}, question)).toEqual(question.choices);
    for (const order of [[], ["a", "a", "c", "d"], ["a", "b", "c", "forged"]])
      expect(() =>
        sessionQuestionChoices(
          { questionChoiceOrders: { [question.id]: order } },
          question,
        ),
      ).toThrow("option order is invalid");
    expect(() =>
      sessionQuestionChoices({ questionChoiceOrders: {} }, question),
    ).toThrow("option order is invalid");
    expect(() => createExamChoiceOrders([question], () => 1)).toThrow(
      "randomization source",
    );
  });
});
