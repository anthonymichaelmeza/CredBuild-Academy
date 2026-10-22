import { describe, expect, it } from "vitest";
import { demoQuestions } from "@/demo/questions";
import { allocateDomains, domains } from "@/modules/catalog/blueprint";
import {
  aggregate,
  grade,
  priority,
  selectQuestions,
  sessionConfigSchema,
  sessionView,
} from "@/modules/practice/engine";
import type { Session } from "@/modules/practice/types";
const config = {
  count: 10 as const,
  mode: "adaptive" as const,
  domain: "all" as const,
  prioritizeMissed: false,
};
describe("practice rules", () => {
  it("allocates exactly 200 questions using largest remainders", () => {
    expect(
      allocateDomains(
        200,
        domains.map((d) => d.weight),
      ),
    ).toEqual([73, 40, 45, 42]);
    for (const n of [1, 10, 25, 50, 100, 200])
      expect(
        allocateDomains(n, [3660, 1990, 2250, 2100]).reduce((a, b) => a + b),
      ).toBe(n);
    expect(() => allocateDomains(1, [0])).toThrow();
  });
  it("keeps requested defaults valid and rejects unsupported counts", () => {
    expect(sessionConfigSchema.parse({ ...config, count: 25 }).count).toBe(25);
    expect(
      sessionConfigSchema.safeParse({ ...config, count: 11 }).success,
    ).toBe(false);
  });
  it("selects distinct questions and refuses shortages and narrow domains", () => {
    const selected = selectQuestions(demoQuestions, config, [], () => 0.5);
    expect(new Set(selected.map((q) => q.id)).size).toBe(10);
    expect(() =>
      selectQuestions(demoQuestions, { ...config, count: 25 }, []),
    ).toThrow("Only 12");
    expect(() =>
      selectQuestions(demoQuestions, { ...config, domain: "1" }, []),
    ).toThrow("Only 3");
  });
  it("grades choice identity rather than display order and rejects invalid choices", () => {
    for (const q of demoQuestions) {
      expect(grade(q, "c0")).toBe(true);
      expect(grade(q, "c1")).toBe(false);
    }
    expect(() => grade(demoQuestions[0], "invented")).toThrow();
  });
  it("prioritizes missed low-confidence work with documented deterministic rules", () => {
    const history = [
      {
        questionId: "demo-01",
        correct: false,
        confidence: "low",
        answeredAt: new Date().toISOString(),
      },
    ];
    expect(priority("demo-01", history)).toBeGreaterThan(
      priority("demo-02", history),
    );
    expect(selectQuestions(demoQuestions, config, history)[0].id).toBe(
      "demo-01",
    );
  });
  it("does not leak keys, rationales, references, or explanations before checking", () => {
    const s: Session = {
      id: "session",
      ownerId: "private",
      questionIds: [demoQuestions[0].id],
      answers: {},
      flags: [],
      mode: "learning",
      status: "in_progress",
      createdAt: new Date().toISOString(),
      submittedAt: null,
      revision: 0,
    };
    const safe = sessionView(s, demoQuestions);
    expect(safe).not.toHaveProperty("ownerId");
    expect(safe.feedback).toEqual({});
    expect(safe.questions[0]).not.toHaveProperty("correctChoice");
    expect(safe.questions[0]).not.toHaveProperty("explanation");
    expect(safe.questions[0].choices[0]).not.toHaveProperty("rationale");
    expect(safe.questions[0]).not.toHaveProperty("reference");
  });
  it("leaves new-user accuracy unassessed rather than fabricating a score", () => {
    expect(aggregate([])).toEqual({
      answered: 0,
      correct: 0,
      accuracy: null,
      completed: 0,
      studyMinutes: 0,
    });
  });
});
