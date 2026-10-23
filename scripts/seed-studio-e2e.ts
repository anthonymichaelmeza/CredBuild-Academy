import { rm } from "node:fs/promises";
import { seedDemo } from "../src/db/seed";
import { connection } from "../src/db/client";
import {
  grantStudioRole,
  localStudioEnabled,
} from "../src/modules/studio/roles";
if (
  process.env.CREDBUILT_STUDIO_TEST_SEED !== "true" ||
  process.env.LOCAL_DATABASE_PATH !== ".local/studio-e2e" ||
  process.env.DATABASE_URL ||
  process.env.VERCEL ||
  !localStudioEnabled() ||
  process.env.NEXT_PUBLIC_BROWSER_DEMO === "true"
)
  throw new Error(
    "Studio test fixtures require the explicit isolated local test configuration.",
  );
// This exact guarded test directory contains no learner/customer data. The app
// is stopped before this fixture starts; PGlite is never shared by two processes.
await rm(".local/studio-e2e", { recursive: true, force: true });
await seedDemo();
const c = await connection();
const identities = [
  ["11111111-1111-4111-8111-111111111111", "author"],
  ["22222222-2222-4222-8222-222222222222", "reviewer"],
  ["33333333-3333-4333-8333-333333333333", "administrator"],
] as const;
for (const [id, role] of identities) {
  const subject = `demo:${id}`;
  await c.query(
    "INSERT INTO users(id,identity_mode) VALUES($1,'demo') ON CONFLICT DO NOTHING",
    [subject],
  );
  await grantStudioRole(subject, role, "isolated-browser-test-fixture");
}
console.log(
  "Isolated local Studio test roles prepared; all demonstration content remains unapproved.",
);
await c.close();
