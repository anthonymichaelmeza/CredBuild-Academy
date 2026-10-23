import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { lessonProgress, lessonVersions, users } from "@/db/schema";
import { AccessError, type Actor } from "@/modules/identity/auth";
import { lessons } from "./catalog";
import {
  applyLessonAction,
  emptyLearning,
  type LearningState,
} from "./progress";
import type { LessonWrite } from "./requests";
import {
  getPublishedLesson,
  listPublishedLessons,
} from "@/modules/studio/publication";
import { requirePublishedLearner } from "@/modules/practice/service";
import { completeable } from "./progress";
import { safePublishedLesson, type ConnectedLesson } from "./published-types";

export type LearningSnapshot = {
  state: LearningState;
  revisions: Record<string, number>;
};
let seeded: Promise<void> | undefined;
async function ready() {
  await (seeded ??= seedDemo().catch((error) => {
    seeded = undefined;
    throw error;
  }));
  return db();
}
export async function readLearning(owner: string): Promise<LearningSnapshot> {
  const orm = await ready();
  const rows = await orm
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.ownerId, owner));
  const snapshot: LearningSnapshot = { state: emptyLearning(), revisions: {} };
  for (const lesson of [...lessons, ...(await listPublishedLessons())]) {
    const row = rows.find(
      (r) => r.lessonVersionId === `${lesson.id}:v${lesson.version}`,
    );
    if (row) {
      snapshot.state.progress[lesson.id] = row.data;
      snapshot.revisions[lesson.id] = row.revision;
    }
  }
  return snapshot;
}

export async function saveLesson(who: Actor, input: LessonWrite) {
  const orm = await ready();
  const current =
    lessons.find((l) => l.id === input.lessonId) ||
    (await getPublishedLesson(input.lessonId));
  if (!current) throw new AccessError("Lesson not found.", 404);
  if (current.contentKind === "instructional") {
    requirePublishedLearner(who);
    await assertPrerequisites(who.id, current);
  }
  if (current.version !== input.lessonVersion)
    throw new AccessError(
      "This lesson has a new revision. Refresh to study the current version.",
      409,
    );
  const versionId = `${current.id}:v${current.version}`;
  const [stored] = await orm
    .select()
    .from(lessonVersions)
    .where(eq(lessonVersions.id, versionId));
  if (!stored) throw new AccessError("Lesson not available.", 404);
  const where = and(
    eq(lessonProgress.ownerId, who.id),
    eq(lessonProgress.lessonVersionId, versionId),
  );
  const [previous] = await orm.select().from(lessonProgress).where(where);
  if ((previous?.revision ?? 0) !== input.revision)
    throw new AccessError(
      "Lesson progress changed in another tab. Reload progress and try again.",
      409,
    );
  let next;
  try {
    next = applyLessonAction(stored.data, previous?.data, input.action);
  } catch (error) {
    throw new AccessError(
      error instanceof Error ? error.message : "Invalid lesson action.",
      400,
    );
  }
  await orm
    .insert(users)
    .values({ id: who.id, identityMode: who.mode })
    .onConflictDoNothing();
  const saved = previous
    ? await orm
        .update(lessonProgress)
        .set({
          revision: previous.revision + 1,
          data: next,
          updatedAt: new Date(),
        })
        .where(and(where, eq(lessonProgress.revision, previous.revision)))
        .returning()
    : await orm
        .insert(lessonProgress)
        .values({
          ownerId: who.id,
          lessonVersionId: versionId,
          revision: 1,
          data: next,
        })
        .onConflictDoNothing()
        .returning();
  if (!saved.length)
    throw new AccessError(
      "Lesson progress changed in another tab. Reload progress and try again.",
      409,
    );
  return readLearning(who.id);
}

export async function assertPrerequisites(
  owner: string,
  lesson: ConnectedLesson,
) {
  if (!lesson.prerequisites.length) return;
  const state = (await readLearning(owner)).state;
  for (const id of lesson.prerequisites) {
    const prerequisite =
      lessons.find((candidate) => candidate.id === id) ||
      (await getPublishedLesson(id));
    if (
      !prerequisite ||
      !state.progress[id]?.completedAt ||
      !completeable(prerequisite, state.progress[id])
    )
      throw new AccessError(
        "Complete this lesson's prerequisite learning before starting it. Return to Learn to continue your pathway.",
        403,
      );
  }
}

export async function publishedLessonResource(who: Actor, id: string) {
  requirePublishedLearner(who);
  const lesson = await getPublishedLesson(id);
  if (!lesson) throw new AccessError("Published lesson not found.", 404);
  await assertPrerequisites(who.id, lesson);
  const saved = await readLearning(who.id);
  const progress = saved.state.progress[id] || null;
  const feedback: Record<
    string,
    { correctChoice: string; explanation: string }
  > = {};
  for (const check of lesson.checks)
    if (progress?.checks[check.id])
      feedback[check.id] = {
        correctChoice: check.correctChoice,
        explanation: check.explanation,
      };
  return {
    lesson: safePublishedLesson(lesson),
    progress,
    revision: saved.revisions[id] || 0,
    feedback,
  };
}
