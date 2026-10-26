import { describe, expect, it } from "vitest";
import { demoQuestions } from "@/demo/questions";
import {
  selectFullLengthExam,
  type ExamSelectionPolicy,
} from "@/modules/exams/selection";
import type { Question } from "@/modules/practice/types";

// Fictional test policy and content; no real BCSP duration or approval is established.
const policy: ExamSelectionPolicy = {
  certification: "chst",
  blueprintVersion: "qa-test-blueprint",
  blueprintVerified: true,
  durationSeconds: 3600,
  durationVerified: true,
  domains: [
    { code: "1", weight: 3660 },
    { code: "2", weight: 1990 },
    { code: "3", weight: 2250 },
    { code: "4", weight: 2100 },
  ],
};
const pool: Question[] = [80, 45, 50, 45].flatMap((count, index) =>
  Array.from({ length: count }, (_, position) => ({
    ...demoQuestions[0],
    id: `fictional-qa-${index + 1}-${position}`,
    certification: "chst",
    domain: String(index + 1),
    contentKind: "instructional" as const,
    reviewStatus: "published" as const,
    blueprint: {
      version: "qa-test-blueprint",
      objective: `fictional-objective-${index + 1}`,
    },
  })),
);
const config = {
  count: 200 as const,
  mode: "exam" as const,
  domain: "all",
  bank: "published" as const,
  durationSeconds: 3600,
  prioritizeMissed: false,
};

describe("server-authoritative full-length exam eligibility", () => {
  it("blocks a full exam despite 200+ publications while real policy remains unverified", () => {
    expect(pool.length).toBeGreaterThan(200);
    expect(() => selectFullLengthExam(pool, config, [])).toThrow(
      /not been.*verified/,
    );
    expect(() =>
      selectFullLengthExam(pool, config, [], [], {
        ...policy,
        durationVerified: false,
      }),
    ).toThrow(/duration/);
  });
  it("allocates 73/40/45/42 distinct identities with an explicitly fictional verified test policy", () => {
    const selected = selectFullLengthExam(
      pool,
      config,
      [],
      [],
      policy,
      () => 0.5,
    );
    expect(selected).toHaveLength(200);
    expect(new Set(selected.map((question) => question.id)).size).toBe(200);
    expect(
      policy.domains.map(
        (domain) =>
          selected.filter((question) => question.domain === domain.code).length,
      ),
    ).toEqual([73, 40, 45, 42]);
  });
  it("does not substitute duplicate revisions, drafts, other blueprints, or arbitrary durations", () => {
    const shortage = pool.filter(
      (question) =>
        question.domain !== "2" || Number(question.id.split("-").at(-1)) < 39,
    );
    expect(() =>
      selectFullLengthExam(
        [
          ...shortage,
          ...shortage.map((question) => ({ ...question, version: 2 })),
        ],
        config,
        [],
        [],
        policy,
      ),
    ).toThrow("Domain 2 requires 40");
    expect(() =>
      selectFullLengthExam(
        pool.map((question) => ({ ...question, contentKind: "demonstration" })),
        config,
        [],
        [],
        policy,
      ),
    ).toThrow(/eligible/);
    expect(() =>
      selectFullLengthExam(
        pool.map((question) => ({
          ...question,
          blueprint: { version: "wrong", objective: "wrong" },
        })),
        config,
        [],
        [],
        policy,
      ),
    ).toThrow(/eligible/);
    expect(() =>
      selectFullLengthExam(
        pool,
        { ...config, durationSeconds: 60 },
        [],
        [],
        policy,
      ),
    ).toThrow(/configured policy duration/);
  });
});
