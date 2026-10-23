import { z } from "zod";

export const studioRoles = ["author", "reviewer", "administrator"] as const;
export type StudioRole = (typeof studioRoles)[number];
export const studioStatuses = [
  "draft",
  "source_verification_pending",
  "source_verified",
  "technical_review",
  "changes_requested",
  "rejected",
  "approved",
  "published",
  "retired",
] as const;
export type StudioStatus = (typeof studioStatuses)[number];
const text = (max = 20000) => z.string().trim().min(1).max(max);
export function safeHttps(value: string) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/\.+$/, "");
    const privateHost =
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.includes(":") ||
      /^\d+(?:\.\d+){3}$/.test(host) ||
      /^\[/.test(host) ||
      /^(?:0|10|127|169\.254|192\.168)\./.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !privateHost &&
      host.includes(".")
    );
  } catch {
    return false;
  }
}
export function safeMediaUrl(value: string) {
  return (
    (/^\/media\/[a-zA-Z0-9/_.,-]+$/.test(value) && !value.includes("..")) ||
    safeHttps(value)
  );
}
export const sourceReferenceSchema = z
  .object({
    id: text(80),
    title: text(300),
    url: z
      .string()
      .trim()
      .max(2000)
      .refine(
        (value) => !value || safeHttps(value),
        "Use a public HTTPS source URL or leave it unknown.",
      ),
    edition: z.string().trim().max(200),
    section: z.string().trim().max(500),
    classification: z
      .enum([
        "regulatory_requirement",
        "consensus_standard",
        "professional_guidance",
        "supplemental_resource",
      ])
      .optional(),
    bibliographyId: z.string().trim().max(100).optional(),
  })
  .strict();
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export const mediaAssetSchema = z
  .object({
    kind: z.enum(["image", "video", "audio"]).default("image"),
    url: text(2000).refine(safeMediaUrl, "Use an HTTPS or local /media URL."),
    alt: text(500),
    rights: text(1000),
    captionsUrl: z.string().max(2000).refine(safeMediaUrl).optional(),
    transcript: z.string().max(100000).optional(),
  })
  .strict();
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
const uniqueIds = (values: { id: string }[]) =>
  new Set(values.map((v) => v.id)).size === values.length;
export const questionBodySchema = z
  .object({
    type: z.enum([
      "multiple_choice",
      "scenario",
      "calculation",
      "image_hazard",
      "multi_step",
    ]),
    stem: text(10000),
    choices: z
      .array(
        z
          .object({ id: text(20), text: text(5000), rationale: text(5000) })
          .strict(),
      )
      .min(2)
      .max(6)
      .refine(uniqueIds, "Choice IDs must be unique."),
    correctChoice: text(20),
    explanation: text(10000),
    difficulty: z.enum(["introductory", "intermediate", "advanced"]),
    media: z
      .array(mediaAssetSchema)
      .max(10)
      .refine(
        (media) => media.every((m) => m.kind === "image"),
        "Question media must be images.",
      ),
    solutionSteps: z.array(text(3000)).max(30),
  })
  .strict()
  .refine(
    (q) => q.choices.some((c) => c.id === q.correctChoice),
    "Select an existing correct choice.",
  );
export type QuestionBody = z.infer<typeof questionBodySchema>;
const knowledgeCheckSchema = z
  .object({
    id: text(80),
    stem: text(5000),
    choices: z
      .array(z.object({ id: text(20), text: text(3000) }).strict())
      .min(2)
      .max(6)
      .refine(uniqueIds),
    correctChoice: text(20),
    explanation: text(5000),
  })
  .strict()
  .refine(
    (q) => q.choices.some((c) => c.id === q.correctChoice),
    "Select an existing correct choice.",
  );
export const lessonBodySchema = z
  .object({
    summary: text(3000),
    objectives: z.array(text(1000)).min(1).max(20),
    sections: z
      .array(
        z
          .object({
            id: text(80),
            title: text(500),
            paragraphs: z.array(text(20000)).min(1).max(30),
            reflection: z.string().max(3000),
          })
          .strict(),
      )
      .min(1)
      .max(30)
      .refine(uniqueIds),
    checks: z.array(knowledgeCheckSchema).min(1).max(20).refine(uniqueIds),
    readingMinutes: z.number().int().min(1).max(240),
    questionIds: z
      .array(text(100))
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
    relatedLessonIds: z.array(text(100)).max(100),
    prerequisites: z
      .array(text(100))
      .max(20)
      .refine((ids) => new Set(ids).size === ids.length),
    media: z.array(mediaAssetSchema).max(20),
    transcript: z.string().max(100000),
  })
  .strict();
export type LessonBody = z.infer<typeof lessonBodySchema>;
const common = z.object({
  certificationId: text(80),
  blueprintRevisionId: text(100),
  domain: text(30),
  objectiveCode: z.string().trim().max(200),
  topic: text(300),
  subtopic: z.string().trim().max(300),
  title: text(500),
  contentKind: z.enum(["instructional", "demonstration"]),
  origin: z.enum(["human_authored", "ai_generated", "imported"]),
  instructionalCategory: z
    .enum([
      "foundational",
      "applied_technical",
      "scenario",
      "reasoning_calculation",
    ])
    .optional(),
  sources: z
    .array(sourceReferenceSchema)
    .max(30)
    .refine(uniqueIds, "Source IDs must be unique."),
});
export const contentDraftSchema = z.discriminatedUnion("kind", [
  common
    .extend({ kind: z.literal("question"), body: questionBodySchema })
    .strict(),
  common.extend({ kind: z.literal("lesson"), body: lessonBodySchema }).strict(),
]);
export type ContentDraft = z.infer<typeof contentDraftSchema>;
export const sourceCheckSchema = z
  .object({
    sourceId: text(80),
    outcome: z.enum(["supports", "contradicts", "insufficient"]),
    notes: text(5000),
  })
  .strict();
export type SourceCheck = z.infer<typeof sourceCheckSchema>;
export const sourceVerificationCheckSchema = sourceCheckSchema
  .extend({
    edition: z.string().trim().max(200),
    section: z.string().trim().max(500),
    url: z
      .string()
      .trim()
      .max(2000)
      .refine((value) => !value || safeHttps(value)),
  })
  .strict();
export type SourceVerificationCheck = z.infer<
  typeof sourceVerificationCheckSchema
>;
export type SourceVerification = {
  id: string;
  revisionId: string;
  reviewerId: string;
  decision: "verified" | "changes_requested";
  findings: string;
  sourceChecks: SourceVerificationCheck[];
  createdAt: string;
};
export type StudioAccess = {
  actorId: string;
  roles: StudioRole[];
  localDevelopment: boolean;
};
export type StudioReview = {
  id: string;
  reviewerId: string;
  revisionId: string;
  decision: "approved" | "changes_requested" | "rejected";
  findings: string;
  sourceChecks: SourceCheck[];
  createdAt: string;
};
export type StudioEvent = {
  id: string;
  actorId: string;
  event: string;
  revisionId: string | null;
  createdAt: string;
  data: Record<string, unknown>;
};
export type StudioItem = {
  id: string;
  kind: "question" | "lesson";
  ownerId: string;
  revision: number;
  revisionId: string;
  rowVersion: number;
  status: StudioStatus;
  data: ContentDraft;
  reviews: StudioReview[];
  sourceVerifications?: SourceVerification[];
  events: StudioEvent[];
  publishedRevisionId: string | null;
  blockers: string[];
  versions: {
    revision: number;
    revisionId: string;
    status: StudioStatus;
    authorId: string;
  }[];
};
export type BlueprintObjective = {
  code: string;
  domain: string;
  title: string;
};
export type BlueprintSummary = {
  id: string;
  certificationId: string;
  version: string;
  verified: boolean;
  domains: { code: string; title: string }[];
  objectives: BlueprintObjective[];
};
export type ImportPreview = {
  id: string;
  expiresAt: string;
  records: ContentDraft[];
  errors: { index: number; message: string }[];
  duplicates: string[];
};
export type StudioSnapshot = {
  access: StudioAccess;
  items: StudioItem[];
  blueprints: BlueprintSummary[];
  pagination?: { page: number; pageSize: number; total: number; pages: number };
};
const expected = z.object({
  id: text(100),
  revision: z.number().int().positive(),
  rowVersion: z.number().int().nonnegative(),
});
export const studioActionSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("create"), content: contentDraftSchema })
    .strict(),
  expected
    .extend({ action: z.literal("revise"), content: contentDraftSchema })
    .strict(),
  ...(
    ["submit", "publish", "retire", "request_source_verification"] as const
  ).map((action) => expected.extend({ action: z.literal(action) }).strict()),
  expected
    .extend({
      action: z.literal("verify_sources"),
      decision: z.enum(["verified", "changes_requested"]),
      findings: text(10000),
      sourceChecks: z.array(sourceVerificationCheckSchema).max(30),
      humanAttestation: z.literal(true),
    })
    .strict(),
  expected
    .extend({
      action: z.literal("review"),
      decision: z.enum(["approved", "changes_requested", "rejected"]),
      findings: text(10000),
      sourceChecks: z.array(sourceCheckSchema).max(30),
      humanAttestation: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("verify_blueprint"),
      blueprintRevisionId: text(100),
      sourceUrl: text(2000).refine(safeHttps),
      edition: text(200),
      section: text(500),
      notes: text(10000),
      objectives: z
        .array(
          z
            .object({ code: text(200), domain: text(30), title: text(1000) })
            .strict(),
        )
        .min(1)
        .max(1000),
      humanAttestation: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("preview_import"),
      records: z.array(z.unknown()).min(1).max(50),
    })
    .strict(),
  z
    .object({ action: z.literal("confirm_import"), previewId: z.uuid() })
    .strict(),
]);
export type StudioAction = z.infer<typeof studioActionSchema>;
export const questionTemplate: Extract<ContentDraft, { kind: "question" }> = {
  kind: "question",
  certificationId: "chst",
  blueprintRevisionId: "chst5-unverified",
  domain: "1",
  objectiveCode: "",
  topic: "Replace with topic",
  subtopic: "",
  title: "New original question draft",
  contentKind: "instructional",
  origin: "human_authored",
  sources: [],
  body: {
    type: "multiple_choice",
    stem: "Replace with an original question.",
    choices: [
      { id: "a", text: "First choice", rationale: "Explain this choice." },
      { id: "b", text: "Second choice", rationale: "Explain this choice." },
    ],
    correctChoice: "a",
    explanation: "Provide a source-supported explanation.",
    difficulty: "introductory",
    media: [],
    solutionSteps: [],
  },
};
export const lessonTemplate: Extract<ContentDraft, { kind: "lesson" }> = {
  ...questionTemplate,
  kind: "lesson",
  title: "New original lesson draft",
  body: {
    summary: "Replace with an original summary.",
    objectives: ["Describe a specific learning objective."],
    sections: [
      {
        id: "introduction",
        title: "Introduction",
        paragraphs: [
          "Write original educational content supported by reviewed references.",
        ],
        reflection: "",
      },
    ],
    checks: [
      {
        id: "check-1",
        stem: "Replace with a knowledge check.",
        choices: [
          { id: "a", text: "First choice" },
          { id: "b", text: "Second choice" },
        ],
        correctChoice: "a",
        explanation: "Explain using reviewed material.",
      },
    ],
    readingMinutes: 5,
    questionIds: [],
    relatedLessonIds: [],
    prerequisites: [],
    media: [],
    transcript: "",
  },
};
