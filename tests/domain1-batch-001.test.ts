import { describe, expect, it } from "vitest";
import {
  domain1Batch001,
  domain1Batch001Disclosure,
  domain1Batch001Topics,
} from "@/content/chst/domain1-batch-001";
import { chstDraftRecords } from "@/content/chst/draft-bank";
import { chstObjectives } from "@/modules/curriculum/catalog";
import { contentDraftSchema } from "@/modules/studio/model";
import {
  parseQuestionBatch,
  QUESTION_IMPORT_MAX_BYTES,
} from "@/modules/studio/batch-import";

describe("Domain 1 authoring batch 001", () => {
  it("fits the protected JSON importer as one validated 50-record batch", () => {
    const text = JSON.stringify(
      domain1Batch001.map(({ id, content, category }) => ({
        id,
        content: { ...content, instructionalCategory: category },
      })),
    );
    expect(Buffer.byteLength(text, "utf8")).toBeLessThan(
      QUESTION_IMPORT_MAX_BYTES,
    );
    const parsed = parseQuestionBatch("json", text);
    expect(parsed.records).toHaveLength(50);
    expect(parsed.errors).toEqual([]);
    expect(parsed.duplicates).toEqual([]);
  });
  it("adds 50 distinct identities and stems without replacing the previous batch", () => {
    expect(domain1Batch001).toHaveLength(50);
    const normalize = (value: string) =>
      value.toLowerCase().replace(/\W+/g, " ").trim();
    const previousIds = new Set(chstDraftRecords.map((record) => record.id));
    const previousStems = new Set(
      chstDraftRecords.map((record) =>
        record.content.kind === "question"
          ? normalize(record.content.body.stem)
          : "",
      ),
    );
    expect(new Set(domain1Batch001.map((record) => record.id)).size).toBe(50);
    expect(
      new Set(
        domain1Batch001.map((record) =>
          record.content.kind === "question"
            ? normalize(record.content.body.stem)
            : "",
        ),
      ).size,
    ).toBe(50);
    for (const record of domain1Batch001) {
      expect(previousIds.has(record.id)).toBe(false);
      expect(record.content.kind).toBe("question");
      if (record.content.kind !== "question") throw new Error("Not a question");
      expect(previousStems.has(normalize(record.content.body.stem))).toBe(
        false,
      );
    }
  });

  it("validates every complete four-choice draft against a real Domain 1 objective", () => {
    for (const record of domain1Batch001) {
      const content = contentDraftSchema.parse(record.content);
      if (content.kind !== "question") throw new Error("Not a question");
      expect(content.certificationId).toBe("chst");
      expect(content.blueprintRevisionId).toBe("chst5-2022.04.12");
      expect(content.domain).toBe("1");
      expect(
        chstObjectives.find(
          (objective) => objective.id === content.objectiveCode,
        )?.domain,
      ).toBe("1");
      expect(content.body.choices).toHaveLength(4);
      expect(
        new Set(content.body.choices.map((choice) => choice.text)).size,
      ).toBe(4);
      expect(
        content.body.choices.filter(
          (choice) => choice.id === content.body.correctChoice,
        ),
      ).toHaveLength(1);
      expect(
        content.body.choices.every((choice) => choice.rationale.length > 35),
      ).toBe(true);
      expect(content.body.explanation.length).toBeGreaterThan(80);
      expect(content.subtopic).toBeTruthy();
    }
    expect(
      new Set(
        domain1Batch001.flatMap((record) =>
          record.content.kind === "question"
            ? [record.content.body.correctChoice]
            : [],
        ),
      ).size,
    ).toBe(4);
  });

  it("balances the twelve requested topics with mixed levels of difficulty", () => {
    expect(
      new Set(domain1Batch001.map((record) => record.content.topic)),
    ).toEqual(new Set(domain1Batch001Topics));
    for (const topic of domain1Batch001Topics) {
      const count = domain1Batch001.filter(
        (record) => record.content.topic === topic,
      ).length;
      expect(count).toBeGreaterThanOrEqual(4);
      expect(count).toBeLessThanOrEqual(5);
    }
    const levels = domain1Batch001.flatMap((record) =>
      record.content.kind === "question"
        ? [record.content.body.difficulty]
        : [],
    );
    expect(new Set(levels)).toEqual(
      new Set(["introductory", "intermediate", "advanced"]),
    );
    expect(
      levels.filter((level) => level === "advanced").length,
    ).toBeGreaterThanOrEqual(10);
  });

  it("records only candidate citations and never invents source review or approval", () => {
    expect(domain1Batch001Disclosure.sourceAccess).toBe(
      "blocked_by_network_proxy",
    );
    expect(domain1Batch001Disclosure.sourceVerifiedCount).toBe(0);
    expect(domain1Batch001Disclosure.technicallyApprovedCount).toBe(0);
    expect(domain1Batch001Disclosure.publishedCount).toBe(0);
    for (const record of domain1Batch001) {
      expect(record.sourceVerifiedAt).toBeNull();
      expect(record.technicalReviewer).toBeNull();
      expect(record.reviewStatus).toBe("draft");
      expect(record.content.origin).toBe("ai_generated");
      expect(record.revision).toBe(1);
      expect(record.content.sources).toHaveLength(1);
      const source = record.content.sources[0];
      expect(source.title).toMatch(/^CANDIDATE — NOT REVIEWED:/);
      expect(source.edition).toBe("");
      expect(source.section).toMatch(/^Candidate locator, not checked:/);
      expect(new URL(source.url).hostname).toMatch(
        /^(www\.)?(osha\.gov|cdc\.gov)$/,
      );
    }
  });
});
