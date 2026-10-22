import { z } from "zod";
import {
  emptyPlanner,
  plannerStateSchema,
  plannerActionSchema,
  type PlannerAction,
  type PlannerSnapshot,
} from "@/modules/planner/model";
import { generateStudyPlan, updatePlanner } from "@/modules/planner/plan";

export const PLANNER_KEY = "credbuilt.planner-demo.v1";
const PLANNER_CHANGED = "credbuilt:planner-changed";
const storedSchema = z
  .object({
    state: plannerStateSchema.nullable(),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export function plannerSnapshot() {
  try {
    return localStorage.getItem(PLANNER_KEY);
  } catch {
    return "unavailable";
  }
}
export function parsePlanner(raw: string | null): PlannerSnapshot {
  if (raw === null) return emptyPlanner;
  if (raw === "unavailable")
    throw new Error(
      "Study-plan storage is blocked. Allow site storage before saving your preferences.",
    );
  try {
    return storedSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      "Saved study preferences cannot be read. Reset the study plan to begin again; your lessons and practice stay separate.",
    );
  }
}
export function subscribePlanner(notify: () => void) {
  const changed = (event: StorageEvent) => {
    if (!event.key || event.key === PLANNER_KEY) notify();
  };
  window.addEventListener("storage", changed);
  window.addEventListener(PLANNER_CHANGED, notify);
  return () => {
    window.removeEventListener("storage", changed);
    window.removeEventListener(PLANNER_CHANGED, notify);
  };
}
export function plannerAction(
  input: PlannerAction,
  completedLessons: string[],
  weakDomains: string[] = [],
) {
  const action = plannerActionSchema.parse(input);
  const current = parsePlanner(plannerSnapshot());
  if (current.revision !== action.revision)
    throw new Error(
      "This study plan changed in another tab. Refresh and try again.",
    );
  if (
    action.action === "complete" &&
    (!current.state ||
      !generateStudyPlan(current.state, completedLessons, weakDomains).some(
        (day) => day.tasks.some((task) => task.id === action.taskId),
      ))
  )
    throw new Error(
      "This task is no longer in your current week. Refresh your plan.",
    );
  const result = {
    state: updatePlanner(
      current.state,
      action,
      undefined,
      undefined,
      completedLessons,
      weakDomains,
    ),
    revision: current.revision + 1,
  };
  storedSchema.parse(result);
  try {
    localStorage.setItem(PLANNER_KEY, JSON.stringify(result));
  } catch {
    throw new Error(
      "Study preferences could not be saved. Storage may be full or blocked; no change was recorded.",
    );
  }
  window.dispatchEvent(new Event(PLANNER_CHANGED));
  return result;
}
export function resetPlanner() {
  try {
    localStorage.removeItem(PLANNER_KEY);
  } catch {
    throw new Error("Study-plan storage is blocked.");
  }
  window.dispatchEvent(new Event(PLANNER_CHANGED));
}
