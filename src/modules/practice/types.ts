export type Confidence = "low" | "medium" | "high";
export type Question = {
  id: string;
  version: number;
  domain: string;
  topic: string;
  difficulty: "introductory" | "intermediate";
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
  contentKind: "demonstration";
  origin: "ai_generated";
  reviewStatus: "draft";
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
  answers: Record<string, Answer>;
  flags: string[];
  mode: "learning" | "adaptive";
  status: "in_progress" | "submitted";
  createdAt: string;
  submittedAt: string | null;
  revision: number;
};
export type SafeQuestion = Omit<
  Question,
  "correctChoice" | "explanation" | "reference" | "choices"
> & { choices: { id: string; text: string }[] };
export type SessionView = Omit<Session, "ownerId"> & {
  questions: SafeQuestion[];
  feedback: Record<
    string,
    {
      correctChoice: string;
      explanation: string;
      reference: Question["reference"];
      rationales: Question["choices"];
    }
  >;
};
