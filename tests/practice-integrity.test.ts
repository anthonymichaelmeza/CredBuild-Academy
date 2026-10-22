import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoQuestions } from "@/demo/questions";
import { selectQuestions, sessionView } from "@/modules/practice/engine";
import { recordAnswer } from "@/modules/practice/lifecycle";
import { performanceData } from "@/modules/performance/dto";
import { analyzeSessions } from "@/modules/performance/analytics";
import type { Question, Session } from "@/modules/practice/types";
import { connection, db } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { questionVersions } from "@/db/schema";
import * as service from "@/modules/practice/service";

const original = demoQuestions[0];
// Synthetic revisions exercise integrity rules only, not technical verification.
const revised: Question = {
  ...original,
  version: 2,
  topic: "Synthetic revised topic",
  correctChoice: "c1",
  explanation: "Synthetic second-revision explanation",
};
const input = {
  questionId: original.id,
  choiceId: "c0",
  confidence: "high" as const,
  responseMs: 50,
};
function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "test-session",
    ownerId: "private-learner",
    questionIds: [original.id],
    answers: {},
    flags: [],
    mode: "learning",
    status: "in_progress",
    createdAt: "2026-10-22T10:00:00.000Z",
    submittedAt: null,
    revision: 0,
    ...overrides,
  };
}

describe("immutable question identity and safe performance payloads", () => {
  it("counts distinct questions, selects latest revisions, and filters their current mapping", () => {
    const config = {
      count: 1 as const,
      mode: "learning" as const,
      domain: "all" as const,
      prioritizeMissed: false,
    };
    const pool = [original, revised, { ...revised, version: 3 }];
    expect(selectQuestions(pool, config, [])[0].version).toBe(3);
    expect(() => selectQuestions(pool, { ...config, count: 3 }, [])).toThrow(
      "Only 1",
    );
    expect(() =>
      selectQuestions(pool, { ...config, topic: original.topic }, []),
    ).toThrow("Only 0");
  });

  it("uses the selected revision for grading and feedback regardless of pool order", () => {
    const pool = [revised, original];
    const pinned = session({ questionVersions: { [original.id]: 1 } });
    const answered = recordAnswer(pinned, pool, input);
    expect(answered.answers[original.id].correct).toBe(true);
    const view = sessionView(answered, pool);
    expect(view.questions[0].version).toBe(1);
    expect(view.feedback[original.id].explanation).toBe(original.explanation);
    const latest = recordAnswer(
      session({ questionVersions: { [original.id]: 2 } }),
      pool,
      input,
    );
    expect(latest.answers[original.id].correct).toBe(false);
  });

  it("preserves legacy version-one attempts and fails closed when that revision is unavailable", () => {
    const legacy = recordAnswer(session(), [revised, original], input);
    expect(legacy.answers[original.id].correct).toBe(true);
    expect(() => sessionView(session(), [revised])).toThrow(
      "Pinned question version unavailable",
    );
    expect(() =>
      sessionView(session({ questionVersions: {} }), [original]),
    ).toThrow("Pinned question version unavailable");
  });

  it("omits answer keys, learner identities and active-exam correctness at the RSC boundary", () => {
    const answered = recordAnswer(session({ mode: "exam" }), [original], input);
    const payload = performanceData([answered], [original]);
    const encoded = JSON.stringify(payload);
    for (const forbidden of [
      "ownerId",
      "private-learner",
      "correctChoice",
      "explanation",
      "rationale",
      "choiceId",
      '"correct"',
    ])
      expect(encoded).not.toContain(forbidden);
    expect(payload.questions).toEqual([
      {
        id: original.id,
        version: 1,
        domain: original.domain,
        topic: original.topic,
        difficulty: original.difficulty,
      },
    ]);
    expect(analyzeSessions(payload.saved, payload.questions).answered).toBe(0);
    const submitted = performanceData(
      [{ ...answered, status: "submitted" }],
      [original],
    );
    expect(analyzeSessions(submitted.saved, submitted.questions).accuracy).toBe(
      100,
    );
  });

  it("attributes history to the question revision studied, excluding ungraded data from accuracy", () => {
    const answered = recordAnswer(
      session({ questionVersions: { [original.id]: 1 } }),
      [original],
      input,
    );
    const data = performanceData([answered], [revised, original]);
    expect(analyzeSessions(data.saved, data.questions).topics[0].value).toBe(
      original.topic,
    );
    const safe = data.saved[0];
    delete safe.answers[original.id].correct;
    expect(analyzeSessions([safe], data.questions).accuracy).toBeNull();
  });
});

beforeAll(async () => {
  process.env.ALLOW_LOCAL_DEMO = "true";
  process.env.LOCAL_DATABASE_PATH = ":memory:";
  delete process.env.DATABASE_URL;
  delete process.env.NEXT_PUBLIC_BROWSER_DEMO;
  await seedDemo();
});
afterAll(async () => {
  await (await connection()).close();
});
describe("database sessions retain their selected question revision", () => {
  it("pins a version before a bank update and never substitutes the new answer key", async () => {
    const who = { id: "demo:revision-test", mode: "demo" as const };
    const id = await service.startSession(who, {
      count: 1,
      mode: "learning",
      domain: "1",
      topic: original.topic,
      prioritizeMissed: false,
    });
    expect((await service.ownedSession(id, who.id)).questionVersions).toEqual({
      [original.id]: 1,
    });
    await (await db()).insert(questionVersions).values({
      id: `${revised.id}:v${revised.version}`,
      questionId: revised.id,
      version: revised.version,
      certificationId: "chst",
      domain: revised.domain,
      topic: revised.topic,
      difficulty: revised.difficulty,
      contentKind: revised.contentKind,
      origin: revised.origin,
      reviewStatus: revised.reviewStatus,
      authorId: "synthetic-revision-test",
      data: revised,
    });
    const result = await service.answer(id, who.id, input);
    expect(result.answers[original.id].correct).toBe(true);
    expect(result.feedback[original.id].explanation).toBe(original.explanation);
    expect((await service.view(id, who.id)).questions[0].version).toBe(1);
    const latestId = await service.startSession(who, {
      count: 1,
      mode: "learning",
      domain: "1",
      topic: revised.topic,
      prioritizeMissed: false,
    });
    expect(
      (await service.ownedSession(latestId, who.id)).questionVersions,
    ).toEqual({ [original.id]: 2 });
  });
});
