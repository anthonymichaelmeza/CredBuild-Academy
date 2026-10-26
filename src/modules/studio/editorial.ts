import "server-only";
import { randomUUID } from "node:crypto";
import { connection, type DatabaseQuery } from "@/db/client";
import { AccessError, type Actor } from "@/modules/identity/access";
import { contentDraftSchema } from "./model";
import {
  requireEditorialIdentity,
  requireStudioAccess,
  requireStudioRole,
} from "./roles";
import {
  editorialActionSchema,
  type EditorialSnapshot,
  type EditorialDecision,
} from "./editorial-model";
import { questionQualityReport } from "./question-quality";

export async function requireEditorialApproval(
  query: DatabaseQuery,
  revisionId: string,
) {
  const [proof] = (
    await query(
      "SELECT e.* FROM studio_editorial_reviews e WHERE revision_id=$1 ORDER BY event_number DESC LIMIT 1",
      [revisionId],
    )
  ).rows;
  if (
    !proof ||
    proof.decision !== "approved" ||
    !(
      await query(
        "SELECT 1 FROM editorial_roles WHERE subject_id=$1 AND role='reviewer' FOR SHARE",
        [proof.reviewer_id],
      )
    ).rows.length
  )
    throw new AccessError(
      "Independent human editorial approval of this exact revision is required before publication.",
      422,
    );
}
export async function editorialSnapshot(
  who: Actor,
): Promise<EditorialSnapshot> {
  requireEditorialIdentity(who);
  const access = await requireStudioAccess(who);
  requireStudioRole(access, ["administrator", "reviewer"]);
  const c = await connection();
  const [rows, events] = await Promise.all([
    c.query(
      `SELECT c.id,c.owner_id,c.current_revision,r.id AS revision_id,r.data,w.status,w.row_version,
      coalesce((SELECT s.decision='verified' AND EXISTS(SELECT 1 FROM editorial_roles er WHERE er.subject_id=s.reviewer_id AND er.role='reviewer') FROM studio_source_verifications s WHERE s.revision_id=r.id ORDER BY s.event_number DESC LIMIT 1),false) AS source_verified,
      EXISTS(SELECT 1 FROM studio_revisions contribution WHERE contribution.content_id=c.id AND contribution.author_id=$1) AS contributed
      FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision
      JOIN studio_workflow w ON w.revision_id=r.id WHERE c.certification_id='chst' AND r.data->>'contentKind'='instructional' ORDER BY c.id LIMIT 2501`,
      [who.id],
    ),
    c.query(`SELECT e.*,EXISTS(SELECT 1 FROM editorial_roles er WHERE er.subject_id=e.reviewer_id AND er.role='reviewer') AS authorized FROM
      (SELECT r.id FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision WHERE c.certification_id='chst' AND r.data->>'contentKind'='instructional' ORDER BY c.id LIMIT 2500) current
      CROSS JOIN LATERAL(SELECT * FROM studio_editorial_reviews x WHERE x.revision_id=current.id ORDER BY x.event_number DESC LIMIT 5)e ORDER BY e.event_number DESC`),
  ]);
  const items = rows.rows.slice(0, 2500).map((row) => {
    const data = contentDraftSchema.parse(row.data);
    const history = events.rows
      .filter((event) => event.revision_id === row.revision_id)
      .map((event) => ({
        id: String(event.id),
        revisionId: String(event.revision_id),
        reviewerId: String(event.reviewer_id),
        decision: event.decision as EditorialDecision["decision"],
        findings: String(event.findings),
        checks: event.checks as EditorialDecision["checks"],
        createdAt: new Date(String(event.created_at)).toISOString(),
      }));
    const latest = events.rows.find(
      (event) => event.revision_id === row.revision_id,
    );
    const editorialApproved = Boolean(
      latest?.decision === "approved" && latest.authorized,
    );
    const stage =
      row.status === "approved"
        ? editorialApproved
          ? "Approved — ready for administrator publication"
          : latest?.decision === "changes_requested"
            ? "Editorial changes requested — create a new revision"
            : latest?.decision === "rejected"
              ? "Editorial rejection — create a new revision"
              : "Editorial Review — technical approval recorded"
        : String(row.status).replaceAll("_", " ");
    return {
      id: String(row.id),
      revisionId: String(row.revision_id),
      revision: Number(row.current_revision),
      rowVersion: Number(row.row_version),
      ownerId: String(row.owner_id),
      status: row.status as EditorialSnapshot["items"][number]["status"],
      data,
      sourceVerified: Boolean(row.source_verified),
      editorialApproved,
      history,
      stage,
      canReview:
        access.roles.includes("reviewer") &&
        row.status === "approved" &&
        row.owner_id !== who.id &&
        !row.contributed,
    };
  });
  return {
    access,
    items,
    truncated: rows.rows.length > 2500,
    quality: questionQualityReport(
      items.filter((item) => item.data.kind === "question"),
    ),
  };
}
export async function recordEditorialDecision(who: Actor, input: unknown) {
  requireEditorialIdentity(who);
  const action = editorialActionSchema.parse(input);
  const c = await connection();
  await c.transaction(async (query) => {
    const access = await requireStudioAccess(who, query);
    requireStudioRole(access, ["reviewer"]);
    const [row] = (
      await query(
        `SELECT c.owner_id,c.current_revision,r.id AS revision_id,r.data,w.status,w.row_version FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision JOIN studio_workflow w ON w.revision_id=r.id WHERE c.id=$1 FOR UPDATE OF c,w`,
        [action.id],
      )
    ).rows;
    if (!row) throw new AccessError("Content not found.", 404);
    if (
      Number(row.current_revision) !== action.revision ||
      Number(row.row_version) !== action.rowVersion
    )
      throw new AccessError(
        "The content changed. Reload before editorial review.",
        409,
      );
    if (row.status !== "approved")
      throw new AccessError(
        "Complete independent source and technical review before editorial review.",
        409,
      );
    if (
      row.owner_id === who.id ||
      (
        await query(
          "SELECT 1 FROM studio_revisions WHERE content_id=$1 AND author_id=$2",
          [action.id, who.id],
        )
      ).rows.length
    )
      throw new AccessError(
        "Authors cannot editorially approve their own content.",
        403,
      );
    const [latest] = (
      await query(
        "SELECT id FROM studio_editorial_reviews WHERE revision_id=$1 ORDER BY event_number DESC LIMIT 1",
        [row.revision_id],
      )
    ).rows;
    if ((latest ? String(latest.id) : null) !== action.editorialEvent)
      throw new AccessError(
        "A newer editorial decision exists. Reload before reviewing.",
        409,
      );
    if (action.decision === "approved") {
      if (Object.values(action.checks).some((value) => !value))
        throw new AccessError(
          "Complete every human editorial check before approval.",
          422,
        );
      const data = contentDraftSchema.parse(row.data);
      if (
        data.kind === "lesson" &&
        /^SOURCE-BLOCKED AUTHORING BRIEF[.]/i.test(data.body.summary)
      )
        throw new AccessError(
          "Replace the source-blocked authoring brief with completed source-supported instruction before editorial approval.",
          422,
        );
      if (
        data.kind === "question" &&
        questionQualityReport([{ id: action.id, data, sourceVerified: true }])
          .errorCount
      )
        throw new AccessError(
          "Resolve blocking question structure and mapping errors before editorial approval.",
          422,
        );
    }
    const id = randomUUID();
    await query(
      "INSERT INTO studio_editorial_reviews(id,revision_id,reviewer_id,decision,findings,checks,human_attestation) VALUES($1,$2,$3,$4,$5,$6::jsonb,true)",
      [
        id,
        row.revision_id,
        who.id,
        action.decision,
        action.findings,
        JSON.stringify(action.checks),
      ],
    );
    await query(
      "INSERT INTO studio_audit(content_id,revision_id,actor_id,event,data) VALUES($1,$2,$3,$4,$5::jsonb)",
      [
        action.id,
        row.revision_id,
        who.id,
        `editorial_${action.decision}`,
        JSON.stringify({ editorialId: id }),
      ],
    );
  });
  return editorialSnapshot(who);
}
