import "server-only";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import type { Actor } from "@/modules/identity/access";
import {
  contentDraftSchema,
  type ContentDraft,
  type StudioAccess,
} from "@/modules/studio/model";
import { requireStudioAccess, requireStudioRole } from "@/modules/studio/roles";
import { researchEvidenceForObjectives } from "@/modules/research/service";
import { CHST_BLUEPRINT_ID, chstDomains } from "./catalog";
import { chstMasterCurriculum } from "./master";
import { lessonResearchBriefs } from "@/content/chst/lesson-briefs";

export type CurriculumEvidence = {
  objectiveId: string;
  sourceId: string;
  sectionId: string | null;
  relationKind: string;
  sourceTitle: string;
  classification?: string;
  currentDocument?: boolean;
  locator: string | null;
  verified: boolean;
  notes: string;
};
export type CurriculumContentHead = {
  id: string;
  revisionId: string;
  status: string;
  data: ContentDraft;
  sourceVerified: boolean;
  technicalApproved: boolean;
  editorialApproved: boolean;
};
export type CurriculumPublication = { id: string; data: ContentDraft };

/** Evidence progress is deliberately capped at 75. Full objective completeness
 * requires a separate comprehensive coverage determination, not one citation,
 * lesson or question. It is not a measure of learner mastery. */
export function summarizeCurriculumManager(
  heads: CurriculumContentHead[],
  publications: CurriculumPublication[],
  evidence: CurriculumEvidence[],
) {
  const active = [
    ...new Map(heads.map((head) => [head.id, head])).values(),
  ].filter(
    (head) =>
      head.status !== "retired" &&
      head.data.certificationId === "chst" &&
      head.data.blueprintRevisionId === CHST_BLUEPRINT_ID &&
      head.data.contentKind === "instructional",
  );
  const published = [
    ...new Map(publications.map((item) => [item.id, item])).values(),
  ].filter(
    (item) =>
      item.data.certificationId === "chst" &&
      item.data.blueprintRevisionId === CHST_BLUEPRINT_ID &&
      item.data.contentKind === "instructional",
  );
  const sourceBlockedBrief = (data: ContentDraft) =>
    data.kind === "lesson" &&
    data.body.summary.startsWith("SOURCE-BLOCKED AUTHORING BRIEF.");
  const objectives = chstMasterCurriculum.map((master) => {
    const content = active.filter(
      (head) => head.data.objectiveCode === master.id,
    );
    const sources = evidence.filter((item) => item.objectiveId === master.id);
    const conflicts = sources.filter(
      (item) =>
        item.relationKind === "conflicts" && item.currentDocument !== false,
    );
    const verifiedSources = sources.filter(
      (item) =>
        conflicts.length === 0 &&
        item.verified &&
        item.relationKind === "supports" &&
        Boolean(item.sectionId) &&
        [
          "regulatory_requirement",
          "consensus_standard",
          "professional_guidance",
          "technical_research",
        ].includes(item.classification || ""),
    );
    const approved = (kind: "question" | "lesson") =>
      content.filter(
        (head) =>
          head.data.kind === kind &&
          ["approved", "published"].includes(head.status) &&
          head.sourceVerified &&
          head.technicalApproved &&
          head.editorialApproved &&
          !sourceBlockedBrief(head.data),
      );
    const questions = content.filter((head) => head.data.kind === "question");
    const lessons = content.filter((head) => head.data.kind === "lesson");
    const publishedQuestions = published.filter(
      (item) =>
        item.data.kind === "question" && item.data.objectiveCode === master.id,
    );
    const publishedLessons = published.filter(
      (item) =>
        item.data.kind === "lesson" && item.data.objectiveCode === master.id,
    );
    const approvedQuestions = approved("question");
    const approvedLessons = approved("lesson");
    return {
      ...master,
      sources,
      liveEvidenceStatus: conflicts.length
        ? ("source_conflict_requires_resolution" as const)
        : verifiedSources.length
          ? ("reviewed_section_support_present" as const)
          : ("additional_source_review_required" as const),
      coverageScore:
        (verifiedSources.length ? 25 : 0) +
        (approvedLessons.length || publishedLessons.length ? 25 : 0) +
        (approvedQuestions.length || publishedQuestions.length ? 25 : 0),
      comprehensiveCoverageReviewed: false as const,
      counts: {
        questions: questions.length,
        draftQuestions: questions.filter((head) => head.status === "draft")
          .length,
        awaitingReviewQuestions: questions.filter(
          (head) =>
            [
              "source_verification_pending",
              "source_verified",
              "technical_review",
            ].includes(head.status) ||
            (head.status === "approved" && !head.editorialApproved),
        ).length,
        technicallyApprovedQuestions: questions.filter(
          (head) =>
            ["approved", "published"].includes(head.status) &&
            head.technicalApproved &&
            head.sourceVerified,
        ).length,
        approvedQuestions: approvedQuestions.length,
        publishedQuestions: publishedQuestions.length,
        lessons: lessons.length,
        draftLessons: lessons.filter(
          (head) => head.status === "draft" && !sourceBlockedBrief(head.data),
        ).length,
        sourceBlockedLessonBriefs: lessons.filter((head) =>
          sourceBlockedBrief(head.data),
        ).length,
        approvedLessons: approvedLessons.length,
        publishedLessons: publishedLessons.length,
        verifiedSourceSections: verifiedSources.length,
        sourceConflicts: conflicts.length,
      },
      content: content.map((head) => ({
        id: head.id,
        kind: head.data.kind,
        title: head.data.title,
        status: head.status,
        finalApproval:
          head.sourceVerified &&
          head.technicalApproved &&
          head.editorialApproved,
      })),
      lessonBriefs: lessonResearchBriefs
        .filter((brief) => brief.objectiveId === master.id)
        .map(({ id, title, status, missingEvidence, plannedSections }) => ({
          id,
          title,
          status,
          missingEvidence,
          plannedSections,
        })),
    };
  });
  const domains = chstDomains.map((domain) => {
    const rows = objectives.filter((row) => row.domain === domain.code);
    return {
      ...domain,
      objectives: rows.length,
      withVerifiedEvidence: rows.filter(
        (row) => row.counts.verifiedSourceSections > 0,
      ).length,
      withDraftLessons: rows.filter((row) => row.counts.draftLessons > 0)
        .length,
      withApprovedLessons: rows.filter(
        (row) => row.counts.approvedLessons + row.counts.publishedLessons > 0,
      ).length,
      withDraftQuestions: rows.filter((row) => row.counts.draftQuestions > 0)
        .length,
      withApprovedQuestions: rows.filter(
        (row) =>
          row.counts.approvedQuestions + row.counts.publishedQuestions > 0,
      ).length,
    };
  });
  return {
    blueprint: {
      id: CHST_BLUEPRINT_ID,
      latestOfficialVersionConfirmed: false as const,
    },
    objectives,
    domains,
    totals: {
      objectives: objectives.length,
      withVerifiedEvidence: objectives.filter(
        (row) => row.counts.verifiedSourceSections > 0,
      ).length,
      objectivesWithConflicts: objectives.filter(
        (row) => row.counts.sourceConflicts > 0,
      ).length,
      sourceGaps: objectives.filter(
        (row) => row.counts.verifiedSourceSections === 0,
      ).length,
      withDraftLessons: objectives.filter((row) => row.counts.draftLessons > 0)
        .length,
      withApprovedLessons: objectives.filter(
        (row) => row.counts.approvedLessons + row.counts.publishedLessons > 0,
      ).length,
      withDraftQuestions: objectives.filter(
        (row) => row.counts.draftQuestions > 0,
      ).length,
      withApprovedQuestions: objectives.filter(
        (row) =>
          row.counts.approvedQuestions + row.counts.publishedQuestions > 0,
      ).length,
      comprehensivelyReviewedObjectives: 0,
      lessonBriefs: lessonResearchBriefs.length,
      repositoryTechnicalLessonsWritten: 0,
    },
  };
}
export type CurriculumManagerSnapshot = ReturnType<
  typeof summarizeCurriculumManager
> & { access: StudioAccess };

export async function curriculumManagerSnapshot(
  who: Actor,
): Promise<CurriculumManagerSnapshot> {
  const access = await requireStudioAccess(who);
  requireStudioRole(access, ["administrator"]);
  await seedDemo();
  const query = (await connection()).query;
  const [heads, publications, evidence] = await Promise.all([
    query(
      `SELECT c.id,r.id AS revision_id,r.data,w.status,
      coalesce((SELECT s.decision='verified' AND EXISTS(SELECT 1 FROM editorial_roles er WHERE er.subject_id=s.reviewer_id AND er.role='reviewer') FROM studio_source_verifications s WHERE s.revision_id=r.id ORDER BY s.event_number DESC LIMIT 1),false) AS source_verified,
      coalesce((SELECT t.decision='approved' AND EXISTS(SELECT 1 FROM editorial_roles er WHERE er.subject_id=t.reviewer_id AND er.role='reviewer') FROM studio_reviews t WHERE t.revision_id=r.id ORDER BY t.created_at DESC,t.id DESC LIMIT 1),false) AS technical_approved,
      coalesce((SELECT e.decision='approved' AND EXISTS(SELECT 1 FROM editorial_roles er WHERE er.subject_id=e.reviewer_id AND er.role='reviewer') FROM studio_editorial_reviews e WHERE e.revision_id=r.id ORDER BY e.event_number DESC LIMIT 1),false) AS editorial_approved
      FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision JOIN studio_workflow w ON w.revision_id=r.id
      WHERE c.certification_id='chst' AND r.data->>'blueprintRevisionId'=$1 ORDER BY c.id`,
      [CHST_BLUEPRINT_ID],
    ),
    query(
      `SELECT c.id,r.data FROM studio_publications p JOIN studio_content c ON c.id=p.content_id JOIN studio_revisions r ON r.id=p.revision_id JOIN studio_workflow w ON w.revision_id=r.id AND w.status='published' WHERE c.certification_id='chst' AND r.data->>'blueprintRevisionId'=$1 ORDER BY c.id`,
      [CHST_BLUEPRINT_ID],
    ),
    researchEvidenceForObjectives(who),
  ]);
  return {
    ...summarizeCurriculumManager(
      heads.rows.map((row) => ({
        id: String(row.id),
        revisionId: String(row.revision_id),
        status: String(row.status),
        data: contentDraftSchema.parse(row.data),
        sourceVerified: Boolean(row.source_verified),
        technicalApproved: Boolean(row.technical_approved),
        editorialApproved: Boolean(row.editorial_approved),
      })),
      publications.rows.map((row) => ({
        id: String(row.id),
        data: contentDraftSchema.parse(row.data),
      })),
      evidence,
    ),
    access,
  };
}
