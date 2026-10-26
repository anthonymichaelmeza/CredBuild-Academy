import { describe, expect, it } from "vitest";
import {
  analyzeExam,
  filterExamReview,
  missedExamConcepts,
  summarizeExamHistory,
  type ExamComparisonAttempt,
} from "@/modules/exams/results";
import type { SafeQuestion, SessionView } from "@/modules/practice/types";
import { chstObjectives } from "@/modules/curriculum/catalog";

// Pure synthetic analytics data: no real question is approved by these tests.
function attempt(): SessionView & { durationSeconds: number } {
  const allocation = [73, 40, 45, 42];
  const questions: SafeQuestion[] = allocation.flatMap((count, domain) =>
    Array.from({ length: count }, (_, i) => ({
      id: `synthetic-${domain + 1}-${i}`,
      version: 1,
      certification: "chst",
      blueprint: {
        version: "2022.04.12",
        objective: chstObjectives.find(
          (objective) => objective.domain === String(domain + 1),
        )!.id,
      },
      domain: String(domain + 1),
      topic: `Topic ${domain + 1}`,
      difficulty: i % 2 ? "advanced" : "introductory",
      stem: `Synthetic analytics item ${domain + 1}-${i}`,
      choices: ["A", "B", "C", "D"].map((id) => ({ id, text: `Choice ${id}` })),
      contentKind: "demonstration",
      origin: "human_authored",
      reviewStatus: "draft",
    })),
  );
  return {
    id: "current-attempt",
    questionIds: questions.map((question) => question.id),
    questions,
    questionVersions: Object.fromEntries(
      questions.map((question) => [question.id, 1]),
    ),
    mode: "exam",
    status: "submitted",
    createdAt: "2026-10-26T08:00:00Z",
    submittedAt: "2026-10-26T09:00:00Z",
    deadlineAt: "2026-10-26T12:00:00Z",
    durationSeconds: 14400,
    flags: [questions[0].id, questions[73].id, questions[199].id],
    revision: 0,
    answers: Object.fromEntries(
      questions.slice(0, 150).map((question, i) => [
        question.id,
        {
          choiceId: "A",
          confidence: "medium",
          correct: i < 100,
          responseMs: 2000,
          answeredAt: "2026-10-26T08:50:00Z",
        },
      ]),
    ),
    feedback: Object.fromEntries(
      questions.map((question) => [
        question.id,
        {
          correctChoice: "A",
          explanation: `Synthetic explanation ${question.id}`,
          reference: {
            title: "Synthetic reference",
            url: "",
            locator: "",
            verifiedAt: null,
          },
          rationales: question.choices.map((choice) => ({
            ...choice,
            rationale: "Synthetic rationale",
          })),
        },
      ]),
    ),
  };
}
const prior = (
  extra: Partial<ExamComparisonAttempt> = {},
): ExamComparisonAttempt => ({
  id: "older-attempt",
  status: "submitted",
  createdAt: "2026-10-25T08:00:00Z",
  submittedAt: "2026-10-25T09:00:00Z",
  questionCount: 200,
  percentage: 40,
  domains: [
    { code: "1", correct: 30, total: 73 },
    { code: "2", correct: 20, total: 40 },
    { code: "3", correct: 10, total: 45 },
    { code: "4", correct: 20, total: 42 },
  ],
  ...extra,
});

describe("completed full-length exam results", () => {
  it("distinguishes answered errors from omissions and counts all 200 in accuracy", () => {
    const result = analyzeExam(attempt())!;
    expect(result).toMatchObject({
      total: 200,
      answered: 150,
      correct: 100,
      incorrect: 50,
      unanswered: 50,
      accuracy: 50,
      durationSeconds: 14400,
      timeUsedSeconds: 3600,
      responseTimeSumMs: 300000,
      averageResponseMs: 2000,
    });
    expect(result.domains.map((domain) => domain.total)).toEqual([
      73, 40, 45, 42,
    ]);
    expect(result.domains[1]).toMatchObject({
      correct: 27,
      incorrect: 13,
      unanswered: 0,
      accuracy: 68,
    });
    expect(result.domains[2]).toMatchObject({
      correct: 0,
      incorrect: 37,
      unanswered: 8,
      averageResponseMs: 2000,
    });
    expect(result.domains[3]).toMatchObject({
      correct: 0,
      incorrect: 0,
      unanswered: 42,
      averageResponseMs: null,
    });
    expect(result.domains[1].label).toContain("Emergency Preparedness");
    expect(result.topics.reduce((sum, group) => sum + group.total, 0)).toBe(
      200,
    );
    expect(
      result.difficulties.reduce((sum, group) => sum + group.answered, 0),
    ).toBe(150);
    expect(result.weakestAreas[0].accuracy).toBe(0);
    expect(result).not.toHaveProperty("passed");
    expect(result).not.toHaveProperty("mastery");
  });
  it("never returns results or review material for active, short, duplicate or ungraded attempts", () => {
    const session = attempt();
    expect(analyzeExam({ ...session, status: "in_progress" })).toBeNull();
    expect(filterExamReview({ ...session, status: "in_progress" })).toEqual([]);
    expect(
      missedExamConcepts({ ...session, status: "in_progress" }).total,
    ).toBe(0);
    expect(
      analyzeExam({
        ...session,
        questionIds: session.questionIds.slice(0, 10),
      }),
    ).toBeNull();
    const duplicate = [...session.questionIds];
    duplicate[199] = duplicate[0];
    expect(analyzeExam({ ...session, questionIds: duplicate })).toBeNull();
    const first = session.questionIds[0];
    delete session.answers[first].correct;
    expect(analyzeExam(session)).toBeNull();
  });
  it("ignores answers outside the pinned question set and respects exact original question order", () => {
    const session = attempt();
    session.answers.foreign = {
      choiceId: "A",
      confidence: "high",
      correct: true,
      responseMs: 9999999,
      answeredAt: session.createdAt,
    };
    session.questions.reverse();
    expect(analyzeExam(session)?.correct).toBe(100);
    const review = filterExamReview(session, {
      domain: "2",
      outcome: "incorrect",
    });
    expect(review).toHaveLength(13);
    expect(review[0].index).toBe(100);
    expect(review[0].question.id).toBe(session.questionIds[100]);
    expect(review[0].feedback?.explanation).toContain(review[0].question.id);
  });
  it("bounds elapsed time at the server deadline even if expiration is observed after reopening", () => {
    const session = attempt();
    expect(
      analyzeExam({
        ...session,
        submittedAt: "2026-10-27T12:00:00Z",
        submissionReason: "expired",
      })?.timeUsedSeconds,
    ).toBe(14400);
    expect(
      analyzeExam({ ...session, submittedAt: "2026-10-27T12:00:00Z" })
        ?.timeUsedSeconds,
    ).toBe(14400);
    expect(
      analyzeExam({ ...session, submittedAt: "2026-10-26T07:00:00Z" })
        ?.timeUsedSeconds,
    ).toBe(0);
    expect(
      analyzeExam({ ...session, submittedAt: null })?.timeUsedSeconds,
    ).toBe(0);
    expect(
      analyzeExam({ ...session, durationSeconds: undefined })?.durationSeconds,
    ).toBe(14400);
  });
  it("handles a completely unanswered submitted exam without invented response times", () => {
    const session = { ...attempt(), answers: {} };
    const result = analyzeExam(session)!;
    expect(result).toMatchObject({
      answered: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 200,
      accuracy: 0,
      averageResponseMs: null,
      responseTimeSumMs: 0,
    });
    expect(
      result.domains.every((domain) => domain.averageResponseMs === null),
    ).toBe(true);
    expect(missedExamConcepts(session).total).toBe(200);
    expect(missedExamConcepts(session).unanswered).toBe(200);
  });
  it("compares only completed prior full attempts and uses the latest actual prior record", () => {
    const session = attempt();
    const result = analyzeExam(session, [
      prior(),
      prior({ id: session.id, percentage: 99 }),
      prior({ id: "active", status: "in_progress", percentage: 99 }),
      prior({ id: "short", questionCount: 10, percentage: 99 }),
      prior({
        id: "future",
        submittedAt: "2026-10-27T09:00:00Z",
        percentage: 99,
      }),
      prior({
        id: "latest",
        submittedAt: "2026-10-26T07:00:00Z",
        percentage: 45,
      }),
    ])!;
    expect(result.comparison).toMatchObject({
      previousAttemptId: "latest",
      previousPercentage: 45,
      percentagePointChange: 5,
      historyCount: 2,
    });
    expect(result.comparison?.domains[1]).toMatchObject({
      key: "2",
      currentAccuracy: 68,
      previousAccuracy: 50,
      percentagePointChange: 18,
      total: 40,
      previousTotal: 40,
    });
    expect(analyzeExam(session)?.comparison).toBeNull();
  });
  it("filters correct, incorrect, unanswered, flagged, domain and topic without changing original indexes", () => {
    const session = attempt();
    expect(filterExamReview(session, { outcome: "correct" })).toHaveLength(100);
    expect(filterExamReview(session, { outcome: "incorrect" })).toHaveLength(
      50,
    );
    expect(filterExamReview(session, { outcome: "unanswered" })).toHaveLength(
      50,
    );
    expect(
      filterExamReview(session, { outcome: "flagged" }).map(
        (item) => item.index,
      ),
    ).toEqual([0, 73, 199]);
    expect(
      filterExamReview(session, {
        outcome: "incorrect",
        domain: "3",
        topic: "Topic 3",
      }),
    ).toHaveLength(37);
    expect(
      filterExamReview(session, { outcome: "unanswered", domain: "4" }),
    ).toHaveLength(42);
    expect(filterExamReview(session, { topic: "missing" })).toEqual([]);
  });
  it("recommends only real mapped outlines, existing demonstration lessons and actual missed topics", () => {
    const session = attempt();
    const concepts = missedExamConcepts(session);
    expect(concepts).toMatchObject({
      total: 100,
      unanswered: 50,
      topics: ["Topic 2", "Topic 3", "Topic 4"],
    });
    expect(new Set(concepts.questionIds).size).toBe(100);
    expect(concepts.objectives).toHaveLength(3);
    const recommendations = analyzeExam(session)!.recommendations;
    expect(
      recommendations.some((item) =>
        item.href.startsWith("/curriculum/CHST5-2022.04.12"),
      ),
    ).toBe(true);
    expect(
      recommendations.filter((item) => item.kind === "practice"),
    ).toHaveLength(3);
    const noObjectives = {
      ...session,
      questions: session.questions.map((question) => ({
        ...question,
        blueprint: { version: "synthetic", objective: "invented-objective" },
      })),
    };
    expect(
      analyzeExam(noObjectives)!.recommendations.every(
        (item) => item.kind !== "objective",
      ),
    ).toBe(true);
    expect(
      analyzeExam({
        ...session,
        answers: Object.fromEntries(
          session.questions.map((question) => [
            question.id,
            { ...session.answers[session.questionIds[0]], correct: true },
          ]),
        ),
      })!.recommendations,
    ).toEqual([]);
  });
  it("summarizes real completed history and transparently identifies repeated domain omissions/errors", () => {
    const earlier = prior();
    const later = prior({
      id: "later",
      submittedAt: "2026-10-26T07:00:00Z",
      percentage: 60,
      domains: [
        { code: "1", correct: 73, total: 73 },
        { code: "2", correct: 30, total: 40 },
        { code: "3", correct: 45, total: 45 },
        { code: "4", correct: 42, total: 42 },
      ],
    });
    const result = summarizeExamHistory([
      later,
      earlier,
      earlier,
      prior({ id: "active", status: "in_progress" }),
      prior({ id: "missing", percentage: undefined }),
    ]);
    expect(result.completedCount).toBe(2);
    expect(result.averagePercentage).toBe(50);
    expect(
      result.domainTrends[1].attempts.map((item) => item.attemptId),
    ).toEqual(["older-attempt", "later"]);
    expect(result.repeatedDomainGaps).toHaveLength(1);
    expect(result.repeatedDomainGaps[0]).toMatchObject({
      key: "2",
      attemptsWithMisses: 2,
      totalAttempts: 2,
      latestAccuracy: 75,
    });
    expect(summarizeExamHistory([])).toEqual({
      completedCount: 0,
      averagePercentage: null,
      domainTrends: [],
      repeatedDomainGaps: [],
    });
    const invalidDomain = prior({
      domains: [{ code: "1", correct: NaN, total: 73 }],
    });
    expect(summarizeExamHistory([invalidDomain]).domainTrends).toEqual([]);
    expect(
      analyzeExam(attempt(), [invalidDomain])?.comparison?.domains,
    ).toEqual([]);
  });
});
