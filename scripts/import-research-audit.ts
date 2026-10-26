import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "../src/db/client";
import { seedDemo } from "../src/db/seed";
import {
  requireStudioAccess,
  requireStudioRole,
} from "../src/modules/studio/roles";
import {
  registerResearchSources,
  importRecordedResearchAttempt,
  importResearchDocument,
  researchAction,
  researchSnapshot,
} from "../src/modules/research/service";
import { chstObjectives } from "../src/modules/curriculum/catalog";
const [subject, ...options] = process.argv.slice(2);
if (
  !subject ||
  !options.includes("--confirm") ||
  options.some(
    (value) =>
      !value.startsWith("--blueprint=") &&
      !value.startsWith("--references=") &&
      value !== "--confirm",
  )
)
  throw new Error(
    "Usage: npm run research:import-audit -- existing-administrator-subject --confirm [--blueprint=/authorized/CHST-Blueprint.pdf] [--references=/authorized/CHST-References.pdf]. This registers metadata and imports recorded attempts, never reruns or fabricates a download.",
  );
const c = await connection();
try {
  const [user] = (
    await c.query("SELECT id,identity_mode FROM users WHERE id=$1", [subject])
  ).rows;
  if (!user || !["managed", "demo"].includes(String(user.identity_mode)))
    throw new Error(
      "An existing connected administrator is required. This command cannot create users or grant roles.",
    );
  const who = { id: subject, mode: user.identity_mode as "managed" | "demo" };
  requireStudioRole(await requireStudioAccess(who), ["administrator"]);
  await seedDemo();
  const folder = path.join(process.cwd(), "research/chst5");
  const manifest = JSON.parse(
    await readFile(path.join(folder, "SOURCE_BOOTSTRAP.json"), "utf8"),
  ) as { auditId: string; entityKind: string; source: unknown }[];
  const audit = JSON.parse(
    await readFile(path.join(folder, "CRAWL_AUDIT.json"), "utf8"),
  ) as {
    sources: {
      sourceId: string;
      attempts: {
        startedAt: string;
        targetHttpStatus: number | null;
        proxyConnectStatus: number | null;
        error: string | null;
      }[];
    }[];
  };
  const registered = await registerResearchSources(
    who,
    manifest.map((item) => item.source),
  );
  const ids = new Map(
    manifest.map((item, index) => [item.auditId, registered[index].id]),
  );
  let recordedAttempts = 0;
  for (const source of audit.sources) {
    const sourceId = ids.get(source.sourceId);
    if (!sourceId)
      throw new Error("Missing source mapping for a recorded network audit.");
    for (const attempt of source.attempts) {
      await importRecordedResearchAttempt(who, sourceId, {
        attemptedAt: new Date(attempt.startedAt).toISOString(),
        httpStatus: attempt.targetHttpStatus,
        proxyStatus: attempt.proxyConnectStatus,
        error: attempt.error,
        resolvedUrl: null,
      });
      recordedAttempts++;
    }
  }
  let documentsImported = 0;
  for (const [option, auditId] of [
    ["--blueprint=", "attachment-blueprint"],
    ["--references=", "attachment-bibliography"],
  ] as const) {
    const filename = options
      .find((value) => value.startsWith(option))
      ?.slice(option.length);
    if (!filename) continue;
    const sourceId = ids.get(auditId)!;
    await importResearchDocument(who, sourceId, await readFile(filename), {
      format: "pdf",
      rightsAttestation: true,
    });
    documentsImported++;
    if (auditId === "attachment-blueprint") {
      const state = await researchSnapshot(who, { sourceId });
      for (const objective of chstObjectives) {
        const section = state.sections.find(
          (row) => row.page === objective.documentPage,
        );
        if (!section)
          throw new Error(
            "Blueprint objective cannot be linked to a page that was not actually extracted.",
          );
        await researchAction(who, {
          action: "link",
          sourceId,
          objectiveId: objective.id,
          sectionId: section.id,
          relationKind: "candidate",
          notes:
            "Supplied blueprint page establishes the exact examination statement, not technical answer support, current online version or human verification.",
        });
      }
    }
  }
  console.log(
    JSON.stringify({
      registeredMetadata: registered.length,
      recordedAccessAttempts: recordedAttempts,
      privateDocumentsImported: documentsImported,
      networkRequestsPerformedByThisCommand: 0,
      questionsApproved: 0,
      notice:
        "Historical access evidence is imported with original timestamps. Supplied files are parsed privately only when explicit paths are provided. No source was human-verified and no question was approved or published.",
    }),
  );
} finally {
  await c.close();
}
