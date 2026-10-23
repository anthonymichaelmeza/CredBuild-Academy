import type { ContentDraft } from "@/modules/studio/model";

/** Authored working material, not independently reviewed educational content. */
export type DraftQuestionRecord = {
  id: string;
  category:
    "foundational" | "applied_technical" | "scenario" | "reasoning_calculation";
  content: ContentDraft;
  sourceVerifiedAt: null;
  technicalReviewer: null;
  reviewStatus: "draft";
  revision: 1;
};
