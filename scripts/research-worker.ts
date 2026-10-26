import { connection } from "../src/db/client";
import { runResearchWorker } from "../src/modules/research/worker";

const [subject, execute, ...extra] = process.argv.slice(2);
const maximum =
  extra.length === 1 && /^--max-jobs=\d+$/.test(extra[0])
    ? Number(extra[0].slice("--max-jobs=".length))
    : 10;
if (
  !subject ||
  subject.length > 200 ||
  execute !== "--execute" ||
  extra.length > 1 ||
  (extra.length === 1 && !/^--max-jobs=\d+$/.test(extra[0])) ||
  !Number.isInteger(maximum) ||
  maximum < 1 ||
  maximum > 50
)
  throw new Error(
    "Usage: npm run research:worker -- existing-admin-subject --execute [--max-jobs=10]",
  );
if (process.env.NEXT_PUBLIC_BROWSER_DEMO === "true" || process.env.VERCEL)
  throw new Error(
    "Run the explicit research worker in an authorized maintenance environment, not the browser demonstration or a Vercel request runtime.",
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
      "An existing administrator identity is required. This command cannot create accounts, grant roles, or approve sources.",
    );
  const result = await runResearchWorker(
    { id: subject, mode: user.identity_mode as "managed" | "demo" },
    { maxJobs: maximum },
  );
  console.log(
    JSON.stringify({
      ...result,
      notice:
        "Actual retrieval/processing results only. Parsing does not verify sources or approve instructional content. No source text was sent to an AI provider.",
    }),
  );
} finally {
  await database.close();
}
