import type { StudioAccess } from "@/modules/studio/model";
export type CoverageFilters = {
  domain?: string;
  objective?: string;
  status?: string;
  search?: string;
};
export type CoverageCount = {
  questions: number;
  sourceVerified: number;
  approved: number;
  published: number;
};
export type ContentReport = {
  id: string;
  contentId: string;
  revisionId: string;
  reporterId: string;
  category: string;
  message: string;
  status: "open" | "under_review" | "resolved" | "dismissed";
  createdAt: string;
  updatedAt: string;
  resolution: string;
};
export type CurriculumCoverage = {
  access: StudioAccess;
  blueprint: {
    id: string;
    version: string;
    latestOfficialVersionConfirmed: false;
  };
  totals: CoverageCount & {
    lessons: number;
    draft: number;
    technicalReview: number;
    sourcePending: number;
    reportedErrors: number;
    objectivesWithoutQuestions: number;
    objectivesInsufficientCoverage: number;
  };
  domains: (CoverageCount & { code: string; title: string; weight: number })[];
  objectives: (CoverageCount & {
    id: string;
    domain: string;
    kind: string;
    number: number;
    statement: string;
    page: number;
  })[];
  references: {
    id: string;
    title: string;
    edition: string;
    url: string | null;
    classification: string;
    bibliographyListed: boolean;
    verificationStatus: "not_reviewed";
    freshness: "unknown";
  }[];
  reports: ContentReport[];
  filters: CoverageFilters;
};
