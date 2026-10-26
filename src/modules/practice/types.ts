export type Confidence = "low" | "medium" | "high";
export type PracticeBank = "demonstration" | "published" | "curriculum_drafts";
export type QuestionReference = {
  title: string;
  url: string;
  locator: string;
  verifiedAt: string | null;
  edition?: string;
  classification?:
    | "regulatory_requirement"
    | "consensus_standard"
    | "professional_guidance"
    | "supplemental_resource";
  verificationStatus?: "pending" | "verified";
};
export type Question = {
  id: string;
  version: number;
  /** Absent on the original CHST demonstration fixtures. */
  certification?: string;
  blueprint?: { version: string; objective: string };
  domain: string;
  topic: string;
  difficulty: "introductory" | "intermediate" | "advanced";
  stem: string;
  choices: { id: string; text: string; rationale: string }[];
  correctChoice: string;
  explanation: string;
  reference: QuestionReference;
  references?: QuestionReference[];
  contentKind: "demonstration" | "instructional";
  origin: "ai_generated" | "human_authored" | "imported";
  reviewStatus: "draft" | "approved" | "published";
  questionType?:
    | "multiple_choice"
    | "scenario"
    | "calculation"
    | "image_hazard"
    | "multi_step";
  media?: { url: string; alt: string; rights: string }[];
  solutionSteps?: string[];
};
export type Answer = {
  choiceId: string;
  confidence: Confidence;
  correct: boolean;
  answeredAt: string;
  responseMs: number;
};
export type Session = {
  id: string;
  ownerId: string;
  questionIds: string[];
  /** Immutable revision selected for each ID. Legacy snapshots mean version 1. */
  questionVersions?: Record<string, number>;
  answers: Record<string, Answer>;
  flags: string[];
  mode: "learning" | "adaptive" | "timed" | "exam";
  status: "in_progress" | "submitted";
  createdAt: string;
  submittedAt: string | null;
  revision: number;
  deadlineAt?: string;
  submissionReason?: "manual" | "expired";
  topic?: string;
  /** Absent on legacy attempts, which always use the demonstration bank. */
  bank?: PracticeBank;
  certification?: string;
  /** Dedicated full-length attempts keep the existing owner/revision history. */
  examKind?: "chst_full_length";
  currentQuestionIndex?: number;
  examPolicyVersion?: string;
  durationSeconds?: number;
  /** Synthetic local QA only; never a reviewed CHST examination. */
  developmentFixture?: boolean;
};
export type SafeQuestion = Omit<
  Question,
  | "correctChoice"
  | "explanation"
  | "reference"
  | "references"
  | "choices"
  | "solutionSteps"
> & { choices: { id: string; text: string }[] };
export type SessionView = Omit<Session, "ownerId" | "answers"> & {
  /** Authoritative response time used to calibrate the examination countdown. */
  serverNow?: string;
  answers: Record<string, Omit<Answer, "correct"> & { correct?: boolean }>;
  questions: SafeQuestion[];
  feedback: Record<
    string,
    {
      correctChoice: string;
      explanation: string;
      reference: Question["reference"];
      references?: QuestionReference[];
      rationales: Question["choices"];
      solutionSteps?: string[];
    }
  >;
};
