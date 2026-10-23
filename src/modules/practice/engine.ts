import { z } from "zod";
import type { Answer, Question, Session, SessionView } from "./types";
export const sessionConfigSchema = z
  .object({
    count: z.union([
      z.literal(1),
      z.literal(3),
      z.literal(5),
      z.literal(10),
      z.literal(25),
      z.literal(50),
      z.literal(100),
      z.literal(200),
    ]),
    mode: z.enum(["learning", "adaptive", "timed", "exam"]),
    domain: z.string().min(1).max(80),
    prioritizeMissed: z.boolean().default(false),
    topic: z.string().max(100).optional(),
    durationSeconds: z.number().int().min(60).max(14400).optional(),
    bank: z.enum(["demonstration", "published"]).optional(),
    certification: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9_-]+$/)
      .optional(),
  })
  .refine(
    (c) =>
      c.bank === "published" || ["all", "1", "2", "3", "4"].includes(c.domain),
    { message: "Choose an available demonstration domain.", path: ["domain"] },
  )
  .refine(
    (c) =>
      !["timed", "exam"].includes(c.mode) || c.durationSeconds !== undefined,
    {
      message: "Choose a duration for timed sessions.",
      path: ["durationSeconds"],
    },
  );
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
  // A revision is not another question. Pick the latest eligible revision for
  // each identity before filtering so an obsolete topic cannot remain eligible.
  const eligible = currentQuestionVersions(pool).filter(
    (q) =>
      (config.bank !== "published" ||
        q.certification === (config.certification || "chst")) &&
      (config.domain === "all" || q.domain === config.domain) &&
      (!config.topic || config.topic === "all" || q.topic === config.topic),
  );
  if (eligible.length < config.count)
    throw new Error(
      config.bank === "published"
        ? `Only ${eligible.length} eligible published questions are available. Choose a smaller set or another topic. Questions are never duplicated.`
        : `Only ${eligible.length} eligible demonstration questions are available. Choose a smaller focused set (1, 3, or 5), select all domains for 10 questions, or wait for a larger reviewed bank. Questions are never duplicated.`,
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
/** Shared by availability summaries and selection, so revisions cannot inflate counts. */
export function currentQuestionVersions<
  T extends { id: string; version: number },
>(pool: T[]): T[] {
  const current = new Map<string, T>();
  for (const question of pool) {
    const existing = current.get(question.id);
    if (!existing || existing.version < question.version)
      current.set(question.id, question);
  }
  return [...current.values()];
}
export function findPinnedQuestion<T extends { id: string; version: number }>(
  session: Pick<Session, "questionVersions">,
  pool: T[],
  id: string,
): T | undefined {
  // v0.3/v0.4 only shipped version 1. Never substitute a newer revision into
  // those historical attempts when a bank revision is added later.
  const version =
    session.questionVersions === undefined ? 1 : session.questionVersions[id];
  return pool.find((q) => q.id === id && q.version === version);
}
export function pinnedQuestion(
  session: Pick<Session, "questionVersions">,
  pool: Question[],
  id: string,
) {
  const question = findPinnedQuestion(session, pool, id);
  if (!question) throw new Error("Pinned question version unavailable.");
  return question;
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
    const q = pinnedQuestion(session, pool, id);
    // Use an explicit allowlist. New editorial fields must not silently enter
    // the public payload when the Question model expands.
    return {
      id: q.id,
      version: q.version,
      ...(q.certification ? { certification: q.certification } : {}),
      ...(q.blueprint
        ? {
            blueprint: {
              version: q.blueprint.version,
              objective: q.blueprint.objective,
            },
          }
        : {}),
      domain: q.domain,
      topic: q.topic,
      difficulty: q.difficulty,
      stem: q.stem,
      contentKind: q.contentKind,
      origin: q.origin,
      reviewStatus: q.reviewStatus,
      ...(q.questionType ? { questionType: q.questionType } : {}),
      ...(q.media
        ? {
            media: q.media.map(({ url, alt, rights }) => ({
              url,
              alt,
              rights,
            })),
          }
        : {}),
      choices: q.choices.map(({ id, text }) => ({ id, text })),
    };
  });
  const feedback: SessionView["feedback"] = {};
  for (const id of session.questionIds) {
    if (
      (session.mode !== "exam" && session.answers[id]) ||
      session.status === "submitted"
    ) {
      const q = pinnedQuestion(session, pool, id);
      feedback[id] = {
        correctChoice: q.correctChoice,
        explanation: q.explanation,
        reference: q.reference,
        rationales: q.choices,
        ...(q.solutionSteps ? { solutionSteps: [...q.solutionSteps] } : {}),
      };
    }
  }
  const answers =
    session.mode === "exam" && session.status === "in_progress"
      ? Object.fromEntries(
          Object.entries(session.answers).map(([id, a]) => {
            const { correct: _correct, ...rest } = a;
            void _correct;
            return [id, rest];
          }),
        )
      : session.answers;
  return { ...safe, answers, questions, feedback };
}
export function aggregate(
  sessions: (Pick<Session, "answers" | "status"> &
    Partial<Pick<Session, "mode">>)[],
) {
  const answers: Answer[] = sessions
    .filter((s) => s.mode !== "exam" || s.status === "submitted")
    .flatMap((s) => Object.values(s.answers));
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
