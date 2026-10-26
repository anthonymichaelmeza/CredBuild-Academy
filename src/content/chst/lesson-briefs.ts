import type { ContentDraft } from "@/modules/studio/model";
import {
  CHST_BLUEPRINT_ID,
  getChstObjective,
} from "@/modules/curriculum/catalog";

export type LessonResearchBrief = {
  id: string;
  title: string;
  objectiveId: string;
  estimatedLearningMinutes: number;
  status: "blocked_sources";
  technicalTextDrafted: false;
  questionsDrafted: false;
  missingEvidence: string[];
  plannedSections: string[];
  draft: ContentDraft;
};

const plans = [
  {
    id: "chst5-lesson-brief-excavations",
    objective: "K03",
    title: "Excavation planning: conditions, responsibilities and evidence",
    topic: "Excavation safety",
    subtopic: "Planning and changed conditions",
    section:
      "1926.651 and 1926.652 — precise supporting subsections require examination",
    url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.651",
    scenarios: [
      "A utility location is uncertain near a proposed excavation.",
      "Ground loading or water conditions change after an earlier evaluation.",
    ],
  },
  {
    id: "chst5-lesson-brief-falls",
    objective: "K04",
    title: "Work at height: planning a defensible control decision",
    topic: "Fall protection",
    subtopic: "Task-specific assessment and control compatibility",
    section:
      "1926.501 and 1926.502 — activity-specific applicability requires examination",
    url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.501",
    scenarios: [
      "A task changes from inspecting an edge to carrying materials beside it.",
      "The planned work method changes and existing protection needs reassessment.",
    ],
  },
  {
    id: "chst5-lesson-brief-jha",
    objective: "S02",
    title: "Job hazard analysis: connecting task steps and evidence",
    topic: "Job hazard analysis",
    subtopic: "Task sequencing and trade interfaces",
    section:
      "OSHA Job Hazard Analysis — edition and exact supporting pages not examined",
    url: "https://www.osha.gov/sites/default/files/publications/osha3071.pdf",
    scenarios: [
      "A delivery route crosses another crew's active work area.",
      "A task is divided into steps but changes in exposure between steps are not documented.",
    ],
  },
] as const;

/** Original authoring briefs, deliberately not completed technical lessons.
 * Missing authoritative text is represented as an evidence gap, not invented
 * explanations, regulatory thresholds, source-backed answers or source review. */
export const lessonResearchBriefs: readonly LessonResearchBrief[] = plans.map(
  (plan) => {
    const objectiveId = `CHST5-2022.04.12-D1-${plan.objective}`;
    const objective = getChstObjective(objectiveId);
    if (!objective)
      throw new Error(
        "A lesson brief must map to a supplied blueprint statement.",
      );
    const missingEvidence = [
      "Retrieve the current applicable authoritative source using lawful access.",
      "Record the actual publication/revision, exact page or section, retrieval date and applicability.",
      "Examine technical definitions, responsibilities, exceptions, controls and source conflicts before drafting explanation.",
      "Have independent source, technical and editorial reviewers examine the completed revision before publication.",
    ];
    const plannedSections = [
      "Scope and definitions",
      "Applicable requirements and their limits",
      "Nonregulatory guidance, separately identified",
      "Construction scenarios and decision rationale",
      "Misconceptions, inspection considerations and evidence gaps",
      "Knowledge checks with source-supported answers",
    ];
    const draft: ContentDraft = {
      kind: "lesson",
      certificationId: "chst",
      blueprintRevisionId: CHST_BLUEPRINT_ID,
      domain: "1",
      objectiveCode: objectiveId,
      topic: plan.topic,
      subtopic: plan.subtopic,
      title: plan.title,
      contentKind: "instructional",
      origin: "ai_generated",
      sources: [
        {
          id: `${plan.id}-candidate`,
          title: "Candidate OSHA source — not retrieved or examined",
          url: plan.url,
          edition: "",
          section: `Candidate locator only: ${plan.section}`,
          classification:
            plan.objective === "S02"
              ? "professional_guidance"
              : "regulatory_requirement",
        },
      ],
      body: {
        summary:
          "SOURCE-BLOCKED AUTHORING BRIEF. Technical instruction, definitions, legal applicability and assessment answers have not been drafted because the supporting source could not be examined. This is not a completed safety lesson.",
        objectives: [
          `Plan a source-supported lesson for the exact supplied statement: ${objective.statement}`,
          "Separate official examination scope, regulatory requirements and nonregulatory guidance.",
          "Identify missing evidence before authoring or publishing technical instruction.",
        ],
        sections: [
          {
            id: "blueprint-scope",
            title: "Governing blueprint statement",
            paragraphs: [
              objective.statement,
              "This statement establishes examination scope. It does not by itself establish a safe work procedure or verify a regulatory answer.",
            ],
            reflection:
              "Which source and applicability details need examination before this statement can be taught accurately?",
          },
          {
            id: "technical-evidence-gap",
            title: "Technical explanation — blocked pending source examination",
            paragraphs: [
              "No technical explanation or numerical requirement is supplied here. Retrieve and examine the applicable source, document exact supporting sections, then replace this authoring brief with original instruction reviewed by authorized humans.",
              ...missingEvidence,
            ],
            reflection:
              "Which planned claims are supported, contradicted or still unresolved by examined evidence?",
          },
          {
            id: "scenario-briefs",
            title:
              "Scenario development prompts — no technical solution asserted",
            paragraphs: [
              ...plan.scenarios,
              "Develop a complete scenario, assumptions, defensible response and alternative rationales only after the applicable evidence has been reviewed.",
            ],
            reflection:
              "What information would a learner need before making a defensible decision?",
          },
          {
            id: "writing-plan",
            title: "Planned lesson structure",
            paragraphs: plannedSections.map(
              (title) => `To develop after source review: ${title}.`,
            ),
            reflection:
              "Does each material technical claim have a citation and an applicability note?",
          },
        ],
        checks: [
          {
            id: "authoring-readiness",
            stem: "What must happen before this source-blocked authoring brief can become published technical instruction?",
            choices: [
              {
                id: "a",
                text: "Complete the source-supported lesson and obtain the required independent human reviews.",
              },
              {
                id: "b",
                text: "Treat the supplied blueprint statement as proof of every technical answer.",
              },
              {
                id: "c",
                text: "Replace missing source text with an unsupported confident explanation.",
              },
              {
                id: "d",
                text: "Publish the authoring brief because a candidate URL has been saved.",
              },
            ],
            correctChoice: "a",
            explanation:
              "This check concerns CredBuilt's authoring workflow. A blueprint mapping or candidate URL does not verify technical claims; completed instruction needs source, technical and editorial review.",
          },
        ],
        readingMinutes: 15,
        questionIds: [],
        relatedLessonIds: [],
        prerequisites: [],
        media: [],
        transcript: "",
      },
    };
    return {
      id: plan.id,
      title: plan.title,
      objectiveId,
      estimatedLearningMinutes: 15,
      status: "blocked_sources",
      technicalTextDrafted: false,
      questionsDrafted: false,
      missingEvidence,
      plannedSections,
      draft,
    };
  },
);
