import type { Question, Session } from "@/modules/practice/types";
import { lessons } from "@/modules/learning/catalog";
export function analyzeSessions(
  sessions: Session[],
  questions: Question[],
  filter: { domain?: string; topic?: string; since?: number } = {},
) {
  const eligible = sessions.filter(
    (s) => s.mode !== "exam" || s.status === "submitted",
  );
  const attempts = eligible.flatMap((s) =>
    Object.entries(s.answers).flatMap(([id, a]) => {
      const q = questions.find((q) => q.id === id);
      if (
        !q ||
        (filter.domain &&
          filter.domain !== "all" &&
          q.domain !== filter.domain) ||
        (filter.topic && filter.topic !== "all" && q.topic !== filter.topic) ||
        (filter.since && Date.parse(a.answeredAt) < filter.since)
      )
        return [];
      return [{ ...a, question: q, sessionId: s.id }];
    }),
  );
  function group(key: "domain" | "topic") {
    return [...new Set(attempts.map((a) => a.question[key]))]
      .map((value) => {
        const items = attempts.filter((a) => a.question[key] === value);
        const correct = items.filter((a) => a.correct).length;
        return {
          value,
          correct,
          answered: items.length,
          accuracy: Math.round((correct / items.length) * 100),
          sessionIds: [...new Set(items.map((a) => a.sessionId))],
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered);
  }
  const repeated = questions
    .map((q) => {
      const items = attempts.filter((a) => a.question.id === q.id);
      return {
        question: q,
        misses: items.filter((a) => !a.correct).length,
        attempts: items.length,
        sessionIds: [...new Set(items.map((a) => a.sessionId))],
      };
    })
    .filter((q) => q.misses >= 2)
    .sort((a, b) => b.misses - a.misses);
  const activity = [...new Set(attempts.map((a) => a.answeredAt.slice(0, 10)))]
    .sort()
    .map((day) => ({
      day,
      answers: attempts.filter((a) => a.answeredAt.startsWith(day)).length,
    }));
  const correct = attempts.filter((a) => a.correct).length;
  return {
    answered: attempts.length,
    correct,
    accuracy: attempts.length
      ? Math.round((correct / attempts.length) * 100)
      : null,
    domains: group("domain"),
    topics: group("topic"),
    repeated,
    activity,
    studyMinutes: Math.round(
      attempts.reduce((n, a) => n + a.responseMs, 0) / 60000,
    ),
    attempts,
  };
}
export function recommendedLessons(
  sessions: Session[],
  questions: Question[],
  completed: string[],
) {
  const analysis = analyzeSessions(sessions, questions);
  const weakTopics = analysis.topics
    .filter((t) => t.accuracy < 75)
    .map((t) => t.value);
  const ranked = [...lessons]
    .filter((l) => !completed.includes(l.id))
    .sort((a, b) => {
      const ai = weakTopics.indexOf(a.topic);
      const bi = weakTopics.indexOf(b.topic);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  return ranked.slice(0, 2).map((l) => ({
    lesson: l,
    reason: weakTopics.includes(l.topic)
      ? "Related to your lower-accuracy practice topics"
      : "Next incomplete demo lesson in the learning path",
  }));
}
