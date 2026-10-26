import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { grantStudioRole, revokeStudioRole } from "@/modules/studio/roles";
import { studioAction, readStudio } from "@/modules/studio/service";
import {
  editorialSnapshot,
  recordEditorialDecision,
  requireEditorialApproval,
} from "@/modules/studio/editorial";
import {
  questionTemplate,
  lessonTemplate,
  type StudioItem,
} from "@/modules/studio/model";
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
process.env.NEXT_PUBLIC_BROWSER_DEMO = "false";
const author = { id: "editorial-qa-author", mode: "managed" as const },
  technical = { id: "editorial-qa-technical", mode: "managed" as const },
  editor = { id: "editorial-qa-editor", mode: "managed" as const },
  admin = { id: "editorial-qa-admin", mode: "managed" as const },
  learner = { id: "editorial-qa-learner", mode: "managed" as const };
const source = {
  id: "qa-source",
  title: "Fictional software-only reference",
  url: "https://example.test/editorial-fixture",
  edition: "Synthetic edition",
  section: "Fictional section",
  classification: "professional_guidance" as const,
};
const expected = (item: StudioItem) => ({
  id: item.id,
  revision: item.revision,
  rowVersion: item.rowVersion,
});
const act = async (who: typeof author, input: unknown) =>
  (await studioAction(who, input)) as StudioItem;
function decision(item: StudioItem) {
  return {
    ...expected(item),
    editorialEvent: null as string | null,
    decision: "approved" as "approved" | "changes_requested" | "rejected",
    findings:
      "Fictional software QA editorial decision; no actual source or instructional material reviewed.",
    checks: {
      clarity: true,
      originality: true,
      distractors: true,
      answerClues: true,
      rights: true,
    },
    humanAttestation: true,
  };
}
async function create(title: string) {
  return act(author, {
    action: "create",
    content: {
      ...structuredClone(questionTemplate),
      certificationId: "qa-editorial",
      blueprintRevisionId: "qa-editorial-blueprint",
      domain: "qa",
      objectiveCode: "QA-1",
      title,
      topic: "Synthetic editorial testing",
      subtopic: "Software gates",
      sources: [source],
      body: {
        ...structuredClone(questionTemplate.body),
        stem: `Fictional software-only scenario for ${title}. Which action retains the required human review gates?`,
      },
    },
  });
}
async function technicalApproval(item: StudioItem) {
  let current = await act(author, {
    action: "request_source_verification",
    ...expected(item),
  });
  current = await act(technical, {
    action: "verify_sources",
    ...expected(current),
    decision: "verified",
    findings: "Synthetic source workflow test only.",
    sourceChecks: [
      {
        sourceId: source.id,
        outcome: "supports",
        notes: "Fictional evidence only.",
        edition: source.edition,
        section: source.section,
        url: source.url,
      },
    ],
    humanAttestation: true,
  });
  current = await act(author, { action: "submit", ...expected(current) });
  return act(technical, {
    action: "review",
    ...expected(current),
    decision: "approved",
    findings: "Synthetic technical review fixture only.",
    sourceChecks: [
      {
        sourceId: source.id,
        outcome: "supports",
        notes: "Fictional evidence only.",
      },
    ],
    humanAttestation: true,
  });
}
beforeAll(async () => {
  await seedDemo();
  const q = (await connection()).query;
  for (const who of [author, technical, editor, admin, learner])
    await q("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(author.id, "author", "isolated-QA");
  await grantStudioRole(author.id, "reviewer", "isolated-QA");
  await grantStudioRole(technical.id, "reviewer", "isolated-QA");
  await grantStudioRole(editor.id, "reviewer", "isolated-QA");
  await grantStudioRole(admin.id, "administrator", "isolated-QA");
  await q(
    "INSERT INTO certifications(id,name,kind) VALUES('qa-editorial','Fictional editorial QA','credential_prep')",
  );
  await q(
    "INSERT INTO blueprint_revisions(id,certification_id,version_label,source_url,provenance,data) VALUES('qa-editorial-blueprint','qa-editorial','QA','https://example.test/blueprint','Fictional fixture','[{\"code\":\"qa\",\"title\":\"Software QA\"}]')",
  );
  await studioAction(admin, {
    action: "verify_blueprint",
    blueprintRevisionId: "qa-editorial-blueprint",
    sourceUrl: "https://example.test/blueprint",
    edition: "QA",
    section: "Fixture",
    notes: "Synthetic fixture only.",
    objectives: [
      { code: "QA-1", domain: "qa", title: "Software-only objective" },
    ],
    humanAttestation: true,
  });
});
afterAll(async () => {
  await (await connection()).close();
});
describe("separate immutable human editorial approval", () => {
  it("requires an authorized reviewer and the exact technically approved revision", async () => {
    const item = await create("preconditions");
    await expect(editorialSnapshot(learner)).rejects.toThrow(/editorial role/);
    await expect(
      recordEditorialDecision(learner, decision(item)),
    ).rejects.toThrow(/editorial role/);
    await expect(
      recordEditorialDecision(editor, decision(item)),
    ).rejects.toThrow(/source and technical/);
    const approved = await technicalApproval(item);
    await expect(
      recordEditorialDecision(author, decision(approved)),
    ).rejects.toThrow(/own content/);
    await expect(
      recordEditorialDecision(editor, {
        ...decision(approved),
        humanAttestation: false,
      }),
    ).rejects.toThrow();
    await expect(
      recordEditorialDecision(editor, {
        ...decision(approved),
        checks: { ...decision(approved).checks, originality: false },
      }),
    ).rejects.toThrow(/every human editorial check/);
  });
  it("blocks publication until a separate human decision and preserves immutable evidence", async () => {
    const approved = await technicalApproval(await create("publication gate"));
    await expect(
      act(admin, { action: "publish", ...expected(approved) }),
    ).rejects.toThrow(/editorial approval/);
    const q = (await connection()).query;
    await expect(
      q("SELECT studio_require_editorial_approval($1)", [approved.revisionId]),
    ).rejects.toThrow(/editorial approval/);
    expect(approved.editorialApproved).toBe(false);
    await recordEditorialDecision(editor, decision(approved));
    expect((await readStudio(admin, approved.id)).editorialApproved).toBe(true);
    await requireEditorialApproval(q, approved.revisionId);
    await expect(
      q(
        "UPDATE studio_editorial_reviews SET findings='changed' WHERE revision_id=$1",
        [approved.revisionId],
      ),
    ).rejects.toThrow(/immutable/);
    const published = await act(admin, {
      action: "publish",
      ...expected(approved),
    });
    expect(published.status).toBe("published");
    const revised = await act(author, {
      action: "revise",
      ...expected(published),
      content: { ...published.data, title: "New unreviewed revision" },
    });
    await expect(
      requireEditorialApproval(q, revised.revisionId),
    ).rejects.toThrow(/editorial approval/);
    expect(
      (
        await q(
          "SELECT revision_id FROM studio_publications WHERE content_id=$1",
          [published.id],
        )
      ).rows[0].revision_id,
    ).toBe(published.revisionId);
  });
  it("retains negative decisions and rejects stale editorial submissions", async () => {
    const approved = await technicalApproval(await create("negative decision"));
    await recordEditorialDecision(editor, {
      ...decision(approved),
      decision: "changes_requested",
    });
    const q = (await connection()).query;
    const [event] = (
      await q("SELECT id FROM studio_editorial_reviews WHERE revision_id=$1", [
        approved.revisionId,
      ])
    ).rows;
    await expect(
      recordEditorialDecision(editor, decision(approved)),
    ).rejects.toThrow(/newer editorial decision/);
    await expect(
      act(admin, { action: "publish", ...expected(approved) }),
    ).rejects.toThrow(/editorial approval/);
    await recordEditorialDecision(editor, {
      ...decision(approved),
      editorialEvent: String(event.id),
    });
    expect(
      (
        await q(
          "SELECT id FROM studio_editorial_reviews WHERE revision_id=$1",
          [approved.revisionId],
        )
      ).rows,
    ).toHaveLength(2);
  });
  it("prevents citation metadata from publishing an unfinished source-blocked lesson brief", async () => {
    const created = await act(author, {
      action: "create",
      content: {
        ...structuredClone(lessonTemplate),
        certificationId: "qa-editorial",
        blueprintRevisionId: "qa-editorial-blueprint",
        domain: "qa",
        objectiveCode: "QA-1",
        title: "Unfinished source-blocked lesson",
        topic: "Synthetic editorial testing",
        subtopic: "Authoring brief",
        sources: [source],
        body: {
          ...structuredClone(lessonTemplate.body),
          summary:
            "SOURCE-BLOCKED AUTHORING BRIEF. Technical instruction has not been developed.",
        },
      },
    });
    const approved = await technicalApproval(created);
    await expect(
      recordEditorialDecision(editor, decision(approved)),
    ).rejects.toThrow(/source-blocked authoring brief/);
    const q = (await connection()).query;
    await expect(
      q(
        "INSERT INTO studio_editorial_reviews(id,revision_id,reviewer_id,decision,findings,checks,human_attestation) VALUES('qa-unfinished-editorial',$1,$2,'approved','Fictional bypass attempt',$3::jsonb,true)",
        [
          approved.revisionId,
          editor.id,
          JSON.stringify(decision(approved).checks),
        ],
      ),
    ).rejects.toThrow(/Source-blocked authoring briefs/);
    await expect(
      act(admin, { action: "publish", ...expected(approved) }),
    ).rejects.toThrow(/editorial approval/);
  });
  it("requires a currently authorized editorial reviewer at publication", async () => {
    const approved = await technicalApproval(
      await create("revoked editorial role"),
    );
    await recordEditorialDecision(editor, decision(approved));
    await revokeStudioRole(editor.id, "reviewer", "isolated-QA");
    await expect(
      act(admin, { action: "publish", ...expected(approved) }),
    ).rejects.toThrow(/editorial approval/);
    await grantStudioRole(editor.id, "reviewer", "isolated-QA");
    expect(
      (await act(admin, { action: "publish", ...expected(approved) })).status,
    ).toBe("published");
  });
});
