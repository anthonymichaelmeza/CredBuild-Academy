import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import * as practice from "@/modules/practice/service";
import { saveLesson, readLearning } from "@/modules/learning/service";
import { readProfile, saveProfile } from "@/modules/planner/service";
import { defaultProfile } from "@/modules/planner/model";
import { lessons } from "@/modules/learning/catalog";
import { demoQuestions } from "@/demo/questions";
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
const alice = { id: "user_connected_alice", mode: "managed" as const };
const bob = { id: "user_connected_bob", mode: "managed" as const };
beforeAll(async () => {
  await connection();
});
afterAll(async () => {
  await (await connection()).close();
});
describe("connected account resource isolation using safe database substitutes", () => {
  it("recovers the same saved practice/exam/bookmark/profile/lesson state for one subject and denies another", async () => {
    const id = await practice.startSession(alice, {
      count: 1,
      domain: "all",
      mode: "exam",
      prioritizeMissed: false,
      durationSeconds: 60,
    });
    const questionId = (await practice.ownedSession(id, alice.id))
      .questionIds[0];
    await practice.answer(id, alice.id, {
      questionId,
      choiceId: demoQuestions.find((q) => q.id === questionId)!.correctChoice,
      confidence: "high",
      responseMs: 1000,
    });
    await practice.setBookmark(alice.id, questionId, true);
    await practice.submit(id, alice.id);
    const lesson = lessons[0];
    let revision = 0;
    for (const section of lesson.sections) {
      const saved = await saveLesson(alice, {
        lessonId: lesson.id,
        lessonVersion: lesson.version,
        revision,
        action: { type: "visit", sectionId: section.id },
      });
      revision = saved.revisions[lesson.id];
    }
    for (const check of lesson.checks) {
      const saved = await saveLesson(alice, {
        lessonId: lesson.id,
        lessonVersion: lesson.version,
        revision,
        action: {
          type: "check",
          checkId: check.id,
          choiceId: check.correctChoice,
        },
      });
      revision = saved.revisions[lesson.id];
    }
    await saveLesson(alice, {
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      revision,
      action: { type: "complete" },
    });
    await saveProfile(alice, {
      action: "save",
      revision: 0,
      profile: defaultProfile,
    });
    // A new actor object represents a later verified session with the same subject.
    const returning = { ...alice };
    expect((await practice.history(returning.id))[0].status).toBe("submitted");
    expect(await practice.bookmarkList(returning.id)).toContain(questionId);
    expect(
      (await readLearning(returning.id)).state.progress[lesson.id].completedAt,
    ).toBeTruthy();
    expect((await readProfile(returning.id)).state?.profile).toEqual(
      defaultProfile,
    );
    expect(await practice.history(bob.id)).toEqual([]);
    expect(await practice.bookmarkList(bob.id)).toEqual([]);
    expect((await readLearning(bob.id)).state.progress).toEqual({});
    expect((await readProfile(bob.id)).state).toBeNull();
    await expect(practice.view(id, bob.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(practice.submit(id, bob.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      practice.answer(id, bob.id, {
        questionId,
        choiceId: "c0",
        confidence: "low",
        responseMs: 0,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
