import { lessons, focusedPracticeLink } from "@/modules/learning/catalog";
import { demoQuestions } from "@/demo/questions";
import type { Question, Session } from "@/modules/practice/types";
import { findPinnedQuestion } from "@/modules/practice/engine";
import { utcDate, type PlannerState } from "./model";

export type StudyTask = {
  id: string;
  kind: "lesson" | "practice" | "review";
  title: string;
  lessonId: string;
  domain: string;
  minutes: number;
  href: string;
  reason: string;
  completed: boolean;
  completionSource: "lesson" | "self_reported" | null;
};
export type StudyDay = { date: string; minutes: number; tasks: StudyTask[] };
export function weakDomainsFromSessions(
  sessions: Session[],
  questions: Pick<Question, "id" | "version" | "domain">[] = demoQuestions,
) {
  const scores = new Map<string, { total: number; correct: number }>();
  for (const session of sessions) {
    // An ongoing exam must not influence feedback or recommendations.
    if (session.mode === "exam" && session.status !== "submitted") continue;
    for (const [id, answer] of Object.entries(session.answers)) {
      const question = findPinnedQuestion(session, questions, id);
      if (!question) continue;
      const score = scores.get(question.domain) || { total: 0, correct: 0 };
      score.total++;
      score.correct += Number(answer.correct);
      scores.set(question.domain, score);
    }
  }
  return [...scores.entries()]
    .filter(([, score]) => score.correct / score.total < 0.75)
    .sort(
      (a, b) =>
        a[1].correct / a[1].total - b[1].correct / b[1].total ||
        a[0].localeCompare(b[0]),
    )
    .map(([domain]) => domain);
}

/** Assignments remain fixed until the learner refreshes their seven-day plan. */
function makeAssignments(
  state: PlannerState,
  completedLessons: string[],
  weakDomains: string[] = [],
  today = utcDate(),
) {
  const { profile } = state;
  const completed = new Set(completedLessons);
  const priorities = [...new Set([...weakDomains, ...profile.priorityDomains])];
  const ordered = [...lessons].sort((a, b) => {
    const rank = (lesson: typeof a) =>
      Number(completed.has(lesson.id)) * 100 +
      (priorities.includes(lesson.domain)
        ? priorities.indexOf(lesson.domain)
        : 10);
    return rank(a) - rank(b) || lessons.indexOf(a) - lessons.indexOf(b);
  });
  let index = 0;
  const assignments: NonNullable<PlannerState["schedule"]>["assignments"] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(`${today}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const day = utcDate(date);
    if (
      (profile.targetDate && day > profile.targetDate) ||
      !profile.studyDays.includes(date.getUTCDay())
    )
      continue;
    const lesson = ordered[index++ % ordered.length];
    const reason = weakDomains.includes(lesson.domain)
      ? "Suggested from saved practice accuracy below 75%; small samples are not a mastery assessment."
      : profile.priorityDomains.some((domain) => domain === lesson.domain)
        ? "A priority domain you selected."
        : completed.has(lesson.id)
          ? "Revisit a completed concept for retention."
          : "Continue an incomplete representative lesson.";
    assignments.push({
      date: day,
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      kind: completed.has(lesson.id) ? "review" : "lesson",
      reason,
    });
  }
  return assignments;
}

export function generateStudyPlan(
  state: PlannerState,
  completedLessons: string[],
  weakDomains: string[] = [],
  today = utcDate(),
): StudyDay[] {
  const { profile } = state;
  const completed = new Set(completedLessons);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const lastDay = utcDate(end);
  const assignments =
    state.schedule?.assignments ??
    makeAssignments(state, completedLessons, weakDomains, today);
  const days: StudyDay[] = [];
  for (const assignment of assignments) {
    const day = assignment.date;
    if (
      day < today ||
      day > lastDay ||
      (profile.targetDate && day > profile.targetDate)
    )
      continue;
    const found = lessons.find((l) => l.id === assignment.lessonId);
    if (!found) continue;
    const lesson = found;
    const tasks: StudyTask[] = [];
    function task(kind: StudyTask["kind"], minutes: number) {
      const id = `${day}:${kind}:${lesson.id}:v${assignment.lessonVersion}`;
      const actualCompletion =
        kind === "lesson" &&
        lesson.version === assignment.lessonVersion &&
        completed.has(lesson.id);
      tasks.push({
        id,
        kind,
        lessonId: lesson.id,
        domain: lesson.domain,
        minutes,
        title:
          kind === "practice"
            ? `Practice: ${lesson.topic}`
            : kind === "review"
              ? `Revisit: ${lesson.title}`
              : lesson.title,
        href:
          kind === "practice"
            ? focusedPracticeLink(lesson)
            : `/learn/${lesson.id}`,
        reason: assignment.reason,
        completed: actualCompletion || state.completedTaskIds.includes(id),
        completionSource: actualCompletion
          ? "lesson"
          : state.completedTaskIds.includes(id)
            ? "self_reported"
            : null,
      });
    }
    if (profile.preference !== "practice")
      task(assignment.kind, lesson.readingMinutes);
    if (profile.preference !== "reading") {
      const remaining =
        profile.minutesPerSession -
        tasks.reduce((sum, item) => sum + item.minutes, 0);
      if (remaining >= 4) task("practice", Math.min(5, remaining));
    }
    days.push({ date: day, minutes: profile.minutesPerSession, tasks });
  }
  return days;
}

export function updatePlanner(
  current: PlannerState | null,
  action: import("./model").PlannerAction,
  today = utcDate(),
  now = new Date().toISOString(),
  completedLessons: string[] = [],
  weakDomains: string[] = [],
): PlannerState {
  if (action.action === "save" || action.action === "regenerate") {
    // Revalidation is intentionally separate from persisted-profile parsing: old target dates remain readable.
    const profile =
      action.action === "save" ? action.profile : current?.profile;
    if (!profile)
      throw new Error("Save study preferences before refreshing your plan.");
    const { targetDate } = profile;
    if (targetDate && targetDate < today)
      throw new Error(
        "Your target exam date has passed. Choose today or a future date.",
      );
    const next: PlannerState = {
      version: 1,
      profile,
      completedTaskIds: current?.completedTaskIds || [],
      onboardedAt: current?.onboardedAt || now,
    };
    next.schedule = {
      createdOn: today,
      assignments: makeAssignments(next, completedLessons, weakDomains, today),
    };
    return next;
  }
  if (!current)
    throw new Error(
      "Save your study preferences before completing a plan task.",
    );
  // IDs are suggestions, not evidence of learning. Retain only a bounded rolling checklist.
  const recent = current.completedTaskIds.filter((id) => {
    const age =
      (Date.parse(`${today}T00:00:00Z`) -
        Date.parse(`${id.slice(0, 10)}T00:00:00Z`)) /
      86_400_000;
    return age < 60 && age >= -7;
  });
  const completedTaskIds = action.completed
    ? [...new Set([...recent, action.taskId])].slice(-500)
    : recent.filter((id) => id !== action.taskId);
  return {
    ...current,
    completedTaskIds,
    schedule: current.schedule ?? {
      createdOn: today,
      assignments: makeAssignments(
        current,
        completedLessons,
        weakDomains,
        today,
      ),
    },
  };
}
