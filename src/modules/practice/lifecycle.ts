import type { Question, Session, Confidence } from "./types";
import { grade } from "./engine";

export function deadlinePassed(session: Session, now = Date.now()) {
  return (
    session.status === "in_progress" &&
    Boolean(session.deadlineAt) &&
    Date.parse(session.deadlineAt!) <= now
  );
}
export function finalize(session: Session, now = Date.now()): Session {
  if (session.status === "submitted") return session;
  return {
    ...session,
    status: "submitted",
    submittedAt: new Date(now).toISOString(),
    submissionReason: deadlinePassed(session, now) ? "expired" : "manual",
  };
}
export function recordAnswer(
  session: Session,
  pool: Question[],
  input: {
    questionId: string;
    choiceId: string;
    confidence: Confidence;
    responseMs: number;
  },
  now = Date.now(),
): Session {
  if (session.status !== "in_progress")
    throw new Error("Session already submitted.");
  if (deadlinePassed(session, now)) return finalize(session, now); // late answers never enter results
  if (!session.questionIds.includes(input.questionId))
    throw new Error("Question not in this session.");
  if (session.answers[input.questionId] && session.mode !== "exam")
    return session;
  const q = pool.find((q) => q.id === input.questionId);
  if (!q) throw new Error("Pinned question unavailable.");
  const previous = session.answers[input.questionId];
  return {
    ...session,
    answers: {
      ...session.answers,
      [input.questionId]: {
        choiceId: input.choiceId,
        confidence: input.confidence,
        correct: grade(q, input.choiceId),
        responseMs: Math.min(
          86_400_000,
          (previous?.responseMs || 0) + input.responseMs,
        ),
        answeredAt: new Date(now).toISOString(),
      },
    },
  };
}
