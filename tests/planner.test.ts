import { describe, expect, it } from "vitest";
import {
  defaultProfile,
  plannerActionSchema,
  validateProfile,
  type PlannerState,
} from "@/modules/planner/model";
import {
  generateStudyPlan,
  updatePlanner,
  weakDomainsFromSessions,
} from "@/modules/planner/plan";
import { lessons } from "@/modules/learning/catalog";
import type { Session } from "@/modules/practice/types";

const today = "2026-10-22";
const state: PlannerState = {
  version: 1,
  profile: {
    ...defaultProfile,
    studyDays: [0, 1, 2, 3, 4, 5, 6],
    minutesPerSession: 10,
  },
  completedTaskIds: [],
  onboardedAt: `${today}T09:00:00.000Z`,
};
describe("practical personalized study planning", () => {
  it("rejects impossible dates, past targets, duplicate days, unsupported tracks, and excessive capacity", () => {
    for (const profile of [
      { ...defaultProfile, targetDate: "2026-02-30" },
      { ...defaultProfile, targetDate: "2026-10-21" },
      { ...defaultProfile, studyDays: [1, 1] },
      { ...defaultProfile, studyDays: [] },
      { ...defaultProfile, certification: "asp" },
      { ...defaultProfile, minutesPerSession: 121 },
    ])
      expect(() => validateProfile(profile, today)).toThrow();
    expect(
      validateProfile({ ...defaultProfile, targetDate: today }, today)
        .targetDate,
    ).toBe(today);
    expect(() =>
      plannerActionSchema.parse({
        action: "save",
        profile: defaultProfile,
        revision: 0,
        ownerId: "other",
      }),
    ).toThrow();
  });
  it("limits tasks to available days, the target date, and the session budget", () => {
    const plan = generateStudyPlan(
      {
        ...state,
        profile: {
          ...state.profile,
          studyDays: [4, 6],
          targetDate: "2026-10-24",
        },
      },
      [],
      [],
      today,
    );
    expect(plan.map((day) => day.date)).toEqual(["2026-10-22", "2026-10-24"]);
    for (const day of plan)
      expect(
        day.tasks.reduce((minutes, task) => minutes + task.minutes, 0),
      ).toBeLessThanOrEqual(day.minutes);
    expect(
      generateStudyPlan(
        { ...state, profile: { ...state.profile, targetDate: "2026-10-21" } },
        [],
        [],
        today,
      ),
    ).toEqual([]);
  });
  it("prioritizes actual weak domains and incomplete lessons with recorded reasons", () => {
    const plan = generateStudyPlan(state, [lessons[0].id], ["4"], today);
    expect(plan[0].tasks[0].domain).toBe("4");
    expect(plan[0].tasks[0].reason).toContain("saved practice accuracy");
    expect(
      plan
        .flatMap((day) => day.tasks)
        .some((task) => task.lessonId === lessons[0].id),
    ).toBe(false);
    expect(new Set(plan.map((day) => day.tasks[0].lessonId)).size).toBe(7);
    expect(plan[0].tasks[1].href).toContain("/practice?domain=4");
  });
  it("moves missed work forward without adding overdue tasks or overloading tomorrow", () => {
    const initial = generateStudyPlan(state, [], [], today);
    const later = generateStudyPlan(state, [], [], "2026-10-25");
    expect(later).toHaveLength(7);
    expect(later.every((day) => day.date >= "2026-10-25")).toBe(true);
    expect(later.flatMap((day) => day.tasks)).toHaveLength(
      initial.flatMap((day) => day.tasks).length,
    );
  });
  it("persists self-reported activity distinctly from lesson completion and keeps onboarding history", () => {
    const task = generateStudyPlan(state, [], [], today)[0].tasks[0];
    const updated = updatePlanner(
      state,
      { action: "complete", taskId: task.id, completed: true, revision: 1 },
      today,
    );
    expect(generateStudyPlan(updated, [], [], today)[0].tasks[0]).toMatchObject(
      { completed: true, completionSource: "self_reported" },
    );
    expect(updated).not.toHaveProperty("progress");
    const saved = updatePlanner(
      updated,
      {
        action: "save",
        profile: { ...defaultProfile, preference: "reading" },
        revision: 2,
      },
      today,
    );
    expect(saved.onboardedAt).toBe(state.onboardedAt);
    expect(saved.completedTaskIds).toContain(task.id);
  });
  it("never derives recommendations from active exam answer correctness", () => {
    const session = {
      id: "exam",
      ownerId: "learner",
      questionIds: ["demo-01"],
      answers: {
        "demo-01": {
          choiceId: "c3",
          correct: false,
          confidence: "high",
          responseMs: 1000,
          answeredAt: `${today}T10:00:00Z`,
        },
      },
      flags: [],
      mode: "exam",
      status: "in_progress",
      revision: 0,
      createdAt: `${today}T10:00:00Z`,
      submittedAt: null,
    } as Session;
    expect(weakDomainsFromSessions([session])).toEqual([]);
    expect(
      weakDomainsFromSessions([{ ...session, status: "submitted" }]),
    ).toEqual(["1"]);
    const versions = [
      { id: "demo-01", version: 1, domain: "1" },
      { id: "demo-01", version: 2, domain: "4" },
    ];
    expect(
      weakDomainsFromSessions(
        [
          {
            ...session,
            status: "submitted",
            questionVersions: { "demo-01": 2 },
          },
        ],
        versions,
      ),
    ).toEqual(["4"]);
    expect(
      weakDomainsFromSessions([{ ...session, status: "submitted" }], versions),
    ).toEqual(["1"]);
  });
  it("keeps saved assignments stable after lesson completion and updates the real completion indicator", () => {
    const saved = updatePlanner(
      null,
      { action: "save", profile: state.profile, revision: 0 },
      today,
    );
    const initial = generateStudyPlan(saved, [], [], today);
    const lessonId = initial[0].tasks[0].lessonId;
    const completed = generateStudyPlan(saved, [lessonId], ["4"], today);
    expect(completed.map((day) => day.tasks.map((task) => task.id))).toEqual(
      initial.map((day) => day.tasks.map((task) => task.id)),
    );
    expect(completed[0].tasks[0]).toMatchObject({
      completed: true,
      completionSource: "lesson",
      kind: "lesson",
    });
    expect(completed[0].tasks[1].completed).toBe(false);
    const refreshed = updatePlanner(
      saved,
      { action: "regenerate", revision: 1 },
      today,
      undefined,
      [lessonId],
      ["4"],
    );
    expect(
      generateStudyPlan(refreshed, [lessonId], ["4"], today)[0].tasks[0].domain,
    ).toBe("4");
    const nextDay = generateStudyPlan(saved, [lessonId], [], "2026-10-23");
    expect(nextDay[0].date).toBe(initial[1].date);
    expect(nextDay[0].tasks[0].id).toBe(initial[1].tasks[0].id);
  });
});
