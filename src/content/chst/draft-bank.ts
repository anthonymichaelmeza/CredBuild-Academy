import type { Question, QuestionReference } from "@/modules/practice/types";
import { CHST_BLUEPRINT_VERSION } from "@/modules/curriculum/catalog";
import { domain1Drafts } from "./drafts-domain1";
import { domain2Drafts } from "./drafts-domain2";
import { domain3Drafts } from "./drafts-domain3";
import { domain4Drafts } from "./drafts-domain4";
import type { DraftQuestionRecord } from "./draft-types";

/** Original AI drafts, not an approved bank. Database ingestion is an explicit
 * trusted operation; importing this module never writes or publishes content. */
export const chstDraftRecords: readonly DraftQuestionRecord[] = [
  ...domain1Drafts,
  ...domain2Drafts,
  ...domain3Drafts,
  ...domain4Drafts,
];

function demonstrationQuestion(record: DraftQuestionRecord): Question {
  const content = record.content;
  if (content.kind !== "question")
    throw new Error("Expected a question draft.");
  const references: QuestionReference[] = content.sources.map((source) => ({
    title: source.title,
    url: source.url,
    locator: source.section,
    verifiedAt: null,
    edition: source.edition,
    ...(source.classification ? { classification: source.classification } : {}),
    verificationStatus: "pending",
  }));
  return {
    id: record.id,
    version: record.revision,
    certification: content.certificationId,
    blueprint: {
      version: CHST_BLUEPRINT_VERSION,
      objective: content.objectiveCode,
    },
    domain: content.domain,
    topic: content.topic,
    difficulty: content.body.difficulty,
    stem: content.body.stem,
    choices: content.body.choices.map((choice) => ({ ...choice })),
    correctChoice: content.body.correctChoice,
    explanation: content.body.explanation,
    reference: references[0] || {
      title: "Technical source verification required",
      url: "",
      locator: "",
      verifiedAt: null,
      verificationStatus: "pending",
    },
    references,
    contentKind: "demonstration",
    origin: "ai_generated",
    reviewStatus: "draft",
    questionType: content.body.type,
    ...(content.body.media.length
      ? {
          media: content.body.media.map((media) => ({
            url: media.url,
            alt: media.alt,
            rights: media.rights,
          })),
        }
      : {}),
    ...(content.body.solutionSteps.length
      ? { solutionSteps: [...content.body.solutionSteps] }
      : {}),
  };
}

/** Public, inspectable demonstration fixtures. Connected production selection
 * must never use this pool; approved material comes from publication pointers. */
export const browserDraftQuestions: Question[] = chstDraftRecords.map(
  demonstrationQuestion,
);

export const draftBankDisclosure = {
  label: "CHST5 curriculum drafts — unreviewed demonstration",
  blueprintVersion: CHST_BLUEPRINT_VERSION,
  sourceVerifiedCount: 0,
  technicallyApprovedCount: 0,
  publishedCount: 0,
  notice:
    "Original AI-generated drafts. Sources and technical accuracy have not been independently verified. These questions are not official BCSP examination questions.",
} as const;
