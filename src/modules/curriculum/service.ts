import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { AccessError, type Actor } from "@/modules/identity/access";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { requireStudioAccess, requireStudioRole } from "@/modules/studio/roles";
import {
  CHST_BLUEPRINT_ID,
  CHST_BLUEPRINT_VERSION,
  chstDomains,
} from "./catalog";
import type {
  CurriculumCoverage,
  CoverageFilters,
  CoverageCount,
  ContentReport,
} from "./coverage-types";
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
export async function curriculumCoverage(
  who: Actor,
  filters: CoverageFilters = {},
): Promise<CurriculumCoverage> {
  const access = await requireStudioAccess(who);
  requireStudioRole(access, ["reviewer", "administrator"]);
  await seedDemo();
  const query = (await connection()).query;
  // This query only reads current editorial heads. Published counts below use
  // publication pointers separately so a newer draft cannot remap an old release.
  const rows = (
    await query(
      "SELECT c.id,c.kind,r.id AS revision_id,r.data,w.status,coalesce((SELECT s.decision='verified' FROM studio_source_verifications s WHERE s.revision_id=r.id ORDER BY s.event_number DESC LIMIT 1),false) AS source_verified FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision JOIN studio_workflow w ON w.revision_id=r.id WHERE c.certification_id='chst' AND r.data->>'blueprintRevisionId'=$1",
      [CHST_BLUEPRINT_ID],
    )
  ).rows;
  const published = (
    await query(
      "SELECT c.id,r.data FROM studio_publications p JOIN studio_content c ON c.id=p.content_id JOIN studio_revisions r ON r.id=p.revision_id WHERE c.kind='question' AND c.certification_id='chst' AND r.data->>'blueprintRevisionId'=$1",
      [CHST_BLUEPRINT_ID],
    )
  ).rows;
  function matches(row: Record<string, unknown>) {
    const data = row.data as Record<string, unknown>;
    return (
      (!filters.domain ||
        filters.domain === "all" ||
        data.domain === filters.domain) &&
      (!filters.objective ||
        filters.objective === "all" ||
        data.objectiveCode === filters.objective) &&
      (!filters.status ||
        filters.status === "all" ||
        row.status === filters.status) &&
      (!filters.search ||
        `${data.title} ${data.topic} ${data.objectiveCode}`
          .toLowerCase()
          .includes(filters.search.toLowerCase().slice(0, 200)))
    );
  }
  const selected = rows.filter(matches),
    questions = selected.filter((row) => row.kind === "question");
  const activePublished = published.filter((row) =>
    matches({ ...row, status: "published" }),
  );
  function counts(
    where: (data: Record<string, unknown>) => boolean,
  ): CoverageCount {
    const eligible = questions.filter((row) =>
      where(row.data as Record<string, unknown>),
    );
    return {
      questions: eligible.length,
      sourceVerified: eligible.filter((row) => row.source_verified).length,
      approved: eligible.filter((row) =>
        ["approved", "published"].includes(String(row.status)),
      ).length,
      published: activePublished.filter((row) =>
        where(row.data as Record<string, unknown>),
      ).length,
    };
  }
  const objectives = (
    await query(
      "SELECT * FROM curriculum_objectives WHERE blueprint_revision_id=$1 ORDER BY domain,CASE WHEN kind='knowledge' THEN 0 ELSE 1 END,official_number",
      [CHST_BLUEPRINT_ID],
    )
  ).rows.map((row) => ({
    id: String(row.id),
    domain: String(row.domain),
    kind: String(row.kind),
    number: Number(row.official_number),
    statement: String(row.statement),
    page: Number(row.page),
    ...counts((data) => data.objectiveCode === row.id),
  }));
  const references = (
    await query("SELECT * FROM reference_publications ORDER BY id")
  ).rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    edition: String(row.edition),
    url: row.url ? String(row.url) : null,
    classification: String(row.classification),
    bibliographyListed: Boolean(row.bibliography_listed),
    verificationStatus: "not_reviewed" as const,
    freshness: "unknown" as const,
  }));
  const reports = (
    await query(
      "SELECT r.*,t.status,t.notes AS resolution,t.created_at AS updated_at FROM content_error_reports r LEFT JOIN LATERAL(SELECT status,notes,created_at FROM content_error_triage WHERE report_id=r.id ORDER BY event_number DESC LIMIT 1)t ON true ORDER BY r.created_at DESC LIMIT 200",
    )
  ).rows.map((row) => ({
    id: String(row.id),
    contentId: String(row.content_id),
    revisionId: String(row.revision_id),
    reporterId: String(row.reporter_id),
    category: String(row.category),
    message: String(row.message),
    status: (row.status || "open") as ContentReport["status"],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at || row.created_at),
    resolution: row.resolution ? String(row.resolution) : "",
  }));
  return {
    access,
    blueprint: {
      id: CHST_BLUEPRINT_ID,
      version: CHST_BLUEPRINT_VERSION,
      latestOfficialVersionConfirmed: false,
    },
    totals: {
      ...counts(() => true),
      lessons: selected.filter((row) => row.kind === "lesson").length,
      draft: questions.filter((row) => row.status === "draft").length,
      technicalReview: questions.filter(
        (row) => row.status === "technical_review",
      ).length,
      sourcePending: questions.filter(
        (row) => row.status === "source_verification_pending",
      ).length,
      reportedErrors: reports.filter((row) =>
        ["open", "under_review"].includes(row.status),
      ).length,
      objectivesWithoutQuestions: objectives.filter((row) => !row.questions)
        .length,
      objectivesInsufficientCoverage: objectives.filter(
        (row) => row.questions < 2,
      ).length,
    },
    domains: chstDomains.map((domain) => ({
      code: domain.code,
      title: domain.title,
      weight: domain.weight,
      ...counts((data) => data.domain === domain.code),
    })),
    objectives: objectives.filter(
      (row) =>
        (!filters.domain ||
          filters.domain === "all" ||
          row.domain === filters.domain) &&
        (!filters.objective ||
          filters.objective === "all" ||
          row.id === filters.objective),
    ),
    references,
    reports,
    filters,
  };
}
export const contentReportSchema = z
  .object({
    contentId: z.string().min(1).max(100),
    revision: z.number().int().positive().optional(),
    category: z.enum(["accuracy", "citation", "ambiguity", "other"]),
    message: z.string().trim().min(10).max(5000),
  })
  .strict();
export async function reportContentError(who: Actor, input: unknown) {
  if (browserDemoEnabled())
    throw new AccessError(
      "Content reports need a connected learner account.",
      403,
    );
  const data = contentReportSchema.parse(input);
  await seedDemo();
  return (await connection()).transaction(async (query) => {
    const [pointer] = (
      await query(
        "SELECT p.revision_id FROM studio_publications p WHERE p.content_id=$1",
        [data.contentId],
      )
    ).rows;
    const requested = data.revision
      ? `${data.contentId}:v${data.revision}`
      : pointer?.revision_id;
    if (!requested) throw new AccessError("Published content not found.", 404);
    if (pointer?.revision_id !== requested) {
      const [owned] = (
        await query(
          "SELECT id FROM learning_sessions WHERE owner_id=$1 AND data->'questionIds' ? $2 AND coalesce(data->'questionVersions'->>$2,'1')=$3::text UNION ALL SELECT lesson_version_id AS id FROM lesson_progress WHERE owner_id=$1 AND lesson_version_id=$4 LIMIT 1",
          [who.id, data.contentId, String(data.revision || 1), requested],
        )
      ).rows;
      if (!owned)
        throw new AccessError(
          "Content not found in your learning history.",
          404,
        );
    }
    await query(
      "INSERT INTO users(id,identity_mode) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [who.id, who.mode],
    );
    const id = randomUUID();
    await query(
      "INSERT INTO content_error_reports(id,content_id,revision_id,reporter_id,category,message) VALUES($1,$2,$3,$4,$5,$6)",
      [id, data.contentId, requested, who.id, data.category, data.message],
    );
    await query(
      "INSERT INTO studio_audit(content_id,revision_id,actor_id,event,data) VALUES($1,$2,$3,'content_error_reported',$4::jsonb)",
      [
        data.contentId,
        requested,
        who.id,
        JSON.stringify({ reportId: id, category: data.category }),
      ],
    );
    return { id, status: "open" };
  });
}
export const triageSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(["under_review", "resolved", "dismissed"]),
    notes: z.string().trim().min(10).max(5000),
  })
  .strict();
export async function triageContentReport(who: Actor, input: unknown) {
  const action = triageSchema.parse(input);
  return (await connection()).transaction(async (query) => {
    const access = await requireStudioAccess(who, query);
    requireStudioRole(access, ["reviewer", "administrator"]);
    const [report] = (
      await query(
        "SELECT * FROM content_error_reports WHERE id=$1 FOR UPDATE",
        [action.id],
      )
    ).rows;
    if (!report) throw new AccessError("Report not found.", 404);
    await query(
      "INSERT INTO content_error_triage(id,report_id,actor_id,status,notes) VALUES($1,$2,$3,$4,$5)",
      [randomUUID(), action.id, who.id, action.status, action.notes],
    );
    await query(
      "INSERT INTO studio_audit(content_id,revision_id,actor_id,event,data) VALUES($1,$2,$3,'content_error_triaged',$4::jsonb)",
      [
        report.content_id,
        report.revision_id,
        who.id,
        JSON.stringify({
          reportId: action.id,
          status: action.status,
          notes: action.notes,
        }),
      ],
    );
    return { id: action.id, status: action.status };
  });
}
