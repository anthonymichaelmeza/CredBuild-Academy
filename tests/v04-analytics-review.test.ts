import { describe, expect, it } from "vitest";
import { demoQuestions } from "@/demo/questions";
import {
  analyzeSessions,
  recommendedLessons,
} from "@/modules/performance/analytics";
import {
  transitionReview,
  reviseContent,
  approvalBlockers,
  type ReviewContent,
} from "@/modules/content/review";
import type { Session } from "@/modules/practice/types";
function session(id: string): Session {
  return {
    id,
    ownerId: "test",
    mode: "learning",
    questionIds: ["demo-01"],
    answers: {
      "demo-01": {
        choiceId: "c1",
        confidence: "low",
        correct: false,
        answeredAt: "2026-10-22T12:00:00Z",
        responseMs: 60_000,
      },
    },
    flags: [],
    status: "submitted",
    revision: 1,
    createdAt: "2026-10-22T12:00:00Z",
    submittedAt: "2026-10-22T12:00:01Z",
  };
}
// Synthetic evidence for policy tests only; never seeded or presented as an actual source review.
const reviewed = (): ReviewContent => ({
  id: "synthetic",
  revision: 1,
  authorId: "author",
  contentKind: "instructional",
  status: "technical_review",
  blueprint: {
    version: "test",
    domain: "1",
    objective: "test-objective",
    verified: true,
  },
  explanation: "Test explanation",
  sources: [
    {
      title: "Synthetic source review",
      url: "https://www.osha.gov/safety-management",
      section: "Synthetic locator",
      edition: "Test edition",
      reviewedBy: "reviewer",
      reviewedAt: "2026-10-22T12:00:00Z",
      notes: "Synthetic supporting evidence",
      supportsClaim: true,
    },
  ],
  review: {
    reviewerId: "reviewer",
    revision: 1,
    notes: "Synthetic technical review",
    reviewedAt: "2026-10-22T12:01:00Z",
  },
  events: [],
});
describe("real-data analytics", () => {
  it("counts domain/topic accuracy, repeated misses, activity, and evidence sessions", () => {
    const data = analyzeSessions([session("a"), session("b")], demoQuestions);
    expect(data.answered).toBe(2);
    expect(data.accuracy).toBe(0);
    expect(data.studyMinutes).toBe(2);
    expect(data.topics[0]).toMatchObject({
      value: "Hazard recognition",
      answered: 2,
      sessionIds: ["a", "b"],
    });
    expect(data.repeated[0].misses).toBe(2);
    expect(data.activity).toEqual([{ day: "2026-10-22", answers: 2 }]);
  });
  it("leaves unattempted groups absent and does not leak ongoing exam performance", () => {
    expect(analyzeSessions([], demoQuestions).accuracy).toBeNull();
    expect(
      analyzeSessions(
        [{ ...session("a"), mode: "exam", status: "in_progress" }],
        demoQuestions,
      ).answered,
    ).toBe(0);
    expect(
      analyzeSessions([session("a")], demoQuestions, { topic: "Training" })
        .topics,
    ).toEqual([]);
    expect(
      analyzeSessions([session("a")], demoQuestions, {
        since: Date.parse("2026-10-23"),
      }).answered,
    ).toBe(0);
  });
  it("recommends a lesson for an observed weak topic and excludes completed lessons", () => {
    expect(
      recommendedLessons([session("a")], demoQuestions, [])[0].lesson.id,
    ).toBe("recognize-hazards");
    expect(
      recommendedLessons([session("a")], demoQuestions, [
        "recognize-hazards",
      ]).every((r) => r.lesson.id !== "recognize-hazards"),
    ).toBe(true);
  });
});
describe("review policy and versioned audit trail", () => {
  it("supports independent approval, administrator publication, and retirement with audit events", () => {
    const approved = transitionReview(reviewed(), "approved", {
      id: "reviewer",
      role: "reviewer",
    });
    const published = transitionReview(approved, "published", {
      id: "admin",
      role: "administrator",
    });
    const retired = transitionReview(published, "retired", {
      id: "admin",
      role: "administrator",
    });
    expect(retired.status).toBe("retired");
    expect(retired.events).toHaveLength(3);
    expect(() =>
      transitionReview(retired, "published", {
        id: "admin",
        role: "administrator",
      }),
    ).toThrow();
  });
  it("rejects absent mapping, unsupported sources, self-approval, and demonstration publication", () => {
    const draft = reviewed();
    draft.blueprint.verified = false;
    draft.sources[0].supportsClaim = false;
    expect(approvalBlockers(draft)).toHaveLength(2);
    expect(() =>
      transitionReview(draft, "approved", { id: "reviewer", role: "reviewer" }),
    ).toThrow();
    expect(() =>
      transitionReview(reviewed(), "approved", {
        id: "author",
        role: "reviewer",
      }),
    ).toThrow();
    const demo = {
      ...reviewed(),
      status: "approved" as const,
      contentKind: "demonstration" as const,
    };
    expect(() =>
      transitionReview(demo, "published", {
        id: "admin",
        role: "administrator",
      }),
    ).toThrow("Demonstration");
  });
  it("invalidates approval on a new revision and rejects a stale review record", () => {
    const changed = reviseContent(reviewed());
    expect(changed).toMatchObject({
      revision: 2,
      status: "draft",
      review: null,
    });
    expect(changed.sources[0].reviewedAt).toBeNull();
    const stale = reviewed();
    stale.revision = 2;
    expect(() =>
      transitionReview(stale, "approved", { id: "reviewer", role: "reviewer" }),
    ).toThrow("exact revision");
  });
});
