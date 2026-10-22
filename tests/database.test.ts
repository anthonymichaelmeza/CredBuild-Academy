import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import * as service from "@/modules/practice/service";
import { demoQuestions } from "@/demo/questions";
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
const who = { id: "demo:alice", mode: "demo" as const };
let id: string;
beforeAll(async () => {
  await seedDemo();
  id = await service.startSession(who, {
    count: 10,
    mode: "adaptive",
    domain: "all",
    prioritizeMissed: false,
  });
});
afterAll(async () => {
  await (await connection()).close();
});
describe("PostgreSQL persistence and authorization", () => {
  it("migrates and seeds idempotently without publishing drafts", async () => {
    await seedDemo();
    expect((await service.pool()).length).toBe(12);
    const result = await (
      await db()
    ).execute(sql`SELECT count(*)::int AS count FROM published_questions`);
    expect(result.rows[0].count).toBe(0);
  });
  it("rejects cross-user reads and mutations", async () => {
    await expect(service.ownedSession(id, "demo:bob")).rejects.toThrow(
      "Session not found",
    );
    await expect(service.submit(id, "demo:bob")).rejects.toThrow(
      "Session not found",
    );
  });
  it("persists first answers and prevents second-answer score changes", async () => {
    const s = await service.ownedSession(id, who.id);
    const questionId = s.questionIds[0];
    const q = demoQuestions.find((q) => q.id === questionId)!;
    const first = await service.answer(id, who.id, {
      questionId,
      choiceId: q.correctChoice,
      confidence: "low",
      responseMs: 900,
    });
    expect(first.answers[questionId].correct).toBe(true);
    const again = await service.answer(id, who.id, {
      questionId,
      choiceId: "c1",
      confidence: "high",
      responseMs: 1,
    });
    expect(again.answers[questionId].choiceId).toBe(q.correctChoice);
    expect(
      (await service.view(id, who.id)).feedback[questionId].explanation,
    ).toBe(q.explanation);
  });
  it("persists bookmarks separately for each user and flags on the session", async () => {
    const q = (await service.ownedSession(id, who.id)).questionIds[0];
    await service.setBookmark(who.id, q, true);
    await service.setBookmark(who.id, q, true);
    expect(await service.bookmarkList(who.id)).toEqual([q]);
    expect(await service.bookmarkList("demo:bob")).toEqual([]);
    expect((await service.flag(id, who.id, q)).flags).toContain(q);
    await service.setBookmark(who.id, q, false);
    expect(await service.bookmarkList(who.id)).toEqual([]);
  });
  it("submits once and rejects answer changes afterward", async () => {
    expect((await service.submit(id, who.id)).status).toBe("submitted");
    expect((await service.submit(id, who.id)).status).toBe("submitted");
    await expect(
      service.answer(id, who.id, {
        questionId: "demo-01",
        choiceId: "c0",
        confidence: "high",
        responseMs: 0,
      }),
    ).rejects.toThrow("already submitted");
  });
  it("database rejects demonstration publication and self approval", async () => {
    const orm = await db();
    await expect(
      orm.execute(
        sql`INSERT INTO published_questions(question_id, question_version_id, published_by) VALUES ('demo-01', 'demo-01:v1', 'admin')`,
      ),
    ).rejects.toThrow();
    await expect(
      orm.execute(
        sql`UPDATE question_versions SET review_status='approved', reviewer_id=author_id, reviewed_at=now() WHERE id='demo-01:v1'`,
      ),
    ).rejects.toThrow();
  });
  it("database rejects approved instructional content without verified sources", async () => {
    const orm = await db();
    await orm.execute(
      sql`INSERT INTO question_versions(id,question_id,version,certification_id,domain,topic,difficulty,content_kind,origin,review_status,author_id,reviewer_id,reviewed_at,data) VALUES ('unverified:v1','unverified',1,'chst','1','test','introductory','instructional','human_authored','approved','author','reviewer',now(),'{}')`,
    );
    await expect(
      orm.execute(
        sql`INSERT INTO published_questions(question_id,question_version_id,published_by) VALUES ('unverified','unverified:v1','admin')`,
      ),
    ).rejects.toThrow();
    await expect(
      orm.execute(
        sql`UPDATE question_versions SET data='{"changed":true}' WHERE id='unverified:v1'`,
      ),
    ).rejects.toThrow();
  });
});
