import type { Answer, Question, Session } from "@/modules/practice/types";

/** Metadata only: analytics never needs answer keys or teaching explanations. */
export type PerformanceQuestion = Pick<
  Question,
  | "id"
  | "version"
  | "domain"
  | "topic"
  | "difficulty"
  | "certification"
  | "blueprint"
>;
export type PerformanceAnswer = Pick<
  Answer,
  "confidence" | "answeredAt" | "responseMs"
> & { correct?: boolean };
export type PerformanceSession = Pick<
  Session,
  | "id"
  | "questionIds"
  | "questionVersions"
  | "mode"
  | "status"
  | "createdAt"
  | "submittedAt"
  | "submissionReason"
  | "bank"
> & { answers: Record<string, PerformanceAnswer> };

/** Call before crossing a server-to-client boundary, including RSC props. */
export function performanceData(saved: Session[], questions: Question[]) {
  return {
    saved: saved.map((session): PerformanceSession => ({
      id: session.id,
      questionIds: [...session.questionIds],
      ...(session.questionVersions && {
        questionVersions: { ...session.questionVersions },
      }),
      mode: session.mode,
      status: session.status,
      createdAt: session.createdAt,
      submittedAt: session.submittedAt,
      ...(session.bank && { bank: session.bank }),
      ...(session.submissionReason && {
        submissionReason: session.submissionReason,
      }),
      answers: Object.fromEntries(
        Object.entries(session.answers).map(([id, answer]) => [
          id,
          {
            confidence: answer.confidence,
            answeredAt: answer.answeredAt,
            responseMs: answer.responseMs,
            ...(session.mode !== "exam" || session.status === "submitted"
              ? { correct: answer.correct }
              : {}),
          },
        ]),
      ),
    })),
    questions: questions.map((question): PerformanceQuestion => ({
      id: question.id,
      version: question.version,
      domain: question.domain,
      topic: question.topic,
      difficulty: question.difficulty,
      ...(question.certification
        ? { certification: question.certification }
        : {}),
      ...(question.blueprint
        ? {
            blueprint: {
              version: question.blueprint.version,
              objective: question.blueprint.objective,
            },
          }
        : {}),
    })),
  };
}
