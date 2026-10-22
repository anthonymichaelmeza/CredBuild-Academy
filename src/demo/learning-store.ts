import { lessons } from "@/modules/learning/catalog";
import {
  applyLessonAction,
  learningStateSchema as progressSchema,
  type LearningState,
  type LessonAction,
} from "@/modules/learning/progress";
export { canComplete, completedLesson } from "@/modules/learning/progress";
export type { LearningState } from "@/modules/learning/progress";
export const LEARNING_KEY = "credbuilt.learning-demo.v1";
export const LEARNING_CHANGED = "credbuilt:learning-changed";
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
export function lessonAction(lessonId: string, action: LessonAction) {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Error("Lesson not found.");
  const state = parseLearning(learningSnapshot());
  state.progress[lessonId] = applyLessonAction(
    lesson,
    state.progress[lessonId],
    action,
  );
  persist(state);
}
export function resetLearning() {
  try {
    localStorage.removeItem(LEARNING_KEY);
  } catch {
    throw new Error("Learning storage is blocked.");
  }
  window.dispatchEvent(new Event(LEARNING_CHANGED));
}
