import { describe, expect, it } from "vitest";
import { questionQualityReport } from "@/modules/studio/question-quality";
import { questionTemplate } from "@/modules/studio/model";
import {
  chstObjectives,
  CHST_BLUEPRINT_ID,
} from "@/modules/curriculum/catalog";
import { domain1Batch001 } from "@/content/chst/domain1-batch-001";
const sample = () => ({
  ...structuredClone(questionTemplate),
  blueprintRevisionId: CHST_BLUEPRINT_ID,
  domain: "1",
  objectiveCode: chstObjectives[0].id,
  subtopic: "Construction planning",
  sources: [
    {
      id: "candidate",
      title: "Candidate not reviewed",
      url: "https://www.osha.gov/construction",
      edition: "",
      section: "",
    },
  ],
});
describe("conservative mechanical CHST question quality checks", () => {
  it("inspects the actual fifty drafts without inventing verification or approval", () => {
    const report = questionQualityReport(
      domain1Batch001.map(({ id, content }) => ({
        id,
        data: content,
        sourceVerified: false,
      })),
    );
    expect(report.inspected).toBe(50);
    expect(report.validQuestions).toBe(50);
    expect(report.errorCount).toBe(0);
    expect(
      Object.values(report.answerPositions).reduce((a, b) => a + b, 0),
    ).toBe(50);
    expect(
      report.results.every((row) =>
        row.issues.some((issue) => issue.code === "source_unverified"),
      ),
    ).toBe(true);
    expect(
      report.results.every((row) =>
        row.issues.some((issue) => issue.code === "citation_currency_unknown"),
      ),
    ).toBe(true);
    expect(report.notice).toContain("no answer was technically verified");
  });
  it("flags malformed options, invented mapping, missing citations and duplicate IDs", () => {
    const a = sample();
    a.body.choices = a.body.choices.slice(0, 3);
    a.objectiveCode = "CHST5-FAKE";
    a.sources = [];
    const report = questionQualityReport([
      { id: "same", data: a },
      { id: "same", data: sample() },
    ]);
    expect(report.results[0].issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([
        "four_choices",
        "canonical_mapping",
        "missing_citation",
      ]),
    );
    expect(
      report.results[1].issues.some((i) => i.code === "duplicate_id"),
    ).toBe(true);
    expect(
      questionQualityReport([{ id: "bad", data: { kind: "question" } }])
        .errorCount,
    ).toBe(1);
  });
  it("identifies exact and near wording candidates without a semantic verdict", () => {
    const a = sample();
    a.body.stem =
      "A construction crew changes its delivery route near an occupied work area before the morning meeting. Which planning action should the supervisor consider first?";
    const b = structuredClone(a);
    b.body.stem = a.body.stem.toUpperCase() + "!";
    const c = structuredClone(a);
    c.body.stem = a.body.stem.replace("morning", "afternoon");
    const report = questionQualityReport([
      { id: "a", data: a },
      { id: "b", data: b },
      { id: "c", data: c },
    ]);
    expect(report.duplicates.some((d) => d.kind === "exact")).toBe(true);
    expect(report.duplicates.some((d) => d.kind === "near")).toBe(true);
    expect(
      report.results[0].issues.some((i) =>
        i.message.includes("not a semantic or plagiarism verdict"),
      ),
    ).toBe(true);
  });
  it("reports comparison limits rather than implying exhaustive duplicate coverage", () => {
    const records = Array.from({ length: 6 }, (_, i) => {
      const data = sample();
      data.body.stem = `Construction scenario number ${i}: inspect a unique condition before selecting the task arrangement and work method.`;
      return { id: String(i), data };
    });
    const report = questionQualityReport(records, 2);
    expect(report.comparisonLimitReached).toBe(true);
    expect(report.comparisons).toBe(2);
  });
  it("flags answer-length clues, negative wording and possible rationale contradictions", () => {
    const data = sample();
    data.body.stem =
      "Which action should NOT be used in this construction scenario?";
    data.body.correctChoice = "a";
    data.body.choices[0].text =
      "This very long intended answer contains many extra contextual details and qualifications that are not present in any of the other distractor answer options.";
    data.body.choices[0].rationale =
      "This choice is incorrect despite being marked as the intended key in this synthetic software test.";
    data.body.choices[1].rationale =
      "This choice is correct in this intentionally contradictory software-only test.";
    const codes = questionQualityReport([
      { id: "clues", data },
    ]).results[0].issues.map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "answer_length_clue",
        "negative_stem",
        "possible_contradiction",
      ]),
    );
  });
});
