import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { chstDraftRecords } from "@/content/chst/draft-bank";
import { importOriginalDraftBatch } from "@/modules/studio/service";
import { grantStudioRole } from "@/modules/studio/roles";
import { curriculumCoverage } from "@/modules/curriculum/service";

process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
const author = { id: "qa-original-draft-author", mode: "managed" as const };
const otherAuthor = { id: "qa-other-draft-author", mode: "managed" as const };
const administrator = {
  id: "qa-curriculum-administrator",
  mode: "managed" as const,
};
const records = chstDraftRecords.map(({ id, content, category }) => ({
  id,
  content,
  category,
}));

beforeAll(async () => {
  await seedDemo();
  const query = (await connection()).query;
  for (const who of [author, otherAuthor, administrator]) {
    await query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  }
  await grantStudioRole(author.id, "author", "isolated-QA-operator");
  await grantStudioRole(otherAuthor.id, "author", "isolated-QA-operator");
  await grantStudioRole(
    administrator.id,
    "administrator",
    "isolated-QA-operator",
  );
});
afterAll(async () => (await connection()).close());

describe("explicit original-draft ingestion and real curriculum coverage", () => {
  it("seeds the 78 objectives and 21 bibliography entries without fake question or source approvals", async () => {
    const coverage = await curriculumCoverage(administrator);
    expect(coverage.objectives).toHaveLength(78);
    expect(coverage.references).toHaveLength(21);
    expect(coverage.totals.questions).toBe(0);
    expect(coverage.totals.objectivesWithoutQuestions).toBe(78);
    expect(coverage.blueprint.latestOfficialVersionConfirmed).toBe(false);
    const [blueprint] = (
      await (
        await connection()
      ).query(
        "SELECT verified_at,verified_by FROM blueprint_revisions WHERE id='chst5-2022.04.12'",
      )
    ).rows;
    expect(blueprint.verified_at).toBeNull();
    expect(blueprint.verified_by).toBeNull();
  });

  it("imports all 100 original records in a transaction and reports actual coverage without publishing", async () => {
    expect(await importOriginalDraftBatch(author, records)).toEqual({
      imported: 100,
      skipped: 0,
      total: 100,
      published: 0,
    });
    const coverage = await curriculumCoverage(administrator);
    expect(coverage.totals.questions).toBe(100);
    expect(coverage.totals.draft).toBe(100);
    expect(coverage.totals.sourceVerified).toBe(0);
    expect(coverage.totals.approved).toBe(0);
    expect(coverage.totals.published).toBe(0);
    expect(coverage.totals.objectivesWithoutQuestions).toBe(0);
    expect(coverage.domains.map((domain) => domain.questions)).toEqual([
      37, 20, 22, 21,
    ]);
    expect(
      coverage.objectives.every((objective) => objective.questions >= 1),
    ).toBe(true);
  });

  it("is idempotent and cannot overwrite the drafts or take another owner's content", async () => {
    expect(await importOriginalDraftBatch(author, records)).toEqual({
      imported: 0,
      skipped: 100,
      total: 100,
      published: 0,
    });
    await expect(
      importOriginalDraftBatch(otherAuthor, records),
    ).rejects.toThrow(/differs|overwritten/i);
    const coverage = await curriculumCoverage(administrator, { domain: "2" });
    expect(coverage.totals.questions).toBe(20);
    expect(coverage.objectives).toHaveLength(15);
  });

  it("rolls back the entire batch when a later record invents an official objective", async () => {
    const first = { ...records[0], id: "qa-atomic-chst-valid" };
    const invalid = {
      ...records[1],
      id: "qa-atomic-chst-invalid",
      content: {
        ...records[1].content,
        objectiveCode: "CHST5-2022.04.12-D1-K999",
      },
    };
    await expect(
      importOriginalDraftBatch(author, [first, invalid]),
    ).rejects.toThrow(/objective/i);
    const rows = (
      await (
        await connection()
      ).query(
        "SELECT id FROM studio_content WHERE id IN ('qa-atomic-chst-valid','qa-atomic-chst-invalid')",
      )
    ).rows;
    expect(rows).toHaveLength(0);
  });
});
