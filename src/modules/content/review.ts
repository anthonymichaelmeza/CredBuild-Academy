export type ReviewStatus =
  "draft" | "technical_review" | "approved" | "published" | "retired";
export type SourceEvidence = {
  title: string;
  url: string;
  section: string;
  edition: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string;
  supportsClaim: boolean;
};
export type ReviewContent = {
  id: string;
  revision: number;
  authorId: string;
  contentKind: "demonstration" | "instructional";
  status: ReviewStatus;
  blueprint: {
    version: string;
    domain: string;
    objective: string;
    verified: boolean;
  };
  explanation: string;
  sources: SourceEvidence[];
  review: {
    reviewerId: string;
    revision: number;
    notes: string;
    reviewedAt: string;
  } | null;
  events: {
    actorId: string;
    from: ReviewStatus;
    to: ReviewStatus;
    at: string;
    revision: number;
  }[];
};
export type Reviewer = {
  id: string;
  role: "author" | "reviewer" | "administrator";
};
export function approvalBlockers(content: ReviewContent): string[] {
  const blockers: string[] = [];
  if (
    !content.blueprint.verified ||
    !content.blueprint.version ||
    !content.blueprint.domain ||
    !content.blueprint.objective.trim()
  )
    blockers.push(
      "A verified blueprint revision, domain, and exact objective mapping are required.",
    );
  if (!content.explanation.trim())
    blockers.push("A correct-answer explanation is required.");
  if (
    !content.sources.length ||
    content.sources.some(
      (s) =>
        !s.title.trim() ||
        !/^https:\/\//.test(s.url) ||
        !s.section.trim() ||
        !s.edition.trim() ||
        !s.reviewedBy ||
        s.reviewedBy === content.authorId ||
        !s.reviewedAt ||
        !Number.isFinite(Date.parse(s.reviewedAt)) ||
        !s.notes.trim() ||
        !s.supportsClaim,
    )
  )
    blockers.push(
      "Every cited technical source needs an independent supporting review with URL, edition, exact section, date, and notes.",
    );
  if (
    !content.review ||
    content.review.revision !== content.revision ||
    content.review.reviewerId === content.authorId ||
    !content.review.notes.trim() ||
    !Number.isFinite(Date.parse(content.review.reviewedAt))
  )
    blockers.push(
      "An independent technical review record for this exact revision is required.",
    );
  if (
    content.review &&
    content.sources.some(
      (s) =>
        s.reviewedAt &&
        Date.parse(s.reviewedAt) > Date.parse(content.review!.reviewedAt),
    )
  )
    blockers.push("Technical approval must follow supporting source review.");
  return blockers;
}
export function transitionReview(
  content: ReviewContent,
  target: ReviewStatus,
  actor: Reviewer,
  at = new Date().toISOString(),
): ReviewContent {
  const allowed: Record<ReviewStatus, ReviewStatus[]> = {
    draft: ["technical_review"],
    technical_review: ["draft", "approved"],
    approved: ["published", "retired"],
    published: ["retired"],
    retired: [],
  };
  if (!allowed[content.status].includes(target))
    throw new Error(
      "This status transition is not allowed. Changes to reviewed content require a new revision.",
    );
  if (
    target === "technical_review" &&
    actor.id !== content.authorId &&
    actor.role !== "administrator"
  )
    throw new Error("Only the author or an administrator may submit a draft.");
  if (target === "approved") {
    if (
      actor.role !== "reviewer" ||
      actor.id === content.authorId ||
      content.review?.reviewerId !== actor.id
    )
      throw new Error(
        "Approval requires an independent reviewer with a matching review record.",
      );
    const blockers = approvalBlockers(content);
    if (blockers.length) throw new Error(blockers.join(" "));
  }
  if (
    target === "draft" &&
    actor.role !== "reviewer" &&
    actor.role !== "administrator"
  )
    throw new Error("Only an authorized reviewer may request changes.");
  if (target === "published" || target === "retired") {
    if (actor.role !== "administrator")
      throw new Error("Only an administrator may publish or retire material.");
    if (
      target === "published" &&
      (content.contentKind === "demonstration" ||
        approvalBlockers(content).length)
    )
      throw new Error(
        "Demonstration or insufficiently reviewed content cannot enter the published bank.",
      );
  }
  return {
    ...content,
    status: target,
    events: [
      ...content.events,
      {
        actorId: actor.id,
        from: content.status,
        to: target,
        at,
        revision: content.revision,
      },
    ],
  };
}
export function reviseContent(content: ReviewContent): ReviewContent {
  return {
    ...content,
    revision: content.revision + 1,
    status: "draft",
    review: null,
    sources: content.sources.map((s) => ({
      ...s,
      reviewedBy: null,
      reviewedAt: null,
      notes: "",
      supportsClaim: false,
    })),
  };
}
