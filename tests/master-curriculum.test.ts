import { describe, expect, it } from "vitest";
import { chstMasterCurriculum } from "@/modules/curriculum/master";
import { chstObjectives, chstDomains } from "@/modules/curriculum/catalog";
import { lessonResearchBriefs } from "@/content/chst/lesson-briefs";
import { contentDraftSchema } from "@/modules/studio/model";
import {
  summarizeCurriculumManager,
  type CurriculumContentHead,
} from "@/modules/curriculum/manager-service";
import { chstDraftRecords } from "@/content/chst/draft-bank";
import { domain1Batch001 } from "@/content/chst/domain1-batch-001";

describe("complete supplied CHST5 master map without fabricated evidence", () => {
  it("preserves all 78 exact official statements, numbering and domain weights while separating authored outcomes", () => {
    expect(chstMasterCurriculum).toHaveLength(78);
    expect(new Set(chstMasterCurriculum.map((row) => row.id)).size).toBe(78);
    expect(
      chstMasterCurriculum.filter((row) => row.officialKind === "knowledge"),
    ).toHaveLength(55);
    expect(
      chstMasterCurriculum.filter((row) => row.officialKind === "skill"),
    ).toHaveLength(23);
    for (const [index, row] of chstMasterCurriculum.entries()) {
      const official = chstObjectives[index];
      expect(row.id).toBe(official.id);
      expect(row.officialNumber).toBe(official.number);
      expect(row.officialStatement).toBe(official.statement);
      expect(row.blueprintPage).toBe(official.documentPage);
      expect(row.domainTitle).toBe(
        chstDomains.find((domain) => domain.code === official.domain)!.title,
      );
      expect(row.credBuiltLearningObjective).not.toBe(row.officialStatement);
      expect(row.learningObjectiveId).toBe(`CB-${row.id}-L01`);
      expect(row.requiredKnowledge.length).toBeGreaterThan(1);
      expect(row.requiredPracticalApplication).toHaveLength(3);
      expect(row.levels).toHaveLength(4);
      expect(row.supportingEvidenceStatus).toBe("not_verified");
      expect(
        row.supportingBooks.every(
          (book) =>
            book.contentExamined === false &&
            book.relevanceBasis === "title_inference_only",
        ),
      ).toBe(true);
      expect(row.consensusStandards.status).toBe("research_required");
    }
    expect(chstDomains.map((domain) => domain.percentage)).toEqual([
      36.6, 19.9, 22.5, 21,
    ]);
  });
  it("retains 150 existing draft questions as planning relationships and creates only three explicitly source-blocked lesson briefs", () => {
    const ids = chstMasterCurriculum.flatMap(
      (row) => row.repositoryDraftQuestionIds,
    );
    expect(ids).toHaveLength(150);
    expect(new Set(ids).size).toBe(150);
    expect(lessonResearchBriefs).toHaveLength(3);
    for (const brief of lessonResearchBriefs) {
      expect(contentDraftSchema.safeParse(brief.draft).success).toBe(true);
      expect(brief.status).toBe("blocked_sources");
      expect(brief.technicalTextDrafted).toBe(false);
      expect(brief.questionsDrafted).toBe(false);
      expect(brief.draft.origin).toBe("ai_generated");
      expect(
        brief.draft.sources.every(
          (source) => !source.edition && source.title.includes("not retrieved"),
        ),
      ).toBe(true);
      expect(brief.draft.kind).toBe("lesson");
      if (brief.draft.kind === "lesson")
        expect(brief.draft.body.summary).toContain(
          "not a completed safety lesson",
        );
    }
  });
  it("counts actual heads, excludes demonstration and retired records, and never treats a candidate relationship as verified support", () => {
    const heads: CurriculumContentHead[] = [
      ...chstDraftRecords,
      ...domain1Batch001,
    ].map(({ id, content }) => ({
      id,
      revisionId: `${id}:v1`,
      status: "draft",
      data: content,
      sourceVerified: false,
      technicalApproved: false,
      editorialApproved: false,
    }));
    heads.push({
      ...heads[0],
      id: "demo",
      data: { ...heads[0].data, contentKind: "demonstration" },
    });
    heads.push({ ...heads[0], id: "retired", status: "retired" });
    const result = summarizeCurriculumManager(
      heads,
      [],
      [
        {
          objectiveId: chstObjectives[0].id,
          sourceId: "candidate",
          sectionId: null,
          relationKind: "candidate",
          sourceTitle: "Not examined",
          locator: null,
          verified: true,
          notes: "A candidate link is not evidence.",
        },
      ],
    );
    expect(
      result.objectives.reduce((sum, row) => sum + row.counts.questions, 0),
    ).toBe(150);
    expect(result.totals.withDraftQuestions).toBe(78);
    expect(result.totals.withVerifiedEvidence).toBe(0);
    expect(result.totals.sourceGaps).toBe(78);
    expect(result.totals.withApprovedLessons).toBe(0);
    expect(result.totals.withApprovedQuestions).toBe(0);
    expect(
      result.objectives.every(
        (row) =>
          row.coverageScore === 0 &&
          row.comprehensiveCoverageReviewed === false,
      ),
    ).toBe(true);
  });
  it("requires final editorial evidence for new approvals and caps progress below comprehensive coverage", () => {
    const objective = chstObjectives[0];
    const original = chstDraftRecords[0].content;
    const question: CurriculumContentHead = {
      id: "approved-question",
      revisionId: "approved-question:v1",
      status: "approved",
      data: original,
      sourceVerified: true,
      technicalApproved: true,
      editorialApproved: false,
    };
    const lessonDraft = lessonResearchBriefs[0].draft;
    if (lessonDraft.kind !== "lesson")
      throw new Error("Expected a lesson authoring brief.");
    const lesson: CurriculumContentHead = {
      ...question,
      id: "approved-lesson",
      revisionId: "approved-lesson:v1",
      editorialApproved: true,
      data: {
        ...lessonDraft,
        objectiveCode: objective.id,
        body: {
          ...lessonDraft.body,
          summary:
            "Synthetic software-test content; not construction instruction.",
        },
      },
    };
    const evidence = [
      {
        objectiveId: objective.id,
        sourceId: "source",
        sectionId: "section",
        relationKind: "supports",
        sourceTitle: "Synthetic software fixture",
        classification: "professional_guidance",
        locator: "section-1",
        verified: true,
        notes:
          "This tests engineering evidence handling, not technical content.",
      },
    ];
    let summary = summarizeCurriculumManager([question, lesson], [], evidence);
    expect(summary.objectives[0].counts.approvedQuestions).toBe(0);
    expect(summary.objectives[0].counts.technicallyApprovedQuestions).toBe(1);
    expect(summary.objectives[0].coverageScore).toBe(50);
    summary = summarizeCurriculumManager(
      [{ ...question, editorialApproved: true }, lesson],
      [],
      evidence,
    );
    expect(summary.objectives[0].coverageScore).toBe(75);
    expect(summary.totals.comprehensivelyReviewedObjectives).toBe(0);
    const conflict = {
      ...evidence[0],
      sourceId: "conflicting-source",
      sectionId: "conflicting-section",
      relationKind: "conflicts",
      currentDocument: true,
    };
    const unresolved = summarizeCurriculumManager(
      [],
      [],
      [...evidence, conflict],
    );
    expect(unresolved.objectives[0].counts.sourceConflicts).toBe(1);
    expect(unresolved.objectives[0].counts.verifiedSourceSections).toBe(0);
    expect(unresolved.objectives[0].liveEvidenceStatus).toBe(
      "source_conflict_requires_resolution",
    );
    expect(unresolved.objectives[0].coverageScore).toBe(0);
    const oldVersion = summarizeCurriculumManager(
      [],
      [],
      [...evidence, { ...conflict, currentDocument: false }],
    );
    expect(oldVersion.objectives[0].counts.sourceConflicts).toBe(0);
    expect(oldVersion.objectives[0].coverageScore).toBe(25);
    for (const classification of [
      "examination_blueprint",
      "credbuilt_instruction",
      undefined,
    ]) {
      const scopeOnly = summarizeCurriculumManager(
        [],
        [],
        [{ ...evidence[0], classification }],
      );
      expect(scopeOnly.totals.withVerifiedEvidence).toBe(0);
      expect(scopeOnly.objectives[0].coverageScore).toBe(0);
    }
    const legacy = summarizeCurriculumManager(
      [],
      [{ id: "legacy-published", data: original }],
      [],
    );
    expect(legacy.objectives[0].counts.publishedQuestions).toBe(1);
    expect(legacy.objectives[0].coverageScore).toBe(25);
    const blocked = summarizeCurriculumManager(
      [
        {
          ...lesson,
          status: "draft",
          data: { ...lessonDraft, objectiveCode: objective.id },
        },
      ],
      [],
      [],
    );
    expect(blocked.objectives[0].counts.lessons).toBe(1);
    expect(blocked.objectives[0].counts.sourceBlockedLessonBriefs).toBe(1);
    expect(blocked.objectives[0].counts.draftLessons).toBe(0);
    expect(blocked.totals.withDraftLessons).toBe(0);
  });
});
