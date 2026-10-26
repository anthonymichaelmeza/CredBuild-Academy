import { domains } from "@/modules/catalog/blueprint";
import { getChstObjective } from "@/modules/curriculum/catalog";
import { objectiveStudyOutline } from "@/modules/curriculum/study-outline";
import { lessonForQuestion, lessons } from "@/modules/learning/catalog";
import type { SafeQuestion, SessionView } from "@/modules/practice/types";
import type { ExamHistoryItem } from "./types";

/** Only already-authorized, completed-attempt metadata belongs in comparisons. */
export type ExamComparisonAttempt = Pick<
  ExamHistoryItem,
  | "id"
  | "status"
  | "createdAt"
  | "submittedAt"
  | "questionCount"
  | "percentage"
  | "domains"
>;
export type ExamResultGroup = {
  key: string;
  label: string;
  total: number;
  answered: number;
  correct: number;
  /** Answered incorrectly; unanswered questions are reported separately. */
  incorrect: number;
  unanswered: number;
  accuracy: number;
  averageResponseMs: number | null;
};
export type ExamRecommendation = {
  kind: "objective" | "lesson" | "practice";
  label: string;
  href: string;
  reason: string;
};
export type ExamResults = {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
  durationSeconds: number;
  timeUsedSeconds: number;
  responseTimeSumMs: number;
  averageResponseMs: number | null;
  domains: ExamResultGroup[];
  topics: ExamResultGroup[];
  difficulties: ExamResultGroup[];
  weakestAreas: ExamResultGroup[];
  recommendations: ExamRecommendation[];
  comparison: {
    previousAttemptId: string;
    previousPercentage: number;
    previousSubmittedAt: string;
    percentagePointChange: number;
    historyCount: number;
    domains: {
      key: string;
      label: string;
      currentAccuracy: number;
      previousAccuracy: number;
      percentagePointChange: number;
      total: number;
      previousTotal: number;
    }[];
  } | null;
};
export type ExamReviewFilter = {
  outcome?: "all" | "incorrect" | "correct" | "unanswered" | "flagged";
  domain?: string;
  topic?: string;
};
export type ExamReviewItem = {
  question: SafeQuestion;
  /** Original zero-based position, retained after filtering. */
  index: number;
  answer: SessionView["answers"][string] | undefined;
  feedback: SessionView["feedback"][string] | undefined;
  flagged: boolean;
};
export type ExamHistorySummary = {
  completedCount: number;
  averagePercentage: number | null;
  domainTrends: {
    key: string;
    label: string;
    attempts: {
      attemptId: string;
      createdAt: string;
      submittedAt: string;
      accuracy: number;
      correct: number;
      total: number;
    }[];
  }[];
  repeatedDomainGaps: {
    key: string;
    label: string;
    attemptsWithMisses: number;
    totalAttempts: number;
    latestAccuracy: number;
  }[];
};
type ExamResultSession = SessionView & { durationSeconds?: number };

const percentage = (correct: number, total: number) =>
  total ? Math.round((correct / total) * 100) : 0;
const milliseconds = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;
const timestamp = (value: string | null | undefined) => {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};
const validDomainResult = (domain: { correct: number; total: number }) =>
  Number.isInteger(domain.correct) &&
  Number.isInteger(domain.total) &&
  domain.total > 0 &&
  domain.correct >= 0 &&
  domain.correct <= domain.total;
const completedHistory = (previous: readonly ExamComparisonAttempt[]) =>
  [...new Map(previous.map((attempt) => [attempt.id, attempt])).values()]
    .filter(
      (attempt) =>
        attempt.status === "submitted" &&
        attempt.questionCount === 200 &&
        typeof attempt.percentage === "number" &&
        Number.isFinite(attempt.percentage) &&
        attempt.percentage >= 0 &&
        attempt.percentage <= 100 &&
        timestamp(attempt.submittedAt) !== null,
    )
    .sort((a, b) => timestamp(a.submittedAt)! - timestamp(b.submittedAt)!);

/** Repeated gap means a recorded omission/error on at least two attempts, not a mastery judgment. */
export function summarizeExamHistory(
  history: readonly ExamComparisonAttempt[],
): ExamHistorySummary {
  const completed = completedHistory(history);
  const domainTrends = domains.flatMap((domain) => {
    const attempts = completed.flatMap((attempt) => {
      const sample = attempt.domains?.find((item) => item.code === domain.code);
      if (!sample || !validDomainResult(sample)) return [];
      return [
        {
          attemptId: attempt.id,
          createdAt: attempt.createdAt,
          submittedAt: attempt.submittedAt!,
          accuracy: percentage(sample.correct, sample.total),
          correct: sample.correct,
          total: sample.total,
        },
      ];
    });
    return attempts.length
      ? [
          {
            key: domain.code,
            label: `Domain ${domain.code} · ${domain.title}`,
            attempts,
          },
        ]
      : [];
  });
  return {
    completedCount: completed.length,
    averagePercentage: completed.length
      ? Math.round(
          completed.reduce((sum, attempt) => sum + attempt.percentage!, 0) /
            completed.length,
        )
      : null,
    domainTrends,
    repeatedDomainGaps: domainTrends
      .flatMap((domain) => {
        const attemptsWithMisses = domain.attempts.filter(
          (attempt) => attempt.correct < attempt.total,
        ).length;
        return attemptsWithMisses >= 2
          ? [
              {
                key: domain.key,
                label: domain.label,
                attemptsWithMisses,
                totalAttempts: domain.attempts.length,
                latestAccuracy: domain.attempts.at(-1)!.accuracy,
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          b.attemptsWithMisses - a.attemptsWithMisses ||
          a.latestAccuracy - b.latestAccuracy,
      ),
  };
}

/** No grading-derived information is returned for an active or invalid attempt. */
function completedQuestions(session: SessionView): SafeQuestion[] | null {
  if (
    session.mode !== "exam" ||
    session.status !== "submitted" ||
    session.questionIds.length !== 200 ||
    session.questions.length !== 200 ||
    new Set(session.questionIds).size !== 200 ||
    new Set(session.questions.map((question) => question.id)).size !== 200
  )
    return null;
  const byId = new Map(
    session.questions.map((question) => [question.id, question]),
  );
  const ordered = session.questionIds.map((id) => byId.get(id));
  if (
    ordered.some((question) => !question) ||
    session.questionIds.some(
      (id) =>
        session.answers[id] && typeof session.answers[id].correct !== "boolean",
    )
  )
    return null;
  return ordered as SafeQuestion[];
}

export function filterExamReview(
  session: SessionView,
  filter: ExamReviewFilter = {},
): ExamReviewItem[] {
  const questions = completedQuestions(session);
  if (!questions) return [];
  return questions.flatMap((question, index) => {
    const answer = session.answers[question.id];
    const flagged = session.flags.includes(question.id);
    if (
      (filter.domain &&
        filter.domain !== "all" &&
        question.domain !== filter.domain) ||
      (filter.topic &&
        filter.topic !== "all" &&
        question.topic !== filter.topic) ||
      (filter.outcome === "incorrect" &&
        (!answer || answer.correct !== false)) ||
      (filter.outcome === "correct" && answer?.correct !== true) ||
      (filter.outcome === "unanswered" && answer) ||
      (filter.outcome === "flagged" && !flagged)
    )
      return [];
    return [
      {
        question,
        index,
        answer,
        feedback: session.feedback[question.id],
        flagged,
      },
    ];
  });
}

/** Missed concepts include unanswered items, while preserving their distinction. */
export function missedExamConcepts(session: SessionView) {
  const items = filterExamReview(session).filter(
    (item) => item.answer?.correct !== true,
  );
  return {
    questionIds: items.map((item) => item.question.id),
    topics: [...new Set(items.map((item) => item.question.topic))],
    objectives: [
      ...new Set(
        items.flatMap((item) =>
          item.question.blueprint?.objective
            ? [item.question.blueprint.objective]
            : [],
        ),
      ),
    ],
    unanswered: items.filter((item) => !item.answer).length,
    total: items.length,
  };
}

function recommendations(session: SessionView, topics: ExamResultGroup[]) {
  const missed = missedExamConcepts(session);
  const result: ExamRecommendation[] = [];
  const relatedLessonIds = new Set<string>();
  for (const id of missed.objectives) {
    const objective = getChstObjective(id);
    if (!objective) continue;
    if (result.filter((item) => item.kind === "objective").length < 3)
      result.push({
        kind: "objective",
        label: objective.statement,
        href: `/curriculum/${encodeURIComponent(id)}`,
        reason:
          "This objective appeared in an incorrect or unanswered item. Its study outline remains unreviewed.",
      });
    for (const lessonId of objectiveStudyOutline(objective).relatedLessonIds)
      relatedLessonIds.add(lessonId);
  }
  for (const id of missed.questionIds) {
    const lesson = lessonForQuestion(id);
    if (lesson) relatedLessonIds.add(lesson.id);
  }
  for (const id of [...relatedLessonIds].slice(0, 2)) {
    const lesson = lessons.find((item) => item.id === id);
    if (lesson)
      result.push({
        kind: "lesson",
        label: lesson.title,
        href: `/learn/${encodeURIComponent(lesson.id)}`,
        reason:
          "A related demonstration lesson; this tentative connection is not verified full-objective coverage.",
      });
  }
  for (const topic of topics
    .filter((item) => item.correct < item.total)
    .slice(0, 3))
    result.push({
      kind: "practice",
      label: `Practice ${topic.label}`,
      href: `/practice?bank=published&topic=${encodeURIComponent(topic.key)}&count=10`,
      reason: `${topic.correct} of ${topic.total} correct in this attempt. Availability depends on the published bank.`,
    });
  return result;
}

export function analyzeExam(
  session: ExamResultSession,
  previous: readonly ExamComparisonAttempt[] = [],
): ExamResults | null {
  const completed = completedQuestions(session);
  if (!completed) return null;
  // Keep the checked type stable inside the grouping closure as well.
  const questions: SafeQuestion[] = completed;
  const relevantAnswers = questions.flatMap((question) =>
    session.answers[question.id] ? [session.answers[question.id]] : [],
  );
  const answered = relevantAnswers.length;
  const correct = relevantAnswers.filter((answer) => answer.correct).length;
  function group(key: "domain" | "topic" | "difficulty"): ExamResultGroup[] {
    const values =
      key === "domain"
        ? [
            ...new Set([
              ...domains.map((domain) => domain.code),
              ...questions.map((question) => question.domain),
            ]),
          ]
        : [...new Set(questions.map((question) => question[key]))];
    return values.map((value) => {
      const items = questions.filter((question) => question[key] === value);
      const answers = items.flatMap((question) =>
        session.answers[question.id] ? [session.answers[question.id]] : [],
      );
      const right = answers.filter((answer) => answer.correct).length;
      const title =
        key === "domain"
          ? domains.find((domain) => domain.code === value)?.title
          : null;
      return {
        key: value,
        label: title ? `Domain ${value} · ${title}` : value,
        total: items.length,
        answered: answers.length,
        correct: right,
        incorrect: answers.length - right,
        unanswered: items.length - answers.length,
        accuracy: percentage(right, items.length),
        averageResponseMs: answers.length
          ? Math.round(
              answers.reduce(
                (sum, answer) => sum + milliseconds(answer.responseMs),
                0,
              ) / answers.length,
            )
          : null,
      };
    });
  }
  const domainResults = group("domain");
  const topics = group("topic").sort(
    (a, b) =>
      a.accuracy - b.accuracy ||
      b.total - a.total ||
      a.key.localeCompare(b.key),
  );
  const createdAt = timestamp(session.createdAt);
  const deadlineAt = timestamp(session.deadlineAt);
  const submittedAt = timestamp(session.submittedAt);
  const requestedDuration = session.durationSeconds;
  const durationSeconds =
    requestedDuration &&
    Number.isFinite(requestedDuration) &&
    requestedDuration > 0
      ? Math.floor(requestedDuration)
      : createdAt !== null && deadlineAt !== null
        ? Math.max(0, Math.floor((deadlineAt - createdAt) / 1000))
        : 0;
  const effectiveEnd =
    session.submissionReason === "expired" && deadlineAt !== null
      ? deadlineAt
      : submittedAt;
  const timeUsedSeconds =
    createdAt !== null && effectiveEnd !== null
      ? Math.min(
          durationSeconds,
          Math.max(
            0,
            Math.floor(
              (Math.min(effectiveEnd, deadlineAt ?? effectiveEnd) - createdAt) /
                1000,
            ),
          ),
        )
      : 0;
  const responseTimeSumMs = relevantAnswers.reduce(
    (sum, answer) => sum + milliseconds(answer.responseMs),
    0,
  );
  const accuracy = percentage(correct, questions.length);
  const prior = completedHistory(previous)
    .filter(
      (attempt) =>
        attempt.id !== session.id &&
        createdAt !== null &&
        timestamp(attempt.submittedAt)! <= createdAt,
    )
    .sort((a, b) => timestamp(b.submittedAt)! - timestamp(a.submittedAt)!);
  const last = prior[0];
  return {
    total: questions.length,
    answered,
    correct,
    incorrect: answered - correct,
    unanswered: questions.length - answered,
    accuracy,
    durationSeconds,
    timeUsedSeconds,
    responseTimeSumMs,
    averageResponseMs: answered
      ? Math.round(responseTimeSumMs / answered)
      : null,
    domains: domainResults,
    topics,
    difficulties: group("difficulty"),
    weakestAreas: topics
      .filter((topic) => topic.total && topic.correct < topic.total)
      .slice(0, 3),
    recommendations: recommendations(session, topics),
    comparison: last
      ? {
          previousAttemptId: last.id,
          previousPercentage: last.percentage!,
          previousSubmittedAt: last.submittedAt!,
          percentagePointChange: accuracy - last.percentage!,
          historyCount: prior.length,
          domains: domainResults.flatMap((domain) => {
            const old = last.domains?.find((item) => item.code === domain.key);
            if (!old || !validDomainResult(old)) return [];
            const oldAccuracy = percentage(old.correct, old.total);
            return [
              {
                key: domain.key,
                label: domain.label,
                currentAccuracy: domain.accuracy,
                previousAccuracy: oldAccuracy,
                percentagePointChange: domain.accuracy - oldAccuracy,
                total: domain.total,
                previousTotal: old.total,
              },
            ];
          }),
        }
      : null,
  };
}
