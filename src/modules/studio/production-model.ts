import {
  CHST_BLUEPRINT_ID,
  chstDomains,
  chstObjectives,
} from "@/modules/curriculum/catalog";
import type { ExamAvailability } from "@/modules/exams/types";
import type { ContentDraft, StudioAccess, StudioStatus } from "./model";

export const questionBankTargets = {
  launch: 500,
  eventual: 2000,
  domains: { "1": 732, "2": 398, "3": 450, "4": 420 },
} as const;

export type ProductionHead = {
  id: string;
  revisionId: string;
  status: StudioStatus;
  sourceVerified: boolean;
  data: ContentDraft;
};
export type ProductionPublication = { id: string; data: ContentDraft };

function isCHSTQuestion(data: ContentDraft) {
  return (
    data.kind === "question" &&
    data.certificationId === "chst" &&
    data.blueprintRevisionId === CHST_BLUEPRINT_ID &&
    data.contentKind === "instructional"
  );
}

/** A candidate is a wording match after punctuation/case/spacing normalization,
 * not an assertion of plagiarism or a semantic duplicate detector. */
export function normalizedQuestionStem(stem: string) {
  return stem
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function summarizeQuestionProduction(
  heads: ProductionHead[],
  publications: ProductionPublication[],
  exam: ExamAvailability,
) {
  // One current editorial head per logical question. Old immutable revisions,
  // retired items and demonstration fixtures cannot inflate production totals.
  const uniqueHeads = [...new Map(heads.map((row) => [row.id, row])).values()];
  const current = uniqueHeads.filter((row) => isCHSTQuestion(row.data));
  const active = current.filter((row) => row.status !== "retired");
  const released = [
    ...new Map(
      publications
        .filter((row) => isCHSTQuestion(row.data))
        .map((row) => [row.id, row]),
    ).values(),
  ];
  const stemGroups = new Map<string, ProductionHead[]>();
  for (const row of active) {
    if (row.data.kind !== "question") continue;
    const key = normalizedQuestionStem(row.data.body.stem);
    if (!key) continue;
    stemGroups.set(key, [...(stemGroups.get(key) || []), row]);
  }
  const duplicates = [...stemGroups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      questionIds: group.map((row) => row.id),
      title: group[0].data.title,
    }));
  const missing = chstObjectives.filter(
    (objective) =>
      !active.some((row) => row.data.objectiveCode === objective.id),
  );
  const publishedMissing = chstObjectives.filter(
    (objective) =>
      !released.some((row) => row.data.objectiveCode === objective.id),
  );
  const count = (status: StudioStatus) =>
    active.filter((row) => row.status === status).length;
  const domains = chstDomains.map((domain) => {
    const matching = active.filter((row) => row.data.domain === domain.code);
    return {
      code: domain.code,
      title: domain.title,
      weight: domain.weight / 100,
      target:
        questionBankTargets.domains[
          domain.code as keyof typeof questionBankTargets.domains
        ],
      total: matching.length,
      approved: matching.filter((row) => row.status === "approved").length,
      published: released.filter((row) => row.data.domain === domain.code)
        .length,
      needsSourceVerification: matching.filter((row) => !row.sourceVerified)
        .length,
    };
  });
  const topicKeys = [
    ...new Set(
      [...active, ...released].map((row) =>
        JSON.stringify([row.data.domain, row.data.topic]),
      ),
    ),
  ].sort();
  const topics = topicKeys.map((key) => {
    const [domain, topic] = JSON.parse(key) as [string, string];
    const matching = active.filter(
      (row) => row.data.domain === domain && row.data.topic === topic,
    );
    return {
      domain,
      topic,
      total: matching.length,
      approved: matching.filter((row) => row.status === "approved").length,
      published: released.filter(
        (row) => row.data.domain === domain && row.data.topic === topic,
      ).length,
    };
  });
  return {
    totals: {
      total: active.length,
      draft: count("draft"),
      awaitingReview:
        count("source_verification_pending") + count("technical_review"),
      sourceVerifiedAwaitingSubmission: count("source_verified"),
      changesRequested: count("changes_requested"),
      rejected: count("rejected"),
      approved: count("approved"),
      published: released.length,
      retired: current.filter((row) => row.status === "retired").length,
      needsSourceVerification: active.filter((row) => !row.sourceVerified)
        .length,
      duplicateGroups: duplicates.length,
      duplicateQuestions: new Set(duplicates.flatMap((row) => row.questionIds))
        .size,
      missingObjectives: missing.length,
      unpublishedObjectives: publishedMissing.length,
    },
    domains,
    topics,
    missingObjectives: missing.map(({ id, domain, statement }) => ({
      id,
      domain,
      statement,
    })),
    duplicateCandidates: duplicates,
    exam,
  };
}

export type QuestionProductionSummary = ReturnType<
  typeof summarizeQuestionProduction
> & { access: StudioAccess };
