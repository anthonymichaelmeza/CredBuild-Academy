import { connection } from "../src/db/client";
import { chstDraftRecords } from "../src/content/chst/draft-bank";
import { importOriginalDraftBatch } from "../src/modules/studio/service";

const [subject, ...extra] = process.argv.slice(2);
if (!subject || subject.length > 200 || extra.length) {
  throw new Error(
    "Usage: npm run content:import-chst -- existing-author-subject",
  );
}
// This operator command deliberately cannot create identities, grant roles,
// verify sources, approve material, or publish. An authorized owner must exist.
const database = await connection();
try {
  const [user] = (
    await database.query("SELECT id,identity_mode FROM users WHERE id=$1", [
      subject,
    ])
  ).rows;
  if (!user || !["managed", "demo"].includes(String(user.identity_mode))) {
    throw new Error(
      "The author must first sign in and save learner activity; then a trusted operator must grant an editorial role.",
    );
  }
  const result = await importOriginalDraftBatch(
    { id: subject, mode: user.identity_mode as "managed" | "demo" },
    chstDraftRecords.map(({ id, content, category }) => ({
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
        "Original AI drafts only. No technical source was verified and no question was approved or published.",
    }),
  );
} finally {
  await database.close();
}
