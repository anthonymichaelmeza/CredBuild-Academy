import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { grantStudioRole, requireStudioAccess } from "@/modules/studio/roles";
import {
  studioAction,
  readStudio,
  studioSnapshot,
} from "@/modules/studio/service";
import {
  listPublishedQuestions,
  getPublishedLesson,
} from "@/modules/studio/publication";
import {
  questionTemplate,
  lessonTemplate,
  type ContentDraft,
  type ImportPreview,
  type StudioItem,
} from "@/modules/studio/model";

process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
const author = { id: "qa-studio-author", mode: "managed" as const },
  reviewer = { id: "qa-studio-reviewer", mode: "managed" as const },
  admin = { id: "qa-studio-admin", mode: "managed" as const },
  learner = { id: "qa-studio-learner", mode: "managed" as const };
const source = {
  id: "qa-source",
  title: "Fictional fixture source; no technical validation",
  url: "https://example.test/fixture",
  edition: "QA fixture",
  section: "Fixture 1",
  classification: "professional_guidance" as const,
};
const current = (item: StudioItem) => ({
  id: item.id,
  revision: item.revision,
  rowVersion: item.rowVersion,
});
const question = (title: string): ContentDraft => ({
  ...questionTemplate,
  certificationId: "qa-studio-fixture",
  blueprintRevisionId: "qa-blueprint",
  domain: "qa-domain",
  objectiveCode: "QA-1",
  title,
  sources: [source],
  body: { ...questionTemplate.body, stem: `Fictional test item: ${title}` },
});
async function act(who: typeof author, input: unknown) {
  return (await studioAction(who, input)) as StudioItem;
}
async function approve(item: StudioItem) {
  const pending = await act(author, {
    action: "request_source_verification",
    ...current(item),
  });
  const verified = await act(reviewer, {
    action: "verify_sources",
    ...current(pending),
    decision: "verified",
    findings:
      "Isolated fictional source-examination fixture, not technical content verification.",
    sourceChecks: item.data.sources.map((source) => ({
      sourceId: source.id,
      outcome: "supports",
      notes: "Synthetic fixture examination only.",
      edition: source.edition,
      section: source.section,
      url: source.url,
    })),
    humanAttestation: true,
  });
  const submitted = await act(author, {
    action: "submit",
    ...current(verified),
  });
  return act(reviewer, {
    action: "review",
    ...current(submitted),
    decision: "approved",
    findings:
      "Fictional isolated QA fixture review, not actual source verification.",
    sourceChecks: [
      {
        sourceId: source.id,
        outcome: "supports",
        notes: "This is a synthetic test attestation only.",
      },
    ],
    humanAttestation: true,
  });
}
beforeAll(async () => {
  await seedDemo();
  const q = (await connection()).query;
  for (const who of [author, reviewer, admin, learner])
    await q("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(author.id, "author", "qa-operator");
  await grantStudioRole(author.id, "reviewer", "qa-operator");
  await grantStudioRole(reviewer.id, "reviewer", "qa-operator");
  await grantStudioRole(admin.id, "administrator", "qa-operator");
  await q(
    "INSERT INTO certifications(id,name,kind) VALUES('qa-studio-fixture','Fictional isolated test certification','credential_prep')",
  );
  await q(
    "INSERT INTO blueprint_revisions(id,certification_id,version_label,source_url,provenance,data) VALUES('qa-blueprint','qa-studio-fixture','QA','https://example.test/blueprint','Fictional isolated test fixture',$1::jsonb)",
    [JSON.stringify([{ code: "qa-domain", title: "Fictional test domain" }])],
  );
  await studioAction(admin, {
    action: "verify_blueprint",
    blueprintRevisionId: "qa-blueprint",
    sourceUrl: "https://example.test/blueprint",
    edition: "Fictional QA",
    section: "Fixture",
    notes: "This test does not verify any official blueprint.",
    objectives: [
      { code: "QA-1", domain: "qa-domain", title: "Fictional QA objective" },
    ],
    humanAttestation: true,
  });
});
afterAll(async () => {
  await (await connection()).close();
});
describe("protected transactional Content Studio", () => {
  it("defaults to learner, rejects self-approval and cannot publish an unapproved revision", async () => {
    await expect(requireStudioAccess(learner)).rejects.toThrow(
      "editorial role",
    );
    const draft = await act(author, {
      action: "create",
      content: question("Authorization fixture"),
    });
    await expect(
      act(learner, { action: "publish", ...current(draft) }),
    ).rejects.toThrow("editorial role");
    await expect(
      act(admin, { action: "publish", ...current(draft) }),
    ).rejects.toThrow("approved current revision");
    const submitted = await act(author, {
      action: "submit",
      ...current(draft),
    });
    await expect(
      act(author, {
        action: "review",
        ...current(submitted),
        decision: "approved",
        findings: "Attempted self approval",
        sourceChecks: [
          {
            sourceId: source.id,
            outcome: "supports",
            notes: "Not independent",
          },
        ],
        humanAttestation: true,
      }),
    ).rejects.toThrow("own content");
    expect((await readStudio(author, draft.id)).status).toBe(
      "technical_review",
    );
  });
  it("publishes approved exact revisions, preserves history after revision and retirement", async () => {
    const draft = await act(author, {
      action: "create",
      content: question("Publication fixture"),
    });
    const approved = await approve(draft);
    await expect(
      act(admin, { action: "publish", ...current(draft) }),
    ).rejects.toThrow("changed");
    const published = await act(admin, {
      action: "publish",
      ...current(approved),
    });
    const q = (await listPublishedQuestions()).find((q) => q.id === draft.id)!;
    expect(q.stem).toBe(
      (draft.data as Extract<ContentDraft, { kind: "question" }>).body.stem,
    );
    expect(published.status).toBe("published");
    const revision = await act(author, {
      action: "revise",
      ...current(published),
      content: question("Publication fixture revised"),
    });
    expect(revision).toMatchObject({
      revision: 2,
      status: "draft",
      publishedRevisionId: published.revisionId,
    });
    expect(
      revision.reviews.every((r) => r.revisionId !== revision.revisionId),
    ).toBe(true);
    await expect(
      act(admin, { action: "publish", ...current(revision) }),
    ).rejects.toThrow("approved current revision");
    const withdrawn = await act(admin, {
      action: "retire",
      ...current(revision),
    });
    expect(withdrawn).toMatchObject({
      revision: 2,
      status: "draft",
      publishedRevisionId: null,
    });
    expect(
      (await listPublishedQuestions()).some((q) => q.id === draft.id),
    ).toBe(false);
    expect(
      (await listPublishedQuestions(true)).find((q) => q.id === draft.id)
        ?.version,
    ).toBe(1);
    const approved2 = await approve(withdrawn);
    const published2 = await act(admin, {
      action: "publish",
      ...current(approved2),
    });
    expect(published2.versions.find((v) => v.revision === 1)?.status).toBe(
      "retired",
    );
    expect(
      (await listPublishedQuestions()).find((q) => q.id === draft.id)?.version,
    ).toBe(2);
    await act(admin, { action: "retire", ...current(published2) });
    expect(
      (await listPublishedQuestions()).some((q) => q.id === draft.id),
    ).toBe(false);
    expect(
      (await listPublishedQuestions(true))
        .filter((q) => q.id === draft.id)
        .map((q) => q.version),
    ).toEqual([1, 2]);
    expect(
      (await readStudio(author, draft.id)).events.map((e) => e.event),
    ).toContain("retired");
  });
  it("records revision requests and rejection without enabling in-place resubmission", async () => {
    const draft = await act(author, {
      action: "create",
      content: question("Revision request fixture"),
    });
    const submitted = await act(author, {
      action: "submit",
      ...current(draft),
    });
    const changes = await act(reviewer, {
      action: "review",
      ...current(submitted),
      decision: "changes_requested",
      findings: "Need clearer technical source support.",
      sourceChecks: [],
      humanAttestation: true,
    });
    expect(changes.status).toBe("changes_requested");
    await expect(
      act(author, { action: "submit", ...current(changes) }),
    ).rejects.toThrow("new draft revision");
    const revised = await act(author, {
      action: "revise",
      ...current(changes),
      content: question("Revised request fixture"),
    });
    expect(revised.status).toBe("draft");
  });
  it("blocks unverified blueprint, missing source evidence, and unsupported calculation content", async () => {
    const unverified = {
      ...question("Unverified fixture"),
      certificationId: "chst",
      blueprintRevisionId: "chst5-unverified",
      domain: "1",
    };
    const item = await act(author, { action: "create", content: unverified });
    const submitted = await act(author, { action: "submit", ...current(item) });
    await expect(
      act(reviewer, {
        action: "review",
        ...current(submitted),
        decision: "approved",
        findings: "Attempted unverified approval",
        sourceChecks: [
          { sourceId: source.id, outcome: "supports", notes: "Test" },
        ],
        humanAttestation: true,
      }),
    ).rejects.toThrow("reviewed canonical blueprint");
    const invalid = question("Calculation fixture");
    if (invalid.kind !== "question") throw new Error();
    invalid.body.type = "calculation";
    const calc = await act(author, { action: "create", content: invalid });
    await expect(approve(calc)).rejects.toThrow("worked solution steps");
  });
  it("imports validated questions atomically as drafts and prevents replay and owner substitution", async () => {
    const preview = (await studioAction(author, {
      action: "preview_import",
      records: [
        { ...question("Import one"), origin: "ai_generated" },
        { ...question("Import two"), origin: "human_authored" },
      ],
    })) as ImportPreview;
    expect(preview.errors).toEqual([]);
    expect(preview.duplicates).toEqual([]);
    expect(preview.records.map((record) => record.origin)).toEqual([
      "ai_generated",
      "human_authored",
    ]);
    await expect(
      studioAction(admin, { action: "confirm_import", previewId: preview.id }),
    ).rejects.toThrow("missing, expired");
    const imported = (await studioAction(author, {
      action: "confirm_import",
      previewId: preview.id,
    })) as { imported: StudioItem[] };
    expect(imported.imported).toHaveLength(2);
    expect(imported.imported.every((i) => i.status === "draft")).toBe(true);
    expect(imported.imported.map((i) => i.data.origin)).toEqual([
      "ai_generated",
      "human_authored",
    ]);
    expect(
      imported.imported.map(
        (i) => i.events.find((e) => e.event === "import_ingested")?.data,
      ),
    ).toEqual([
      { previewId: preview.id, declaredOrigin: "ai_generated" },
      { previewId: preview.id, declaredOrigin: "human_authored" },
    ]);
    expect(
      imported.imported.every(
        (i) =>
          i.events.find((e) => e.event === "import_ingested")?.revisionId ===
          i.revisionId,
      ),
    ).toBe(true);
    await expect(
      studioAction(author, { action: "confirm_import", previewId: preview.id }),
    ).rejects.toThrow("already consumed");
    const duplicate = (await studioAction(author, {
      action: "preview_import",
      records: [question("Import one")],
    })) as ImportPreview;
    expect(duplicate.duplicates.length).toBe(1);
    await expect(
      studioAction(author, {
        action: "confirm_import",
        previewId: duplicate.id,
      }),
    ).rejects.toThrow("errors and duplicates");
    const bad = (await studioAction(author, {
      action: "preview_import",
      records: [
        question("Safe row"),
        { ...question("Forged"), status: "published" },
      ],
    })) as ImportPreview;
    expect(bad.errors).toHaveLength(1);
    await expect(
      studioAction(author, { action: "confirm_import", previewId: bad.id }),
    ).rejects.toThrow("errors and duplicates");
    expect(
      (await studioSnapshot(author)).items.some(
        (i) => i.data.title === "Safe row",
      ),
    ).toBe(false);
  });
  it("delivers published lesson snapshots and blocks unresolved prerequisites", async () => {
    const draft: ContentDraft = {
      ...lessonTemplate,
      certificationId: "qa-studio-fixture",
      blueprintRevisionId: "qa-blueprint",
      domain: "qa-domain",
      objectiveCode: "QA-1",
      title: "Fictional lesson fixture",
      sources: [source],
    };
    const created = await act(author, { action: "create", content: draft });
    const approved = await approve(created);
    const published = await act(admin, {
      action: "publish",
      ...current(approved),
    });
    expect((await getPublishedLesson(created.id))?.title).toBe(draft.title);
    await act(admin, { action: "retire", ...current(published) });
    expect(await getPublishedLesson(created.id)).toBeNull();
    expect(await getPublishedLesson(created.id, 1)).not.toBeNull();
    if (draft.kind !== "lesson") throw new Error();
    draft.body.prerequisites = ["missing-lesson"];
    const invalid = await act(author, { action: "create", content: draft });
    await expect(approve(invalid)).rejects.toThrow(
      "prerequisite must be a published lesson",
    );
  });
});
