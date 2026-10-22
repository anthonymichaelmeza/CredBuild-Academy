import { z } from "zod";
import { lessons } from "@/modules/learning/catalog";
export const LEARNING_KEY = "credbuilt.learning-demo.v1";
export const LEARNING_CHANGED = "credbuilt:learning-changed";
const progressSchema = z.object({
  version: z.literal(1),
  progress: z.record(
    z.string(),
    z.object({
      lessonVersion: z.number().int().positive(),
      sections: z.array(z.string()),
      checks: z.record(
        z.string(),
        z.object({
          choiceId: z.string(),
          correct: z.boolean(),
          attempts: z.number().int().positive(),
        }),
      ),
      completedAt: z.iso.datetime().nullable(),
    }),
  ),
});
export type LearningState = z.infer<typeof progressSchema>;
export function learningSnapshot(): string | null {
  try {
    return localStorage.getItem(LEARNING_KEY);
  } catch {
    return "unavailable";
  }
}
export function parseLearning(raw: string | null): LearningState {
  if (raw === "unavailable")
    throw new Error(
      "Browser learning storage is unavailable. Allow site storage to save lesson progress.",
    );
  if (raw === null) return { version: 1, progress: {} };
  try {
    return progressSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      "Learning progress cannot be read. Reset learning progress below to start again; practice history is separate.",
    );
  }
}
export function subscribeLearning(notify: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === LEARNING_KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LEARNING_CHANGED, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LEARNING_CHANGED, notify);
  };
}
function persist(state: LearningState) {
  progressSchema.parse(state);
  try {
    localStorage.setItem(LEARNING_KEY, JSON.stringify(state));
  } catch {
    throw new Error(
      "Lesson progress could not be saved. Browser storage may be full or blocked; no completion was recorded.",
    );
  }
  window.dispatchEvent(new Event(LEARNING_CHANGED));
}
export function lessonAction(
  lessonId: string,
  action:
    | { type: "visit"; sectionId: string }
    | { type: "check"; checkId: string; choiceId: string }
    | { type: "complete" },
) {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Error("Lesson not found.");
  const state = parseLearning(learningSnapshot());
  const previous = state.progress[lessonId];
  const progress: LearningState["progress"][string] =
    previous?.lessonVersion === lesson.version
      ? previous
      : {
          lessonVersion: lesson.version,
          sections: [],
          checks: {},
          completedAt: null,
        };
  if (action.type === "visit") {
    if (!lesson.sections.some((s) => s.id === action.sectionId))
      throw new Error("Section not found.");
    if (progress.sections.includes(action.sectionId)) return;
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
    if (
      !canComplete(lessonId, { version: 1, progress: { [lessonId]: progress } })
    )
      throw new Error(
        "Visit every section and answer both demonstration knowledge checks correctly before completing this lesson.",
      );
    progress.completedAt ??= new Date().toISOString();
  }
  state.progress[lessonId] = progress;
  persist(state);
}
export function canComplete(id: string, state: LearningState) {
  const lesson = lessons.find((l) => l.id === id);
  const p = state.progress[id];
  return Boolean(
    lesson &&
    p?.lessonVersion === lesson.version &&
    lesson.sections.every((s) => p.sections.includes(s.id)) &&
    lesson.checks.every((c) => p.checks[c.id]?.correct),
  );
}
export function completedLesson(id: string, state: LearningState) {
  return Boolean(canComplete(id, state) && state.progress[id]?.completedAt);
}
export function resetLearning() {
  try {
    localStorage.removeItem(LEARNING_KEY);
  } catch {
    throw new Error("Learning storage is blocked.");
  }
  window.dispatchEvent(new Event(LEARNING_CHANGED));
}
