import "server-only";
import { randomUUID } from "node:crypto";
import { connection, type DatabaseQuery } from "@/db/client";
import { AccessError, type Actor } from "@/modules/identity/access";
import {
  requireEditorialIdentity,
  requireStudioAccess,
  requireStudioRole,
} from "@/modules/studio/roles";
import {
  registryActionSchema,
  registryReferenceSchema,
  type RegistryReference,
} from "./model";

async function administrator(who: Actor, query: DatabaseQuery) {
  requireStudioRole(await requireStudioAccess(who, query), ["administrator"]);
}
async function list(query: DatabaseQuery): Promise<RegistryReference[]> {
  const rows = (
    await query(
      "SELECT * FROM technical_reference_registry ORDER BY lower(data->>'title'),id",
    )
  ).rows;
  const reviews = (
    await query(
      "SELECT * FROM technical_reference_reviews ORDER BY event_number DESC",
    )
  ).rows;
  return rows.map((row) => {
    const history = reviews
      .filter((review) => review.reference_id === row.id)
      .map((review) => ({
        id: String(review.id),
        revision: Number(review.revision),
        reviewerId: String(review.reviewer_id),
        decision: review.decision as "verified" | "needs_revision",
        findings: String(review.findings),
        createdAt: new Date(String(review.created_at)).toISOString(),
      }));
    return {
      id: String(row.id),
      revision: Number(row.revision),
      data: registryReferenceSchema.parse(row.data),
      status:
        history.find((review) => review.revision === Number(row.revision))
          ?.decision || "unverified",
      updatedAt: new Date(String(row.updated_at)).toISOString(),
      reviews: history,
    };
  });
}
export async function referenceRegistry(who: Actor) {
  requireEditorialIdentity(who);
  const c = await connection();
  return c.transaction(async (query) => {
    await administrator(who, query);
    return list(query);
  });
}
export async function referenceRegistryAction(who: Actor, input: unknown) {
  requireEditorialIdentity(who);
  const action = registryActionSchema.parse(input),
    c = await connection();
  return c.transaction(async (query) => {
    await administrator(who, query);
    let id: string;
    if (action.action === "create") {
      id = randomUUID();
      await query(
        "INSERT INTO technical_reference_registry(id,data,created_by) VALUES($1,$2::jsonb,$3)",
        [id, JSON.stringify(action.data), who.id],
      );
    } else {
      id = action.id;
      const [row] = (
        await query(
          "SELECT * FROM technical_reference_registry WHERE id=$1 FOR UPDATE",
          [id],
        )
      ).rows;
      if (!row) throw new AccessError("Reference not found.", 404);
      if (Number(row.revision) !== action.revision)
        throw new AccessError(
          "The reference changed. Reload before saving or reviewing.",
          409,
        );
      if (action.action === "edit")
        await query(
          "UPDATE technical_reference_registry SET revision=revision+1,data=$2::jsonb,updated_at=now() WHERE id=$1",
          [id, JSON.stringify(action.data)],
        );
      else
        await query(
          "INSERT INTO technical_reference_reviews(id,reference_id,revision,reference_snapshot,reviewer_id,decision,findings,human_attestation) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,true)",
          [
            randomUUID(),
            id,
            action.revision,
            JSON.stringify(row.data),
            who.id,
            action.decision,
            action.findings,
          ],
        );
    }
    await query(
      "INSERT INTO studio_audit(actor_id,event,data) VALUES($1,$2,$3::jsonb)",
      [
        who.id,
        `reference_${action.action}`,
        JSON.stringify({
          referenceId: id,
          ...(action.action !== "review"
            ? { data: action.data }
            : { revision: action.revision, decision: action.decision }),
        }),
      ],
    );
    return list(query);
  });
}
