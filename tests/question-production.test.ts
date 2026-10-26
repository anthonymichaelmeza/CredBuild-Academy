import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import {
  CHST_BLUEPRINT_ID,
  chstObjectives,
} from "@/modules/curriculum/catalog";
import { grantStudioRole, revokeStudioRole } from "@/modules/studio/roles";
import { studioAction } from "@/modules/studio/service";
import { questionProductionSummary } from "@/modules/studio/production";
import {
  normalizedQuestionStem,
  questionBankTargets,
  summarizeQuestionProduction,
  type ProductionHead,
} from "@/modules/studio/production-model";
import {
  questionTemplate,
  type ContentDraft,
  type StudioItem,
} from "@/modules/studio/model";
import type { ExamAvailability } from "@/modules/exams/types";

process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
process.env.NEXT_PUBLIC_BROWSER_DEMO = "false";
delete process.env.DATABASE_URL;

const admin = { id: "production-dashboard-admin", mode: "managed" as const };
const author = { id: "production-dashboard-author", mode: "managed" as const };
const reviewer = {
  id: "production-dashboard-reviewer",
  mode: "managed" as const,
};
const learner = {
  id: "production-dashboard-learner",
  mode: "managed" as const,
};
const exam: ExamAvailability = {
  count: 200,
  durationSeconds: 14400,
  blueprintVersion: "2022.04.12",
  latestOfficialVersionConfirmed: false,
  durationBasis: "credbuilt_practice_configuration",
  domains: [],
  eligibleTotal: 0,
  productionEligibleTotal: 0,
  productionReady: false,
  canStart: false,
  blockers: [],
  developmentFixture: false,
  signedIn: true,
  bankConnected: true,
};
function content(title = "Synthetic software fixture"): ContentDraft {
  return {
    ...questionTemplate,
    blueprintRevisionId: CHST_BLUEPRINT_ID,
    objectiveCode: chstObjectives[0].id,
    title,
    topic: "Synthetic current topic",
    body: {
      ...questionTemplate.body,
      stem: `${title}: this is a fictional software test, not safety instruction.`,
    },
  };
}
function head(
  id: string,
  overrides: Partial<ProductionHead> = {},
): ProductionHead {
  return {
    id,
    revisionId: `${id}:v1`,
    data: content(id),
    status: "draft",
    sourceVerified: false,
    ...overrides,
  };
}
beforeAll(async () => {
  await seedDemo();
  const query = (await connection()).query;
  for (const who of [admin, author, reviewer, learner])
    await query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(admin.id, "administrator", "isolated-dashboard-test");
  await grantStudioRole(author.id, "author", "isolated-dashboard-test");
  await grantStudioRole(reviewer.id, "reviewer", "isolated-dashboard-test");
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => (await connection()).close());

describe("actual Question Bank production dashboard", () => {
  it("counts one active instructional head, preserves publication mappings, and excludes fixtures and retired questions", () => {
    const old = content("Published historical topic");
    old.topic = "Original published topic";
    const current = content("New draft topic");
    current.domain = "2";
    current.objectiveCode = chstObjectives.find(
      (row) => row.domain === "2",
    )!.id;
    const result = summarizeQuestionProduction(
      [
        head("edited", { data: old }),
        head("edited", { revisionId: "edited:v2", data: current }),
        head("approved", { status: "approved", sourceVerified: true }),
        head("pending", { status: "technical_review", sourceVerified: true }),
        head("retired", { status: "retired" }),
        head("demo", { data: { ...content(), contentKind: "demonstration" } }),
      ],
      [{ id: "edited", data: old }],
      exam,
    );
    expect(result.totals).toMatchObject({
      total: 3,
      draft: 1,
      awaitingReview: 1,
      approved: 1,
      published: 1,
      retired: 1,
      needsSourceVerification: 1,
      missingObjectives: 76,
      unpublishedObjectives: 77,
    });
    expect(result.domains[0]).toMatchObject({ total: 2, published: 1 });
    expect(result.domains[1]).toMatchObject({ total: 1, published: 0 });
    expect(
      result.topics.find((row) => row.topic === "Original published topic"),
    ).toMatchObject({ total: 0, published: 1 });
    expect(result.exam.productionEligibleTotal).toBe(0);
    expect(
      Object.values(questionBankTargets.domains).reduce((a, b) => a + b, 0),
    ).toBe(2000);
  });

  it("flags punctuation, case and spacing matches across active content without treating history as a second question", () => {
    const a = content();
    const b = content();
    if (a.kind !== "question" || b.kind !== "question")
      throw new Error("Test shape");
    a.body.stem = "Fixture: WHICH color should this software test show?";
    b.body.stem = "  Fixture — which color should this SOFTWARE test show! ";
    const result = summarizeQuestionProduction(
      [
        head("a", { data: a }),
        head("b", { data: b }),
        head("retired", { data: a, status: "retired" }),
      ],
      [],
      exam,
    );
    expect(normalizedQuestionStem(a.body.stem)).toBe(
      normalizedQuestionStem(b.body.stem),
    );
    expect(result.totals.duplicateGroups).toBe(1);
    expect(result.totals.duplicateQuestions).toBe(2);
    expect(result.duplicateCandidates[0].questionIds).toEqual(["a", "b"]);
  });

  it("reads persisted current revisions and actual production shortfalls without publishing imports or counting demonstrations", async () => {
    const created = (await studioAction(admin, {
      action: "create",
      content: content("Persistent first draft"),
    })) as StudioItem;
    await studioAction(admin, {
      action: "revise",
      id: created.id,
      revision: created.revision,
      rowVersion: created.rowVersion,
      content: content("Persistent revised draft"),
    });
    await studioAction(admin, {
      action: "create",
      content: {
        ...content("Isolated demonstration fixture"),
        contentKind: "demonstration",
      },
    });
    const result = await questionProductionSummary(admin);
    expect(result.totals.total).toBe(1);
    expect(result.totals.draft).toBe(1);
    expect(result.totals.published).toBe(0);
    expect(result.totals.needsSourceVerification).toBe(1);
    expect(result.domains[0].total).toBe(1);
    expect(result.exam.productionReady).toBe(false);
    expect(result.exam.productionDomains?.map((row) => row.shortfall)).toEqual([
      73, 40, 45, 42,
    ]);
    expect(result.exam.productionEligibleTotal).toBe(0);
  });

  it("denies author, reviewer and learner accounts and rejects browser demo before database access", async () => {
    for (const who of [author, reviewer, learner])
      await expect(questionProductionSummary(who)).rejects.toMatchObject({
        status: 403,
      });
    const database = await connection();
    const query = vi.spyOn(database, "query");
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    await expect(questionProductionSummary(admin)).rejects.toMatchObject({
      status: 403,
    });
    expect(query).not.toHaveBeenCalled();
    query.mockRestore();
  });

  it("requires new source examination when a recorded examiner loses reviewer authorization without deleting the historical review", async () => {
    const source = {
      id: "synthetic-dashboard-source",
      title: "Fictional source used only to test dashboard authorization",
      url: "https://example.test/dashboard-source",
      edition: "Fictional QA edition",
      section: "Fictional QA section",
      classification: "professional_guidance" as const,
    };
    const created = (await studioAction(admin, {
      action: "create",
      content: {
        ...content("Source reviewer revocation QA"),
        sources: [source],
      },
    })) as StudioItem;
    const pending = (await studioAction(admin, {
      action: "request_source_verification",
      id: created.id,
      revision: created.revision,
      rowVersion: created.rowVersion,
    })) as StudioItem;
    await studioAction(reviewer, {
      action: "verify_sources",
      id: pending.id,
      revision: pending.revision,
      rowVersion: pending.rowVersion,
      decision: "verified",
      findings:
        "Synthetic workflow test only. No actual technical source examination is claimed.",
      humanAttestation: true,
      sourceChecks: [
        {
          sourceId: source.id,
          outcome: "supports",
          notes:
            "Fictional source evidence used only for this authorization test.",
          edition: source.edition,
          section: source.section,
          url: source.url,
        },
      ],
    });
    const before = await questionProductionSummary(admin);
    try {
      await revokeStudioRole(
        reviewer.id,
        "reviewer",
        "isolated-dashboard-test",
      );
      const after = await questionProductionSummary(admin);
      expect(after.totals.needsSourceVerification).toBe(
        before.totals.needsSourceVerification + 1,
      );
      expect(after.exam.productionEligibleTotal).toBe(0);
      expect(after.totals.approved).toBe(0);
      expect(after.totals.published).toBe(0);
      const [{ count }] = (
        await (
          await connection()
        ).query(
          "SELECT count(*) FROM studio_source_verifications WHERE revision_id=$1",
          [pending.revisionId],
        )
      ).rows;
      expect(Number(count)).toBe(1);
    } finally {
      await grantStudioRole(reviewer.id, "reviewer", "isolated-dashboard-test");
    }
  });
});
