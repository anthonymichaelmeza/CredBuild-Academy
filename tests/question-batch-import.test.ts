import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { grantStudioRole } from "@/modules/studio/roles";
import {
  confirmQuestionBatch,
  previewQuestionBatch,
} from "@/modules/studio/service";
import {
  parseQuestionBatch,
  questionImportTemplates,
} from "@/modules/studio/batch-import";

process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
delete process.env.NEXT_PUBLIC_BROWSER_DEMO;
const admin = { id: "question-bank-QA-admin", mode: "managed" as const };
const otherAdmin = {
  id: "question-bank-QA-other-admin",
  mode: "managed" as const,
};
const author = { id: "question-bank-QA-author", mode: "managed" as const };
const draft = (
  id: string,
  stem = `Synthetic parser test ${id}; no safety instruction.`,
) => {
  const [template] = JSON.parse(questionImportTemplates().json);
  return {
    ...template,
    id,
    title: stem,
    origin: "ai_generated",
    body: { ...template.body, stem },
  };
};
beforeAll(async () => {
  await seedDemo();
  const c = await connection();
  for (const actor of [admin, otherAdmin, author])
    await c.query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      actor.id,
    ]);
  await grantStudioRole(
    admin.id,
    "administrator",
    "isolated-question-import-QA",
  );
  await grantStudioRole(
    otherAdmin.id,
    "administrator",
    "isolated-question-import-QA",
  );
  await grantStudioRole(author.id, "author", "isolated-question-import-QA");
});
afterAll(async () => (await connection()).close());

describe("canonical CSV and JSON question validation", () => {
  it("reads both downloadable templates and supports quoted commas, quotes and line breaks", () => {
    const templates = questionImportTemplates();
    expect(parseQuestionBatch("json", templates.json).records).toHaveLength(1);
    expect(parseQuestionBatch("csv", templates.csv).records).toHaveLength(1);
    const csv = templates.csv.replace(
      '"Replace with an original question."',
      '"Quoted, scenario: ""pause""\nthen inspect."',
    );
    const parsed = parseQuestionBatch("csv", csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.records[0].row).toBe(2);
    expect(parsed.records[0].content.body).toMatchObject({
      stem: 'Quoted, scenario: "pause"\nthen inspect.',
    });
  });
  it("reports malformed CSV and field errors rather than silently dropping data", () => {
    const templates = questionImportTemplates();
    for (const text of [
      '"unterminated',
      "id,id\none,two",
      "unknown\nvalue",
      templates.csv.replace("choice_d,", "typo_choice,"),
    ]) {
      expect(parseQuestionBatch("csv", text).errors.length).toBeGreaterThan(0);
    }
    const bad = draft("bad-four-choices");
    bad.body.choices.pop();
    expect(
      parseQuestionBatch("json", JSON.stringify([bad])).errors[0].message,
    ).toMatch(/four distinct/);
    expect(
      parseQuestionBatch(
        "json",
        JSON.stringify([
          { ...draft("bad-map"), objectiveCode: "invented-official-objective" },
        ]),
      ).errors[0].message,
    ).toMatch(/exact supplied/);
    expect(
      parseQuestionBatch(
        "json",
        JSON.stringify([{ ...draft("forged-approval"), approved: true }]),
      ).errors[0].message,
    ).toMatch(/Unrecognized/);
  });
  it("rejects duplicate external IDs, invalid grading keys, oversized files and oversized batches", () => {
    const repeated = parseQuestionBatch(
      "json",
      JSON.stringify([
        draft("same-id", "Different first QA stem"),
        draft("same-id", "Different second QA stem"),
      ]),
    );
    expect(repeated.duplicates).toHaveLength(1);
    expect(repeated.duplicates[0]).toMatch(/same-id/);
    const badKey = draft("bad-key");
    badKey.body.correctChoice = "missing";
    expect(
      parseQuestionBatch("json", JSON.stringify([badKey])).errors[0].message,
    ).toMatch(/existing correct choice/);
    expect(
      parseQuestionBatch("json", "x".repeat(250_001)).errors[0].message,
    ).toMatch(/250 KB/);
    expect(
      parseQuestionBatch(
        "json",
        JSON.stringify(
          Array.from({ length: 51 }, (_, index) => draft(`row-${index}`)),
        ),
      ).errors[0].message,
    ).toMatch(/1 and 50/);
    expect(
      parseQuestionBatch("json", JSON.stringify([draft("invalid id")]))
        .errors[0].message,
    ).toMatch(/stable external ID/);
  });
  it("supports legacy no-ID JSON and ID/content wrappers without inventing verification", () => {
    const raw = draft("legacy");
    const { id: _id, ...legacy } = raw;
    void _id;
    const parsed = parseQuestionBatch(
      "json",
      JSON.stringify([
        legacy,
        {
          id: "wrapped-qa",
          content: {
            ...legacy,
            body: { ...legacy.body, stem: "Different wrapper QA stem" },
          },
        },
      ]),
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.records.map((record) => record.externalId)).toEqual([
      null,
      "wrapped-qa",
    ]);
    expect(
      parsed.records.every(
        (record) => record.content.origin === "ai_generated",
      ),
    ).toBe(true);
    expect(parsed.records[0].content.sources[0]).not.toHaveProperty(
      "verifiedAt",
    );
  });
});

describe("admin-only, durable and atomic Question Bank ingestion", () => {
  it("imports drafts under generated logical identities, preserves AI origin and records immutable external IDs", async () => {
    const preview = await previewQuestionBatch(
      admin,
      "json",
      JSON.stringify([draft("durable-QA-1")]),
    );
    expect(preview.errors).toEqual([]);
    expect(preview.duplicates).toEqual([]);
    const result = await confirmQuestionBatch(admin, preview.id);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]).toMatchObject({
      status: "draft",
      data: { origin: "ai_generated" },
    });
    expect(result.imported[0].id).not.toBe("durable-QA-1");
    const c = await connection();
    const [mapping] = (
      await c.query(
        "SELECT * FROM studio_import_question_ids WHERE external_id='durable-QA-1'",
      )
    ).rows;
    expect(mapping.content_id).toBe(result.imported[0].id);
    expect(mapping.imported_by).toBe(admin.id);
    await expect(
      c.query(
        "UPDATE studio_import_question_ids SET external_id='changed' WHERE content_id=$1",
        [mapping.content_id],
      ),
    ).rejects.toThrow(/immutable/);
    expect(
      (await c.query("SELECT * FROM published_questions")).rows,
    ).toHaveLength(0);
    expect((await c.query("SELECT * FROM studio_reviews")).rows).toHaveLength(
      0,
    );
    await expect(confirmQuestionBatch(admin, preview.id)).rejects.toThrow(
      /already consumed/,
    );
  });
  it("rejects already ingested IDs even when the question text is different", async () => {
    const preview = await previewQuestionBatch(
      admin,
      "json",
      JSON.stringify([
        draft(
          "durable-QA-1",
          "A changed question cannot reuse an imported external identity.",
        ),
      ]),
    );
    expect(preview.duplicates.join(" ")).toMatch(/already imported/);
    await expect(confirmQuestionBatch(admin, preview.id)).rejects.toThrow(
      /Resolve all import errors/,
    );
  });
  it("blocks entire malformed batches and detects duplicate IDs introduced after preview", async () => {
    const malformed = await previewQuestionBatch(
      admin,
      "json",
      JSON.stringify([draft("must-not-import"), { id: "broken" }]),
    );
    expect(malformed.records).toHaveLength(1);
    expect(malformed.errors).toHaveLength(1);
    await expect(confirmQuestionBatch(admin, malformed.id)).rejects.toThrow(
      /Resolve all import errors/,
    );
    expect(
      (
        await (
          await connection()
        ).query(
          "SELECT * FROM studio_import_question_ids WHERE external_id='must-not-import'",
        )
      ).rows,
    ).toHaveLength(0);
    const first = await previewQuestionBatch(
      admin,
      "json",
      JSON.stringify([draft("racing-external-id", "First concurrent QA stem")]),
    );
    const second = await previewQuestionBatch(
      admin,
      "json",
      JSON.stringify([
        draft("racing-external-id", "Second concurrent QA stem"),
      ]),
    );
    const results = await Promise.allSettled([
      confirmQuestionBatch(admin, first.id),
      confirmQuestionBatch(admin, second.id),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      (
        await (
          await connection()
        ).query(
          "SELECT * FROM studio_import_question_ids WHERE external_id='racing-external-id'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("requires current administrator permission and binds preview confirmation to its owner", async () => {
    await expect(
      previewQuestionBatch(
        author,
        "json",
        JSON.stringify([draft("author-denied")]),
      ),
    ).rejects.toThrow(/does not permit/);
    const preview = await previewQuestionBatch(
      admin,
      "json",
      JSON.stringify([draft("owner-bound")]),
    );
    await expect(confirmQuestionBatch(otherAdmin, preview.id)).rejects.toThrow(
      /missing, expired/,
    );
    await expect(confirmQuestionBatch(author, preview.id)).rejects.toThrow(
      /does not permit/,
    );
  });
});
