import { eq, sql } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";
import { db } from "./client";
import { certifications, questionVersions, lessonVersions } from "./schema";
import { demoQuestions } from "@/demo/questions";
import { blueprint, domains } from "@/modules/catalog/blueprint";
import { lessons } from "@/modules/learning/catalog";
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
  for (const lesson of lessons) {
    const versionId = `${lesson.id}:v${lesson.version}`;
    const inserted = await orm
      .insert(lessonVersions)
      .values({
        id: versionId,
        lessonId: lesson.id,
        version: lesson.version,
        certificationId: lesson.certification,
        blueprintRevisionId: "chst5-unverified",
        domain: lesson.domain,
        topic: lesson.topic,
        subtopics: lesson.subtopics,
        objectiveCodes: [],
        contentKind: lesson.contentKind,
        reviewStatus: lesson.reviewStatus,
        data: lesson,
      })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) {
      const [stored] = await orm
        .select()
        .from(lessonVersions)
        .where(eq(lessonVersions.id, versionId));
      if (!stored || !isDeepStrictEqual(stored.data, lesson))
        throw new Error(
          "Lesson revision content changed. Increase the lesson version; historical content must not be overwritten.",
        );
    }
  }
}
