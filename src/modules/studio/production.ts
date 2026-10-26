import "server-only";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import type { Actor } from "@/modules/identity/access";
import { CHST_BLUEPRINT_ID } from "@/modules/curriculum/catalog";
import { productionExamAvailability } from "@/modules/exams/service";
import { contentDraftSchema, type StudioStatus } from "./model";
import { requireStudioAccess, requireStudioRole } from "./roles";
import {
  summarizeQuestionProduction,
  type QuestionProductionSummary,
} from "./production-model";

export async function questionProductionSummary(
  who: Actor,
): Promise<QuestionProductionSummary> {
  // Author/reviewer access to the general Studio does not grant this dashboard.
  // This runs before seeding, querying content or computing bank metrics.
  const access = await requireStudioAccess(who);
  requireStudioRole(access, ["administrator"]);
  await seedDemo();
  const query = (await connection()).query;
  const [heads, publications, exam] = await Promise.all([
    query(
      `SELECT c.id,r.id AS revision_id,r.data,w.status,
        coalesce((SELECT s.decision='verified' AND EXISTS(
          SELECT 1 FROM editorial_roles er WHERE er.subject_id=s.reviewer_id
          AND er.role='reviewer') FROM studio_source_verifications s
          WHERE s.revision_id=r.id ORDER BY s.event_number DESC LIMIT 1),false) AS source_verified
      FROM studio_content c
      JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision
      JOIN studio_workflow w ON w.revision_id=r.id
      WHERE c.kind='question' AND c.certification_id='chst'
        AND r.data->>'blueprintRevisionId'=$1 ORDER BY c.id`,
      [CHST_BLUEPRINT_ID],
    ),
    query(
      `SELECT c.id,r.data FROM studio_publications p
      JOIN studio_content c ON c.id=p.content_id
      JOIN studio_revisions r ON r.id=p.revision_id
      JOIN studio_workflow w ON w.revision_id=r.id AND w.status='published'
      WHERE c.kind='question' AND c.certification_id='chst'
        AND r.data->>'blueprintRevisionId'=$1 ORDER BY c.id`,
      [CHST_BLUEPRINT_ID],
    ),
    productionExamAvailability(who),
  ]);
  return {
    access,
    ...summarizeQuestionProduction(
      heads.rows.map((row) => ({
        id: String(row.id),
        revisionId: String(row.revision_id),
        status: row.status as StudioStatus,
        sourceVerified: Boolean(row.source_verified),
        data: contentDraftSchema.parse(row.data),
      })),
      publications.rows.map((row) => ({
        id: String(row.id),
        data: contentDraftSchema.parse(row.data),
      })),
      exam,
    ),
  };
}
