import { connection } from "../src/db/client";
import { domain1Batch001 } from "../src/content/chst/domain1-batch-001";
import { importOriginalDraftBatch } from "../src/modules/studio/service";
const [subject, ...extra] = process.argv.slice(2);
if (!subject || subject.length > 200 || extra.length)
  throw new Error(
    "Usage: npm run content:import-domain1 -- existing-author-subject",
  );
const database = await connection();
try {
  const [user] = (
    await database.query("SELECT id,identity_mode FROM users WHERE id=$1", [
      subject,
    ])
  ).rows;
  if (!user || !["managed", "demo"].includes(String(user.identity_mode)))
    throw new Error(
      "An existing connected editorial identity is required. This command cannot create identities or grant roles.",
    );
  const result = await importOriginalDraftBatch(
    { id: subject, mode: user.identity_mode as "managed" | "demo" },
    domain1Batch001.map(({ id, content, category }) => ({
      id,
      content,
      category,
    })),
  );
  console.log(
    JSON.stringify({
      ...result,
      sourceVerified: 0,
      technicallyApproved: 0,
      notice:
        "50 provisional AI drafts with candidate citations only. No sources were verified and no content was approved or published.",
    }),
  );
} finally {
  await database.close();
}
