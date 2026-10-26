/** Public metadata only. Never put answer keys or active answer correctness here. */
export type ExamDomainAvailability = {
  code: string;
  title: string;
  required: number;
  eligible: number;
  shortfall: number;
};
export type ExamAvailability = {
  count: 200;
  durationSeconds: 14400;
  blueprintVersion: string;
  latestOfficialVersionConfirmed: boolean;
  durationBasis: "credbuilt_practice_configuration";
  domains: ExamDomainAvailability[];
  eligibleTotal: number;
  canStart: boolean;
  blockers: string[];
  developmentFixture: boolean;
  signedIn: boolean;
  bankConnected: boolean;
};
export type ExamHistoryItem = {
  id: string;
  status: "in_progress" | "submitted";
  createdAt: string;
  submittedAt: string | null;
  deadlineAt: string;
  submissionReason?: "manual" | "expired";
  questionCount: number;
  answered: number;
  correct?: number;
  percentage?: number;
  currentQuestionIndex: number;
  developmentFixture: boolean;
  domains?: { code: string; correct: number; total: number }[];
};
export type ExamAdminSummary = {
  availability: ExamAvailability;
  domainCounts: {
    code: string;
    approved: number;
    published: number;
    draft: number;
    unreviewed: number;
  }[];
  approvedTotal: number;
  publishedTotal: number;
  draftCount: number;
  unreviewedCount: number;
  invalidPublished: number;
  completedAttempts: number;
  inProgressAttempts: number;
  questionStatistics: {
    id: string;
    version: number;
    domain: string;
    topic: string;
    answered: number;
    correct: number;
    accuracy: number | null;
  }[];
};
