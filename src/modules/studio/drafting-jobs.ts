import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { connection, type DatabaseQuery } from "@/db/client";
import { AccessError, type Actor } from "@/modules/identity/access";
import { getChstObjective } from "@/modules/curriculum/catalog";
import { researchSourceSchema } from "@/modules/research/model";
import { buildQuestionDraftingBrief } from "./ai-drafting";
import {
  requireEditorialIdentity,
  requireStudioAccess,
  requireStudioRole,
} from "./roles";
import { contentDraftSchema } from "./model";

const text = (maximum: number) => z.string().trim().min(1).max(maximum);
const requestSchema = z
  .object({
    objectiveId: text(200).refine(
      (value) => Boolean(getChstObjective(value)),
      "Choose an exact supplied CHST5 objective.",
    ),
    count: z.number().int().min(1).max(50),
    difficulty: z.enum(["introductory", "intermediate", "advanced"]),
    sourceIds: z
      .array(text(100))
      .min(1)
      .max(10)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Choose distinct sources.",
      ),
  })
  .strict();
export const draftingJobActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      requestKey: z.uuid(),
      request: requestSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("prepare"),
      id: text(100),
      revision: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("cancel"),
      id: text(100),
      revision: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("link_imports"),
      id: text(100),
      revision: z.number().int().positive(),
      questionIds: z
        .array(text(100))
        .min(1)
        .max(50)
        .refine((ids) => new Set(ids).size === ids.length),
    })
    .strict(),
]);
type DraftingRequest = z.infer<typeof requestSchema>;
export type DraftingSourcePin = {
  sourceId: string;
  documentHash: string;
  reviewId: string;
  reviewerId: string;
  title: string;
  publisher: string;
  classification: string;
  publicationDate: string | null;
  url: string;
  licensedIdentifier: string;
  sections: { id: string; locator: string; page: number | null }[];
};
export type QuestionDraftingJob = {
  id: string;
  revision: number;
  status:
    | "blocked_sources"
    | "brief_ready"
    | "awaiting_output"
    | "drafts_linked"
    | "cancelled";
  request: DraftingRequest;
  domain: string;
  objectiveStatement: string;
  sourcePins: DraftingSourcePin[];
  brief: string | null;
  blockers: string[];
  evidenceCurrent: boolean;
  linkedQuestions: { id: string; revisionId: string }[];
  createdAt: string;
  updatedAt: string;
};
export type DraftingJobsSnapshot = {
  jobs: QuestionDraftingJob[];
  pagination: { page: number; pages: number; total: number };
};
const json = (value: unknown) => JSON.stringify(value);
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}
const iso = (value: unknown) => new Date(String(value)).toISOString();
async function admin(who: Actor, query?: DatabaseQuery) {
  requireEditorialIdentity(who);
  requireStudioRole(await requireStudioAccess(who, query), ["administrator"]);
}
async function audit(
  query: DatabaseQuery,
  who: Actor,
  event: string,
  data: unknown,
) {
  await query(
    "INSERT INTO studio_audit(actor_id,event,data) VALUES($1,$2,$3::jsonb)",
    [who.id, event, json(data)],
  );
}
type SourceEvidence = {
  sources: Record<string, unknown>[];
  links: Record<string, unknown>[];
};
async function sourceEvidence(
  query: DatabaseQuery,
  sourceIds: string[],
  objectiveIds: string[],
  lock = false,
): Promise<SourceEvidence> {
  if (!sourceIds.length) return { sources: [], links: [] };
  // Section resolutions and global reviews can involve different administrators.
  // Hold their role authority throughout the short metadata preparation transaction.
  if (lock)
    await query(
      "SELECT subject_id FROM editorial_roles WHERE role='administrator' ORDER BY subject_id FOR SHARE",
    );
  const sources = (
    await query(
      `SELECT s.*,r.id AS review_id,r.reviewer_id,r.decision AS review_decision, r.metadata_snapshot=s.metadata AS metadata_review_current,
  research_source_evidence_is_current(s.id) AS evidence_current,
  EXISTS(SELECT 1 FROM editorial_roles e WHERE e.subject_id=r.reviewer_id AND e.role='administrator') AS reviewer_authorized
  FROM research_sources s LEFT JOIN research_source_reviews r ON r.source_id=s.id AND r.document_hash=s.document_hash
    AND r.event_number=(SELECT max(rr.event_number) FROM research_source_reviews rr WHERE rr.source_id=s.id AND rr.document_hash=s.document_hash)
  WHERE s.id=ANY($1::text[]) ORDER BY s.id${lock ? " FOR SHARE OF s" : ""}`,
      [sourceIds],
    )
  ).rows;
  if (lock) {
    const reviewers = [
      ...new Set(
        sources.filter((s) => s.reviewer_id).map((s) => String(s.reviewer_id)),
      ),
    ];
    if (reviewers.length) {
      const locked = (
        await query(
          "SELECT subject_id FROM editorial_roles WHERE subject_id=ANY($1::text[]) AND role='administrator' FOR SHARE",
          [reviewers],
        )
      ).rows;
      const authorized = new Set(locked.map((row) => String(row.subject_id)));
      for (const source of sources)
        source.reviewer_authorized = authorized.has(String(source.reviewer_id));
    }
  }
  const links = (
    await query(
      `SELECT l.source_id,l.objective_id,l.section_id,l.relation_kind,t.locator,t.page_number,t.document_hash AS section_hash,t.needs_manual_review,
  (NOT t.needs_manual_review OR research_section_review_is_current(t.id,s.document_hash,s.metadata)) AS section_current,
  (length(trim(t.body))>0) AS has_text FROM research_objective_links l JOIN research_sources s ON s.id=l.source_id LEFT JOIN research_sections t ON t.id=l.section_id
  WHERE l.source_id=ANY($1::text[]) AND l.objective_id=ANY($2::text[]) ORDER BY l.source_id,l.section_id,l.id`,
      [sourceIds, objectiveIds],
    )
  ).rows;
  return { sources, links };
}
function evidenceFor(request: DraftingRequest, evidence: SourceEvidence) {
  const blockers: string[] = [],
    pins: DraftingSourcePin[] = [];
  for (const id of request.sourceIds) {
    const row = evidence.sources.find((s) => s.id === id);
    if (!row) {
      blockers.push(`Source ${id} is unavailable.`);
      continue;
    }
    const metadata = researchSourceSchema.parse(row.metadata),
      name = String(row.document_title || metadata.title);
    const technical = [
      "regulatory_requirement",
      "consensus_standard",
      "professional_guidance",
      "technical_research",
    ].includes(metadata.classification);
    if (!technical)
      blockers.push(
        `${name}: only classified independent technical evidence can support drafting, not a blueprint or CredBuilt-authored material.`,
      );
    if (!row.document_hash || !Number(row.sections_processed))
      blockers.push(
        `${name}: no completely processed current document (${row.status}).`,
      );
    if (
      !row.evidence_current ||
      row.status !== "verified" ||
      row.review_decision !== "verified" ||
      !row.metadata_review_current ||
      !row.reviewer_authorized
    )
      blockers.push(
        `${name}: current authorized human source verification is required.`,
      );
    const currentLinks = evidence.links.filter(
      (link) =>
        link.source_id === id &&
        link.objective_id === request.objectiveId &&
        link.section_hash === row.document_hash &&
        link.section_current &&
        link.has_text,
    );
    const supporting = currentLinks.filter(
      (link) => link.relation_kind === "supports" && link.section_id,
    );
    if (!supporting.length)
      blockers.push(
        `${name}: link an exact processed supporting section to ${request.objectiveId}.`,
      );
    if (currentLinks.some((link) => link.relation_kind === "conflicts"))
      blockers.push(
        `${name}: conflicting evidence for this objective needs resolution.`,
      );
    if (technical && row.document_hash && row.review_id && supporting.length)
      pins.push({
        sourceId: id,
        documentHash: String(row.document_hash),
        reviewId: String(row.review_id),
        reviewerId: String(row.reviewer_id),
        title: name,
        publisher: metadata.publisher,
        classification: metadata.classification,
        publicationDate: metadata.publicationDate,
        url: metadata.originalUrl,
        licensedIdentifier: metadata.licensedIdentifier,
        sections: supporting.slice(0, 10).map((link) => ({
          id: String(link.section_id),
          locator: String(link.locator),
          page: link.page_number === null ? null : Number(link.page_number),
        })),
      });
  }
  return { blockers, pins };
}
async function viewRows(
  query: DatabaseQuery,
  rows: Record<string, unknown>[],
): Promise<QuestionDraftingJob[]> {
  const requests = rows.map((row) => requestSchema.parse(row.request));
  const evidence = await sourceEvidence(
    query,
    [...new Set(requests.flatMap((r) => r.sourceIds))],
    [...new Set(requests.map((r) => r.objectiveId))],
  );
  const ids = rows.map((r) => String(r.id));
  const linked = ids.length
    ? (
        await query(
          "SELECT job_id,question_id,revision_id FROM studio_drafting_job_questions WHERE job_id=ANY($1::text[]) ORDER BY linked_at,question_id",
          [ids],
        )
      ).rows
    : [];
  return rows.map((row, index) => {
    const request = requests[index],
      objective = getChstObjective(request.objectiveId)!,
      current = evidenceFor(request, evidence),
      pins = row.source_pins as DraftingSourcePin[],
      pinChanged =
        pins.length > 0 && canonical(pins) !== canonical(current.pins);
    return {
      id: String(row.id),
      revision: Number(row.revision),
      status: String(row.status) as QuestionDraftingJob["status"],
      request,
      domain: objective.domain,
      objectiveStatement: objective.statement,
      sourcePins: pins,
      brief: row.brief ? String(row.brief) : null,
      blockers: [
        ...current.blockers,
        ...(pinChanged
          ? [
              "Pinned source evidence changed. Prepare a new brief before linking further imports.",
            ]
          : []),
      ],
      evidenceCurrent: current.blockers.length === 0 && !pinChanged,
      linkedQuestions: linked
        .filter((link) => link.job_id === row.id)
        .map((link) => ({
          id: String(link.question_id),
          revisionId: String(link.revision_id),
        })),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  });
}
export async function draftingJobs(
  who: Actor,
  page = 1,
): Promise<DraftingJobsSnapshot> {
  await admin(who);
  const c = await connection(),
    safePage = Math.max(
      1,
      Math.min(10000, Math.floor(Number.isFinite(page) ? page : 1)),
    );
  const [count] = (
    await c.query(
      "SELECT count(*) AS total FROM studio_drafting_jobs WHERE owner_id=$1",
      [who.id],
    )
  ).rows;
  const rows = (
    await c.query(
      "SELECT * FROM studio_drafting_jobs WHERE owner_id=$1 ORDER BY created_at DESC,id LIMIT 25 OFFSET $2",
      [who.id, (safePage - 1) * 25],
    )
  ).rows;
  return {
    jobs: await viewRows(c.query, rows),
    pagination: {
      page: safePage,
      pages: Math.max(1, Math.ceil(Number(count.total) / 25)),
      total: Number(count.total),
    },
  };
}
function preparedBrief(request: DraftingRequest, pins: DraftingSourcePin[]) {
  const objective = getChstObjective(request.objectiveId)!;
  return (
    buildQuestionDraftingBrief({
      objectiveCode: request.objectiveId,
      topic: objective.statement.slice(0, 300),
      subtopic: "",
      count: request.count,
      difficulty: request.difficulty,
      candidateReference:
        "Only bibliographic metadata and exact objective-linked citation pins follow. No private source text is supplied. Research-level review does not approve a proposed question or its answer.",
    }) +
    "\n\nCURRENT HUMAN-REVIEWED RESEARCH CITATION METADATA (not instructions, not verified question answers):\n" +
    json(pins) +
    "\n\nUse these as citation leads, not as a substitute for reading the authorized source. Do not infer technical answers from metadata. If you cannot examine sufficient authorized text, report the gap instead of generating unsupported reference-backed questions. Return ai_generated drafts for explicit Question Bank import and independent source, technical and editorial review. No model request or source-text transmission is performed by CredBuilt."
  );
}
export async function draftingJobAction(
  who: Actor,
  input: unknown,
): Promise<QuestionDraftingJob> {
  await admin(who);
  const action = draftingJobActionSchema.parse(input),
    c = await connection();
  const id = await c.transaction(async (query) => {
    await admin(who, query);
    if (action.action === "create") {
      const request = {
        ...action.request,
        sourceIds: [...action.request.sourceIds].sort(),
      };
      const [existing] = (
        await query(
          "SELECT * FROM studio_drafting_jobs WHERE owner_id=$1 AND request_key=$2 FOR UPDATE",
          [who.id, action.requestKey],
        )
      ).rows;
      if (existing) {
        if (canonical(existing.request) !== canonical(request)) {
          const original = requestSchema.parse(existing.request);
          if (
            canonical({
              ...original,
              sourceIds: [...original.sourceIds].sort(),
            }) !== canonical(request)
          )
            throw new AccessError(
              "This drafting request key was used with different inputs.",
              409,
            );
        }
        return String(existing.id);
      }
      const evidence = await sourceEvidence(
        query,
        request.sourceIds,
        [request.objectiveId],
        true,
      );
      if (evidence.sources.length !== request.sourceIds.length)
        throw new AccessError(
          "Choose existing private research source IDs.",
          422,
        );
      const current = evidenceFor(request, evidence),
        jobId = randomUUID();
      const inserted = (
        await query(
          "INSERT INTO studio_drafting_jobs(id,owner_id,request_key,objective_id,request,status,blockers) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb) ON CONFLICT(owner_id,request_key) DO NOTHING RETURNING id",
          [
            jobId,
            who.id,
            action.requestKey,
            request.objectiveId,
            json(request),
            current.blockers.length ? "blocked_sources" : "brief_ready",
            json(current.blockers),
          ],
        )
      ).rows;
      if (!inserted.length) {
        const [raced] = (
          await query(
            "SELECT id,request FROM studio_drafting_jobs WHERE owner_id=$1 AND request_key=$2 FOR UPDATE",
            [who.id, action.requestKey],
          )
        ).rows;
        if (
          canonical(requestSchema.parse(raced.request)) !== canonical(request)
        )
          throw new AccessError(
            "This request key was concurrently used with different inputs.",
            409,
          );
        return String(raced.id);
      }
      await audit(query, who, "drafting_job_created", {
        jobId,
        request,
        status: current.blockers.length ? "blocked_sources" : "brief_ready",
      });
      return jobId;
    }
    const [job] = (
      await query(
        "SELECT * FROM studio_drafting_jobs WHERE id=$1 AND owner_id=$2 FOR UPDATE",
        [action.id, who.id],
      )
    ).rows;
    if (!job) throw new AccessError("Drafting job not found.", 404);
    if (Number(job.revision) !== action.revision)
      throw new AccessError(
        "The drafting job changed. Reload its current revision.",
        409,
      );
    if (job.status === "cancelled") {
      if (action.action === "cancel") return String(job.id);
      throw new AccessError(
        "A cancelled drafting job cannot create or link output.",
        409,
      );
    }
    const request = requestSchema.parse(job.request);
    if (action.action === "cancel") {
      await query(
        "UPDATE studio_drafting_jobs SET status='cancelled',revision=revision+1,updated_at=now() WHERE id=$1",
        [job.id],
      );
      await audit(query, who, "drafting_job_cancelled", {
        jobId: job.id,
        revision: Number(job.revision) + 1,
      });
      return String(job.id);
    }
    const current = evidenceFor(
      request,
      await sourceEvidence(
        query,
        request.sourceIds,
        [request.objectiveId],
        true,
      ),
    );
    const pins = job.source_pins as DraftingSourcePin[],
      pinChanged =
        pins.length > 0 && canonical(pins) !== canonical(current.pins);
    const previousLinks = (
      await query(
        "SELECT question_id FROM studio_drafting_job_questions WHERE job_id=$1",
        [job.id],
      )
    ).rows.map((row) => String(row.question_id));
    if (action.action === "prepare") {
      if (previousLinks.length) {
        if (current.blockers.length || pinChanged)
          throw new AccessError(
            "This linked job preserves its original evidence. Create a new job for revised sources.",
            409,
          );
        return String(job.id);
      }
      if (current.blockers.length) {
        if (
          job.status !== "blocked_sources" ||
          canonical(job.blockers) !== canonical(current.blockers)
        ) {
          await query(
            "UPDATE studio_drafting_jobs SET status='blocked_sources',source_pins='[]',brief=NULL,prepared_at=NULL,blockers=$2::jsonb,revision=revision+1,updated_at=now() WHERE id=$1",
            [job.id, json(current.blockers)],
          );
          await audit(query, who, "drafting_job_blocked", {
            jobId: job.id,
            blockers: current.blockers,
          });
        }
        return String(job.id);
      }
      const brief = preparedBrief(request, current.pins);
      if (
        job.status === "awaiting_output" &&
        !pinChanged &&
        job.brief === brief
      )
        return String(job.id);
      await query(
        "UPDATE studio_drafting_jobs SET status='awaiting_output',source_pins=$2::jsonb,brief=$3,prepared_at=now(),blockers='[]',revision=revision+1,updated_at=now() WHERE id=$1",
        [job.id, json(current.pins), brief],
      );
      await audit(query, who, "drafting_job_brief_prepared", {
        jobId: job.id,
        sourcePins: current.pins,
        briefHash: createHash("sha256").update(brief).digest("hex"),
        modelRequestSent: false,
      });
      return String(job.id);
    }
    if (
      !["awaiting_output", "drafts_linked"].includes(String(job.status)) ||
      !job.brief ||
      !pins.length
    )
      throw new AccessError(
        "Prepare a source-supported metadata brief before linking imported drafts.",
        422,
      );
    if (current.blockers.length || pinChanged)
      throw new AccessError(
        "Research evidence changed. Recheck the current sources before linking any output.",
        409,
      );
    const additions = action.questionIds
      .filter((questionId) => !previousLinks.includes(questionId))
      .sort();
    if (!additions.length) return String(job.id);
    if (previousLinks.length + additions.length > request.count)
      throw new AccessError(
        "Linked drafts cannot exceed the requested question count.",
        422,
      );
    for (const questionId of additions) {
      const [row] = (
        await query(
          `SELECT c.*,r.id AS revision_id,r.data,w.status,
    EXISTS(SELECT 1 FROM studio_audit a WHERE a.content_id=c.id AND a.actor_id=$2 AND a.event='import_ingested') AS imported
    FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision
    JOIN studio_workflow w ON w.revision_id=r.id WHERE c.id=$1 FOR UPDATE OF c`,
          [questionId, who.id],
        )
      ).rows;
      if (!row || row.owner_id !== who.id || !row.imported)
        throw new AccessError(
          "Link only your actual Question Bank imports.",
          403,
        );
      const content = contentDraftSchema.parse(row.data);
      if (
        content.kind !== "question" ||
        content.origin !== "ai_generated" ||
        content.objectiveCode !== request.objectiveId ||
        content.certificationId !== "chst" ||
        content.contentKind !== "instructional" ||
        content.body.choices.length !== 4 ||
        row.status !== "draft"
      )
        throw new AccessError(
          "Each linked record must be an AI-generated, four-option instructional draft for this exact objective.",
          422,
        );
      const [already] = (
        await query(
          "SELECT job_id FROM studio_drafting_job_questions WHERE question_id=$1",
          [questionId],
        )
      ).rows;
      if (already)
        throw new AccessError(
          "This imported question already belongs to another drafting job.",
          409,
        );
      await query(
        "INSERT INTO studio_drafting_job_questions(job_id,question_id,revision_id,linked_by) VALUES($1,$2,$3,$4)",
        [job.id, questionId, row.revision_id, who.id],
      );
    }
    await query(
      "UPDATE studio_drafting_jobs SET status='drafts_linked',revision=revision+1,updated_at=now() WHERE id=$1",
      [job.id],
    );
    await audit(query, who, "drafting_job_imports_linked", {
      jobId: job.id,
      questionIds: additions,
      approved: 0,
      published: 0,
    });
    return String(job.id);
  });
  const rows = (
    await c.query(
      "SELECT * FROM studio_drafting_jobs WHERE id=$1 AND owner_id=$2",
      [id, who.id],
    )
  ).rows;
  return (await viewRows(c.query, rows))[0];
}
