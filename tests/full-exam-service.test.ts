import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { connection } from "@/db/client";
import * as exams from "@/modules/exams/service";
import * as practice from "@/modules/practice/service";
import {
  developmentExamFixturesEnabled,
  developmentExamQuestions,
  developmentExamDurationSeconds,
} from "@/modules/exams/development-fixtures";
import { grantStudioRole } from "@/modules/studio/roles";
import { studioAction } from "@/modules/studio/service";
import { questionTemplate, type StudioItem } from "@/modules/studio/model";
import { chstObjectives } from "@/modules/curriculum/catalog";
import type { Question } from "@/modules/practice/types";

vi.mock("@/modules/exams/development-fixtures", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/modules/exams/development-fixtures")
    >();
  return {
    ...original,
    developmentExamFixturesEnabled: vi.fn(() => false),
    developmentExamQuestions: vi.fn(),
    developmentExamDurationSeconds: vi.fn(() => 14400),
  };
});
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
delete process.env.NEXT_PUBLIC_BROWSER_DEMO;
const who = (id: string) => ({ id: `exam-QA-${id}`, mode: "managed" as const });
const admin = who("administrator");
const author = who("author");
const reviewer = who("reviewer");
let fixtures: Question[];
beforeAll(async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/exams/development-fixtures")
  >("@/modules/exams/development-fixtures");
  const previousMode = process.env.NODE_ENV;
  vi.stubEnv("NODE_ENV", "development");
  process.env.CREDBUILT_EXAM_FIXTURES = "true";
  process.env.LOCAL_DATABASE_PATH = ".local/exam-e2e";
  fixtures = actual.developmentExamQuestions();
  vi.stubEnv("NODE_ENV", previousMode);
  process.env.LOCAL_DATABASE_PATH = ":memory:";
  vi.mocked(developmentExamQuestions).mockReturnValue(fixtures);
  vi.mocked(developmentExamFixturesEnabled).mockReturnValue(true);
  vi.mocked(developmentExamDurationSeconds).mockReturnValue(14400);
  await exams.ensureDevelopmentFixtures();
  const query = (await connection()).query;
  for (const person of [admin, author, reviewer])
    await query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      person.id,
    ]);
  for (const [person, role] of [
    [admin, "administrator"],
    [author, "author"],
    [reviewer, "reviewer"],
  ] as const)
    await grantStudioRole(person.id, role, "isolated-QA-operator");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(developmentExamFixturesEnabled).mockReturnValue(true);
  vi.mocked(developmentExamDurationSeconds).mockReturnValue(14400);
});
afterAll(async () => (await connection()).close());

describe("server-saved full-length examination lifecycle using explicit synthetic fixtures", () => {
  it("constructs exactly 200 distinct pinned questions and protects active feedback", async () => {
    const learner = who("pins");
    const id = await exams.start(learner);
    const session = await exams.view(id, learner.id);
    expect(session.questionIds).toHaveLength(200);
    expect(new Set(session.questionIds).size).toBe(200);
    expect(
      ["1", "2", "3", "4"].map(
        (domain) =>
          session.questions.filter((question) => question.domain === domain)
            .length,
      ),
    ).toEqual([73, 40, 45, 42]);
    expect(session.questionVersions).toEqual(
      Object.fromEntries(session.questionIds.map((id) => [id, 1])),
    );
    expect(Object.keys(session.questionChoiceOrders || {})).toHaveLength(200);
    for (const question of session.questions)
      expect(question.choices.map((choice) => choice.id)).toEqual(
        session.questionChoiceOrders![question.id],
      );
    expect((await exams.view(id, learner.id)).questions).toEqual(
      session.questions,
    );
    expect(
      Date.parse(session.deadlineAt!) - Date.parse(session.createdAt),
    ).toBe(14_400_000);
    expect(session).toMatchObject({
      examKind: "chst_full_length",
      developmentFixture: true,
      durationSeconds: 14400,
      currentQuestionIndex: 0,
    });
    expect(session.feedback).toEqual({});
    for (const question of session.questions) {
      expect(question).not.toHaveProperty("correctChoice");
      expect(question).not.toHaveProperty("explanation");
      expect(question).not.toHaveProperty("reference");
      expect(
        question.choices.every((choice) => !Object.hasOwn(choice, "rationale")),
      ).toBe(true);
    }
  });
  it("keeps answer presentation immutable and rejects forged SQL option identities", async () => {
    const learner = who("choice-order-sql");
    const id = await exams.start(learner);
    const query = (await connection()).query;
    const [saved] = (
      await query("SELECT data FROM learning_sessions WHERE id=$1", [id])
    ).rows;
    const data = saved.data as import("@/modules/practice/types").Session;
    const first = data.questionIds[0];
    const altered = structuredClone(data);
    altered.questionChoiceOrders![first].reverse();
    await expect(
      query("UPDATE learning_sessions SET data=$1::jsonb WHERE id=$2", [
        JSON.stringify(altered),
        id,
      ]),
    ).rejects.toThrow("immutable");
    const invalid = {
      ...data,
      id: randomUUID(),
      questionChoiceOrders: {
        ...data.questionChoiceOrders,
        [first]: ["a", "b", "c", "forged"],
      },
    };
    await expect(
      query(
        "INSERT INTO learning_sessions(id,owner_id,status,data) VALUES($1,$2,'in_progress',$3::jsonb)",
        [invalid.id, learner.id, JSON.stringify(invalid)],
      ),
    ).rejects.toThrow("pinned question choices");
  });
  it("serializes answer changes, set-flags and saved position without lost updates", async () => {
    const learner = who("save");
    const id = await exams.start(learner);
    const initial = await exams.view(id, learner.id);
    const [a, b] = initial.questionIds;
    await Promise.all([
      exams.answer(id, learner.id, {
        questionId: a,
        choiceId: "a",
        responseMs: 1200,
      }),
      exams.answer(id, learner.id, {
        questionId: b,
        choiceId: "b",
        responseMs: 900,
      }),
      exams.flag(id, learner.id, a, true),
      exams.navigate(id, learner.id, 179),
    ]);
    const saved = await exams.view(id, learner.id);
    expect(saved.answers[a].choiceId).toBe("a");
    expect(saved.answers[b].choiceId).toBe("b");
    expect(saved.flags).toEqual([a]);
    expect(saved.currentQuestionIndex).toBe(179);
    expect(saved.deadlineAt).toBe(initial.deadlineAt);
    const changed = await exams.answer(id, learner.id, {
      questionId: a,
      choiceId: "d",
      responseMs: 300,
    });
    expect(changed.answers[a]).toMatchObject({
      choiceId: "d",
      responseMs: 1500,
    });
    expect(changed.answers[a]).not.toHaveProperty("correct");
    expect(changed.feedback).toEqual({});
    const repeated = await exams.answer(id, learner.id, {
      questionId: a,
      choiceId: "d",
      responseMs: 300,
    });
    expect(repeated.revision).toBe(changed.revision);
    await exams.flag(id, learner.id, a, true);
    expect((await exams.view(id, learner.id)).flags).toEqual([a]);
  });
  it("supports a shortened synthetic engineering attempt without changing production readiness or the standard timer", async () => {
    vi.mocked(developmentExamDurationSeconds).mockReturnValue(5);
    const learner = who("short-timer");
    const available = await exams.availability(learner);
    expect(available).toMatchObject({
      durationSeconds: 5,
      standardDurationSeconds: 14400,
      developmentSimulatorAvailable: true,
      productionReady: false,
      productionEligibleTotal: 0,
    });
    expect(
      available.productionDomains?.map((domain) => domain.shortfall),
    ).toEqual([73, 40, 45, 42]);
    const id = await exams.start(learner);
    const initial = await exams.view(id, learner.id);
    expect(initial.durationSeconds).toBe(5);
    expect(
      Date.parse(initial.deadlineAt!) - Date.parse(initial.createdAt),
    ).toBe(5000);
    await exams.answer(id, learner.id, {
      questionId: initial.questionIds[0],
      choiceId: "a",
      responseMs: 100,
    });
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(initial.deadlineAt!) + 1);
    const expired = await exams.answer(id, learner.id, {
      questionId: initial.questionIds[1],
      choiceId: "b",
      responseMs: 100,
    });
    expect(expired.status).toBe("submitted");
    expect(expired.submissionReason).toBe("expired");
    expect(expired.submittedAt).toBe(initial.deadlineAt);
    expect(Object.keys(expired.answers)).toEqual([initial.questionIds[0]]);
    expect(Object.keys(expired.feedback)).toHaveLength(200);
    vi.mocked(developmentExamFixturesEnabled).mockReturnValue(false);
    const production = await exams.availability(who("short-timer-production"));
    expect(production.durationSeconds).toBe(14400);
    expect(production.developmentSimulatorAvailable).toBe(false);
  });
  it("rejects shortened SQL attempts when the fixture flag, bank or immutable question provenance is forged", async () => {
    const learner = who("short-sql-guard");
    const id = await exams.start(learner);
    const query = (await connection()).query;
    const [saved] = (
      await query("SELECT data FROM learning_sessions WHERE id=$1", [id])
    ).rows;
    const original = saved.data as import("@/modules/practice/types").Session;
    const insert = (data: typeof original) =>
      query(
        "INSERT INTO learning_sessions(id,owner_id,status,data) VALUES($1,$2,'in_progress',$3::jsonb)",
        [data.id, learner.id, JSON.stringify(data)],
      );
    const shortened = {
      ...original,
      id: randomUUID(),
      durationSeconds: 5,
      deadlineAt: new Date(Date.parse(original.createdAt) + 5000).toISOString(),
    };
    await expect(
      insert({ ...shortened, developmentFixture: false }),
    ).rejects.toThrow("standard four-hour");
    await expect(insert({ ...shortened, bank: "published" })).rejects.toThrow(
      "standard four-hour",
    );
    const [nonFixture] = (
      await query(
        "SELECT question_id,version FROM question_versions WHERE content_kind='demonstration' AND author_id<>'development-only-engine-fixture' LIMIT 1",
      )
    ).rows;
    const ids = [...original.questionIds];
    const replaced = ids[0];
    ids[0] = String(nonFixture.question_id);
    const pins = { ...original.questionVersions };
    delete pins[replaced];
    pins[ids[0]] = Number(nonFixture.version);
    await expect(
      insert({
        ...shortened,
        id: randomUUID(),
        questionIds: ids,
        questionVersions: pins,
      }),
    ).rejects.toThrow("synthetic engineering fixtures");
  });
  it("rejects other users, unknown choices/questions and generic-practice bypasses", async () => {
    const learner = who("owner");
    const id = await exams.start(learner);
    const initial = await exams.view(id, learner.id);
    await expect(exams.view(id, who("intruder").id)).rejects.toThrow(
      "not found",
    );
    await expect(exams.submit(id, who("intruder").id)).rejects.toThrow(
      "not found",
    );
    await expect(
      exams.answer(id, learner.id, {
        questionId: initial.questionIds[0],
        choiceId: "z",
        responseMs: 100,
      }),
    ).rejects.toThrow("available answer");
    await expect(
      exams.answer(id, learner.id, {
        questionId: "unselected",
        choiceId: "a",
        responseMs: 100,
      }),
    ).rejects.toThrow("not in this examination");
    await expect(practice.view(id, learner.id)).rejects.toThrow(
      "full-length examination workspace",
    );
    await expect(practice.submit(id, learner.id)).rejects.toThrow(
      "full-length examination workspace",
    );
  });
  it("prevents duplicate starts and returns the same manually submitted result", async () => {
    const learner = who("idempotent");
    const requestId = randomUUID();
    const ids = await Promise.all([
      exams.start(learner, requestId),
      exams.start(learner, requestId),
      exams.start(learner),
    ]);
    expect(new Set(ids).size).toBe(1);
    const before = await exams.view(ids[0], learner.id);
    const question = fixtures.find(
      (question) => question.id === before.questionIds[0],
    )!;
    await exams.answer(ids[0], learner.id, {
      questionId: question.id,
      choiceId: question.correctChoice,
      responseMs: 2000,
    });
    const [first, second] = await Promise.all([
      exams.submit(ids[0], learner.id),
      exams.submit(ids[0], learner.id),
    ]);
    expect({ ...first, serverNow: undefined }).toEqual({
      ...second,
      serverNow: undefined,
    });
    expect(first).toMatchObject({
      status: "submitted",
      submissionReason: "manual",
    });
    expect(first.answers[question.id].correct).toBe(true);
    expect(Object.keys(first.feedback)).toHaveLength(200);
    expect(first.feedback[question.id].correctChoice).toBe(
      question.correctChoice,
    );
    expect(await exams.start(learner, requestId)).toBe(ids[0]);
  });
  it("finalizes against the stored deadline and never accepts a late answer", async () => {
    const learner = who("expiry");
    const id = await exams.start(learner);
    const initial = await exams.view(id, learner.id);
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse(initial.deadlineAt!) + 86_400_000,
    );
    const final = await exams.answer(id, learner.id, {
      questionId: initial.questionIds[0],
      choiceId: "a",
      responseMs: 100,
    });
    expect(final.answers).toEqual({});
    expect(final.submittedAt).toBe(initial.deadlineAt);
    expect(final.submissionReason).toBe("expired");
    const retry = await exams.submit(id, learner.id);
    expect(retry.revision).toBe(final.revision);
    expect(retry.submittedAt).toBe(final.submittedAt);
  });
  it("returns safe owner history and finalizes closed-browser expirations on history read", async () => {
    const learner = who("history");
    const id = await exams.start(learner);
    const initial = await exams.view(id, learner.id);
    await exams.answer(id, learner.id, {
      questionId: initial.questionIds[0],
      choiceId: "a",
      responseMs: 100,
    });
    const active = (await exams.history(learner.id))[0];
    expect(active.answered).toBe(1);
    expect(active).not.toHaveProperty("correct");
    expect(active).not.toHaveProperty("percentage");
    expect(active).not.toHaveProperty("domains");
    expect(await exams.history(who("unrelated").id)).toEqual([]);
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse(initial.deadlineAt!) + 1000,
    );
    const completed = (await exams.history(learner.id))[0];
    expect(completed.status).toBe("submitted");
    expect(completed.submittedAt).toBe(initial.deadlineAt);
    expect(completed.domains?.map((domain) => domain.total)).toEqual([
      73, 40, 45, 42,
    ]);
  });
  it("creates new practice from actual missed concepts with different available examples", async () => {
    const learner = who("missed");
    const id = await exams.start(learner);
    const initial = await exams.view(id, learner.id);
    await expect(exams.studyMissed(id, learner)).rejects.toThrow("Submit");
    await exams.submit(id, learner.id);
    const next = await exams.studyMissed(id, learner);
    const saved = await practice.view(next, learner.id);
    expect(saved.mode).toBe("learning");
    expect(saved.questions).toHaveLength(25);
    expect(new Set(saved.questionIds).size).toBe(25);
    expect(
      saved.questionIds.every((id) => !initial.questionIds.includes(id)),
    ).toBe(true);
    await expect(exams.studyMissed(id, who("other"))).rejects.toThrow(
      "not found",
    );
  });
  it("keeps fixture generation out of production eligibility and administrator statistics", async () => {
    const summary = await exams.adminSummary(admin);
    expect(summary.approvedTotal).toBe(0);
    expect(summary.publishedTotal).toBe(0);
    expect(summary.availability.eligibleTotal).toBe(0);
    expect(summary.availability.canStart).toBe(false);
    expect(
      summary.availability.domains.map((domain) => domain.shortfall),
    ).toEqual([73, 40, 45, 42]);
    expect(summary.completedAttempts).toBe(0);
    expect(summary.questionStatistics).toEqual([]);
    await expect(exams.adminSummary(author)).rejects.toThrow("does not permit");
    vi.mocked(developmentExamFixturesEnabled).mockReturnValue(false);
    const production = await exams.availability(who("real-bank"));
    expect(production.developmentFixture).toBe(false);
    expect(production.eligibleTotal).toBe(0);
    await expect(exams.start(who("real-bank"))).rejects.toThrow("shortfall 73");
    await expect(
      exams.start({ id: "untrusted-demo", mode: "demo" }),
    ).rejects.toThrow("connected account");
  });
  it("enforces immutable deadline/order and rejects incomplete full-exam state at SQL level", async () => {
    const learner = who("sql-guard");
    const id = await exams.start(learner);
    const query = (await connection()).query;
    await expect(
      query(
        "UPDATE learning_sessions SET data=jsonb_set(data,'{deadlineAt}',to_jsonb('2099-01-01T00:00:00Z'::text)) WHERE id=$1",
        [id],
      ),
    ).rejects.toThrow("immutable");
    await expect(
      query(
        "UPDATE learning_sessions SET data=data-'currentQuestionIndex' WHERE id=$1",
        [id],
      ),
    ).rejects.toThrow("Complete full examination");
    const [row] = (
      await query("SELECT data FROM learning_sessions WHERE id=$1", [id])
    ).rows;
    const data: Record<string, unknown> = {
      ...(row.data as Record<string, unknown>),
      id: randomUUID(),
    };
    delete data.questionVersions;
    await expect(
      query(
        "INSERT INTO learning_sessions(id,owner_id,status,data) VALUES($1,$2,'in_progress',$3::jsonb)",
        [data.id, learner.id, JSON.stringify(data)],
      ),
    ).rejects.toThrow("Complete full examination");
  });
});

it("counts genuinely workflow-published canonical questions rather than rejecting all production candidates", async () => {
  const query = (await connection()).query;
  const [blueprint] = (
    await query(
      "SELECT source_url FROM blueprint_revisions WHERE id='chst5-2022.04.12'",
    )
  ).rows;
  await studioAction(admin, {
    action: "verify_blueprint",
    blueprintRevisionId: "chst5-2022.04.12",
    sourceUrl: String(blueprint.source_url),
    edition: "2022.04.12",
    section: "All supplied statements; isolated QA",
    notes:
      "Fictional local workflow test only; no actual source or official blueprint verification.",
    objectives: chstObjectives.map((objective) => ({
      code: objective.id,
      domain: objective.domain,
      title: objective.statement,
    })),
    humanAttestation: true,
  });
  const source = {
    id: "full-exam-source-QA",
    title: "Fictional isolated full exam test source",
    url: "https://example.test/full-exam-QA",
    edition: "QA only",
    section: "Fictional section",
    classification: "professional_guidance",
  };
  const content = {
    ...structuredClone(questionTemplate),
    certificationId: "chst",
    blueprintRevisionId: "chst5-2022.04.12",
    domain: "1",
    objectiveCode: chstObjectives[0].id,
    topic: "Synthetic published eligibility",
    sources: [source],
    title: "Isolated published examination eligibility fixture",
    body: {
      ...questionTemplate.body,
      choices: ["First", "Second", "Third", "Fourth"].map((text, index) => ({
        id: String.fromCharCode(97 + index),
        text,
        rationale: "Fictional isolated fixture rationale.",
      })),
    },
  };
  const act = async (who: typeof admin, input: unknown) =>
    (await studioAction(who, input)) as StudioItem;
  const expected = (item: StudioItem) => ({
    id: item.id,
    revision: item.revision,
    rowVersion: item.rowVersion,
  });
  let item = await act(author, { action: "create", content });
  item = await act(author, {
    action: "request_source_verification",
    ...expected(item),
  });
  item = await act(reviewer, {
    action: "verify_sources",
    ...expected(item),
    decision: "verified",
    findings:
      "Synthetic local source-proof test, not actual source validation.",
    sourceChecks: [
      {
        sourceId: source.id,
        edition: source.edition,
        section: source.section,
        url: source.url,
        outcome: "supports",
        notes: "Fictional isolated test evidence.",
      },
    ],
    humanAttestation: true,
  });
  item = await act(author, { action: "submit", ...expected(item) });
  item = await act(reviewer, {
    action: "review",
    ...expected(item),
    decision: "approved",
    findings: "Fictional local technical review test.",
    sourceChecks: [
      {
        sourceId: source.id,
        outcome: "supports",
        notes: "Synthetic fixture only.",
      },
    ],
    humanAttestation: true,
  });
  await act(admin, { action: "publish", ...expected(item) });
  vi.mocked(developmentExamFixturesEnabled).mockReturnValue(false);
  const available = await exams.availability(who("published-bank"));
  expect(available.domains[0]).toMatchObject({ eligible: 1, shortfall: 72 });
  expect(available.canStart).toBe(false);
  expect((await exams.adminSummary(admin)).publishedTotal).toBe(1);
  await query(
    "DELETE FROM editorial_roles WHERE subject_id=$1 AND role='reviewer'",
    [reviewer.id],
  );
  expect(
    (await exams.availability(who("revoked-reviewer"))).eligibleTotal,
  ).toBe(0);
  const invalid = await exams.adminSummary(admin);
  expect(invalid.publishedTotal).toBe(1);
  expect(invalid.invalidPublished).toBe(1);
});
