import { z } from "zod";
import { lessons, type Lesson } from "./catalog";
export type GradableLesson = Pick<
  Lesson,
  "id" | "version" | "sections" | "checks"
>;

export const lessonProgressSchema = z.object({
  lessonVersion: z.number().int().positive(),
  sections: z.array(z.string()).max(100),
  checks: z.record(
    z.string(),
    z.object({
      choiceId: z.string(),
      correct: z.boolean(),
      attempts: z.number().int().positive(),
    }),
  ),
  completedAt: z.iso.datetime().nullable(),
});
export const learningStateSchema = z.object({
  version: z.literal(1),
  progress: z.record(z.string(), lessonProgressSchema),
});
export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export type LearningState = z.infer<typeof learningStateSchema>;
export const lessonActionSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("visit"), sectionId: z.string().max(100) })
    .strict(),
  z
    .object({
      type: z.literal("check"),
      checkId: z.string().max(100),
      choiceId: z.string().max(100),
    })
    .strict(),
  z.object({ type: z.literal("complete") }).strict(),
]);
export type LessonAction = z.infer<typeof lessonActionSchema>;
export const emptyLearning = (): LearningState => ({
  version: 1,
  progress: {},
});

export function completeable(
  lesson: GradableLesson,
  progress?: LessonProgress,
) {
  return Boolean(
    progress?.lessonVersion === lesson.version &&
    lesson.sections.every((s) => progress.sections.includes(s.id)) &&
    lesson.checks.every((c) => progress.checks[c.id]?.correct),
  );
}

/** Shared state machine; server callers supply the persisted lesson revision. */
export function applyLessonAction(
  lesson: GradableLesson,
  previous: LessonProgress | undefined,
  input: LessonAction,
  now = new Date().toISOString(),
): LessonProgress {
  const action = lessonActionSchema.parse(input);
  const progress: LessonProgress =
    previous?.lessonVersion === lesson.version
      ? structuredClone(previous)
      : {
          lessonVersion: lesson.version,
          sections: [],
          checks: {},
          completedAt: null,
        };
  if (action.type === "visit") {
    if (!lesson.sections.some((s) => s.id === action.sectionId))
      throw new Error("Section not found.");
    if (!progress.sections.includes(action.sectionId))
      progress.sections.push(action.sectionId);
  } else if (action.type === "check") {
    const check = lesson.checks.find((c) => c.id === action.checkId);
    if (!check || !check.choices.some((c) => c.id === action.choiceId))
      throw new Error("Invalid knowledge-check answer.");
    progress.checks[check.id] = {
      choiceId: action.choiceId,
      correct: action.choiceId === check.correctChoice,
      attempts: (progress.checks[check.id]?.attempts || 0) + 1,
    };
    if (action.choiceId !== check.correctChoice) progress.completedAt = null;
  } else {
    if (!completeable(lesson, progress))
      throw new Error(
        "Visit every section and answer every knowledge check correctly before completing this lesson.",
      );
    progress.completedAt ??= now;
  }
  return progress;
}

export function canComplete(id: string, state: LearningState) {
  const lesson = lessons.find((l) => l.id === id);
  return Boolean(lesson && completeable(lesson, state.progress[id]));
}
export function completedLesson(id: string, state: LearningState) {
  return Boolean(canComplete(id, state) && state.progress[id]?.completedAt);
}
