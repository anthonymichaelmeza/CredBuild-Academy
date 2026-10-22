import { sql } from "drizzle-orm";
import { db } from "./client";
import { certifications, questionVersions } from "./schema";
import { demoQuestions } from "@/demo/questions";
import { blueprint, domains } from "@/modules/catalog/blueprint";
export async function seedDemo() {
  const orm = await db();
  await orm
    .insert(certifications)
    .values({
      id: "chst",
      name: "Construction Health and Safety Technician",
      kind: "credential_prep",
    })
    .onConflictDoNothing();
  await orm.execute(
    sql`INSERT INTO blueprint_revisions(id, certification_id, version_label, source_url, provenance, data) VALUES ('chst5-unverified', 'chst', ${blueprint.version}, ${blueprint.source}, ${blueprint.provenance}, ${JSON.stringify(domains)}::jsonb) ON CONFLICT DO NOTHING`,
  );
  for (const q of demoQuestions)
    await orm
      .insert(questionVersions)
      .values({
        id: `${q.id}:v${q.version}`,
        questionId: q.id,
        version: q.version,
        certificationId: "chst",
        domain: q.domain,
        topic: q.topic,
        difficulty: q.difficulty,
        contentKind: q.contentKind,
        origin: q.origin,
        reviewStatus: q.reviewStatus,
        authorId: "demo-ai-draft",
        data: q,
      })
      .onConflictDoNothing();
}
