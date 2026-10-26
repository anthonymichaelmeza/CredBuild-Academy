import { describe, expect, it } from "vitest";
import { browserDraftQuestions } from "@/content/chst/draft-bank";
import { chstObjectives } from "@/modules/curriculum/catalog";
import { chstPracticeExamPolicy } from "@/modules/exams/policy";
import {
  buildFullLengthPracticeExam,
  eligibleFullLengthQuestions,
  fullLengthAvailability,
} from "@/modules/exams/selection";
import type { PriorAttempt } from "@/modules/practice/engine";
import type { Question } from "@/modules/practice/types";

const now = Date.parse("2026-10-26T12:00:00Z");
// Fictional unit-test publications, never imported or treated as source review.
function fixturePool(counts = [80, 45, 50, 45]): Question[] {
  return counts.flatMap((count, index) => {
    const domain = String(index + 1);
    const objective = chstObjectives.find((item) => item.domain === domain)!;
    return Array.from({ length: count }, (_, number) => ({
      ...structuredClone(browserDraftQuestions[0]),
      id: `fictional-unit-${domain}-${number}`,
      stem: `Fictional unit-test construction item ${domain}-${number}; not CHST instruction.`,
      domain,
      blueprint: { version: "2022.04.12", objective: objective.id },
      certification: "chst",
      contentKind: "instructional" as const,
      reviewStatus: "published" as const,
      reference: {
        title: "Fictional unit-test citation; not examined technical content",
        url: "https://example.invalid/qa",
        locator: "Fictional QA section",
        edition: "QA-only",
        classification: "supplemental_resource" as const,
        verifiedAt: "2026-01-01T00:00:00Z",
        verificationStatus: "verified" as const,
      },
      references: [],
    }));
  });
}
function rng(seed: number) {
  let state = seed;
  return () => (state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32;
}
function prior(questionId: string, answeredAt: string): PriorAttempt {
  return { questionId, answeredAt, correct: true, confidence: "medium" };
}

describe("configured full-length CHST practice construction", () => {
  it("uses canonical supplied numbering and an explicitly configured four-hour practice policy", () => {
    expect(chstPracticeExamPolicy.durationSeconds).toBe(14_400);
    expect(chstPracticeExamPolicy.durationBasis).toBe(
      "credbuilt_practice_configuration",
    );
    expect(chstPracticeExamPolicy.latestOfficialVersionConfirmed).toBe(false);
    expect(
      chstPracticeExamPolicy.domains.map((domain) => domain.required),
    ).toEqual([73, 40, 45, 42]);
    expect(chstPracticeExamPolicy.domains[1].title).toMatch(/Emergency/);
  });

  it("constructs exactly 200 distinct pinned identities with balanced, randomized attempts without changing the pool", () => {
    const pool = fixturePool();
    const original = structuredClone(pool);
    const first = buildFullLengthPracticeExam(pool, [], {
      now,
      random: rng(1),
    });
    const second = buildFullLengthPracticeExam(pool, [], {
      now,
      random: rng(2),
    });
    expect(first).toHaveLength(200);
    expect(new Set(first.map((question) => question.id)).size).toBe(200);
    expect(
      chstPracticeExamPolicy.domains.map(
        (domain) =>
          first.filter((question) => question.domain === domain.code).length,
      ),
    ).toEqual([73, 40, 45, 42]);
    expect(first.map((question) => question.id)).not.toEqual(
      second.map((question) => question.id),
    );
    expect(pool).toEqual(original);
  });

  it("selects from more than 2,000 records and avoids all recently answered items when alternatives suffice", () => {
    const pool = fixturePool([800, 450, 500, 500]);
    const recent = pool.filter(
      (question) => Number(question.id.split("-").at(-1)) < 50,
    );
    const history = recent.map((question) =>
      prior(question.id, new Date(now - 60_000).toISOString()),
    );
    const selected = buildFullLengthPracticeExam(pool, history, {
      now,
      random: rng(7),
    });
    expect(selected).toHaveLength(200);
    expect(
      selected.some((question) =>
        recent.some((item) => item.id === question.id),
      ),
    ).toBe(false);
  });

  it("falls back to the least recently answered items when a domain needs them", () => {
    const pool = fixturePool([73, 42, 45, 42]);
    const history = pool
      .filter((question) => question.domain === "2")
      .map((question, index) =>
        prior(
          question.id,
          new Date(now - (100 - index) * 60_000).toISOString(),
        ),
      );
    const selected = buildFullLengthPracticeExam(pool, history, {
      now,
      random: rng(9),
    });
    expect(
      selected
        .filter((question) => question.domain === "2")
        .map((question) => question.id)
        .sort(),
    ).toEqual(
      history
        .slice(0, 40)
        .map((item) => item.questionId)
        .sort(),
    );
  });

  it("rejects drafts, forged mappings, invalid choices and missing or future source evidence", () => {
    expect(eligibleFullLengthQuestions(browserDraftQuestions, { now })).toEqual(
      [],
    );
    const base = fixturePool([1, 0, 0, 0])[0];
    const invalid = [
      { ...base, correctChoice: "missing" },
      {
        ...base,
        choices: [base.choices[0], base.choices[0], ...base.choices.slice(2)],
      },
      {
        ...base,
        blueprint: {
          version: "2022.04.12",
          objective: "invented-official-code",
        },
      },
      { ...base, domain: "2" },
      { ...base, explanation: "" },
      { ...base, reference: { ...base.reference, verifiedAt: null } },
      { ...base, reference: { ...base.reference, edition: "" } },
      {
        ...base,
        reference: {
          ...base.reference,
          verifiedAt: new Date(now + 1).toISOString(),
        },
      },
      { ...base, references: [{ ...base.reference, locator: "" }] },
    ];
    for (const question of invalid)
      expect(eligibleFullLengthQuestions([question], { now })).toEqual([]);
    expect(
      eligibleFullLengthQuestions(
        [base, { ...base, version: 2, explanation: "" }],
        { now },
      ),
    ).toEqual([]);
  });

  it("reports exact per-domain shortages and excludes duplicate identities and wording", () => {
    const pool = fixturePool([100, 39, 100, 100]);
    const duplicate = {
      ...pool[0],
      id: "another-id",
      stem: `  ${pool[0].stem.toUpperCase()}  `,
    };
    const summary = fullLengthAvailability([...pool, ...pool, duplicate], {
      now,
    });
    expect(summary.domains[1]).toMatchObject({
      eligible: 39,
      required: 40,
      shortfall: 1,
    });
    expect(summary.eligibleTotal).toBe(pool.length);
    expect(() => buildFullLengthPracticeExam(pool, [], { now })).toThrow(
      /Domain 2.*39 available.*1 short/,
    );
  });

  it("permits only explicitly marked draft demonstrations through the trusted development-fixture branch", () => {
    const pool = fixturePool([73, 40, 45, 42]).map((question) => ({
      ...question,
      contentKind: "demonstration" as const,
      reviewStatus: "draft" as const,
      reference: { ...question.reference, verifiedAt: null },
    }));
    expect(eligibleFullLengthQuestions(pool, { now })).toHaveLength(0);
    expect(
      buildFullLengthPracticeExam(pool, [], {
        now,
        developmentFixture: true,
        random: rng(3),
      }),
    ).toHaveLength(200);
    expect(
      eligibleFullLengthQuestions(fixturePool(), {
        now,
        developmentFixture: true,
      }),
    ).toHaveLength(0);
  });
});
