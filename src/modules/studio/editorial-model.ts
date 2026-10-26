import { z } from "zod";
import type { ContentDraft, StudioAccess, StudioStatus } from "./model";
import type { questionQualityReport } from "./question-quality";
export const editorialChecksSchema = z
  .object({
    clarity: z.boolean(),
    originality: z.boolean(),
    distractors: z.boolean(),
    answerClues: z.boolean(),
    rights: z.boolean(),
  })
  .strict();
export const editorialActionSchema = z
  .object({
    id: z.string().min(1).max(100),
    revision: z.number().int().positive(),
    rowVersion: z.number().int().nonnegative(),
    editorialEvent: z.string().nullable(),
    decision: z.enum(["approved", "changes_requested", "rejected"]),
    findings: z.string().trim().min(1).max(5000),
    checks: editorialChecksSchema,
    humanAttestation: z.literal(true),
  })
  .strict();
export type EditorialDecision = {
  id: string;
  revisionId: string;
  reviewerId: string;
  decision: "approved" | "changes_requested" | "rejected";
  findings: string;
  checks: z.infer<typeof editorialChecksSchema>;
  createdAt: string;
};
export type EditorialItem = {
  id: string;
  revisionId: string;
  revision: number;
  rowVersion: number;
  ownerId: string;
  status: StudioStatus;
  data: ContentDraft;
  sourceVerified: boolean;
  editorialApproved: boolean;
  history: EditorialDecision[];
  stage: string;
  canReview: boolean;
};
export type EditorialSnapshot = {
  access: StudioAccess;
  items: EditorialItem[];
  quality: ReturnType<typeof questionQualityReport>;
  truncated: boolean;
};
