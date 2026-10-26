import { z } from "zod";
import { allowedResearchUrl, normalizeResearchUrl } from "./scope";

export const RESEARCH_JSON_MAX_BYTES = 2_000_000;
export const RESEARCH_UPLOAD_MAX_BYTES = 5_000_000;
export const researchStatuses = [
  "discovered",
  "queued",
  "retrieved",
  "parsed",
  "partially_parsed",
  "verified",
  "restricted_access",
  "paywalled",
  "not_found",
  "failed",
  "requires_manual_review",
] as const;
export type ResearchStatus = (typeof researchStatuses)[number];
export const researchClassifications = [
  "unclassified",
  "bibliography",
  "publisher_metadata",
  "examination_blueprint",
  "regulatory_requirement",
  "consensus_standard",
  "professional_guidance",
  "technical_research",
  "credbuilt_instruction",
] as const;
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const url = z
  .string()
  .trim()
  .max(3000)
  .refine(
    allowedResearchUrl,
    "Use an allowlisted public HTTPS research source.",
  )
  .transform(normalizeResearchUrl);
export const researchSourceSchema = z
  .object({
    originalUrl: z.union([url, z.literal("")]),
    parentId: optionalText(100).nullable().optional(),
    title: text(500),
    publisher: text(300),
    publicationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
    classification: z.enum(researchClassifications).default("unclassified"),
    access: z
      .enum(["public_link", "licensed_reference", "user_supplied", "unknown"])
      .default("public_link"),
    license: z
      .enum([
        "public_metadata_only",
        "public_reproduction_permitted",
        "licensed_private",
        "permission_required",
        "unknown",
      ])
      .default("unknown"),
    licensedIdentifier: optionalText(500).default(""),
    rightsNotes: optionalText(3000).default(""),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      !v.originalUrl &&
      !["licensed_reference", "user_supplied"].includes(v.access)
    )
      ctx.addIssue({
        code: "custom",
        path: ["originalUrl"],
        message: "A public source needs its exact URL.",
      });
    if (v.access === "licensed_reference" && !v.licensedIdentifier)
      ctx.addIssue({
        code: "custom",
        path: ["licensedIdentifier"],
        message: "Licensed sources need a reference identifier.",
      });
    if (
      v.publicationDate &&
      (Number.isNaN(Date.parse(v.publicationDate)) ||
        new Date(v.publicationDate).toISOString().slice(0, 10) !==
          v.publicationDate)
    )
      ctx.addIssue({
        code: "custom",
        path: ["publicationDate"],
        message: "Provide an actual valid date or leave it unknown.",
      });
  });
export type ResearchSourceInput = z.infer<typeof researchSourceSchema>;
export const processedSectionSchema = z
  .object({
    locator: text(1000),
    title: text(1000),
    text: z.string().max(1_000_000),
    page: z.number().int().positive().nullable(),
    needsManualReview: z.boolean(),
    notes: z.array(text(3000)).max(100),
  })
  .strict();
export const processedDocumentSchema = z
  .object({
    title: text(1000),
    format: z.enum(["html", "pdf", "text"]),
    status: z.enum(["parsed", "partially_parsed", "requires_manual_review"]),
    pageCount: z.number().int().nonnegative().nullable(),
    sections: z.array(processedSectionSchema).max(5000),
    pagesProcessed: z.array(z.number().int().positive()).max(5000),
    warnings: z.array(text(3000)).max(1000),
    links: z
      .array(
        z
          .object({ url: z.string().max(3000), label: z.string().max(1000) })
          .strict(),
      )
      .max(5000),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      new Set(v.pagesProcessed).size !== v.pagesProcessed.length ||
      (v.pageCount !== null && v.pagesProcessed.some((p) => p > v.pageCount!))
    )
      ctx.addIssue({
        code: "custom",
        path: ["pagesProcessed"],
        message:
          "Processed pages must be unique and within the actual page count.",
      });
    if (new Set(v.sections.map((s) => s.locator)).size !== v.sections.length)
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: "Source section locators must be unique.",
      });
    if (
      v.status === "parsed" &&
      (!v.sections.length || v.sections.some((s) => s.needsManualReview))
    )
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message:
          "Incomplete or flagged source sections cannot be fully parsed.",
      });
  });
export type ProcessedResearchDocument = z.infer<typeof processedDocumentSchema>;
export const researchRequestAuditSchema = z
  .object({
    url: z.string().max(3000),
    purpose: z.enum(["robots", "document"]),
    attemptedAt: z.iso.datetime({ offset: true }),
    httpStatus: z.number().int().min(100).max(599).nullable(),
    proxyStatus: z.number().int().min(100).max(599).nullable(),
    resolvedUrl: z.string().max(3000).nullable(),
    error: z.string().max(5000).nullable(),
  })
  .strict();
export const researchCompletionSchema = z
  .object({
    attemptedAt: z.iso.datetime({ offset: true }),
    resolvedUrl: z.string().max(3000).nullable().optional(),
    httpStatus: z.number().int().min(100).max(599).nullable(),
    proxyStatus: z.number().int().min(100).max(599).nullable(),
    error: z.string().max(5000).nullable(),
    restricted: z.boolean().optional(),
    paywalled: z.boolean().optional(),
    notModified: z.boolean().optional(),
    retryAfterSeconds: z.number().int().min(1).max(86400).optional(),
    redirects: z
      .array(
        z
          .object({
            from: z.string().max(3000),
            to: z.string().max(3000),
            status: z.number().int().min(300).max(399),
          })
          .strict(),
      )
      .max(10),
    etag: z.string().max(1000).nullable().optional(),
    lastModified: z.string().max(1000).nullable().optional(),
    requests: z.array(researchRequestAuditSchema).max(50).optional(),
    document: processedDocumentSchema.optional(),
  })
  .strict();
export type ResearchCompletion = z.infer<typeof researchCompletionSchema>;
export const researchQueuePolicySchema = z
  .object({
    maxDepth: z.number().int().min(0).max(2).default(1),
    maxDocuments: z.number().int().min(1).max(50).default(25),
    delayMs: z.number().int().min(1000).max(60000).default(1500),
  })
  .strict();
export const researchActionSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("register"), source: researchSourceSchema })
    .strict(),
  z
    .object({
      action: z.literal("update_metadata"),
      sourceId: text(100),
      expectedRevision: z.number().int().positive(),
      source: researchSourceSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("enqueue"),
      sourceId: text(100),
      runKey: optionalText(100).optional(),
      maxDepth: z.number().int().min(0).max(2).optional(),
      maxDocuments: z.number().int().min(1).max(50).optional(),
      delayMs: z.number().int().min(1000).max(60000).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("link"),
      sourceId: text(100),
      objectiveId: text(200),
      sectionId: text(150).nullable().optional(),
      relationKind: z.enum(["candidate", "supports", "conflicts"]),
      notes: text(3000),
    })
    .strict(),
  z
    .object({
      action: z.literal("import_document"),
      sourceId: text(100),
      format: z.enum(["html", "text"]),
      content: z.string().min(1).max(RESEARCH_JSON_MAX_BYTES),
      rightsAttestation: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("review_section"),
      sourceId: text(100),
      sectionId: text(150),
      documentHash: z.string().regex(/^[a-f0-9]{64}$/),
      decision: z.enum(["resolved", "needs_revision"]),
      notes: text(5000),
      humanAttestation: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("review_source"),
      sourceId: text(100),
      documentHash: z.string().regex(/^[a-f0-9]{64}$/),
      decision: z.enum(["verified", "needs_revision"]),
      findings: text(5000),
      humanAttestation: z.literal(true),
    })
    .strict(),
]);
export type ResearchSource = {
  metadataRevision?: number;
  metadataTitle?: string;
  extractionComplete?: boolean;
  id: string;
  parentId: string | null;
  originalUrl: string;
  resolvedUrl: string | null;
  publisher: string;
  title: string;
  publicationDate: string | null;
  format: string | null;
  access: ResearchSourceInput["access"];
  license: ResearchSourceInput["license"];
  classification: ResearchSourceInput["classification"];
  licensedIdentifier: string;
  rightsNotes: string;
  status: ResearchStatus;
  parseStatus: string;
  pageCount: number | null;
  pagesProcessed: number[];
  sectionsProcessed: number;
  documentHash: string | null;
  error: string | null;
  updatedAt: string;
  retrievedAt?: string | null;
  objectiveIds: string[];
};
export type ResearchSection = {
  id: string;
  sourceId: string;
  locator: string;
  title: string;
  text: string;
  page: number | null;
  needsManualReview: boolean;
  manualReviewResolved?: boolean;
  effectiveNeedsManualReview?: boolean;
  notes: string[];
};
export type ResearchClaim = {
  access: ResearchSourceInput["access"];
  license: ResearchSourceInput["license"];
  classification: ResearchSourceInput["classification"];
  jobId: string;
  sourceId: string;
  url: string;
  depth: number;
  leaseToken: string;
  attemptNumber: number;
  etag: string | null;
  lastModified: string | null;
  policy: z.infer<typeof researchQueuePolicySchema>;
};
export type ResearchSnapshot = {
  access: import("@/modules/studio/model").StudioAccess;
  sources: ResearchSource[];
  sections: ResearchSection[];
  jobs: {
    id: string;
    sourceId: string;
    state: string;
    attempts: number;
    nextAttemptAt: string;
    leaseUntil: string | null;
    error: string | null;
  }[];
  attempts: {
    id: string;
    sourceId: string;
    attemptedAt: string;
    httpStatus: number | null;
    proxyStatus: number | null;
    resolvedUrl: string | null;
    error: string | null;
    kind: string;
    requests?: z.infer<typeof researchRequestAuditSchema>[];
    documentHash?: string | null;
  }[];
  pagination: { page: number; pages: number; total: number };
  metrics: {
    sources: number;
    parsed: number;
    verified: number;
    restricted: number;
    failed: number;
    sections: number;
    pendingJobs: number;
  };
};
