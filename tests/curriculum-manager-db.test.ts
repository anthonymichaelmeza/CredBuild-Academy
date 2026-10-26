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
import { curriculumManagerSnapshot } from "@/modules/curriculum/manager-service";
import { chstObjectives } from "@/modules/curriculum/catalog";
import { chstDraftRecords } from "@/content/chst/draft-bank";
import { lessonResearchBriefs } from "@/content/chst/lesson-briefs";
import { studioAction } from "@/modules/studio/service";
import { grantStudioRole } from "@/modules/studio/roles";
import { researchAction } from "@/modules/research/service";

process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
process.env.NEXT_PUBLIC_BROWSER_DEMO = "false";
delete process.env.DATABASE_URL;
const admin = { id: "curriculum-manager-admin", mode: "managed" as const };
const author = { id: "curriculum-manager-author", mode: "managed" as const };
const learner = { id: "curriculum-manager-learner", mode: "managed" as const };
beforeAll(async () => {
  await seedDemo();
  const query = (await connection()).query;
  for (const who of [admin, author, learner])
    await query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(
    admin.id,
    "administrator",
    "isolated-curriculum-manager-test",
  );
  await grantStudioRole(
    author.id,
    "author",
    "isolated-curriculum-manager-test",
  );
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => (await connection()).close());

describe("live private curriculum inventory", () => {
  it("requires administrator access and keeps browser mode outside the editorial database", async () => {
    await expect(curriculumManagerSnapshot(author)).rejects.toThrow(
      /role|permit/i,
    );
    await expect(curriculumManagerSnapshot(learner)).rejects.toThrow(
      /editorial role/i,
    );
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    await expect(curriculumManagerSnapshot(admin)).rejects.toThrow(
      /browser|demonstration/i,
    );
  });
  it("starts from actual zero editorial records, retaining all 78 supplied statements", async () => {
    const snapshot = await curriculumManagerSnapshot(admin);
    expect(snapshot.objectives).toHaveLength(78);
    expect(snapshot.domains).toHaveLength(4);
    expect(snapshot.totals.withVerifiedEvidence).toBe(0);
    expect(snapshot.totals.withDraftQuestions).toBe(0);
    expect(snapshot.totals.withDraftLessons).toBe(0);
    expect(snapshot.totals.sourceGaps).toBe(78);
    expect(snapshot.totals.lessonBriefs).toBe(3);
    expect(
      snapshot.objectives.every(
        (row) => row.counts.questions === 0 && row.counts.lessons === 0,
      ),
    ).toBe(true);
  });
  it("reports saved drafts and candidate relationships without inventing evidence or counting a source-blocked brief as a technical lesson", async () => {
    await studioAction(author, {
      action: "create",
      content: chstDraftRecords[0].content,
    });
    await studioAction(admin, {
      action: "create",
      content: lessonResearchBriefs[0].draft,
    });
    await researchAction(admin, {
      action: "register",
      source: {
        originalUrl: "https://www.osha.gov/construction",
        title: "Synthetic candidate metadata for software QA only",
        publisher: "Fictional test fixture; no technical text examined",
        classification: "professional_guidance",
        access: "public_link",
        license: "public_metadata_only",
        publicationDate: null,
        licensedIdentifier: "",
        rightsNotes:
          "Software metadata QA only; does not verify construction advice.",
      },
    });
    const [source] = (
      await (
        await connection()
      ).query("SELECT id FROM research_sources WHERE metadata->>'title'=$1", [
        "Synthetic candidate metadata for software QA only",
      ])
    ).rows;
    await researchAction(admin, {
      action: "link",
      sourceId: String(source.id),
      objectiveId: chstObjectives[0].id,
      sectionId: null,
      relationKind: "candidate",
      notes: "Candidate only. No source text has been examined.",
    });
    const snapshot = await curriculumManagerSnapshot(admin);
    expect(snapshot.totals.withDraftQuestions).toBe(1);
    expect(snapshot.totals.withDraftLessons).toBe(0);
    expect(snapshot.totals.withVerifiedEvidence).toBe(0);
    expect(snapshot.totals.withApprovedLessons).toBe(0);
    expect(snapshot.objectives[0].counts.draftQuestions).toBe(1);
    expect(snapshot.objectives[0].sources).toHaveLength(1);
    expect(snapshot.objectives[0].sources[0].verified).toBe(false);
    expect(snapshot.objectives[0].coverageScore).toBe(0);
    const brief = snapshot.objectives.find(
      (row) => row.id === lessonResearchBriefs[0].objectiveId,
    )!;
    expect(brief.counts.lessons).toBe(1);
    expect(brief.counts.sourceBlockedLessonBriefs).toBe(1);
    expect(brief.counts.draftLessons).toBe(0);
    expect(snapshot.totals.withApprovedQuestions).toBe(0);
  });
});
