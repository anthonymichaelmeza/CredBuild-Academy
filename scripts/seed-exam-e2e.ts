import { rm } from "node:fs/promises";
import { connection } from "../src/db/client";
import { seedDemo } from "../src/db/seed";
import {
  ensureDevelopmentFixtures,
  seedExpiredDevelopmentAttempt,
} from "../src/modules/exams/service";
import { grantStudioRole } from "../src/modules/studio/roles";

if (
  process.env.CREDBUILT_EXAM_TEST_SEED !== "true" ||
  process.env.CREDBUILT_EXAM_FIXTURES !== "true" ||
  process.env.LOCAL_DATABASE_PATH !== ".local/exam-e2e" ||
  process.env.NODE_ENV !== "development" ||
  process.env.ALLOW_LOCAL_DEMO !== "true" ||
  process.env.ALLOW_LOCAL_STUDIO !== "true" ||
  process.env.DATABASE_URL ||
  process.env.VERCEL ||
  process.env.NEXT_PUBLIC_BROWSER_DEMO === "true"
)
  throw new Error(
    "Exam test fixtures require the explicit isolated local test configuration.",
  );

// Only this dedicated ignored QA directory is reset, with the app stopped.
// These records are synthetic demonstrations, not reviewed safety instruction.
await rm(".local/exam-e2e", { recursive: true, force: true });
await seedDemo();
await ensureDevelopmentFixtures();
const c = await connection();
const fixtures = [
  {
    owner: "99999999-1111-4111-8111-111111111111",
    expired: "a1111111-1111-4111-8111-111111111111",
  },
  {
    owner: "99999999-2222-4222-8222-222222222222",
    expired: "a2222222-2222-4222-8222-222222222222",
  },
  {
    owner: "99999999-3333-4333-8333-333333333333",
    expired: "a3333333-3333-4333-8333-333333333333",
  },
];
for (const fixture of fixtures)
  await seedExpiredDevelopmentAttempt(
    { id: `demo:${fixture.owner}`, mode: "demo" },
    fixture.expired,
  );

const administrator = "demo:66666666-6666-4666-8666-666666666666";
await c.query(
  "INSERT INTO users(id,identity_mode) VALUES($1,'demo') ON CONFLICT DO NOTHING",
  [administrator],
);
await grantStudioRole(
  administrator,
  "administrator",
  "isolated-exam-browser-test-fixture",
);
console.log(
  "Isolated exam QA fixtures prepared: synthetic unreviewed questions, three expired attempts and a local administrator. No CHST content is approved or published.",
);
await c.close();
