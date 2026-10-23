import "server-only";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { connection, type DatabaseQuery } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { AccessError, type Actor } from "@/modules/identity/access";
import {
  contentDraftSchema,
  studioActionSchema,
  type BlueprintSummary,
  type ContentDraft,
  type ImportPreview,
  type SourceCheck,
  type SourceVerification,
  type SourceVerificationCheck,
  type StudioAccess,
  type StudioItem,
  type StudioReview,
  type StudioSnapshot,
  type StudioStatus,
} from "./model";
import { requireStudioAccess, requireStudioRole } from "./roles";
export { requireStudioAccess } from "./roles";

type Row = Record<string, unknown>;
const iso = (value: unknown) =>
  value instanceof Date ? value.toISOString() : String(value);
function json(value: unknown) {
  return JSON.stringify(value);
}
const headQuery = `SELECT c.id,c.kind,c.owner_id,c.current_revision,c.row_version AS content_row_version,r.id AS revision_id,r.author_id,r.data,w.status,w.row_version,p.revision_id AS published_revision_id FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision JOIN studio_workflow w ON w.revision_id=r.id LEFT JOIN studio_publications p ON p.content_id=c.id`;
function canRead(access: StudioAccess, row: Row) {
  return (
    row.owner_id === access.actorId ||
    access.roles.includes("reviewer") ||
    access.roles.includes("administrator")
  );
}
async function head(
  query: DatabaseQuery,
  access: StudioAccess,
  id: string,
  lock = false,
) {
  const [row] = (
    await query(
      `${headQuery} WHERE c.id=$1${lock ? " FOR UPDATE OF c,w" : ""}`,
      [id],
    )
  ).rows;
  if (!row || !canRead(access, row))
    throw new AccessError("Content not found.", 404);
  return row;
}
function expectRevision(
  row: Row,
  input: { revision: number; rowVersion: number },
) {
  if (
    Number(row.current_revision) !== input.revision ||
    Number(row.row_version) !== input.rowVersion
  )
    throw new AccessError(
      "Content changed in another tab or a newer revision exists. Reload before continuing.",
      409,
    );
}
async function audit(
  query: DatabaseQuery,
  actorId: string,
  event: string,
  contentId: string | null,
  revisionId: string | null,
  data: Record<string, unknown> = {},
) {
  await query(
    "INSERT INTO studio_audit(content_id,revision_id,actor_id,event,data) VALUES($1,$2,$3,$4,$5::jsonb)",
    [contentId, revisionId, actorId, event, json(data)],
  );
}
export async function blueprintSummaries(
  query: DatabaseQuery,
): Promise<BlueprintSummary[]> {
  const rows = (
    await query(
      "SELECT b.*,coalesce(r.objectives,(SELECT jsonb_agg(jsonb_build_object('code',o.id,'domain',o.domain,'title',o.statement) ORDER BY o.domain,o.kind,o.official_number) FROM curriculum_objectives o WHERE o.blueprint_revision_id=b.id)) AS objectives FROM blueprint_revisions b LEFT JOIN LATERAL (SELECT objectives FROM studio_blueprint_reviews WHERE blueprint_revision_id=b.id ORDER BY created_at DESC,id DESC LIMIT 1) r ON true ORDER BY b.certification_id,b.version_label LIMIT 100",
    )
  ).rows;
  return rows.map((r) => ({
    id: String(r.id),
    certificationId: String(r.certification_id),
    version: String(r.version_label),
    verified: Boolean(r.verified_at && r.verified_by),
    domains: (Array.isArray(r.data) ? r.data : []).map(
      (d: { code?: string; title?: string }) => ({
        code: String(d.code || ""),
        title: String(d.title || d.code || ""),
      }),
    ),
    objectives: Array.isArray(r.objectives)
      ? (r.objectives as BlueprintSummary["objectives"])
      : [],
  }));
}
async function mappingBlockers(query: DatabaseQuery, data: ContentDraft) {
  const blueprints = await blueprintSummaries(query);
  const b = blueprints.find((b) => b.id === data.blueprintRevisionId);
  const blockers: string[] = [];
  if (!b || b.certificationId !== data.certificationId || !b.verified)
    blockers.push(
      "A matching independently reviewed canonical blueprint revision is required.",
    );
  if (
    !b?.domains.some((d) => d.code === data.domain) ||
    !b.objectives.some(
      (o) => o.code === data.objectiveCode && o.domain === data.domain,
    )
  )
    blockers.push(
      "Map the content to an exact objective in the reviewed blueprint domain.",
    );
  if (!data.sources.length)
    blockers.push(
      "Add authoritative references with edition and exact supporting section.",
    );
  if (data.sources.some((source) => !source.classification))
    blockers.push(
      "Classify each source as a regulatory requirement, consensus standard, professional guidance or supplemental resource before technical approval.",
    );
  if (
    data.sources.some(
      (source) =>
        (!source.url && !source.bibliographyId) ||
        !source.edition ||
        !source.section,
    )
  )
    blockers.push(
      "Candidate references require an examined URL, publication edition and exact supporting locator before source verification.",
    );
  if (data.contentKind !== "instructional")
    blockers.push(
      "Demonstration content cannot be approved or published as instructional material.",
    );
  if (data.kind === "question") {
    if (data.body.type === "calculation" && !data.body.solutionSteps.length)
      blockers.push(
        "Calculation questions require worked solution steps with units.",
      );
    if (data.body.type === "multi_step" && data.body.solutionSteps.length < 2)
      blockers.push(
        "Multi-step questions require at least two worked reasoning steps.",
      );
    if (
      data.body.type === "image_hazard" &&
      !data.body.media.some((m) => m.kind === "image")
    )
      blockers.push(
        "Image-supported questions require reviewed, licensed image media.",
      );
  }
  return blockers;
}
async function item(
  query: DatabaseQuery,
  access: StudioAccess,
  id: string,
): Promise<StudioItem> {
  const row = await head(query, access, id);
  const reviews = (
    await query(
      "SELECT x.* FROM studio_reviews x JOIN studio_revisions r ON r.id=x.revision_id WHERE r.content_id=$1 ORDER BY x.created_at,x.id",
      [id],
    )
  ).rows;
  const events = (
    await query("SELECT * FROM studio_audit WHERE content_id=$1 ORDER BY id", [
      id,
    ])
  ).rows;
  const sourceVerifications = (
    await query(
      "SELECT s.* FROM studio_source_verifications s JOIN studio_revisions r ON r.id=s.revision_id WHERE r.content_id=$1 ORDER BY s.event_number",
      [id],
    )
  ).rows;
  const versions = (
    await query(
      "SELECT r.id,r.revision,r.author_id,w.status FROM studio_revisions r JOIN studio_workflow w ON w.revision_id=r.id WHERE r.content_id=$1 ORDER BY r.revision DESC",
      [id],
    )
  ).rows;
  const data = contentDraftSchema.parse(row.data);
  return {
    id,
    kind: data.kind,
    ownerId: String(row.owner_id),
    revision: Number(row.current_revision),
    revisionId: String(row.revision_id),
    rowVersion: Number(row.row_version),
    status: row.status as StudioStatus,
    data,
    publishedRevisionId: row.published_revision_id
      ? String(row.published_revision_id)
      : null,
    reviews: reviews.map((r) => ({
      id: String(r.id),
      reviewerId: String(r.reviewer_id),
      revisionId: String(r.revision_id),
      decision: r.decision as StudioReview["decision"],
      findings: String(r.findings),
      sourceChecks: r.source_checks as SourceCheck[],
      createdAt: iso(r.created_at),
    })),
    sourceVerifications: sourceVerifications.map((record) => ({
      id: String(record.id),
      revisionId: String(record.revision_id),
      reviewerId: String(record.reviewer_id),
      decision: record.decision as SourceVerification["decision"],
      findings: String(record.findings),
      sourceChecks: record.source_checks as SourceVerificationCheck[],
      createdAt: iso(record.created_at),
    })),
    events: events.map((e) => ({
      id: String(e.id),
      actorId: String(e.actor_id),
      event: String(e.event),
      revisionId: e.revision_id ? String(e.revision_id) : null,
      createdAt: iso(e.created_at),
      data: e.data as Record<string, unknown>,
    })),
    versions: versions.map((r) => ({
      revision: Number(r.revision),
      revisionId: String(r.id),
      status: r.status as StudioStatus,
      authorId: String(r.author_id),
    })),
    blockers: [
      ...(await mappingBlockers(query, data)),
      ...(sourceVerifications
        .filter((record) => record.revision_id === row.revision_id)
        .at(-1)?.decision === "verified"
        ? []
        : [
            "Separate independent source verification of this exact revision is required before technical approval.",
          ]),
    ],
  };
}
export type StudioFilters = {
  page?: number;
  search?: string;
  status?: string;
  domain?: string;
  objective?: string;
  kind?: string;
};
export async function studioSnapshot(
  who: Actor,
  filters: StudioFilters = {},
): Promise<StudioSnapshot> {
  const access = await requireStudioAccess(who);
  await seedDemo();
  const query = (await connection()).query;
  const params: unknown[] = [];
  const predicates: string[] = [];
  function condition(sql: string, value: unknown) {
    params.push(value);
    predicates.push(sql.replace("?", `$${params.length}`));
  }
  if (!access.roles.some((r) => r === "reviewer" || r === "administrator"))
    condition("c.owner_id=?", who.id);
  if (filters.domain && filters.domain !== "all")
    condition("r.data->>'domain'=?", filters.domain.slice(0, 80));
  if (filters.objective && filters.objective !== "all")
    condition("r.data->>'objectiveCode'=?", filters.objective.slice(0, 200));
  if (filters.status && filters.status !== "all")
    condition("w.status=?", filters.status.slice(0, 40));
  if (filters.kind && filters.kind !== "all")
    condition("c.kind=?", filters.kind.slice(0, 20));
  if (filters.search)
    condition(
      "concat_ws(' ',r.data->>'title',r.data->>'topic',c.id) ILIKE ?",
      `%${filters.search.slice(0, 200)}%`,
    );
  const where = predicates.length ? ` WHERE ${predicates.join(" AND ")}` : "";
  const base = `${headQuery}${where}`;
  const total = Number(
    (await query(`SELECT count(*) AS total FROM (${base}) counted`, params))
      .rows[0].total,
  );
  const pageSize = 25,
    pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(filters.page || 1)));
  const rows = (
    await query(
      `${base} ORDER BY c.created_at DESC,c.id LIMIT 25 OFFSET $${params.length + 1}`,
      [...params, (page - 1) * pageSize],
    )
  ).rows;
  const items = await Promise.all(
    rows.map((r) => item(query, access, String(r.id))),
  );
  return {
    access,
    items,
    blueprints: await blueprintSummaries(query),
    pagination: { page, pageSize, total, pages },
  };
}
export async function readStudio(who: Actor, id: string) {
  const access = await requireStudioAccess(who);
  return item((await connection()).query, access, id);
}
/** Trusted operator import only. This does not expose a role/owner selection API. */
export async function importOriginalDraftBatch(
  who: Actor,
  records: {
    id: string;
    content: unknown;
    category?:
      | "foundational"
      | "applied_technical"
      | "scenario"
      | "reasoning_calculation";
  }[],
) {
  if (
    !records.length ||
    records.length > 2000 ||
    new Set(records.map((record) => record.id)).size !== records.length
  )
    throw new AccessError(
      "Supply a nonempty unique draft batch of at most 2,000 records.",
      400,
    );
  const parsed = records.map((record) => ({
    id: record.id,
    content: contentDraftSchema.parse({
      ...(record.content as object),
      ...(record.category ? { instructionalCategory: record.category } : {}),
      origin: "ai_generated",
    }),
  }));
  if (
    parsed.some(
      (record) =>
        !/^[-a-zA-Z0-9._]{3,100}$/.test(record.id) ||
        record.content.kind !== "question",
    )
  )
    throw new AccessError(
      "Original batches require valid stable question IDs.",
      400,
    );
  await requireStudioAccess(who);
  await seedDemo();
  return (await connection()).transaction(async (query) => {
    const access = await requireStudioAccess(who, query);
    requireStudioRole(access, ["author", "administrator"]);
    await query("LOCK TABLE studio_content IN SHARE ROW EXCLUSIVE MODE");
    let imported = 0,
      skipped = 0;
    for (const record of parsed) {
      const [existing] = (
        await query(`${headQuery} WHERE c.id=$1`, [record.id])
      ).rows;
      if (existing) {
        if (
          existing.owner_id !== who.id ||
          Number(existing.current_revision) !== 1 ||
          existing.status !== "draft" ||
          !isDeepStrictEqual(existing.data, record.content)
        )
          throw new AccessError(
            `Existing content ${record.id} differs from this draft batch; it will not be overwritten.`,
            409,
          );
        skipped++;
        continue;
      }
      await createDraft(query, access, record.content, record.id);
      await audit(
        query,
        who.id,
        "import_ingested",
        record.id,
        `${record.id}:v1`,
        { batch: "chst5-original-drafts", declaredOrigin: "ai_generated" },
      );
      imported++;
    }
    return { imported, skipped, total: records.length, published: 0 };
  });
}
async function validateMappingExists(query: DatabaseQuery, data: ContentDraft) {
  const [b] = (
    await query(
      "SELECT certification_id,data FROM blueprint_revisions WHERE id=$1",
      [data.blueprintRevisionId],
    )
  ).rows;
  if (
    !b ||
    b.certification_id !== data.certificationId ||
    !(
      Array.isArray(b.data) &&
      b.data.some((d: { code: string }) => d.code === data.domain)
    )
  )
    throw new AccessError(
      "Choose a matching existing certification, blueprint revision and domain.",
      400,
    );
  const canonical = (
    await query(
      "SELECT id,domain FROM curriculum_objectives WHERE blueprint_revision_id=$1",
      [data.blueprintRevisionId],
    )
  ).rows;
  if (
    canonical.length &&
    data.objectiveCode &&
    !canonical.some(
      (objective) =>
        objective.id === data.objectiveCode && objective.domain === data.domain,
    )
  )
    throw new AccessError(
      "Choose an objective actually listed in this attached blueprint domain.",
      400,
    );
}
async function createDraft(
  query: DatabaseQuery,
  access: StudioAccess,
  content: ContentDraft,
  explicitId?: string,
) {
  requireStudioRole(access, ["author", "administrator"]);
  await validateMappingExists(query, content);
  const id = explicitId || randomUUID(),
    revisionId = `${id}:v1`;
  await query(
    "INSERT INTO studio_content(id,kind,certification_id,owner_id,current_revision) VALUES($1,$2,$3,$4,1)",
    [id, content.kind, content.certificationId, access.actorId],
  );
  await query(
    "INSERT INTO studio_revisions(id,content_id,revision,author_id,data) VALUES($1,$2,1,$3,$4::jsonb)",
    [revisionId, id, access.actorId, json(content)],
  );
  await query(
    "INSERT INTO studio_workflow(revision_id,status) VALUES($1,'draft')",
    [revisionId],
  );
  await audit(query, access.actorId, "draft_created", id, revisionId, {
    title: content.title,
    origin: content.origin,
  });
  return id;
}
async function transition(
  query: DatabaseQuery,
  row: Row,
  status: StudioStatus,
) {
  const updated = await query(
    "UPDATE studio_workflow SET status=$1,row_version=row_version+1,updated_at=now() WHERE revision_id=$2 AND row_version=$3 RETURNING revision_id",
    [status, row.revision_id, row.row_version],
  );
  if (!updated.rows.length)
    throw new AccessError("Content changed. Reload before continuing.", 409);
}
async function independent(query: DatabaseQuery, id: string, who: string) {
  const [contribution] = (
    await query(
      "SELECT c.id FROM studio_content c WHERE c.id=$1 AND (c.owner_id=$2 OR EXISTS(SELECT 1 FROM studio_revisions r WHERE r.content_id=c.id AND r.author_id=$2))",
      [id, who],
    )
  ).rows;
  if (contribution)
    throw new AccessError(
      "Authors and contributors cannot review or approve their own content, including administrators.",
      403,
    );
}
function exactSourceChecks(content: ContentDraft, checks: SourceCheck[]) {
  if (
    checks.length !== content.sources.length ||
    new Set(checks.map((c) => c.sourceId)).size !== checks.length ||
    content.sources.some(
      (s) =>
        !checks.some(
          (c) =>
            c.sourceId === s.id && c.outcome === "supports" && c.notes.trim(),
        ),
    )
  )
    throw new AccessError(
      "Independently examine every cited source and record a unique supporting finding for each source.",
      422,
    );
}
async function exactVerificationChecks(
  query: DatabaseQuery,
  content: ContentDraft,
  checks: SourceVerificationCheck[],
) {
  exactSourceChecks(content, checks);
  if (
    !content.sources.length ||
    content.sources.some((source) => {
      const check = checks.find(
        (candidate) => candidate.sourceId === source.id,
      );
      return (
        (!source.url && !source.bibliographyId) ||
        !source.edition ||
        !source.section ||
        !check ||
        check.edition !== source.edition ||
        check.section !== source.section ||
        check.url !== source.url
      );
    })
  )
    throw new AccessError(
      "Source verification must examine the exact cited URL, edition and supporting section. Revise incomplete candidate metadata before verification.",
      422,
    );
  for (const source of content.sources.filter((source) => !source.url)) {
    const [publication] = (
      await query(
        "SELECT id FROM reference_publications WHERE id=$1 AND title=$2 AND edition=$3",
        [source.bibliographyId, source.title, source.edition],
      )
    ).rows;
    if (!publication)
      throw new AccessError(
        "A physical source without a URL requires a registered bibliography identity matching its exact title and edition.",
        422,
      );
  }
}
async function sourceProof(query: DatabaseQuery, revisionId: string) {
  const [record] = (
    await query(
      "SELECT * FROM studio_source_verifications WHERE revision_id=$1 ORDER BY event_number DESC LIMIT 1",
      [revisionId],
    )
  ).rows;
  if (!record || record.decision !== "verified")
    throw new AccessError(
      "Separate independent source verification of this exact revision is required before technical approval.",
      422,
    );
  const [role] = (
    await query(
      "SELECT subject_id FROM editorial_roles WHERE subject_id=$1 AND role='reviewer'",
      [record.reviewer_id],
    )
  ).rows;
  if (!role)
    throw new AccessError(
      "The source examiner no longer has an authorized reviewer role; independent re-review is required.",
      422,
    );
  return record;
}
async function validatePrerequisites(
  query: DatabaseQuery,
  id: string,
  data: ContentDraft,
) {
  if (data.kind !== "lesson") return;
  const visited = new Set<string>();
  async function visit(next: string) {
    if (next === id)
      throw new AccessError("Lesson prerequisites cannot create a cycle.", 422);
    if (visited.has(next)) return;
    if (visited.size > 100)
      throw new AccessError(
        "Prerequisite graph is too large to validate.",
        422,
      );
    visited.add(next);
    const [row] = (
      await query(
        "SELECT v.certification_id,v.data FROM published_lessons p JOIN lesson_versions v ON v.id=p.lesson_version_id WHERE p.lesson_id=$1",
        [next],
      )
    ).rows;
    if (!row || row.certification_id !== data.certificationId)
      throw new AccessError(
        "Every prerequisite must be a published lesson in the same certification.",
        422,
      );
    const pre = (row.data as { prerequisites?: string[] }).prerequisites || [];
    for (const child of pre) await visit(child);
  }
  for (const pre of data.body.prerequisites) await visit(pre);
  for (const questionId of data.body.questionIds) {
    const [q] = (
      await query(
        "SELECT v.certification_id FROM published_questions p JOIN question_versions v ON v.id=p.question_version_id WHERE p.question_id=$1",
        [questionId],
      )
    ).rows;
    if (!q || q.certification_id !== data.certificationId)
      throw new AccessError(
        "Related practice questions must be published in the same certification.",
        422,
      );
  }
}
async function materialize(
  query: DatabaseQuery,
  row: Row,
  data: ContentDraft,
  review: Row,
  publishedBy: string,
) {
  const id = String(row.id),
    revisionId = String(row.revision_id),
    version = Number(row.current_revision),
    reviewedAt = iso(review.created_at);
  const evidence = await sourceProof(query, revisionId);
  const sourceVerifiedAt = iso(evidence.created_at);
  const [blueprint] = (
    await query("SELECT version_label FROM blueprint_revisions WHERE id=$1", [
      data.blueprintRevisionId,
    ])
  ).rows;
  if (data.kind === "question") {
    const first = data.sources[0];
    const q = {
      id,
      version,
      certification: data.certificationId,
      blueprint: {
        version: String(blueprint.version_label),
        objective: data.objectiveCode,
      },
      domain: data.domain,
      topic: data.topic,
      difficulty: data.body.difficulty,
      stem: data.body.stem,
      choices: data.body.choices,
      correctChoice: data.body.correctChoice,
      explanation: data.body.explanation,
      reference: {
        title: first.title,
        url: first.url,
        locator: first.section,
        verifiedAt: sourceVerifiedAt,
        edition: first.edition,
        ...(first.classification
          ? { classification: first.classification }
          : {}),
        verificationStatus: "verified",
      },
      references: data.sources.map((source) => ({
        title: source.title,
        url: source.url,
        locator: source.section,
        edition: source.edition,
        verifiedAt: sourceVerifiedAt,
        verificationStatus: "verified",
        ...(source.classification
          ? { classification: source.classification }
          : {}),
      })),
      contentKind: "instructional",
      origin: data.origin,
      reviewStatus: "approved",
      questionType: data.body.type,
      media: data.body.media,
      solutionSteps: data.body.solutionSteps,
    };
    await query(
      "INSERT INTO question_versions(id,question_id,version,certification_id,blueprint_revision_id,objective_code,subtopic,question_type,domain,topic,difficulty,content_kind,origin,review_status,author_id,reviewer_id,reviewed_at,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'instructional',$12,'approved',$13,$14,$15,$16::jsonb)",
      [
        revisionId,
        id,
        version,
        data.certificationId,
        data.blueprintRevisionId,
        data.objectiveCode,
        data.subtopic,
        data.body.type,
        data.domain,
        data.topic,
        data.body.difficulty,
        data.origin,
        row.author_id,
        review.reviewer_id,
        reviewedAt,
        json(q),
      ],
    );
    for (const source of data.sources)
      await query(
        "INSERT INTO source_reviews(id,question_version_id,reviewer_id,source_title,source_url,source_version,source_locator,outcome,notes,reviewed_at) VALUES($1,$2,$3,$4,$5,$6,$7,'supports',$8,$9)",
        [
          randomUUID(),
          revisionId,
          evidence.reviewer_id,
          source.title,
          source.url,
          source.edition,
          source.section,
          (evidence.source_checks as SourceVerificationCheck[]).find(
            (c) => c.sourceId === source.id,
          )!.notes,
          sourceVerifiedAt,
        ],
      );
  } else {
    const lesson = {
      id,
      version,
      certification: data.certificationId,
      domain: data.domain,
      topic: data.topic,
      title: data.title,
      summary: data.body.summary,
      subtopics: data.subtopic ? [data.subtopic] : [],
      objectives: data.body.objectives,
      readingMinutes: data.body.readingMinutes,
      sections: data.body.sections,
      references: data.sources.map((s) => ({
        title: s.title,
        url: s.url,
        section: s.section,
        edition: s.edition,
        verifiedAt: sourceVerifiedAt,
      })),
      checks: data.body.checks,
      questionIds: data.body.questionIds,
      relatedLessonIds: data.body.relatedLessonIds,
      prerequisites: data.body.prerequisites,
      media: data.body.media.map((m) => ({
        kind: m.kind,
        url: m.url,
        title: m.alt,
        caption: m.rights,
        captionsUrl: m.captionsUrl,
        transcript: m.transcript,
      })),
      transcript: data.body.transcript,
      contentKind: "instructional",
      reviewStatus: "published",
      blueprint: {
        version: String(blueprint.version_label),
        objective: data.objectiveCode,
        verified: true,
      },
    };
    await query(
      "INSERT INTO lesson_versions(id,lesson_id,version,certification_id,blueprint_revision_id,domain,topic,subtopics,objective_codes,content_kind,review_status,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,'instructional','published',$10::jsonb)",
      [
        revisionId,
        id,
        version,
        data.certificationId,
        data.blueprintRevisionId,
        data.domain,
        data.topic,
        json(lesson.subtopics),
        json([data.objectiveCode]),
        json(lesson),
      ],
    );
  }
  const previous = row.published_revision_id
    ? String(row.published_revision_id)
    : null;
  await query(
    "INSERT INTO studio_publications(content_id,revision_id,published_by) VALUES($1,$2,$3) ON CONFLICT(content_id) DO UPDATE SET revision_id=excluded.revision_id,published_by=excluded.published_by,published_at=now()",
    [id, revisionId, publishedBy],
  );
  if (data.kind === "question")
    await query(
      "INSERT INTO published_questions(question_id,question_version_id,published_by) VALUES($1,$2,$3) ON CONFLICT(question_id) DO UPDATE SET question_version_id=excluded.question_version_id,published_by=excluded.published_by,published_at=now()",
      [id, revisionId, publishedBy],
    );
  else
    await query(
      "INSERT INTO published_lessons(lesson_id,lesson_version_id,published_by) VALUES($1,$2,$3) ON CONFLICT(lesson_id) DO UPDATE SET lesson_version_id=excluded.lesson_version_id,published_by=excluded.published_by,published_at=now()",
      [id, revisionId, publishedBy],
    );
  if (previous && previous !== revisionId) {
    await query(
      "UPDATE studio_workflow SET status='retired',row_version=row_version+1,updated_at=now() WHERE revision_id=$1 AND status='published'",
      [previous],
    );
    await audit(query, publishedBy, "superseded", id, previous, {
      replacementRevisionId: revisionId,
    });
  }
}
async function duplicateRecords(query: DatabaseQuery, records: ContentDraft[]) {
  const duplicates: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < records.length; i++) {
    const content = records[i];
    const normalized = `${content.kind}:${content.certificationId}:${(content.kind === "question" ? content.body.stem : content.title).trim().toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(normalized))
      duplicates.push(`Record ${i + 1} duplicates another import record.`);
    seen.add(normalized);
    const [existing] = (
      await query(
        "SELECT c.id FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision WHERE c.kind=$1 AND c.certification_id=$2 AND lower(regexp_replace(trim(CASE WHEN c.kind='question' THEN r.data->'body'->>'stem' ELSE r.data->>'title' END),'\\s+',' ','g'))=$3 LIMIT 1",
        [
          content.kind,
          content.certificationId,
          normalized.slice(
            `${content.kind}:${content.certificationId}:`.length,
          ),
        ],
      )
    ).rows;
    if (existing)
      duplicates.push(
        `Record ${i + 1} duplicates existing content ${String(existing.id)}.`,
      );
  }
  return duplicates;
}
async function previewImport(
  query: DatabaseQuery,
  access: StudioAccess,
  records: unknown[],
): Promise<ImportPreview> {
  requireStudioRole(access, ["author", "administrator"]);
  const errors: ImportPreview["errors"] = [],
    parsed: ContentDraft[] = [];
  records.forEach((record, index) => {
    const result = contentDraftSchema.safeParse(record);
    if (!result.success)
      errors.push({
        index,
        message: result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
          .slice(0, 2000),
      });
    else if (result.data.kind !== "question")
      errors.push({
        index,
        message: "Bulk import accepts question records only.",
      });
    else parsed.push(result.data);
  });
  const duplicates = await duplicateRecords(query, parsed),
    id = randomUUID(),
    expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const preview = { id, expiresAt, records: parsed, errors, duplicates };
  await query(
    "INSERT INTO studio_import_batches(id,owner_id,payload,errors,expires_at) VALUES($1,$2,$3::jsonb,$4::jsonb,$5)",
    [
      id,
      access.actorId,
      json(parsed),
      json([
        ...errors,
        ...duplicates.map((message) => ({ index: -1, message })),
      ]),
      expiresAt,
    ],
  );
  await audit(query, access.actorId, "import_previewed", null, null, {
    previewId: id,
    validRecords: parsed.length,
    errors: errors.length,
    duplicates: duplicates.length,
  });
  return preview;
}
export async function studioAction(
  who: Actor,
  input: unknown,
): Promise<
  StudioItem | ImportPreview | { imported: StudioItem[] } | { verified: true }
> {
  const action = studioActionSchema.parse(input);
  await requireStudioAccess(who);
  await seedDemo();
  const c = await connection();
  const result = await c.transaction(async (query) => {
    const access = await requireStudioAccess(who, query);
    if (action.action === "create")
      return { id: await createDraft(query, access, action.content) };
    if (action.action === "preview_import")
      return { preview: await previewImport(query, access, action.records) };
    if (action.action === "confirm_import") {
      requireStudioRole(access, ["author", "administrator"]);
      // Prevent concurrent imports from passing the same duplicate check.
      await query("LOCK TABLE studio_content IN SHARE ROW EXCLUSIVE MODE");
      const [batch] = (
        await query(
          "SELECT * FROM studio_import_batches WHERE id=$1 AND owner_id=$2 FOR UPDATE",
          [action.previewId, who.id],
        )
      ).rows;
      if (
        !batch ||
        batch.consumed_at ||
        Date.parse(iso(batch.expires_at)) <= Date.now()
      )
        throw new AccessError(
          "Import preview is missing, expired, or already consumed.",
          409,
        );
      const issues = batch.errors as unknown[];
      const records = (batch.payload as unknown[]).map((v) =>
        contentDraftSchema.parse(v),
      );
      if (issues.length || !records.length)
        throw new AccessError(
          "Resolve all import errors and duplicates before importing.",
          422,
        );
      const duplicates = await duplicateRecords(query, records);
      if (duplicates.length) throw new AccessError(duplicates.join(" "), 409);
      const ids = [];
      for (const record of records) {
        // Import describes ingestion. Keep the author's declared provenance,
        // especially ai_generated, on the immutable content revision itself.
        const id = await createDraft(query, access, record);
        ids.push(id);
        await audit(query, who.id, "import_ingested", id, `${id}:v1`, {
          previewId: action.previewId,
          declaredOrigin: record.origin,
        });
      }
      await query(
        "UPDATE studio_import_batches SET consumed_at=now() WHERE id=$1",
        [action.previewId],
      );
      await audit(query, who.id, "import_confirmed", null, null, {
        previewId: action.previewId,
        contentIds: ids,
      });
      return { ids };
    }
    if (action.action === "verify_blueprint") {
      requireStudioRole(access, ["administrator"]);
      const [b] = (
        await query(
          "SELECT * FROM blueprint_revisions WHERE id=$1 FOR UPDATE",
          [action.blueprintRevisionId],
        )
      ).rows;
      if (!b) throw new AccessError("Blueprint revision not found.", 404);
      if (b.verified_at)
        throw new AccessError(
          "This verified blueprint revision is immutable. Register a new blueprint revision for changes.",
          409,
        );
      const domains = Array.isArray(b.data)
        ? (b.data as { code: string }[])
        : [];
      if (
        new Set(action.objectives.map((o) => o.code)).size !==
          action.objectives.length ||
        action.objectives.some((o) => !domains.some((d) => d.code === o.domain))
      )
        throw new AccessError(
          "Objectives need unique exact codes in existing blueprint domains.",
          400,
        );
      const canonical = (
        await query(
          "SELECT id,domain,statement FROM curriculum_objectives WHERE blueprint_revision_id=$1",
          [action.blueprintRevisionId],
        )
      ).rows;
      if (
        canonical.length &&
        (canonical.length !== action.objectives.length ||
          canonical.some(
            (objective) =>
              !action.objectives.some(
                (candidate) =>
                  candidate.code === objective.id &&
                  candidate.domain === objective.domain &&
                  candidate.title === objective.statement,
              ),
          ))
      )
        throw new AccessError(
          "The supplied-document blueprint review must preserve every canonical objective ID, domain and exact statement. Do not add, omit or rewrite official objectives.",
          422,
        );
      await query(
        "INSERT INTO studio_blueprint_reviews(id,blueprint_revision_id,reviewer_id,source_url,edition,section,notes,objectives) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)",
        [
          randomUUID(),
          action.blueprintRevisionId,
          who.id,
          action.sourceUrl,
          action.edition,
          action.section,
          action.notes,
          json(action.objectives),
        ],
      );
      await query(
        "UPDATE blueprint_revisions SET source_url=$1,provenance=$2,verified_at=now(),verified_by=$3 WHERE id=$4",
        [
          action.sourceUrl,
          `Human review recorded in Content Studio; edition ${action.edition}; section ${action.section}`,
          who.id,
          action.blueprintRevisionId,
        ],
      );
      await audit(query, who.id, "blueprint_review_recorded", null, null, {
        blueprintRevisionId: action.blueprintRevisionId,
        edition: action.edition,
        section: action.section,
        objectiveCount: action.objectives.length,
      });
      return { verified: true as const };
    }
    const row = await head(query, access, action.id, true);
    expectRevision(row, action);
    const data = contentDraftSchema.parse(row.data),
      id = String(row.id),
      revisionId = String(row.revision_id);
    if (action.action === "request_source_verification") {
      requireStudioRole(access, ["author", "administrator"]);
      if (row.owner_id !== who.id && !access.roles.includes("administrator"))
        throw new AccessError(
          "Only the author or an administrator may submit content.",
          403,
        );
      if (!["draft", "technical_review"].includes(String(row.status)))
        throw new AccessError(
          "Create a new draft revision before requesting source examination.",
          409,
        );
      await transition(query, row, "source_verification_pending");
      await audit(
        query,
        who.id,
        "source_verification_requested",
        id,
        revisionId,
      );
      return { id };
    }
    if (action.action === "verify_sources") {
      requireStudioRole(access, ["reviewer"]);
      await independent(query, id, who.id);
      if (
        !["source_verification_pending", "technical_review"].includes(
          String(row.status),
        )
      )
        throw new AccessError(
          "This revision is not awaiting source examination.",
          409,
        );
      if (action.decision === "verified")
        await exactVerificationChecks(query, data, action.sourceChecks);
      const verificationId = randomUUID();
      await query(
        "INSERT INTO studio_source_verifications(id,revision_id,reviewer_id,decision,findings,source_checks) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
        [
          verificationId,
          revisionId,
          who.id,
          action.decision,
          action.findings,
          json(action.sourceChecks),
        ],
      );
      await transition(
        query,
        row,
        action.decision === "verified"
          ? "source_verified"
          : "changes_requested",
      );
      await audit(query, who.id, `source_${action.decision}`, id, revisionId, {
        verificationId,
      });
      return { id };
    }
    if (action.action === "revise") {
      requireStudioRole(access, ["author", "administrator"]);
      if (row.owner_id !== who.id && !access.roles.includes("administrator"))
        throw new AccessError(
          "Only the author or an administrator may revise content.",
          403,
        );
      if (
        action.content.kind !== data.kind ||
        action.content.certificationId !== data.certificationId
      )
        throw new AccessError(
          "Content kind and certification identity cannot change between revisions.",
          400,
        );
      await validateMappingExists(query, action.content);
      const revision = Number(row.current_revision) + 1,
        next = `${id}:v${revision}`;
      await query(
        "INSERT INTO studio_revisions(id,content_id,revision,author_id,data) VALUES($1,$2,$3,$4,$5::jsonb)",
        [next, id, revision, who.id, json(action.content)],
      );
      await query(
        "INSERT INTO studio_workflow(revision_id,status) VALUES($1,'draft')",
        [next],
      );
      await query(
        "UPDATE studio_content SET current_revision=$1,row_version=row_version+1 WHERE id=$2",
        [revision, id],
      );
      await audit(query, who.id, "revision_created", id, next, {
        previousRevisionId: revisionId,
      });
      return { id };
    }
    if (action.action === "submit") {
      requireStudioRole(access, ["author", "administrator"]);
      if (row.owner_id !== who.id && !access.roles.includes("administrator"))
        throw new AccessError(
          "Only the author or an administrator may submit content.",
          403,
        );
      if (!["draft", "source_verified"].includes(String(row.status)))
        throw new AccessError(
          "Create a new draft revision before resubmitting reviewed content.",
          409,
        );
      await transition(query, row, "technical_review");
      await audit(query, who.id, "submitted_for_review", id, revisionId);
      return { id };
    }
    if (action.action === "review") {
      requireStudioRole(access, ["reviewer"]);
      await independent(query, id, who.id);
      if (row.status !== "technical_review")
        throw new AccessError(
          "Only the current submitted revision can receive a technical review.",
          409,
        );
      if (action.decision === "approved") {
        const blockers = await mappingBlockers(query, data);
        if (blockers.length) throw new AccessError(blockers.join(" "), 422);
        exactSourceChecks(data, action.sourceChecks);
        await sourceProof(query, revisionId);
        await validatePrerequisites(query, id, data);
      }
      await query(
        "INSERT INTO studio_reviews(id,revision_id,reviewer_id,decision,findings,source_checks) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
        [
          randomUUID(),
          revisionId,
          who.id,
          action.decision,
          action.findings,
          json(action.sourceChecks),
        ],
      );
      await transition(query, row, action.decision);
      await audit(query, who.id, `review_${action.decision}`, id, revisionId, {
        findings: action.findings,
      });
      return { id };
    }
    requireStudioRole(access, ["administrator"]);
    if (action.action === "publish") {
      if (row.status !== "approved")
        throw new AccessError(
          "Only the approved current revision can be published.",
          409,
        );
      const blockers = await mappingBlockers(query, data);
      if (blockers.length) throw new AccessError(blockers.join(" "), 422);
      await sourceProof(query, revisionId);
      const [review] = (
        await query(
          "SELECT * FROM studio_reviews WHERE revision_id=$1 AND decision='approved' ORDER BY created_at DESC,id DESC LIMIT 1",
          [revisionId],
        )
      ).rows;
      if (!review)
        throw new AccessError(
          "An independent review for this exact revision is required.",
          422,
        );
      await independent(query, id, String(review.reviewer_id));
      exactSourceChecks(data, review.source_checks as SourceCheck[]);
      await validatePrerequisites(query, id, data);
      await materialize(query, row, data, review, who.id);
      await transition(query, row, "published");
      await audit(query, who.id, "published", id, revisionId);
      return { id };
    }
    if (action.action === "retire") {
      const targetRevisionId = row.published_revision_id
        ? String(row.published_revision_id)
        : revisionId;
      if (!row.published_revision_id && row.status !== "approved")
        throw new AccessError(
          "Only approved content or an active published revision can be retired.",
          409,
        );
      if (row.published_revision_id) {
        await query(
          "DELETE FROM studio_publications WHERE content_id=$1 AND revision_id=$2",
          [id, targetRevisionId],
        );
        if (data.kind === "question")
          await query(
            "DELETE FROM published_questions WHERE question_id=$1 AND question_version_id=$2",
            [id, targetRevisionId],
          );
        else
          await query(
            "DELETE FROM published_lessons WHERE lesson_id=$1 AND lesson_version_id=$2",
            [id, targetRevisionId],
          );
      }
      const [target] = (
        await query(
          "SELECT revision_id,row_version,status FROM studio_workflow WHERE revision_id=$1 FOR UPDATE",
          [targetRevisionId],
        )
      ).rows;
      if (!target || !["approved", "published"].includes(String(target.status)))
        throw new AccessError(
          "The active publication changed. Reload before retiring it.",
          409,
        );
      await transition(query, target, "retired");
      await audit(query, who.id, "retired", id, targetRevisionId);
      return { id };
    }
    throw new AccessError("Unsupported Studio action.", 400);
  });
  if (result.preview) return result.preview;
  if (result.ids)
    return {
      imported: await Promise.all(result.ids.map((id) => readStudio(who, id))),
    };
  if (result.verified === true) return { verified: true };
  if (!result.id) throw new Error("Studio operation returned no result.");
  return readStudio(who, result.id);
}
