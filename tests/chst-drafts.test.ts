import { describe, expect, it } from "vitest";
import {
  chstDraftRecords,
  browserDraftQuestions,
} from "@/content/chst/draft-bank";
import {
  chstObjectives,
  CHST_BLUEPRINT_ID,
} from "@/modules/curriculum/catalog";
import { contentDraftSchema } from "@/modules/studio/model";
import { selectQuestions } from "@/modules/practice/engine";

describe("original CHST5 draft content integrity", () => {
  it("contains 100 distinct identities/stems, with four distinct choices and an existing grading key", () => {
    expect(chstDraftRecords).toHaveLength(100);
    expect(new Set(chstDraftRecords.map((record) => record.id)).size).toBe(100);
    expect(
      new Set(
        browserDraftQuestions.map((question) =>
          question.stem.toLowerCase().replace(/\s+/g, " ").trim(),
        ),
      ).size,
    ).toBe(100);
    for (const record of chstDraftRecords) {
      const content = contentDraftSchema.parse(record.content);
      expect(content.kind).toBe("question");
      if (content.kind !== "question") throw new Error("Wrong content kind");
      expect(content.body.choices).toHaveLength(4);
      expect(
        new Set(
          content.body.choices.map((choice) =>
            choice.text.toLowerCase().trim(),
          ),
        ).size,
      ).toBe(4);
      expect(
        content.body.choices.some(
          (choice) => choice.id === content.body.correctChoice,
        ),
      ).toBe(true);
      expect(
        content.body.choices.every((choice) =>
          Boolean(choice.rationale.trim()),
        ),
      ).toBe(true);
    }
  });

  it("maps every supplied objective and uses the proportional 37/20/22/21 domain allocation", () => {
    const counts = ["1", "2", "3", "4"].map(
      (domain) =>
        chstDraftRecords.filter((record) => record.content.domain === domain)
          .length,
    );
    expect(counts).toEqual([37, 20, 22, 21]);
    expect(
      new Set(chstDraftRecords.map((record) => record.content.objectiveCode))
        .size,
    ).toBe(78);
    for (const record of chstDraftRecords) {
      const objective = chstObjectives.find(
        (objective) => objective.id === record.content.objectiveCode,
      );
      expect(objective, record.id).toBeDefined();
      expect(objective?.domain).toBe(record.content.domain);
      expect(record.content.blueprintRevisionId).toBe(CHST_BLUEPRINT_ID);
      expect(record.content.certificationId).toBe("chst");
    }
  });

  it("keeps all original records unreviewed, with no fabricated technical/source approval", () => {
    for (const record of chstDraftRecords) {
      expect(record.reviewStatus).toBe("draft");
      expect(record.sourceVerifiedAt).toBeNull();
      expect(record.technicalReviewer).toBeNull();
      expect(record.revision).toBe(1);
      expect(record.content.origin).toBe("ai_generated");
      expect(record.content.sources.length).toBeGreaterThan(0);
    }
    for (const question of browserDraftQuestions) {
      expect(question.contentKind).toBe("demonstration");
      expect(question.reviewStatus).toBe("draft");
      expect(question.reference.verifiedAt).toBeNull();
      expect(
        question.references?.every(
          (reference) =>
            reference.verifiedAt === null &&
            reference.verificationStatus === "pending",
        ),
      ).toBe(true);
    }
  });

  it("represents all four instructional categories and varies correct-choice positions", () => {
    expect(
      [...new Set(chstDraftRecords.map((record) => record.category))].sort(),
    ).toEqual([
      "applied_technical",
      "foundational",
      "reasoning_calculation",
      "scenario",
    ]);
    expect(
      new Set(
        browserDraftQuestions.map((question) =>
          question.choices.findIndex(
            (choice) => choice.id === question.correctChoice,
          ),
        ),
      ).size,
    ).toBe(4);
    expect(
      browserDraftQuestions
        .filter((question) => question.questionType === "calculation")
        .every((question) => (question.solutionSteps?.length || 0) > 0),
    ).toBe(true);
  });

  it("can select 100 distinct demo drafts and rejects a fabricated 200-question examination", () => {
    const config = {
      count: 100 as const,
      domain: "all",
      mode: "learning" as const,
      bank: "curriculum_drafts" as const,
      prioritizeMissed: false,
    };
    const selected = selectQuestions(browserDraftQuestions, config, []);
    expect(new Set(selected.map((question) => question.id)).size).toBe(100);
    expect(() =>
      selectQuestions(browserDraftQuestions, { ...config, count: 200 }, []),
    ).toThrow(/100|available|insufficient/i);
  });
});
