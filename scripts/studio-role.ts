import { connection } from "../src/db/client";
import { grantStudioRole, revokeStudioRole } from "../src/modules/studio/roles";
import { studioRoles, type StudioRole } from "../src/modules/studio/model";
const [operation, subject, role, operator] = process.argv.slice(2);
if (
  !["grant", "revoke"].includes(operation) ||
  !subject ||
  !studioRoles.includes(role as StudioRole) ||
  !operator
)
  throw new Error(
    "Usage: npm run studio:role -- grant|revoke existing-subject author|reviewer|administrator responsible-operator",
  );
try {
  const result =
    operation === "grant"
      ? await grantStudioRole(subject, role as StudioRole, operator)
      : await revokeStudioRole(subject, role as StudioRole, operator);
  console.log(JSON.stringify(result));
} finally {
  await (await connection()).close();
}
