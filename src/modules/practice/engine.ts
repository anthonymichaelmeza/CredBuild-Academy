import { z } from "zod";
import type { Answer, Question, Session, SessionView } from "./types";
export const sessionConfigSchema = z.object({
  count: z.union([
    z.literal(10),
    z.literal(25),
    z.literal(50),
    z.literal(100),
    z.literal(200),
  ]),
  mode: z.enum(["learning", "adaptive"]),
  domain: z.enum(["all", "1", "2", "3", "4"]),
  prioritizeMissed: z.boolean().default(false),
});
export const answerSchema = z.object({
  questionId: z.string().max(80),
  choiceId: z.string().max(20),
  confidence: z.enum(["low", "medium", "high"]),
  responseMs: z.number().int().min(0).max(86_400_000),
});
export type Config = z.infer<typeof sessionConfigSchema>;
export type PriorAttempt = {
  questionId: string;
  correct: boolean;
  confidence: string;
  answeredAt: string;
};
// v1: transparent, deterministic ranking. No claim of psychometric validity.
export function priority(
  questionId: string,
  history: PriorAttempt[],
  now = Date.now(),
) {
  const attempts = history.filter((a) => a.questionId === questionId);
  if (!attempts.length) return 4;
  const latest = attempts.at(-1)!;
  const misses = attempts.filter((a) => !a.correct).length;
  const days = Math.max(0, (now - Date.parse(latest.answeredAt)) / 86_400_000);
  return (
    (latest.correct ? 0 : 5) +
    Math.min(misses, 3) +
    (latest.confidence === "low" ? 2 : 0) +
    Math.min(days / 7, 3)
  );
}
export function selectQuestions(
  pool: Question[],
  config: Config,
  history: PriorAttempt[],
  random: () => number = Math.random,
): Question[] {
  const eligible = pool.filter(
    (q) => config.domain === "all" || q.domain === config.domain,
  );
  if (eligible.length < config.count)
    throw new Error(
      `Only ${eligible.length} eligible demonstration questions are available. Select 10 questions and all domains, or wait for a larger reviewed bank. Questions are never duplicated.`,
    );
  const randomized = eligible.map((q) => ({ q, tie: random() }));
  randomized.sort((a, b) => {
    const missed = (id: string) =>
      history.some((h) => h.questionId === id && !h.correct) ? 1 : 0;
    const boost = config.prioritizeMissed
      ? (missed(b.q.id) - missed(a.q.id)) * 100
      : 0;
    const adaptive =
      config.mode === "adaptive"
        ? priority(b.q.id, history) - priority(a.q.id, history)
        : 0;
    return boost || adaptive || a.tie - b.tie;
  });
  return randomized.slice(0, config.count).map((x) => x.q);
}
export function grade(question: Question, choiceId: string) {
  if (!question.choices.some((c) => c.id === choiceId))
    throw new Error("Choose an available answer.");
  return choiceId === question.correctChoice;
}
export function sessionView(session: Session, pool: Question[]): SessionView {
  const { ownerId: _owner, ...safe } = session;
  void _owner;
  const questions = session.questionIds.map((id) => {
    const q = pool.find((q) => q.id === id);
    if (!q) throw new Error("Pinned question version unavailable");
    const {
      correctChoice: _key,
      explanation: _explanation,
      reference: _ref,
      choices,
      ...rest
    } = q;
    void _key;
    void _explanation;
    void _ref;
    return { ...rest, choices: choices.map(({ id, text }) => ({ id, text })) };
  });
  const feedback: SessionView["feedback"] = {};
  for (const id of session.questionIds) {
    if (session.answers[id] || session.status === "submitted") {
      const q = pool.find((q) => q.id === id)!;
      feedback[id] = {
        correctChoice: q.correctChoice,
        explanation: q.explanation,
        reference: q.reference,
        rationales: q.choices,
      };
    }
  }
  return { ...safe, questions, feedback };
}
export function aggregate(sessions: Pick<Session, "answers" | "status">[]) {
  const answers: Answer[] = sessions.flatMap((s) => Object.values(s.answers));
  const correct = answers.filter((a) => a.correct).length;
  return {
    answered: answers.length,
    correct,
    accuracy: answers.length
      ? Math.round((correct / answers.length) * 100)
      : null,
    completed: sessions.filter((s) => s.status === "submitted").length,
    studyMinutes: Math.round(
      answers.reduce((sum, a) => sum + a.responseMs, 0) / 60000,
    ),
  };
}
