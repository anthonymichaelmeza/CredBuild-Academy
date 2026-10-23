import { describe, expect, it } from "vitest";
import { demoQuestions } from "@/demo/questions";
import {
  eligibleQuestions,
  selectionHistory,
  selectQuestions,
  sessionConfigSchema,
  sessionView,
} from "@/modules/practice/engine";
import { analyzeSessions } from "@/modules/performance/analytics";
import { performanceData } from "@/modules/performance/dto";
import type { Question, Session } from "@/modules/practice/types";

const make = (
  id: string,
  objective: string,
  difficulty: Question["difficulty"] = "introductory",
): Question => ({
  ...demoQuestions[0],
  id,
  difficulty,
  certification: "chst",
  blueprint: { version: "2022.04.12", objective },
  references: [
    {
      ...demoQuestions[0].reference,
      classification: "professional_guidance",
      edition: "Candidate edition",
      verificationStatus: "pending",
    },
  ],
});
const pool = [
  make("a", "objective-a"),
  make("b", "objective-a", "advanced"),
  make("c", "objective-b", "advanced"),
];
const config = {
  count: 1 as const,
  mode: "learning" as const,
  domain: "all",
  prioritizeMissed: false,
};
const history = [
  {
    questionId: "b",
    correct: false,
    confidence: "low",
    answeredAt: "2026-10-22T20:00:00Z",
    responseMs: 100_000,
  },
];
const session = (
  question: Question,
  overrides: Partial<Session> = {},
): Session => ({
  id: "attempt",
  ownerId: "private",
  questionIds: [question.id],
  questionVersions: { [question.id]: question.version },
  answers: {
    [question.id]: {
      choiceId: "c1",
      correct: false,
      confidence: "low",
      answeredAt: "2026-10-22T20:00:00Z",
      responseMs: 100_000,
    },
  },
  flags: [],
  mode: "learning",
  status: "submitted",
  createdAt: "2026-10-22T20:00:00Z",
  submittedAt: "2026-10-22T20:01:00Z",
  revision: 1,
  ...overrides,
});

describe("objective selection and observed learning evidence", () => {
  it("preserves optional defaults while validating additional independent filters", () => {
    expect(sessionConfigSchema.parse(config)).toEqual(config);
    expect(
      sessionConfigSchema.parse({
        ...config,
        objective: "objective-a",
        difficulty: "advanced",
        answered: "answered",
        review: "bookmarked",
      }).objective,
    ).toBe("objective-a");
    expect(
      sessionConfigSchema.safeParse({ ...config, difficulty: "expert" })
        .success,
    ).toBe(false);
    expect(
      sessionConfigSchema.safeParse({ ...config, answered: "forged" }).success,
    ).toBe(false);
  });

  it("uses the same composite predicate for availability and actual distinct selection", () => {
    const focused = {
      ...config,
      objective: "objective-a",
      difficulty: "advanced" as const,
      answered: "answered" as const,
      review: "bookmarked" as const,
    };
    expect(
      eligibleQuestions(pool, focused, history, ["b"]).map((q) => q.id),
    ).toEqual(["b"]);
    expect(
      selectQuestions(pool, focused, history, () => 0.5, ["b"]).map(
        (q) => q.id,
      ),
    ).toEqual(["b"]);
    expect(() =>
      selectQuestions(pool, { ...focused, count: 3 }, history, () => 0.5, [
        "b",
      ]),
    ).toThrow("Only 1");
    expect(
      eligibleQuestions(pool, { ...config, review: "bookmarked" }, history, [])
        .length,
    ).toBe(0);
    expect(
      eligibleQuestions(pool, { ...config, review: "missed" }, history).map(
        (q) => q.id,
      ),
    ).toEqual(["b"]);
    expect(
      eligibleQuestions(
        pool,
        { ...config, answered: "unanswered" },
        history,
      ).map((q) => q.id),
    ).toEqual(["a", "c"]);
  });

  it("does not resurrect an obsolete objective revision or include active-exam history", () => {
    const revised = {
      ...pool[0],
      version: 2,
      blueprint: { version: "2022.04.12", objective: "objective-c" },
    };
    expect(
      eligibleQuestions([...pool, revised], {
        ...config,
        objective: "objective-a",
      }).map((q) => q.id),
    ).toEqual(["b"]);
    expect(
      selectionHistory([
        session(pool[0], { mode: "exam", status: "in_progress" }),
      ]),
    ).toEqual([]);
    expect(selectionHistory([session(pool[0])])[0]).toMatchObject({
      questionId: "a",
      responseMs: 100_000,
    });
  });

  it("reports objective evidence from exact owned revision pins with no invented mastery", () => {
    const revised = {
      ...pool[0],
      version: 2,
      blueprint: { version: "2022.04.12", objective: "objective-c" },
    };
    const dto = performanceData(
      [
        session(pool[0]),
        session(revised, { id: "exam", mode: "exam", status: "in_progress" }),
      ],
      [pool[0], revised],
    );
    const analysis = analyzeSessions(dto.saved, dto.questions);
    expect(analysis.objectives).toHaveLength(1);
    expect(analysis.objectives[0]).toMatchObject({
      value: "objective-a",
      answered: 1,
      accuracy: 0,
      lowConfidence: 1,
      averageResponseMs: 100_000,
      evidence: "Needs review",
    });
    expect(
      analyzeSessions(dto.saved, dto.questions, { objective: "objective-c" })
        .objectives,
    ).toEqual([]);
    expect(analyzeSessions([], dto.questions).objectives).toEqual([]);
  });

  it("withholds all source references and grading hints until appropriate feedback", () => {
    const active = session(pool[0], { mode: "exam", status: "in_progress" });
    const hidden = sessionView(active, pool);
    expect(hidden.questions[0]).not.toHaveProperty("reference");
    expect(hidden.questions[0]).not.toHaveProperty("references");
    expect(hidden.feedback).toEqual({});
    expect(
      sessionView({ ...active, status: "submitted" }, pool).feedback.a
        .references?.[0],
    ).toMatchObject({
      classification: "professional_guidance",
      verificationStatus: "pending",
    });
    const privateMetadata = {
      ...pool[0],
      references: [
        {
          ...pool[0].references![0],
          privateReviewerNotes: "Must stay editorial",
        },
      ],
    };
    expect(
      sessionView({ ...active, status: "submitted" }, [privateMetadata])
        .feedback.a.references?.[0],
    ).not.toHaveProperty("privateReviewerNotes");
  });
});
