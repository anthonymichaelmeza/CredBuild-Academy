import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { readLearning, saveLesson } from "@/modules/learning/service";
import { lessons } from "@/modules/learning/catalog";
import { completedLesson } from "@/modules/learning/progress";
import { lessonWriteSchema } from "@/modules/learning/requests";
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
const who = { id: "managed:learning-alice", mode: "managed" as const };
const lesson = lessons[0];
beforeAll(async () => {
  await seedDemo();
});
afterAll(async () => {
  await (await connection()).close();
});

async function write(action: Parameters<typeof saveLesson>[1]["action"]) {
  const snapshot = await readLearning(who.id);
  return saveLesson(who, {
    lessonId: lesson.id,
    lessonVersion: lesson.version,
    revision: snapshot.revisions[lesson.id] || 0,
    action,
  });
}

describe("account-linked curriculum and progress", () => {
  it("seeds versioned demo curriculum idempotently without claiming source approval", async () => {
    await seedDemo();
    const result = await (
      await db()
    ).execute(
      sql`SELECT id, content_kind, review_status, objective_codes FROM lesson_versions ORDER BY id`,
    );
    expect(result.rows).toHaveLength(8);
    expect(
      result.rows.every(
        (r) =>
          r.content_kind === "demonstration" && r.review_status === "draft",
      ),
    ).toBe(true);
    expect(
      result.rows.every((r) => JSON.stringify(r.objective_codes) === "[]"),
    ).toBe(true);
  });
  it("rejects forged correctness, ownership and completion timestamps at the boundary", () => {
    expect(
      lessonWriteSchema.safeParse({
        lessonId: lesson.id,
        lessonVersion: 1,
        revision: 0,
        ownerId: "victim",
        action: { type: "complete", completedAt: new Date().toISOString() },
      }).success,
    ).toBe(false);
    expect(
      lessonWriteSchema.safeParse({
        lessonId: lesson.id,
        lessonVersion: 1,
        revision: 0,
        action: {
          type: "check",
          checkId: lesson.checks[0].id,
          choiceId: "c0",
          correct: true,
        },
      }).success,
    ).toBe(false);
  });
  it("blocks early completion and grades knowledge checks from the stored lesson", async () => {
    await expect(write({ type: "complete" })).rejects.toThrow(
      "Visit every section",
    );
    await expect(
      write({ type: "visit", sectionId: "invented" }),
    ).rejects.toThrow("Section not found");
    const check = lesson.checks[0];
    const wrong = check.choices.find((c) => c.id !== check.correctChoice)!.id;
    const saved = await write({
      type: "check",
      checkId: check.id,
      choiceId: wrong,
    });
    expect(saved.state.progress[lesson.id].checks[check.id]).toMatchObject({
      correct: false,
      attempts: 1,
    });
    expect(completedLesson(lesson.id, saved.state)).toBe(false);
  });
  it("preserves section/check progress and completes only after every prerequisite", async () => {
    for (const section of lesson.sections)
      await write({ type: "visit", sectionId: section.id });
    for (const check of lesson.checks)
      await write({
        type: "check",
        checkId: check.id,
        choiceId: check.correctChoice,
      });
    const saved = await write({ type: "complete" });
    expect(completedLesson(lesson.id, saved.state)).toBe(true);
    expect((await readLearning(who.id)).state).toEqual(saved.state);
    const again = await write({ type: "complete" });
    expect(again.state.progress[lesson.id].completedAt).toBe(
      saved.state.progress[lesson.id].completedAt,
    );
  });
  it("prevents stale tabs from overwriting saved progress and rejects obsolete lesson versions", async () => {
    await expect(
      saveLesson(who, {
        lessonId: lesson.id,
        lessonVersion: 1,
        revision: 0,
        action: { type: "visit", sectionId: "understand" },
      }),
    ).rejects.toThrow("another tab");
    await expect(
      saveLesson(who, {
        lessonId: lesson.id,
        lessonVersion: 99,
        revision: 0,
        action: { type: "complete" },
      }),
    ).rejects.toThrow("new revision");
    expect(completedLesson(lesson.id, (await readLearning(who.id)).state)).toBe(
      true,
    );
  });
  it("isolates each account and retains immutable historical lesson revisions", async () => {
    const other = { id: "managed:learning-bob", mode: "managed" as const };
    expect((await readLearning(other.id)).state.progress).toEqual({});
    await saveLesson(other, {
      lessonId: lesson.id,
      lessonVersion: 1,
      revision: 0,
      action: { type: "visit", sectionId: "understand" },
    });
    expect(
      completedLesson(lesson.id, (await readLearning(other.id)).state),
    ).toBe(false);
    expect(completedLesson(lesson.id, (await readLearning(who.id)).state)).toBe(
      true,
    );
    await expect(
      (await db()).execute(
        sql`UPDATE lesson_versions SET data='{}' WHERE id=${lesson.id + ":v1"}`,
      ),
    ).rejects.toThrow();
  });
  it("rejects seed edits without a new version instead of silently changing the material shown", async () => {
    const summary = lesson.summary;
    try {
      lesson.summary = "A changed revision must use a new version.";
      await expect(seedDemo()).rejects.toThrow("Increase the lesson version");
    } finally {
      lesson.summary = summary;
    }
    await seedDemo();
    expect(completedLesson(lesson.id, (await readLearning(who.id)).state)).toBe(
      true,
    );
  });
});
