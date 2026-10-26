import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { connection, type DatabaseQuery } from "@/db/client";
import { AccessError, type Actor } from "@/modules/identity/access";
import {
  requireEditorialIdentity,
  requireStudioAccess,
  requireStudioRole,
} from "@/modules/studio/roles";
import { getChstObjective } from "@/modules/curriculum/catalog";
import { allowedResearchUrl, normalizeResearchUrl } from "./scope";
import {
  researchActionSchema,
  researchCompletionSchema,
  researchQueuePolicySchema,
  researchSourceSchema,
  processedDocumentSchema,
  RESEARCH_UPLOAD_MAX_BYTES,
  type ResearchSourceInput,
  type ResearchSource,
  type ResearchStatus,
  type ResearchSnapshot,
  type ResearchClaim,
  type ResearchCompletion,
  type ProcessedResearchDocument,
} from "./model";

const iso = (value: unknown) => new Date(String(value)).toISOString();
const json = (value: unknown) => JSON.stringify(value);
async function administrator(who: Actor, query?: DatabaseQuery) {
  requireEditorialIdentity(who);
  const access = await requireStudioAccess(who, query);
  requireStudioRole(access, ["administrator"]);
  return access;
}
async function source(query: DatabaseQuery, id: string, lock = false) {
  const [row] = (
    await query(
      `SELECT * FROM research_sources WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
      [id],
    )
  ).rows;
  if (!row) throw new AccessError("Research source not found.", 404);
  return row;
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
function mappedSource(
  row: Record<string, unknown>,
  objectiveIds: string[],
): ResearchSource {
  const data = researchSourceSchema.parse(row.metadata);
  return {
    id: String(row.id),
    metadataRevision: Number(row.metadata_revision),
    metadataTitle: data.title,
    extractionComplete: Boolean(row.extraction_complete),
    parentId: row.parent_id ? String(row.parent_id) : null,
    originalUrl: data.originalUrl,
    resolvedUrl: row.resolved_url ? String(row.resolved_url) : null,
    publisher: data.publisher,
    title: row.document_title ? String(row.document_title) : data.title,
    publicationDate: data.publicationDate,
    format: row.format ? String(row.format) : null,
    access: data.access,
    license: data.license,
    classification: data.classification,
    licensedIdentifier: data.licensedIdentifier,
    rightsNotes: data.rightsNotes,
    status: String(row.effective_status || row.status) as ResearchStatus,
    parseStatus: String(row.parse_status),
    pageCount: row.page_count === null ? null : Number(row.page_count),
    pagesProcessed: row.pages_processed as number[],
    sectionsProcessed: Number(row.sections_processed),
    documentHash: row.document_hash ? String(row.document_hash) : null,
    error: row.error ? String(row.error) : null,
    updatedAt: iso(row.updated_at),
    retrievedAt: row.retrieved_at ? iso(row.retrieved_at) : null,
    objectiveIds,
  };
}

/** Private indexed text is available to administrators only. It is never joined
 * into public reference pages, learner DTOs or question-publication evidence. */
export async function researchSnapshot(
  who: Actor,
  filters: {
    search?: string;
    status?: string;
    page?: number;
    sourceId?: string;
  } = {},
): Promise<ResearchSnapshot> {
  const access = await administrator(who),
    c = await connection();
  const search = (filters.search || "").trim().slice(0, 200),
    status = filters.status || "all",
    page = Math.max(1, Math.min(10000, Math.floor(filters.page || 1)));
  const parameters = [search, status];
  const where =
    "WHERE ($1='' OR s.metadata->>'title' ILIKE '%'||$1||'%' OR s.metadata->>'publisher' ILIKE '%'||$1||'%' OR s.canonical_url ILIKE '%'||$1||'%' OR EXISTS(SELECT 1 FROM research_sections t WHERE t.source_id=s.id AND t.document_hash=s.document_hash AND(t.body ILIKE '%'||$1||'%' OR t.title ILIKE '%'||$1||'%'))) AND($2='all' OR s.status=$2)";
  const [totalRows, sourceRows, metricsRows, jobsRows, attemptRows] =
    await Promise.all([
      c.query(
        `SELECT count(*) AS total FROM research_sources s ${where}`,
        parameters,
      ),
      c.query(
        `SELECT s.*,CASE WHEN s.status='verified' AND NOT research_source_evidence_is_current(s.id) THEN 'requires_manual_review' ELSE s.status END AS effective_status FROM research_sources s ${where} ORDER BY s.updated_at DESC,s.id LIMIT 25 OFFSET $3`,
        [...parameters, (page - 1) * 25],
      ),
      c.query(
        "SELECT count(*) AS sources,count(*) FILTER(WHERE parse_status='parsed') AS parsed,count(*) FILTER(WHERE research_source_evidence_is_current(s.id)) AS verified,count(*) FILTER(WHERE status IN('restricted_access','paywalled')) AS restricted,count(*) FILTER(WHERE status='failed') AS failed,coalesce(sum(sections_processed),0) AS sections,(SELECT count(*) FROM research_jobs WHERE state IN('queued','running','retry')) AS pending_jobs FROM research_sources s",
      ),
      c.query(
        "SELECT id,source_id,state,attempts,next_attempt_at,lease_until,error FROM research_jobs ORDER BY created_at DESC,id LIMIT 100",
      ),
      c.query(
        "SELECT * FROM research_attempts ORDER BY event_number DESC LIMIT 100",
      ),
    ]);
  const ids = filters.sourceId
    ? [filters.sourceId]
    : sourceRows.rows.map((r) => String(r.id));
  const [sections, links] = ids.length
    ? await Promise.all([
        c.query(
          "SELECT t.*,research_section_review_is_current(t.id,s.document_hash,s.metadata) AS manually_resolved,(length(trim(t.body))=0 OR(t.needs_manual_review AND NOT research_section_review_is_current(t.id,s.document_hash,s.metadata))) AS effective_manual_review FROM research_sections t JOIN research_sources s ON s.id=t.source_id AND s.document_hash=t.document_hash WHERE t.source_id=ANY($1::text[]) AND($2='' OR t.body ILIKE '%'||$2||'%' OR t.title ILIKE '%'||$2||'%') ORDER BY t.source_id,t.page_number NULLS FIRST,t.locator LIMIT 100",
          [ids, search],
        ),
        c.query(
          "SELECT source_id,objective_id FROM research_objective_links WHERE source_id=ANY($1::text[])",
          [ids],
        ),
      ])
    : [{ rows: [] }, { rows: [] }];
  const metrics = metricsRows.rows[0],
    total = Number(totalRows.rows[0]?.total || 0);
  return {
    access,
    sources: sourceRows.rows.map((row) =>
      mappedSource(row, [
        ...new Set(
          links.rows
            .filter((link) => link.source_id === row.id)
            .map((link) => String(link.objective_id)),
        ),
      ]),
    ),
    sections: sections.rows.map((row) => ({
      id: String(row.id),
      sourceId: String(row.source_id),
      locator: String(row.locator),
      title: String(row.title),
      text: String(row.body),
      page: row.page_number === null ? null : Number(row.page_number),
      needsManualReview: Boolean(row.needs_manual_review),
      manualReviewResolved: Boolean(row.manually_resolved),
      effectiveNeedsManualReview: Boolean(row.effective_manual_review),
      notes: row.notes as string[],
    })),
    jobs: jobsRows.rows.map((row) => ({
      id: String(row.id),
      sourceId: String(row.source_id),
      state: String(row.state),
      attempts: Number(row.attempts),
      nextAttemptAt: iso(row.next_attempt_at),
      leaseUntil: row.lease_until ? iso(row.lease_until) : null,
      error: row.error ? String(row.error) : null,
    })),
    attempts: attemptRows.rows.map((row) => {
      const data = row.data as Record<string, unknown>;
      return {
        id: String(row.id),
        sourceId: String(row.source_id),
        attemptedAt:
          typeof data.attemptedAt === "string"
            ? data.attemptedAt
            : iso(row.attempted_at),
        httpStatus:
          typeof data.httpStatus === "number" ? data.httpStatus : null,
        proxyStatus:
          typeof data.proxyStatus === "number" ? data.proxyStatus : null,
        resolvedUrl:
          typeof data.resolvedUrl === "string" ? data.resolvedUrl : null,
        error: typeof data.error === "string" ? data.error : null,
        kind: String(data.kind || "network"),
        ...(Array.isArray(data.requests)
          ? {
              requests:
                data.requests as ResearchSnapshot["attempts"][number]["requests"],
            }
          : {}),
        documentHash:
          typeof data.documentHash === "string" ? data.documentHash : null,
      };
    }),
    pagination: { page, pages: Math.max(1, Math.ceil(total / 25)), total },
    metrics: {
      sources: Number(metrics.sources),
      parsed: Number(metrics.parsed),
      verified: Number(metrics.verified),
      restricted: Number(metrics.restricted),
      failed: Number(metrics.failed),
      sections: Number(metrics.sections),
      pendingJobs: Number(metrics.pending_jobs),
    },
  };
}

async function register(
  query: DatabaseQuery,
  who: Actor,
  input: ResearchSourceInput,
) {
  const canonical = input.originalUrl
    ? normalizeResearchUrl(input.originalUrl)
    : null;
  const identity =
    canonical ||
    `${input.access}:${input.licensedIdentifier}:${input.publisher}:${input.title}`;
  const id = `source-${createHash("sha256").update(identity).digest("hex").slice(0, 32)}`;
  if (input.parentId) await source(query, input.parentId);
  await query(
    "INSERT INTO research_sources(id,parent_id,canonical_url,metadata,created_by) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING",
    [id, input.parentId || null, canonical, json(input), who.id],
  );
  return source(query, id);
}
export async function registerResearchSources(who: Actor, inputs: unknown[]) {
  await administrator(who);
  const records = z.array(researchSourceSchema).min(1).max(250).parse(inputs),
    c = await connection();
  return c.transaction(async (query) => {
    await administrator(who, query);
    const rows = [];
    for (const record of records) rows.push(await register(query, who, record));
    await audit(query, who, "research_sources_registered", {
      count: records.length,
    });
    return rows.map((row) => mappedSource(row, []));
  });
}
async function enqueue(
  query: DatabaseQuery,
  who: Actor,
  sourceId: string,
  options: {
    runKey?: string;
    maxDepth?: number;
    maxDocuments?: number;
    delayMs?: number;
  } = {},
) {
  const row = await source(query, sourceId, true),
    data = researchSourceSchema.parse(row.metadata);
  if (!data.originalUrl || !allowedResearchUrl(data.originalUrl))
    throw new AccessError(
      "This source requires an authorized manual import rather than network retrieval.",
      422,
    );
  if (data.access === "licensed_reference")
    throw new AccessError(
      "Licensed sources require manual authorized import. The crawler never enters paid or authenticated sources.",
      422,
    );
  const [active] = (
    await query(
      "SELECT id FROM research_jobs WHERE source_id=$1 AND state IN('queued','running','retry') ORDER BY created_at DESC LIMIT 1",
      [sourceId],
    )
  ).rows;
  if (active) return String(active.id);
  const runKey = options.runKey || "initial",
    policy = researchQueuePolicySchema.parse({
      maxDepth: options.maxDepth,
      maxDocuments: options.maxDocuments,
      delayMs: options.delayMs,
    });
  const id = randomUUID();
  const result = await query(
    "INSERT INTO research_jobs(id,source_id,run_key,root_id,depth,policy,created_by) VALUES($1,$2,$3,$2,0,$4::jsonb,$5) ON CONFLICT(source_id,run_key) DO NOTHING RETURNING id",
    [id, sourceId, runKey, json(policy), who.id],
  );
  if (result.rows.length) {
    await query(
      "UPDATE research_sources SET status='queued',updated_at=now() WHERE id=$1",
      [sourceId],
    );
    await audit(query, who, "research_source_queued", {
      sourceId,
      jobId: id,
      runKey,
    });
    return id;
  }
  return String(
    (
      await query(
        "SELECT id FROM research_jobs WHERE source_id=$1 AND run_key=$2",
        [sourceId, runKey],
      )
    ).rows[0].id,
  );
}
export async function enqueueResearchSource(
  who: Actor,
  sourceId: string,
  options: {
    runKey?: string;
    maxDepth?: number;
    maxDocuments?: number;
    delayMs?: number;
  } = {},
) {
  await administrator(who);
  return (await connection()).transaction(async (query) => {
    await administrator(who, query);
    return enqueue(query, who, sourceId, options);
  });
}

/** Trusted worker operation, never exposed through an API action. A fresh token
 * is issued on each lease so a resumed worker cannot overwrite a recovered job. */
export async function claimResearchJob(
  who: Actor,
  workerId: string,
  { leaseSeconds = 120 }: { leaseSeconds?: number } = {},
): Promise<ResearchClaim | null> {
  await administrator(who);
  if (
    !workerId.trim() ||
    workerId.length > 200 ||
    !Number.isInteger(leaseSeconds) ||
    leaseSeconds < 5 ||
    leaseSeconds > 900
  )
    throw new AccessError("Invalid research worker lease.", 400);
  return (await connection()).transaction(async (query) => {
    await administrator(who, query);
    const expired = await query(
      "UPDATE research_jobs SET state=CASE WHEN attempts>=3 THEN 'blocked' ELSE 'retry' END,lease_token=NULL,lease_owner=NULL,lease_until=NULL,error='Worker lease expired; prior worker lost its write capability.',next_attempt_at=now(),updated_at=now() WHERE state='running' AND lease_until<=now() RETURNING id,source_id,state",
    );
    for (const recovered of expired.rows) {
      await query(
        "UPDATE research_sources SET status=$2,error=$3,updated_at=now() WHERE id=$1 AND document_hash IS NULL",
        [
          recovered.source_id,
          recovered.state === "blocked" ? "failed" : "queued",
          "Worker lease expired; recovery was recorded without claiming a network request.",
        ],
      );
      await audit(query, who, "research_worker_lease_recovered", {
        jobId: recovered.id,
        sourceId: recovered.source_id,
        state: recovered.state,
      });
    }
    const [job] = (
      await query(
        "SELECT * FROM research_jobs WHERE state IN('queued','retry') AND next_attempt_at<=now() AND attempts<3 ORDER BY next_attempt_at,created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED",
      )
    ).rows;
    if (!job) return null;
    const row = await source(query, String(job.source_id)),
      data = researchSourceSchema.parse(row.metadata);
    if (
      !data.originalUrl ||
      !allowedResearchUrl(data.originalUrl) ||
      data.access === "licensed_reference"
    ) {
      await query(
        "UPDATE research_jobs SET state='blocked',error='Network scope or licensing prevents retrieval.',updated_at=now() WHERE id=$1",
        [job.id],
      );
      return null;
    }
    const leaseToken = randomUUID();
    await query(
      "UPDATE research_jobs SET state='running',attempts=attempts+1,lease_token=$2,lease_owner=$3,lease_until=now()+($4::integer*interval '1 second'),updated_at=now() WHERE id=$1",
      [job.id, leaseToken, workerId, leaseSeconds],
    );
    return {
      access: data.access,
      license: data.license,
      classification: data.classification,
      jobId: String(job.id),
      sourceId: String(job.source_id),
      url: data.originalUrl,
      depth: Number(job.depth),
      leaseToken,
      attemptNumber: Number(job.attempts) + 1,
      etag: row.document_hash && row.etag ? String(row.etag) : null,
      lastModified:
        row.document_hash && row.last_modified
          ? String(row.last_modified)
          : null,
      policy: researchQueuePolicySchema.parse(job.policy),
    };
  });
}

async function persistDocument(
  query: DatabaseQuery,
  sourceId: string,
  document: ProcessedResearchDocument,
) {
  if (Buffer.byteLength(json(document), "utf8") > 8_000_000)
    throw new AccessError(
      "Extracted document is too large; split it into traceable sections.",
      413,
    );
  const row = await source(query, sourceId, true);
  const extractionComplete =
    document.sections.length > 0 &&
    document.sections.every((section) => Boolean(section.text.trim())) &&
    (document.format !== "pdf" ||
      (document.pageCount !== null &&
        document.pagesProcessed.length === document.pageCount)) &&
    ![
      ...document.warnings,
      ...document.sections.flatMap((section) => section.notes),
    ].some((note) =>
      /text exceeded|section cap reached|pages remain unprocessed|time budget reached|not counted as fully extracted|extraction failed|no meaningful article text|truncated/i.test(
        note,
      ),
    );
  const [priorProof] = (
    await query("SELECT research_source_evidence_is_current($1) AS valid", [
      sourceId,
    ])
  ).rows;
  for (const section of document.sections) {
    const id = `section-${createHash("sha256").update(`${sourceId}:${document.contentHash}:${section.locator}`).digest("hex").slice(0, 40)}`;
    const [existing] = (
      await query("SELECT * FROM research_sections WHERE id=$1", [id])
    ).rows;
    if (
      existing &&
      (existing.body !== section.text ||
        existing.title !== section.title ||
        Boolean(existing.needs_manual_review) !== section.needsManualReview ||
        existing.page_number !== section.page)
    )
      throw new AccessError(
        "The same document bytes produced different section extraction. Existing evidence was preserved; manual reconciliation is required.",
        409,
      );
    await query(
      "INSERT INTO research_sections(id,source_id,document_hash,locator,title,body,page_number,needs_manual_review,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT DO NOTHING",
      [
        id,
        sourceId,
        document.contentHash,
        section.locator,
        section.title,
        section.text,
        section.page,
        section.needsManualReview,
        json(section.notes),
      ],
    );
  }
  const previousVerified =
    row.document_hash === document.contentHash &&
    Boolean(priorProof.valid) &&
    extractionComplete;
  await query(
    "UPDATE research_sources SET document_hash=$2,document_title=$3,format=$4,parse_status=$5,status=$6,page_count=$7,pages_processed=$8::jsonb,sections_processed=$9,error=$10,extraction_complete=$11,retrieved_at=now(),updated_at=now() WHERE id=$1",
    [
      sourceId,
      document.contentHash,
      document.title,
      document.format,
      document.status,
      previousVerified ? "verified" : document.status,
      document.pageCount,
      json(document.pagesProcessed),
      document.sections.length,
      document.warnings.length
        ? document.warnings.join(" ").slice(0, 5000)
        : null,
      extractionComplete,
    ],
  );
  return (previousVerified ? "verified" : document.status) as ResearchStatus;
}

/** Only actually parsed bytes create sections. HTTP status alone does not count
 * as processing and can never establish human technical verification. */
export async function completeResearchJob(
  who: Actor,
  jobId: string,
  leaseToken: string,
  input: ResearchCompletion,
) {
  await administrator(who);
  const result = researchCompletionSchema.parse(input),
    c = await connection();
  return c.transaction(async (query) => {
    await administrator(who, query);
    const [job] = (
      await query(
        "SELECT *,lease_until>now() AS lease_valid FROM research_jobs WHERE id=$1 FOR UPDATE",
        [jobId],
      )
    ).rows;
    if (
      !job ||
      job.state !== "running" ||
      job.lease_token !== leaseToken ||
      !job.lease_valid
    )
      throw new AccessError(
        "Research lease expired or was replaced. Reclaim the job before writing.",
        409,
      );
    const row = await source(query, String(job.source_id), true),
      sourceId = String(row.id);
    if (result.resolvedUrl && !allowedResearchUrl(result.resolvedUrl))
      throw new AccessError(
        "Resolved source leaves the configured research scope.",
        422,
      );
    if (
      result.document &&
      (result.httpStatus !== 200 ||
        result.restricted ||
        result.paywalled ||
        result.proxyStatus !== null)
    )
      throw new AccessError(
        "A failed or restricted retrieval cannot contain a parsed document.",
        422,
      );
    if (result.notModified && (result.httpStatus !== 304 || !row.document_hash))
      throw new AccessError(
        "Not-modified requires a prior actual document and an HTTP 304 response.",
        422,
      );
    const transient =
      !result.restricted &&
      !result.paywalled &&
      result.httpStatus !== 403 &&
      result.proxyStatus !== 403 &&
      (result.retryAfterSeconds !== undefined ||
        [408, 429, 500, 502, 503, 504].includes(result.httpStatus || 0));
    const retry = transient && Number(job.attempts) < 3;
    let status: ResearchStatus;
    if (result.notModified) {
      const [review] = (
        await query(
          "SELECT r.decision,r.metadata_snapshot=$3::jsonb AS metadata_matches,EXISTS(SELECT 1 FROM editorial_roles e WHERE e.subject_id=r.reviewer_id AND e.role='administrator') AS authorized,NOT EXISTS(SELECT 1 FROM research_sections t WHERE t.source_id=$1 AND t.document_hash=$2 AND(length(trim(t.body))=0 OR(t.needs_manual_review AND NOT research_section_review_is_current(t.id,$2,$3::jsonb)))) AS sections_resolved FROM research_source_reviews r WHERE source_id=$1 AND document_hash=$2 ORDER BY event_number DESC LIMIT 1",
          [sourceId, row.document_hash, json(row.metadata)],
        )
      ).rows;
      status =
        review?.decision === "verified" &&
        Boolean(review.metadata_matches) &&
        review.authorized &&
        Boolean(row.extraction_complete) &&
        Boolean(review.sections_resolved)
          ? "verified"
          : ["parsed", "partially_parsed", "requires_manual_review"].includes(
                String(row.parse_status),
              )
            ? (String(row.parse_status) as ResearchStatus)
            : "retrieved";
    } else if (result.document) status = result.document.status;
    else if (result.paywalled) status = "paywalled";
    else if (
      result.restricted ||
      result.httpStatus === 401 ||
      result.httpStatus === 403 ||
      result.proxyStatus === 403
    )
      status = "restricted_access";
    else if (result.httpStatus === 404) status = "not_found";
    else if (result.httpStatus === 200) status = "retrieved";
    else status = "failed";
    await query(
      "INSERT INTO research_attempts(id,source_id,job_id,actor_id,attempted_at,data) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
      [
        randomUUID(),
        sourceId,
        jobId,
        who.id,
        result.attemptedAt,
        json({
          ...result,
          document: result.document
            ? {
                title: result.document.title,
                format: result.document.format,
                status: result.document.status,
                contentHash: result.document.contentHash,
                pageCount: result.document.pageCount,
                pagesProcessed: result.document.pagesProcessed,
                sectionsProcessed: result.document.sections.length,
                warnings: result.document.warnings,
              }
            : undefined,
          kind: "network",
          documentHash: result.document?.contentHash || null,
        }),
      ],
    );
    if (result.document)
      status = await persistDocument(query, sourceId, result.document);
    // A newly retrieved body without extraction does not prove that an older
    // index still represents the current document. Preserve old section rows,
    // but stop exposing them as current evidence or sending mismatched validators.
    if (result.httpStatus === 200 && !result.document)
      await query(
        "UPDATE research_sources SET document_hash=NULL,document_title=NULL,parse_status='not_processed',extraction_complete=false,page_count=NULL,pages_processed='[]'::jsonb,sections_processed=0,etag=NULL,last_modified=NULL WHERE id=$1",
        [sourceId],
      );
    await query(
      "UPDATE research_sources SET status=$2,resolved_url=coalesce($3,resolved_url),etag=CASE WHEN $7 THEN $4 ELSE etag END,last_modified=CASE WHEN $7 THEN $5 ELSE last_modified END,error=$6,updated_at=now() WHERE id=$1",
      [
        sourceId,
        status,
        result.resolvedUrl || null,
        result.etag || (result.notModified ? row.etag : null) || null,
        result.lastModified ||
          (result.notModified ? row.last_modified : null) ||
          null,
        result.error,
        Boolean(result.document || result.notModified),
      ],
    );
    const delay =
        result.retryAfterSeconds ||
        Math.min(300, 15 * 2 ** (Number(job.attempts) - 1)),
      next = new Date(Date.now() + delay * 1000).toISOString();
    const terminalState =
      result.document || result.notModified
        ? "complete"
        : retry
          ? "retry"
          : "blocked";
    await query(
      "UPDATE research_jobs SET state=$2,lease_token=NULL,lease_owner=NULL,lease_until=NULL,next_attempt_at=$3,error=$4,updated_at=now() WHERE id=$1",
      [jobId, terminalState, next, result.error],
    );
    let childrenQueued = 0;
    const policy = researchQueuePolicySchema.parse(job.policy),
      sourceMetadata = researchSourceSchema.parse(row.metadata);
    if (result.document && Number(job.depth) < policy.maxDepth) {
      const [count] = (
        await query(
          "SELECT count(*) AS total FROM research_jobs WHERE root_id=$1 AND run_key=$2",
          [job.root_id, job.run_key],
        )
      ).rows;
      let remaining = Math.max(0, policy.maxDocuments - Number(count.total));
      for (const link of result.document.links) {
        if (!remaining) break;
        if (
          !allowedResearchUrl(link.url) ||
          !/chst|blueprint|reference|construction|hazard|safety|health|1926|1910|silica|excavat|trench|fall|crane|rigg|scaffold|respirat|noise|ergonom|incident|emergency/i.test(
            `${link.url} ${link.label}`,
          )
        )
          continue;
        const child = await register(query, who, {
          ...sourceMetadata,
          access: "public_link",
          license: "unknown",
          classification: "unclassified",
          licensedIdentifier: "",
          originalUrl: normalizeResearchUrl(link.url),
          parentId: sourceId,
          title: link.label.trim().slice(0, 500) || link.url,
          publisher: `Unconfirmed publisher (${new URL(link.url).hostname})`,
          publicationDate: null,
          rightsNotes:
            "Discovered supporting link; relevance is provisional and access/licensing require examination.",
        });
        const inserted = await query(
          "INSERT INTO research_jobs(id,source_id,run_key,root_id,depth,policy,created_by,next_attempt_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8) ON CONFLICT(source_id,run_key) DO NOTHING RETURNING id",
          [
            randomUUID(),
            child.id,
            job.run_key,
            job.root_id,
            Number(job.depth) + 1,
            json(policy),
            who.id,
            new Date(Date.now() + policy.delayMs).toISOString(),
          ],
        );
        if (inserted.rows.length) {
          remaining--;
          childrenQueued++;
          await query(
            "UPDATE research_sources SET status='queued',updated_at=now() WHERE id=$1 AND status='discovered'",
            [child.id],
          );
        }
      }
    }
    return { sourceId, status, childrenQueued };
  });
}

/** Actual browser/manual bytes, parsed server-side, are stored only after an
 * explicit lawful-use attestation. No raw document is exposed by a public URL. */
export async function importResearchDocument(
  who: Actor,
  sourceId: string,
  bytes: Uint8Array,
  options: { format: "html" | "pdf" | "text"; rightsAttestation: true },
) {
  await administrator(who);
  if (
    options.rightsAttestation !== true ||
    bytes.byteLength > RESEARCH_UPLOAD_MAX_BYTES ||
    !bytes.byteLength
  )
    throw new AccessError(
      "A lawful-use attestation and a document up to 5 MB are required.",
      422,
    );
  const { processDocument } = await import("./processing");
  const document = processedDocumentSchema.parse(
    await processDocument(bytes, { format: options.format }),
  );
  const c = await connection();
  return c.transaction(async (query) => {
    await administrator(who, query);
    await source(query, sourceId, true);
    const status = await persistDocument(query, sourceId, document);
    await query(
      "INSERT INTO research_attempts(id,source_id,actor_id,attempted_at,data) VALUES($1,$2,$3,now(),$4::jsonb)",
      [
        randomUUID(),
        sourceId,
        who.id,
        json({
          kind: "manual_import",
          httpStatus: null,
          proxyStatus: null,
          rightsAttestation: true,
          documentHash: document.contentHash,
          format: document.format,
          pageCount: document.pageCount,
          pagesProcessed: document.pagesProcessed,
          sectionsProcessed: document.sections.length,
          warnings: document.warnings,
        }),
      ],
    );
    await audit(query, who, "research_document_imported", {
      sourceId,
      contentHash: document.contentHash,
      sections: document.sections.length,
    });
    return {
      sourceId,
      documentHash: document.contentHash,
      status,
    };
  });
}

export async function researchAction(
  who: Actor,
  input: unknown,
): Promise<ResearchSnapshot> {
  await administrator(who);
  const action = researchActionSchema.parse(input);
  if (action.action === "register")
    await registerResearchSources(who, [action.source]);
  else if (action.action === "update_metadata")
    await (
      await connection()
    ).transaction(async (query) => {
      await administrator(who, query);
      const row = await source(query, action.sourceId, true);
      if (Number(row.metadata_revision) !== action.expectedRevision)
        throw new AccessError(
          "Research metadata changed. Reload before editing.",
          409,
        );
      const previous = researchSourceSchema.parse(row.metadata);
      if (
        action.source.originalUrl !== previous.originalUrl ||
        (action.source.parentId || null) !== (previous.parentId || null)
      )
        throw new AccessError(
          "Preserve the original source URL and parent identity when correcting metadata.",
          422,
        );
      await query(
        "UPDATE research_sources SET metadata=$2::jsonb,metadata_revision=metadata_revision+1,status=CASE WHEN document_hash IS NULL THEN 'discovered' WHEN parse_status='parsed' THEN 'parsed' ELSE 'requires_manual_review' END,updated_at=now() WHERE id=$1",
        [action.sourceId, json(action.source)],
      );
      await audit(query, who, "research_source_metadata_updated", {
        sourceId: action.sourceId,
        before: previous,
        after: action.source,
        verificationReset: true,
      });
    });
  else if (action.action === "enqueue")
    await enqueueResearchSource(who, action.sourceId, {
      runKey: action.runKey,
      maxDepth: action.maxDepth,
      maxDocuments: action.maxDocuments,
      delayMs: action.delayMs,
    });
  else if (action.action === "import_document")
    await importResearchDocument(
      who,
      action.sourceId,
      new TextEncoder().encode(action.content),
      { format: action.format, rightsAttestation: action.rightsAttestation },
    );
  else
    await (
      await connection()
    ).transaction(async (query) => {
      await administrator(who, query);
      const row = await source(query, action.sourceId, true);
      if (action.action === "review_section") {
        if (row.document_hash !== action.documentHash)
          throw new AccessError(
            "The document changed. Review the current source checksum before resolving a section.",
            409,
          );
        const [section] = (
          await query(
            "SELECT * FROM research_sections WHERE id=$1 AND source_id=$2 AND document_hash=$3",
            [action.sectionId, action.sourceId, action.documentHash],
          )
        ).rows;
        if (!section)
          throw new AccessError(
            "This section is not part of the current source document.",
            422,
          );
        if (action.decision === "resolved" && !String(section.body).trim())
          throw new AccessError(
            "An empty or unreadable section needs actual new text extraction before it can be resolved.",
            422,
          );
        await query(
          "INSERT INTO research_section_reviews(id,source_id,section_id,document_hash,metadata_snapshot,reviewer_id,decision,notes,human_attestation) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,true)",
          [
            randomUUID(),
            action.sourceId,
            action.sectionId,
            action.documentHash,
            json(row.metadata),
            who.id,
            action.decision,
            action.notes,
          ],
        );
        await query(
          "UPDATE research_sources SET status=CASE WHEN status='verified' THEN 'requires_manual_review' ELSE status END,updated_at=now() WHERE id=$1",
          [action.sourceId],
        );
        await audit(query, who, "research_section_reviewed", {
          sourceId: action.sourceId,
          sectionId: action.sectionId,
          documentHash: action.documentHash,
          decision: action.decision,
        });
      } else if (action.action === "link") {
        if (!getChstObjective(action.objectiveId))
          throw new AccessError(
            "Select an exact statement from the supplied CHST5 blueprint.",
            422,
          );
        if (action.sectionId) {
          const [section] = (
            await query(
              "SELECT id FROM research_sections WHERE id=$1 AND source_id=$2 AND document_hash=$3",
              [action.sectionId, action.sourceId, row.document_hash],
            )
          ).rows;
          if (!section)
            throw new AccessError(
              "The source section is missing or belongs to an older document revision.",
              422,
            );
        }
        if (action.relationKind !== "candidate" && !action.sectionId)
          throw new AccessError(
            "Supporting or conflicting evidence needs an exact processed section.",
            422,
          );
        await query(
          "INSERT INTO research_objective_links(id,source_id,objective_id,section_id,relation_kind,notes,created_by) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE NOT EXISTS(SELECT 1 FROM research_objective_links WHERE source_id=$2 AND objective_id=$3 AND section_id IS NOT DISTINCT FROM $4 AND relation_kind=$5)",
          [
            randomUUID(),
            action.sourceId,
            action.objectiveId,
            action.sectionId || null,
            action.relationKind,
            action.notes,
            who.id,
          ],
        );
        await audit(query, who, "research_objective_linked", {
          sourceId: action.sourceId,
          objectiveId: action.objectiveId,
          relationKind: action.relationKind,
        });
      } else {
        if (row.document_hash !== action.documentHash)
          throw new AccessError(
            "The processed document changed. Review the current checksum before attesting.",
            409,
          );
        if (action.decision === "verified") {
          if (
            researchSourceSchema.parse(row.metadata).classification ===
            "unclassified"
          )
            throw new AccessError(
              "Classify the actual source before verifying its contents.",
              422,
            );
          const [flagged] = (
            await query(
              "SELECT count(*) AS total FROM research_sections t WHERE source_id=$1 AND document_hash=$2 AND(length(trim(body))=0 OR(needs_manual_review AND NOT research_section_review_is_current(t.id,$2,$3::jsonb)))",
              [action.sourceId, action.documentHash, json(row.metadata)],
            )
          ).rows;
          if (
            !row.extraction_complete ||
            !Number(row.sections_processed) ||
            Number(flagged.total)
          )
            throw new AccessError(
              "Complete the actual document extraction and resolve every current manual-review section before source verification.",
              422,
            );
        }
        await query(
          "INSERT INTO research_source_reviews(id,source_id,document_hash,reviewer_id,decision,findings,human_attestation,metadata_snapshot) VALUES($1,$2,$3,$4,$5,$6,true,$7::jsonb)",
          [
            randomUUID(),
            action.sourceId,
            action.documentHash,
            who.id,
            action.decision,
            action.findings,
            json(row.metadata),
          ],
        );
        await query(
          "UPDATE research_sources SET status=$2,updated_at=now() WHERE id=$1",
          [
            action.sourceId,
            action.decision === "verified"
              ? "verified"
              : "requires_manual_review",
          ],
        );
        await audit(query, who, "research_source_reviewed", {
          sourceId: action.sourceId,
          documentHash: action.documentHash,
          decision: action.decision,
        });
      }
    });
  return researchSnapshot(who);
}

export async function researchEvidenceForObjectives(who: Actor) {
  await administrator(who);
  const rows = (
    await (
      await connection()
    )
      .query(`SELECT l.*,s.metadata,s.document_title,s.document_hash,s.parse_status,s.status,t.locator,t.needs_manual_review,t.document_hash AS section_hash,
 (length(trim(t.body))=0 OR(t.needs_manual_review AND NOT research_section_review_is_current(t.id,s.document_hash,s.metadata))) AS effective_manual_review,
  research_source_evidence_is_current(s.id) AS reviewed
  FROM research_objective_links l JOIN research_sources s ON s.id=l.source_id LEFT JOIN research_sections t ON t.id=l.section_id ORDER BY l.objective_id,l.created_at,l.id`)
  ).rows;
  return rows.map((row) => ({
    objectiveId: String(row.objective_id),
    sourceId: String(row.source_id),
    sectionId: row.section_id ? String(row.section_id) : null,
    currentDocument: !row.section_id || row.section_hash === row.document_hash,
    relationKind: String(row.relation_kind) as
      "candidate" | "supports" | "conflicts",
    sourceTitle: String(
      row.document_title || (row.metadata as ResearchSourceInput).title,
    ),
    classification: String(
      (row.metadata as ResearchSourceInput).classification,
    ),
    locator: row.locator ? String(row.locator) : "",
    verified:
      Boolean(row.reviewed) &&
      row.status === "verified" &&
      row.relation_kind === "supports" &&
      Boolean(row.section_id) &&
      row.section_hash === row.document_hash &&
      !row.effective_manual_review,
    notes: String(row.notes),
  }));
}

/** Trusted operator import of an existing access audit. This does not execute a
 * new request or assert extraction; original observation timestamps and proxy
 * versus target statuses remain explicit. It is not an HTTP API action. */
export async function importRecordedResearchAttempt(
  who: Actor,
  sourceId: string,
  input: Pick<
    ResearchCompletion,
    "attemptedAt" | "httpStatus" | "proxyStatus" | "error"
  > &
    Partial<
      Omit<
        ResearchCompletion,
        "attemptedAt" | "httpStatus" | "proxyStatus" | "error" | "document"
      >
    >,
) {
  await administrator(who);
  const parsed = researchCompletionSchema
    .omit({ document: true })
    .strict()
    .parse({ redirects: [], ...input });
  const id = `recorded-${createHash("sha256")
    .update(`${sourceId}:${json(parsed)}`)
    .digest("hex")}`;
  return (await connection()).transaction(async (query) => {
    await administrator(who, query);
    const row = await source(query, sourceId, true);
    const [latest] = (
      await query(
        "SELECT max(attempted_at) AS attempted_at FROM research_attempts WHERE source_id=$1",
        [sourceId],
      )
    ).rows;
    const inserted = await query(
      "INSERT INTO research_attempts(id,source_id,actor_id,attempted_at,data) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING RETURNING id",
      [
        id,
        sourceId,
        who.id,
        parsed.attemptedAt,
        json({
          ...parsed,
          kind: "operator_recorded_access_audit",
          provenance:
            "Imported prior operator observation; no request was executed by this database import.",
        }),
      ],
    );
    if (inserted.rows.length) {
      const [active] = (
        await query(
          "SELECT id FROM research_jobs WHERE source_id=$1 AND state IN('queued','running','retry') LIMIT 1",
          [sourceId],
        )
      ).rows;
      if (
        !row.document_hash &&
        !active &&
        (!latest.attempted_at ||
          Date.parse(iso(latest.attempted_at)) <=
            Date.parse(parsed.attemptedAt))
      ) {
        const status: ResearchStatus = parsed.paywalled
          ? "paywalled"
          : parsed.restricted ||
              parsed.httpStatus === 401 ||
              parsed.httpStatus === 403 ||
              parsed.proxyStatus === 403
            ? "restricted_access"
            : parsed.httpStatus === 404
              ? "not_found"
              : parsed.httpStatus === 200
                ? "retrieved"
                : "failed";
        await query(
          "UPDATE research_sources SET status=$2,error=$3,resolved_url=coalesce($4,resolved_url),updated_at=now() WHERE id=$1",
          [sourceId, status, parsed.error, parsed.resolvedUrl || null],
        );
      }
      await audit(query, who, "research_prior_access_audit_imported", {
        sourceId,
        attemptId: id,
        originalAttemptedAt: parsed.attemptedAt,
      });
    }
    return { sourceId, attemptId: id, imported: Boolean(inserted.rows.length) };
  });
}
