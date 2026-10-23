export type Confidence = "low" | "medium" | "high";
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
  reference: {
    title: string;
    url: string;
    locator: string;
    verifiedAt: string | null;
  };
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
  bank?: "demonstration" | "published";
  certification?: string;
};
export type SafeQuestion = Omit<
  Question,
  "correctChoice" | "explanation" | "reference" | "choices" | "solutionSteps"
> & { choices: { id: string; text: string }[] };
export type SessionView = Omit<Session, "ownerId" | "answers"> & {
  answers: Record<string, Omit<Answer, "correct"> & { correct?: boolean }>;
  questions: SafeQuestion[];
  feedback: Record<
    string,
    {
      correctChoice: string;
      explanation: string;
      reference: Question["reference"];
      rationales: Question["choices"];
      solutionSteps?: string[];
    }
  >;
};
