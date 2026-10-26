import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { grantStudioRole, revokeStudioRole } from "@/modules/studio/roles";
import {
  CHST_BLUEPRINT_ID,
  chstObjectives,
} from "@/modules/curriculum/catalog";
import {
  draftingJobAction,
  draftingJobs,
  draftingJobActionSchema,
} from "@/modules/studio/drafting-jobs";
import {
  registerResearchSources,
  importResearchDocument,
  researchAction,
  researchSnapshot,
} from "@/modules/research/service";
import { questionTemplate, type ContentDraft } from "@/modules/studio/model";
import {
  previewQuestionBatch,
  confirmQuestionBatch,
} from "@/modules/studio/service";
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
process.env.NEXT_PUBLIC_BROWSER_DEMO = "false";
delete process.env.DATABASE_URL;
const admin = { id: "drafting-jobs-admin", mode: "managed" as const },
  other = { id: "drafting-jobs-other-admin", mode: "managed" as const },
  author = { id: "drafting-jobs-author", mode: "managed" as const };
const objective = chstObjectives[0];
let blockedSourceId: string, sourceId: string;
const requested = (id: string, count = 2) => ({
  objectiveId: objective.id,
  count,
  difficulty: "intermediate" as const,
  sourceIds: [id],
});
beforeAll(async () => {
  await seedDemo();
  const c = await connection();
  for (const who of [admin, other, author])
    await c.query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(
    admin.id,
    "administrator",
    "isolated-software-QA-operator",
  );
  await grantStudioRole(
    other.id,
    "administrator",
    "isolated-software-QA-operator",
  );
  await grantStudioRole(author.id, "author", "isolated-software-QA-operator");
  const sources = await registerResearchSources(admin, [
    {
      originalUrl: "",
      title: "Unretrieved synthetic software QA source",
      publisher: "QA publisher",
      classification: "technical_research",
      access: "user_supplied",
      license: "licensed_private",
      licensedIdentifier: "qa-blocked-source",
    },
    {
      originalUrl: "",
      title: "Synthetic private source — software workflow fixture only",
      publisher: "QA publisher",
      classification: "technical_research",
      access: "user_supplied",
      license: "licensed_private",
      licensedIdentifier: "qa-processed-source",
    },
  ]);
  [blockedSourceId, sourceId] = sources.map((source) => source.id);
});
afterAll(async () => {
  await (await connection()).close();
});
describe("persistent source-gated AI drafting requests", () => {
  it("requires administrator identity, denies browser storage, and rejects invented authority metadata", async () => {
    await expect(draftingJobs(author)).rejects.toMatchObject({ status: 403 });
    await expect(
      draftingJobAction(author, {
        action: "create",
        requestKey: randomUUID(),
        request: requested(blockedSourceId),
      }),
    ).rejects.toMatchObject({ status: 403 });
    process.env.NEXT_PUBLIC_BROWSER_DEMO = "true";
    try {
      await expect(draftingJobs(admin)).rejects.toMatchObject({ status: 403 });
    } finally {
      process.env.NEXT_PUBLIC_BROWSER_DEMO = "false";
    }
    expect(
      draftingJobActionSchema.safeParse({
        action: "create",
        requestKey: randomUUID(),
        request: { ...requested(blockedSourceId), approved: true },
      }).success,
    ).toBe(false);
  });
  it("persists and resumes blocked requests idempotently without producing unsupported questions", async () => {
    const key = randomUUID(),
      input = {
        action: "create",
        requestKey: key,
        request: requested(blockedSourceId),
      };
    const job = await draftingJobAction(admin, input);
    expect(job.status).toBe("blocked_sources");
    expect(job.brief).toBeNull();
    expect(job.sourcePins).toEqual([]);
    expect(job.blockers.length).toBeGreaterThan(0);
    expect((await draftingJobAction(admin, input)).id).toBe(job.id);
    expect(
      (
        await draftingJobAction(admin, {
          action: "prepare",
          id: job.id,
          revision: job.revision,
        })
      ).revision,
    ).toBe(job.revision);
    const saved = (await draftingJobs(admin)).jobs.find(
      (item) => item.id === job.id,
    )!;
    expect(saved.linkedQuestions).toEqual([]);
    expect(saved.evidenceCurrent).toBe(false);
    await expect(
      draftingJobAction(admin, {
        ...input,
        request: { ...input.request, count: 3 },
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await draftingJobs(other)).jobs).toEqual([]);
    await expect(
      draftingJobAction(other, {
        action: "prepare",
        id: job.id,
        revision: job.revision,
      }),
    ).rejects.toMatchObject({ status: 404 });
    const cancelled = await draftingJobAction(admin, {
      action: "cancel",
      id: job.id,
      revision: job.revision,
    });
    expect(cancelled.status).toBe("cancelled");
    await expect(
      draftingJobAction(admin, {
        action: "prepare",
        id: job.id,
        revision: cancelled.revision,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("requires an actual extracted, human-reviewed, exact section before saving a citation-only brief", async () => {
    const imported = await importResearchDocument(
      admin,
      sourceId,
      new TextEncoder().encode(
        "<html><head><title>Synthetic workflow evidence</title></head><body><main><h1>Software QA fixture</h1><p>SYNTHETIC SOFTWARE QA FIXTURE. This is not a construction safety reference. Confidential sample body must not enter a generated brief. Workflow evidence is exercised only in an isolated test database.</p></main></body></html>",
      ),
      { format: "html", rightsAttestation: true },
    );
    const snapshot = await researchSnapshot(admin, { sourceId });
    const section = snapshot.sections.find(
      (item) => item.sourceId === sourceId,
    )!;
    expect(section).toBeTruthy();
    await researchAction(admin, {
      action: "link",
      sourceId,
      objectiveId: objective.id,
      sectionId: section.id,
      relationKind: "supports",
      notes:
        "Synthetic isolated permission fixture; not an actual claim of CHST source support.",
    });
    const job = await draftingJobAction(admin, {
      action: "create",
      requestKey: randomUUID(),
      request: requested(sourceId),
    });
    expect(job.status).toBe("blocked_sources");
    await researchAction(admin, {
      action: "review_source",
      sourceId,
      documentHash: imported.documentHash,
      decision: "verified",
      findings:
        "Synthetic software test verifies the review state machine only. This record is not production technical evidence.",
      humanAttestation: true,
    });
    const prepared = await draftingJobAction(admin, {
      action: "prepare",
      id: job.id,
      revision: job.revision,
    });
    expect(prepared.status).toBe("awaiting_output");
    expect(prepared.evidenceCurrent).toBe(true);
    expect(prepared.sourcePins).toHaveLength(1);
    expect(prepared.brief).toContain(imported.documentHash);
    expect(prepared.brief).toContain(section.locator);
    expect(prepared.brief).not.toContain(
      "Confidential sample body must not enter",
    );
    expect(prepared.brief).toContain(
      "No model request or source-text transmission",
    );
    expect(
      (
        await draftingJobAction(admin, {
          action: "prepare",
          id: prepared.id,
          revision: prepared.revision,
        })
      ).revision,
    ).toBe(prepared.revision);
    await expect(
      draftingJobAction(admin, {
        action: "cancel",
        id: prepared.id,
        revision: job.revision,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("links only real owned AI draft imports, keeps them unpublished, and enforces count and immutable history", async () => {
    const job = (await draftingJobs(admin)).jobs.find(
      (item) => item.status === "awaiting_output",
    )!;
    const content: ContentDraft = {
      ...questionTemplate,
      blueprintRevisionId: CHST_BLUEPRINT_ID,
      objectiveCode: objective.id,
      origin: "ai_generated",
      title: "Synthetic drafting job output; not safety instruction",
      sources: [
        {
          id: "qa-candidate-source",
          title: "Synthetic software fixture; not a safety reference",
          url: "",
          edition: "",
          section: "",
          classification: "professional_guidance",
        },
      ],
      body: {
        ...questionTemplate.body,
        stem: "Which software workflow preserves this unreviewed synthetic item as a draft without publishing it?",
      },
    };
    const preview = await previewQuestionBatch(
      admin,
      "json",
      JSON.stringify([{ id: "draft-job-qa-output", content }]),
    );
    expect(preview.errors).toEqual([]);
    expect(preview.duplicates).toEqual([]);
    const result = await confirmQuestionBatch(admin, preview.id),
      question = result.imported[0];
    const linked = await draftingJobAction(admin, {
      action: "link_imports",
      id: job.id,
      revision: job.revision,
      questionIds: [question.id],
    });
    expect(linked.status).toBe("drafts_linked");
    expect(linked.linkedQuestions).toEqual([
      { id: question.id, revisionId: question.revisionId },
    ]);
    expect(
      (
        await draftingJobAction(admin, {
          action: "link_imports",
          id: linked.id,
          revision: linked.revision,
          questionIds: [question.id],
        })
      ).revision,
    ).toBe(linked.revision);
    await expect(
      draftingJobAction(admin, {
        action: "link_imports",
        id: linked.id,
        revision: linked.revision,
        questionIds: ["not-an-import-1", "not-an-import-2"],
      }),
    ).rejects.toMatchObject({ status: 422 });
    const c = await connection();
    expect(
      Number(
        (await c.query("SELECT count(*) AS total FROM published_questions"))
          .rows[0].total,
      ),
    ).toBe(0);
    expect(
      (
        await c.query(
          "SELECT status FROM studio_workflow WHERE revision_id=$1",
          [question.revisionId],
        )
      ).rows[0].status,
    ).toBe("draft");
    await expect(
      c.query("DELETE FROM studio_drafting_job_questions WHERE job_id=$1", [
        job.id,
      ]),
    ).rejects.toThrow(/immutable/);
    const second = await draftingJobAction(admin, {
      action: "create",
      requestKey: randomUUID(),
      request: requested(sourceId),
    });
    const prepared = await draftingJobAction(admin, {
      action: "prepare",
      id: second.id,
      revision: second.revision,
    });
    await expect(
      draftingJobAction(admin, {
        action: "link_imports",
        id: prepared.id,
        revision: prepared.revision,
        questionIds: [question.id],
      }),
    ).rejects.toMatchObject({ status: 409 });
    const otherJob = await draftingJobAction(other, {
      action: "create",
      requestKey: randomUUID(),
      request: requested(sourceId),
    });
    const otherPrepared = await draftingJobAction(other, {
      action: "prepare",
      id: otherJob.id,
      revision: otherJob.revision,
    });
    await expect(
      draftingJobAction(other, {
        action: "link_imports",
        id: otherPrepared.id,
        revision: otherPrepared.revision,
        questionIds: [question.id],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("invalidates saved evidence after reviewer-role revocation and prevents additional linked outputs", async () => {
    const job = (await draftingJobs(admin)).jobs.find(
      (item) => item.status === "drafts_linked",
    )!;
    await revokeStudioRole(
      admin.id,
      "administrator",
      "isolated-software-QA-operator",
    );
    // The other administrator may see the source state, but never this owner's job.
    const otherJob = (await draftingJobs(other)).jobs.find(
      (item) => item.status === "awaiting_output",
    )!;
    expect(otherJob.evidenceCurrent).toBe(false);
    expect(otherJob.blockers.join(" ")).toMatch(/human source verification/);
    await expect(
      draftingJobAction(other, {
        action: "link_imports",
        id: otherJob.id,
        revision: otherJob.revision,
        questionIds: ["invented-question"],
      }),
    ).rejects.toMatchObject({ status: 409 });
    await grantStudioRole(
      admin.id,
      "administrator",
      "isolated-software-QA-operator",
    );
    const restored = (await draftingJobs(admin)).jobs.find(
      (item) => item.id === job.id,
    )!;
    expect(restored.evidenceCurrent).toBe(true);
  });
  it("blocks stale hashes and section links instead of reusing an earlier research review", async () => {
    const job = (await draftingJobs(admin)).jobs.find(
      (item) => item.status === "awaiting_output",
    )!;
    const previousHash = job.sourcePins[0].documentHash;
    const imported = await importResearchDocument(
      admin,
      sourceId,
      new TextEncoder().encode(
        "<html><head><title>Revised synthetic workflow source</title></head><body><main><h1>Revised software fixture</h1><p>Different private synthetic body. This change must not inherit source review or exact-section support from an older source hash.</p></main></body></html>",
      ),
      { format: "html", rightsAttestation: true },
    );
    expect(imported.documentHash).not.toBe(previousHash);
    const resumed = (await draftingJobs(admin)).jobs.find(
      (item) => item.id === job.id,
    )!;
    expect(resumed.evidenceCurrent).toBe(false);
    expect(resumed.blockers.join(" ")).toMatch(
      /evidence changed|verification|required|supporting section/,
    );
    const blocked = await draftingJobAction(admin, {
      action: "prepare",
      id: job.id,
      revision: job.revision,
    });
    expect(blocked.status).toBe("blocked_sources");
    expect(blocked.brief).toBeNull();
    expect(blocked.sourcePins).toEqual([]);
  });
  it("accepts human-resolved extracted text, retains parser flags, and rejects revoked or stale section attestations", async () => {
    const [manualSource] = await registerResearchSources(admin, [
      {
        originalUrl: "",
        title:
          "Synthetic manually scoped text — software permission fixture only",
        publisher: "QA publisher",
        classification: "technical_research",
        access: "user_supplied",
        license: "licensed_private",
        licensedIdentifier: "qa-manually-resolved-text",
        rightsNotes:
          "Original synthetic software fixture; not safety guidance.",
      },
    ]);
    const imported = await importResearchDocument(
      admin,
      manualSource.id,
      new TextEncoder().encode(
        "SYNTHETIC SOFTWARE WORKFLOW FIXTURE. This private body is not construction safety guidance. The extracted text has no original page numbering. An authorized human must examine its document scope and citation meaning before the software can use citation metadata. No actual technical conclusion or production approval is asserted by this isolated test.",
      ),
      { format: "text", rightsAttestation: true },
    );
    let inventory = await researchSnapshot(admin, {
      sourceId: manualSource.id,
    });
    const sections = inventory.sections.filter(
      (section) => section.sourceId === manualSource.id,
    );
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.every((section) => section.needsManualReview)).toBe(true);
    await researchAction(admin, {
      action: "link",
      sourceId: manualSource.id,
      objectiveId: objective.id,
      sectionId: sections[0].id,
      relationKind: "supports",
      notes:
        "Synthetic objective-link permission test only; not actual CHST source evidence.",
    });
    const verify = {
      action: "review_source",
      sourceId: manualSource.id,
      documentHash: imported.documentHash,
      decision: "verified",
      findings:
        "Synthetic isolated review-state test. No genuine safety source was examined.",
      humanAttestation: true,
    };
    await expect(researchAction(admin, verify)).rejects.toMatchObject({
      status: 422,
    });
    let job = await draftingJobAction(admin, {
      action: "create",
      requestKey: randomUUID(),
      request: requested(manualSource.id),
    });
    expect(job.status).toBe("blocked_sources");
    for (const section of sections)
      await researchAction(other, {
        action: "review_section",
        sourceId: manualSource.id,
        sectionId: section.id,
        documentHash: imported.documentHash,
        decision: "resolved",
        notes:
          "Synthetic QA scope and citation check; no missing pages or source text were invented.",
        humanAttestation: true,
      });
    job = await draftingJobAction(admin, {
      action: "prepare",
      id: job.id,
      revision: job.revision,
    });
    expect(job.status).toBe("blocked_sources");
    await researchAction(admin, verify);
    job = await draftingJobAction(admin, {
      action: "prepare",
      id: job.id,
      revision: job.revision,
    });
    expect(job.status).toBe("awaiting_output");
    expect(job.evidenceCurrent).toBe(true);
    expect(job.brief).not.toContain(
      "This private body is not construction safety guidance",
    );
    const c = await connection();
    const [raw] = (
      await c.query(
        "SELECT s.parse_status,t.needs_manual_review FROM research_sources s JOIN research_sections t ON t.source_id=s.id AND t.document_hash=s.document_hash WHERE s.id=$1",
        [manualSource.id],
      )
    ).rows;
    expect(raw.parse_status).not.toBe("parsed");
    expect(raw.needs_manual_review).toBe(true);
    await revokeStudioRole(
      other.id,
      "administrator",
      "isolated-software-QA-operator",
    );
    try {
      const resumed = (await draftingJobs(admin)).jobs.find(
        (item) => item.id === job.id,
      )!;
      expect(resumed.evidenceCurrent).toBe(false);
      job = await draftingJobAction(admin, {
        action: "prepare",
        id: job.id,
        revision: job.revision,
      });
      expect(job.status).toBe("blocked_sources");
      expect(job.brief).toBeNull();
    } finally {
      await grantStudioRole(
        other.id,
        "administrator",
        "isolated-software-QA-operator",
      );
    }
    job = await draftingJobAction(admin, {
      action: "prepare",
      id: job.id,
      revision: job.revision,
    });
    expect(job.evidenceCurrent).toBe(true);
    const [current] = (
      await c.query(
        "SELECT metadata,metadata_revision FROM research_sources WHERE id=$1",
        [manualSource.id],
      )
    ).rows;
    await researchAction(admin, {
      action: "update_metadata",
      sourceId: manualSource.id,
      expectedRevision: Number(current.metadata_revision),
      source: {
        ...(current.metadata as Record<string, unknown>),
        rightsNotes:
          "Changed synthetic rights scope requires fresh current-metadata source and section examinations.",
      },
    });
    inventory = await researchSnapshot(admin, { sourceId: manualSource.id });
    expect(
      inventory.sources.find((item) => item.id === manualSource.id)?.status,
    ).not.toBe("verified");
    expect(
      (await draftingJobs(admin)).jobs.find((item) => item.id === job.id)
        ?.evidenceCurrent,
    ).toBe(false);
    await expect(researchAction(admin, verify)).rejects.toMatchObject({
      status: 422,
    });
  });
});
