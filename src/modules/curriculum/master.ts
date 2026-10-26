import {
  CHST_BLUEPRINT_ID,
  CHST_BLUEPRINT_VERSION,
  chstBibliography,
  chstDomains,
  chstObjectives,
} from "./catalog";
import { objectiveStudyOutline } from "./study-outline";
import { chstDraftRecords } from "@/content/chst/draft-bank";
import { domain1Batch001 } from "@/content/chst/domain1-batch-001";
import type { CurriculumObjective } from "./types";

export const curriculumLearningLevels = [
  { id: "foundational", title: "Foundational knowledge" },
  { id: "applied", title: "Applied knowledge" },
  { id: "analysis", title: "Analysis" },
  { id: "professional_decision", title: "Professional decision-making" },
] as const;

/** Planning relationships, never proof that a source supports a claim. */
export type CurriculumCandidateReference = {
  title: string;
  url: string | null;
  locator: string;
  classification:
    | "regulatory_requirement"
    | "consensus_standard"
    | "professional_guidance"
    | "technical_research";
  status: "candidate_unverified";
  relevanceBasis:
    "existing_draft_candidate" | "title_inference_only" | "research_required";
};

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
function masterObjective(objective: CurriculumObjective) {
  const outline = objectiveStudyOutline(objective);
  const matchedDrafts = [...chstDraftRecords, ...domain1Batch001].filter(
    ({ content }) => content.objectiveCode === objective.id,
  );
  const candidates = new Map<string, CurriculumCandidateReference>();
  for (const { content } of matchedDrafts) {
    for (const source of content.sources) {
      const classification =
        source.classification === "regulatory_requirement"
          ? "regulatory_requirement"
          : source.classification === "consensus_standard"
            ? "consensus_standard"
            : "professional_guidance";
      const item: CurriculumCandidateReference = {
        title: source.title,
        url: source.url || null,
        locator: source.section || "Exact supporting section not examined",
        classification,
        status: "candidate_unverified",
        relevanceBasis: "existing_draft_candidate",
      };
      candidates.set(`${item.url}:${item.locator}`, item);
    }
  }
  const reading = outline.candidateReferenceNumbers
    .map((number) => chstBibliography[number - 1])
    .filter(Boolean)
    .map((book) => ({
      id: book.id,
      title: book.title,
      edition: book.edition,
      relevanceBasis: "title_inference_only" as const,
      availability: "bibliography_only" as const,
      contentExamined: false as const,
    }));
  return {
    id: objective.id,
    certificationId: "chst" as const,
    blueprintRevisionId: CHST_BLUEPRINT_ID,
    blueprintVersion: CHST_BLUEPRINT_VERSION,
    domain: objective.domain,
    domainTitle: chstDomains.find((domain) => domain.code === objective.domain)!
      .title,
    officialKind: objective.kind,
    officialNumber: objective.number,
    officialStatement: objective.statement,
    blueprintPage: objective.documentPage,
    learningObjectiveId: `CB-${objective.id}-L01`,
    credBuiltLearningObjective:
      objective.kind === "knowledge"
        ? `Explain ${lowerFirst(objective.statement)} in a construction scenario, separating evidence-supported requirements from recommendations.`
        : `Given a construction scenario, demonstrate the skill described by “${objective.statement}” and justify the decision using applicable evidence.`,
    requiredKnowledge: [
      ...outline.terms,
      "Applicable source scope, edition and limits of applicability",
    ],
    requiredPracticalApplication: [
      `Describe a construction activity relevant to: ${objective.statement}.`,
      "Identify exposed people, changing conditions, responsibilities and evidence needed before recommending action.",
      "Compare alternatives and identify when additional qualified advice or evidence is required.",
    ],
    topic: outline.terms[0] || objective.statement,
    subtopics: outline.terms.slice(1),
    recommendedDifficulty:
      objective.kind === "skill"
        ? ("intermediate" as const)
        : ("foundational" as const),
    levels: curriculumLearningLevels.map((level) => ({
      ...level,
      outcome:
        level.id === "foundational"
          ? `Define the terms needed to discuss ${lowerFirst(objective.statement)}.`
          : level.id === "applied"
            ? `Apply examined evidence about this objective to a clearly scoped construction example.`
            : level.id === "analysis"
              ? "Evaluate changing conditions, competing alternatives and the limits of the available evidence."
              : "Explain a defensible decision, responsibilities, escalation needs and follow-up without asserting unsupported requirements.",
    })),
    candidateRegulations: [...candidates.values()].filter(
      (source) => source.classification === "regulatory_requirement",
    ),
    candidatePublicReferences: [...candidates.values()].filter(
      (source) => source.classification !== "regulatory_requirement",
    ),
    consensusStandards: {
      status: "research_required" as const,
      note: "Identify applicable consensus standards and lawful access during source research; no standard, edition or clause is invented here.",
    },
    supportingBooks: reading,
    candidateRelatedLessonIds: outline.relatedLessonIds,
    repositoryDraftQuestionIds: matchedDrafts.map(({ id }) => id),
    supportingEvidenceStatus: "not_verified" as const,
    contentReviewStatus: "planning_requires_source_and_human_review" as const,
    mappingStatus: "supplied_blueprint_transcribed" as const,
  };
}

/** Exactly the supplied official statements; CredBuilt authoring fields are separate. */
export const chstMasterCurriculum = chstObjectives.map(masterObjective);
export type MasterCurriculumObjective = (typeof chstMasterCurriculum)[number];
