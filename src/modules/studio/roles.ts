import "server-only";
import { connection, type DatabaseQuery } from "@/db/client";
import { AccessError, type Actor } from "@/modules/identity/access";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { studioRoles, type StudioAccess, type StudioRole } from "./model";

export function localStudioEnabled() {
  return (
    process.env.ALLOW_LOCAL_STUDIO === "true" &&
    process.env.ALLOW_LOCAL_DEMO === "true" &&
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production"
  );
}
export function requireEditorialIdentity(who: Actor) {
  if (browserDemoEnabled())
    throw new AccessError(
      "Content Studio requires a connected, authorized account. Browser demonstration storage cannot publish content.",
      403,
    );
  if (who.mode !== "managed" && !localStudioEnabled())
    throw new AccessError(
      "Content Studio requires verified managed authentication.",
      403,
    );
}
export async function studioAccess(
  who: Actor,
  query?: DatabaseQuery,
): Promise<StudioAccess> {
  requireEditorialIdentity(who);
  const q = query || (await connection()).query;
  const rows = (
    await q(
      "SELECT role FROM editorial_roles WHERE subject_id=$1 ORDER BY role FOR SHARE",
      [who.id],
    )
  ).rows;
  return {
    actorId: who.id,
    roles: rows.map((r) => r.role as StudioRole),
    localDevelopment: who.mode === "demo",
  };
}
export async function requireStudioAccess(who: Actor, query?: DatabaseQuery) {
  const access = await studioAccess(who, query);
  if (!access.roles.length)
    throw new AccessError(
      "Your account does not have an editorial role. Contact an administrator.",
      403,
    );
  return access;
}
export function requireStudioRole(
  access: StudioAccess,
  roles: readonly StudioRole[],
) {
  if (!access.roles.some((role) => roles.includes(role)))
    throw new AccessError(
      "Your editorial role does not permit this action.",
      403,
    );
}

/** Trusted CLI/job only: this function is deliberately not exposed by any API action. */
export async function grantStudioRole(
  subjectId: string,
  role: StudioRole,
  grantedBy: string,
) {
  if (!studioRoles.includes(role) || !subjectId || !grantedBy.trim())
    throw new Error(
      "Supply an existing subject, valid role, and responsible operator.",
    );
  const c = await connection();
  return c.transaction(async (query) => {
    const [user] = (
      await query(
        "SELECT id, identity_mode FROM users WHERE id=$1 FOR UPDATE",
        [subjectId],
      )
    ).rows;
    if (!user || (user.identity_mode !== "managed" && !localStudioEnabled()))
      throw new Error(
        "The subject must first sign in as a managed user. Explicit local Studio development identities are allowed only outside production/Vercel.",
      );
    const inserted = await query(
      "INSERT INTO editorial_roles(subject_id,role,granted_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING subject_id",
      [subjectId, role, grantedBy],
    );
    if (inserted.rows.length)
      await query(
        "INSERT INTO studio_audit(actor_id,event,data) VALUES($1,'role_granted',$2::jsonb)",
        [grantedBy, JSON.stringify({ subjectId, role })],
      );
    return { granted: Boolean(inserted.rows.length), subjectId, role };
  });
}
export async function revokeStudioRole(
  subjectId: string,
  role: StudioRole,
  revokedBy: string,
) {
  if (!studioRoles.includes(role) || !subjectId || !revokedBy.trim())
    throw new Error("Supply a subject, valid role, and responsible operator.");
  return (await connection()).transaction(async (query) => {
    const removed = await query(
      "DELETE FROM editorial_roles WHERE subject_id=$1 AND role=$2 RETURNING subject_id",
      [subjectId, role],
    );
    if (removed.rows.length)
      await query(
        "INSERT INTO studio_audit(actor_id,event,data) VALUES($1,'role_revoked',$2::jsonb)",
        [revokedBy, JSON.stringify({ subjectId, role })],
      );
    return { revoked: Boolean(removed.rows.length), subjectId, role };
  });
}
