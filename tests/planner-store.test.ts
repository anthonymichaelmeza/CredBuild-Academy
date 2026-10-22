// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@/modules/planner/model";
import { generateStudyPlan } from "@/modules/planner/plan";
import {
  PLANNER_KEY,
  plannerAction,
  plannerSnapshot,
  parsePlanner,
  resetPlanner,
} from "@/demo/planner-store";
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe("browser-local planner persistence", () => {
  it("resumes saved preferences and checklist while preserving learning and practice keys", () => {
    localStorage.setItem("credbuilt.browser-demo.v1", "practice");
    localStorage.setItem("credbuilt.learning-demo.v1", "lessons");
    const created = plannerAction(
      {
        action: "save",
        profile: { ...defaultProfile, studyDays: [0, 1, 2, 3, 4, 5, 6] },
        revision: 0,
      },
      [],
    );
    const task = generateStudyPlan(created.state, [])[0].tasks[0];
    plannerAction(
      {
        action: "complete",
        taskId: task.id,
        completed: true,
        revision: created.revision,
      },
      [],
    );
    expect(parsePlanner(plannerSnapshot()).state?.completedTaskIds).toContain(
      task.id,
    );
    expect(() =>
      plannerAction(
        { action: "save", profile: defaultProfile, revision: 0 },
        [],
      ),
    ).toThrow("another tab");
    resetPlanner();
    expect(localStorage.getItem(PLANNER_KEY)).toBeNull();
    expect(localStorage.getItem("credbuilt.browser-demo.v1")).toBe("practice");
    expect(localStorage.getItem("credbuilt.learning-demo.v1")).toBe("lessons");
  });
  it("rejects invalid tasks and does not claim persistence after a storage failure", () => {
    const created = plannerAction(
      { action: "save", profile: defaultProfile, revision: 0 },
      [],
    );
    expect(() =>
      plannerAction(
        {
          action: "complete",
          taskId: "2020-01-01:lesson:recognize-hazards",
          completed: true,
          revision: created.revision,
        },
        [],
      ),
    ).toThrow("current week");
    const previous = plannerSnapshot();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    expect(() =>
      plannerAction(
        { action: "save", profile: defaultProfile, revision: created.revision },
        [],
      ),
    ).toThrow("could not be saved");
    expect(plannerSnapshot()).toBe(previous);
    expect(() => parsePlanner("unavailable")).toThrow("blocked");
    expect(() => parsePlanner("broken")).toThrow("cannot be read");
  });
});
