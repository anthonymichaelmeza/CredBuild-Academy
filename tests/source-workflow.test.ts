import { approveEditorialFixture } from "./shared/editorial-fixture";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { grantStudioRole } from "@/modules/studio/roles";
import {
  studioAction,
  importOriginalDraftBatch,
  studioSnapshot,
} from "@/modules/studio/service";
import { questionTemplate, type StudioItem } from "@/modules/studio/model";
import {
  curriculumCoverage,
  reportContentError,
  triageContentReport,
} from "@/modules/curriculum/service";
import {
  chstObjectives,
  CHST_BLUEPRINT_ID,
} from "@/modules/curriculum/catalog";
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
const author = { id: "source-qa-author", mode: "managed" as const },
  reviewer = { id: "source-qa-reviewer", mode: "managed" as const },
  admin = { id: "source-qa-admin", mode: "managed" as const },
  learner = { id: "source-qa-learner", mode: "managed" as const };
const source = {
  id: "fixture-source",
  title: "Fictional test source",
  url: "https://example.test/fixture",
  edition: "Synthetic edition",
  section: "Synthetic locator",
  classification: "professional_guidance" as const,
};
const expected = (item: StudioItem) => ({
  id: item.id,
  revision: item.revision,
  rowVersion: item.rowVersion,
});
const draft = (title: string) => ({
  ...questionTemplate,
  certificationId: "qa-source-cert",
  blueprintRevisionId: "qa-source-blueprint",
  domain: "qa",
  objectiveCode: "QA1",
  title,
  sources: [source],
  body: {
    ...questionTemplate.body,
    stem: `Synthetic source workflow ${title}?`,
  },
});
const act = async (who: typeof author, input: unknown) =>
  (await studioAction(who, input)) as StudioItem;
const checks = () => [
  {
    sourceId: source.id,
    outcome: "supports" as const,
    notes: "Fictional QA examination only; not technical approval.",
    edition: source.edition,
    section: source.section,
    url: source.url,
  },
];
async function verify(item: StudioItem) {
  const pending = await act(author, {
    action: "request_source_verification",
    ...expected(item),
  });
  return act(reviewer, {
    action: "verify_sources",
    ...expected(pending),
    decision: "verified",
    findings: "Synthetic independent source examination test.",
    sourceChecks: checks(),
    humanAttestation: true,
  });
}
async function approve(item: StudioItem) {
  const submitted = await act(author, { action: "submit", ...expected(item) });
  const approved = await act(reviewer, {
    action: "review",
    ...expected(submitted),
    decision: "approved",
    findings: "Separate fictional technical review test.",
    sourceChecks: checks().map(({ sourceId, outcome, notes }) => ({
      sourceId,
      outcome,
      notes,
    })),
    humanAttestation: true,
  });
  return approveEditorialFixture(reviewer, approved);
}
beforeAll(async () => {
  await seedDemo();
  const query = (await connection()).query;
  for (const actor of [author, reviewer, admin, learner])
    await query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      actor.id,
    ]);
  await grantStudioRole(author.id, "author", "qa");
  await grantStudioRole(author.id, "reviewer", "qa");
  await grantStudioRole(reviewer.id, "reviewer", "qa");
  await grantStudioRole(admin.id, "administrator", "qa");
  await query(
    "INSERT INTO certifications(id,name,kind) VALUES('qa-source-cert','Fictional test only','credential_prep')",
  );
  await query(
    "INSERT INTO blueprint_revisions(id,certification_id,version_label,source_url,provenance,data) VALUES('qa-source-blueprint','qa-source-cert','QA','https://example.test/blueprint','Synthetic fixture','[{\"code\":\"qa\",\"title\":\"Fictional\"}]')",
  );
  await studioAction(admin, {
    action: "verify_blueprint",
    blueprintRevisionId: "qa-source-blueprint",
    sourceUrl: "https://example.test/blueprint",
    edition: "QA",
    section: "Fixture",
    notes: "Synthetic fixture only.",
    objectives: [{ code: "QA1", domain: "qa", title: "Fictional objective" }],
    humanAttestation: true,
  });
});
afterAll(async () => {
  await (await connection()).close();
});
describe("separate source examination and curriculum operations", () => {
  it("seeds exact curriculum metadata without certifying technical content or the latest online blueprint", async () => {
    const q = (await connection()).query;
    expect(
      (await q("SELECT count(*) AS n FROM curriculum_objectives")).rows[0].n,
    ).toBe(78);
    expect(
      (await q("SELECT count(*) AS n FROM reference_publications")).rows[0].n,
    ).toBe(21);
    expect(
      (
        await q("SELECT verified_at FROM blueprint_revisions WHERE id=$1", [
          CHST_BLUEPRINT_ID,
        ])
      ).rows[0].verified_at,
    ).toBeNull();
    const coverage = await curriculumCoverage(reviewer);
    expect(coverage.objectives).toHaveLength(78);
    expect(coverage.totals.questions).toBe(0);
    expect(coverage.totals.objectivesWithoutQuestions).toBe(78);
    expect(
      coverage.references.every(
        (ref) => ref.verificationStatus === "not_reviewed",
      ),
    ).toBe(true);
    await expect(curriculumCoverage(learner)).rejects.toThrow("editorial role");
  });
  it("blocks technical approval without the separate source step, including raw SQL transitions", async () => {
    const created = await act(author, {
      action: "create",
      content: draft("requires proof"),
    });
    const submitted = await act(author, {
      action: "submit",
      ...expected(created),
    });
    await expect(approve(submitted)).rejects.toThrow("new draft revision");
    await expect(
      act(reviewer, {
        action: "review",
        ...expected(submitted),
        decision: "approved",
        findings: "Synthetic review",
        sourceChecks: checks().map(({ sourceId, outcome, notes }) => ({
          sourceId,
          outcome,
          notes,
        })),
        humanAttestation: true,
      }),
    ).rejects.toThrow("Separate independent source verification");
    const q = (await connection()).query;
    await expect(
      q(
        "INSERT INTO studio_reviews(id,revision_id,reviewer_id,decision,findings,source_checks) VALUES('raw-no-source',$1,$2,'approved','Synthetic test',$3::jsonb)",
        [
          submitted.revisionId,
          reviewer.id,
          JSON.stringify(
            checks().map(({ sourceId, outcome, notes }) => ({
              sourceId,
              outcome,
              notes,
            })),
          ),
        ],
      ),
    ).rejects.toThrow("Separate independent source verification");
    await expect(
      q(
        "UPDATE studio_workflow SET status='approved',row_version=row_version+1 WHERE revision_id=$1",
        [submitted.revisionId],
      ),
    ).rejects.toThrow("Independent approval");
  });
  it("requires independent exact-locator examination before a distinct technical review", async () => {
    const created = await act(author, {
      action: "create",
      content: draft("two stage"),
    });
    const pending = await act(author, {
      action: "request_source_verification",
      ...expected(created),
    });
    expect(pending.status).toBe("source_verification_pending");
    const input = {
      action: "verify_sources",
      ...expected(pending),
      decision: "verified",
      findings: "Synthetic source finding",
      sourceChecks: checks(),
      humanAttestation: true,
    };
    await expect(act(author, input)).rejects.toThrow("own content");
    await expect(
      act(reviewer, {
        ...input,
        sourceChecks: [{ ...checks()[0], section: "wrong locator" }],
      }),
    ).rejects.toThrow("exact cited");
    const verified = await act(reviewer, input);
    expect(verified.status).toBe("source_verified");
    expect(verified.sourceVerifications).toHaveLength(1);
    await expect(
      act(reviewer, {
        action: "review",
        ...expected(verified),
        decision: "approved",
        findings: "Cannot skip submission",
        sourceChecks: [],
        humanAttestation: true,
      }),
    ).rejects.toThrow("submitted revision");
    const approved = await approve(verified);
    expect(approved.status).toBe("approved");
    const pub = await act(admin, { action: "publish", ...expected(approved) });
    expect(pub.status).toBe("published");
    const report = await reportContentError(learner, {
      contentId: pub.id,
      revision: 1,
      category: "ambiguity",
      message: "Fictional QA report of unclear wording.",
    });
    expect(report.status).toBe("open");
    await expect(
      triageContentReport(learner, {
        id: report.id,
        status: "resolved",
        notes: "Unauthorized resolution attempt.",
      }),
    ).rejects.toThrow("editorial role");
    await triageContentReport(reviewer, {
      id: report.id,
      status: "under_review",
      notes: "QA report needs an independent follow-up review.",
    });
    const reportRow = (await curriculumCoverage(admin)).reports.find(
      (item) => item.id === report.id,
    );
    expect(reportRow?.status).toBe("under_review");
    const revised = await act(author, {
      action: "revise",
      ...expected(pub),
      content: { ...pub.data, title: "New immutable draft" },
    });
    expect(revised.status).toBe("draft");
    const fresh = await act(author, { action: "submit", ...expected(revised) });
    await expect(
      act(reviewer, {
        action: "review",
        ...expected(fresh),
        decision: "approved",
        findings: "Cannot transfer old source evidence",
        sourceChecks: checks().map(({ sourceId, outcome, notes }) => ({
          sourceId,
          outcome,
          notes,
        })),
        humanAttestation: true,
      }),
    ).rejects.toThrow("Separate independent source verification");
    await expect(
      (await connection()).query(
        "DELETE FROM studio_source_verifications WHERE revision_id=$1",
        [pub.revisionId],
      ),
    ).rejects.toThrow("append-only");
  });
  it("preserves unknown candidate metadata and rejects forged examination dates", async () => {
    const candidate = draft("unknown citation");
    candidate.sources = [{ ...source, url: "", edition: "", section: "" }];
    const created = await act(author, { action: "create", content: candidate });
    const pending = await act(author, {
      action: "request_source_verification",
      ...expected(created),
    });
    await expect(
      act(reviewer, {
        action: "verify_sources",
        ...expected(pending),
        decision: "verified",
        findings: "Unknown source cannot be verified",
        sourceChecks: [{ ...checks()[0], url: "", edition: "", section: "" }],
        humanAttestation: true,
      }),
    ).rejects.toThrow("exact cited");
    const changes = await act(reviewer, {
      action: "verify_sources",
      ...expected(pending),
      decision: "changes_requested",
      findings:
        "The actual publication and exact supporting section were not available.",
      sourceChecks: [
        {
          ...checks()[0],
          outcome: "insufficient",
          url: "",
          edition: "",
          section: "",
        },
      ],
      humanAttestation: true,
    });
    expect(changes.status).toBe("changes_requested");
  });
  it("permits an actually examined registered physical citation without inventing a URL", async () => {
    const q = (await connection()).query;
    await q(
      "INSERT INTO reference_publications(id,title,edition,classification,data) VALUES('qa-physical-publication','Synthetic physical book','Synthetic edition','professional_guidance','{}')",
    );
    const physical = {
      ...source,
      title: "Synthetic physical book",
      url: "",
      bibliographyId: "qa-physical-publication",
    };
    const content = {
      ...draft("physical source fixture"),
      sources: [physical],
    };
    const pending = await act(author, {
      action: "request_source_verification",
      ...expected(await act(author, { action: "create", content })),
    });
    const verified = await act(reviewer, {
      action: "verify_sources",
      ...expected(pending),
      decision: "verified",
      findings:
        "Synthetic physical-publication examination fixture; no real book was reviewed.",
      sourceChecks: [{ ...checks()[0], url: "" }],
      humanAttestation: true,
    });
    const published = await act(admin, {
      action: "publish",
      ...expected(await approve(verified)),
    });
    expect(published.status).toBe("published");
    expect(
      (
        await q("SELECT data FROM question_versions WHERE id=$1", [
          published.revisionId,
        ])
      ).rows[0].data,
    ).toMatchObject({
      reference: {
        url: "",
        edition: "Synthetic edition",
        verificationStatus: "verified",
      },
    });
    const unknown = await act(author, {
      action: "create",
      content: {
        ...content,
        title: "Unknown physical source",
        sources: [{ ...physical, bibliographyId: "not-registered" }],
      },
    });
    const requested = await act(author, {
      action: "request_source_verification",
      ...expected(unknown),
    });
    await expect(
      act(reviewer, {
        action: "verify_sources",
        ...expected(requested),
        decision: "verified",
        findings: "Unregistered source cannot be verified.",
        sourceChecks: [{ ...checks()[0], url: "" }],
        humanAttestation: true,
      }),
    ).rejects.toThrow("registered bibliography");
  });
  it("imports stable IDs transactionally as AI drafts and calculates real coverage", async () => {
    const content = {
      ...questionTemplate,
      blueprintRevisionId: CHST_BLUEPRINT_ID,
      domain: "1",
      objectiveCode: chstObjectives[0].id,
      sources: [{ ...source, url: "", edition: "", section: "" }],
    };
    const records = [
      { id: "CB-QA-STABLE-001", content, category: "scenario" as const },
      {
        id: "CB-QA-STABLE-002",
        content: {
          ...content,
          body: {
            ...content.body,
            stem: "A second distinct fictional import prompt?",
          },
        },
      },
    ];
    expect(await importOriginalDraftBatch(author, records)).toMatchObject({
      imported: 2,
      skipped: 0,
      published: 0,
    });
    expect(await importOriginalDraftBatch(author, records)).toMatchObject({
      imported: 0,
      skipped: 2,
    });
    await expect(
      importOriginalDraftBatch(author, [
        { id: "CB-QA-ROLLBACK-001", content },
        {
          id: "CB-QA-ROLLBACK-002",
          content: { ...content, objectiveCode: "invented" },
        },
      ]),
    ).rejects.toThrow("objective actually listed");
    expect(
      (
        await (
          await connection()
        ).query(
          "SELECT id FROM studio_content WHERE id LIKE 'CB-QA-ROLLBACK-%'",
        )
      ).rows,
    ).toHaveLength(0);
    const coverage = await curriculumCoverage(admin);
    expect(coverage.totals.questions).toBe(2);
    expect(coverage.totals.draft).toBe(2);
    expect(coverage.totals.sourceVerified).toBe(0);
    expect(coverage.totals.published).toBe(0);
    expect(
      coverage.objectives.find(
        (objective) => objective.id === chstObjectives[0].id,
      )?.questions,
    ).toBe(2);
    expect(coverage.totals.objectivesWithoutQuestions).toBe(77);
    await expect(
      importOriginalDraftBatch(author, [
        {
          ...records[0],
          content: { ...content, title: "Changed existing record" },
        },
      ]),
    ).rejects.toThrow("will not be overwritten");
    const page = await studioSnapshot(author, {
      page: 1,
      objective: chstObjectives[0].id,
    });
    expect(page.pagination?.total).toBe(2);
    expect(page.items).toHaveLength(2);
  });
  it("uses the latest source decision and never carries a prior verified badge across an adverse re-examination", async () => {
    const created = await act(author, {
      action: "create",
      content: {
        ...questionTemplate,
        title: "Fictional latest-evidence test",
        blueprintRevisionId: CHST_BLUEPRINT_ID,
        objectiveCode: chstObjectives[1].id,
        sources: [source],
      },
    });
    const verified = await verify(created);
    expect(
      (await curriculumCoverage(admin)).objectives.find(
        (objective) => objective.id === chstObjectives[1].id,
      )?.sourceVerified,
    ).toBe(1);
    const submitted = await act(author, {
      action: "submit",
      ...expected(verified),
    });
    const pending = await act(author, {
      action: "request_source_verification",
      ...expected(submitted),
    });
    const returned = await act(reviewer, {
      action: "verify_sources",
      ...expected(pending),
      decision: "changes_requested",
      findings: "Synthetic later examination found insufficient support.",
      sourceChecks: [{ ...checks()[0], outcome: "insufficient" }],
      humanAttestation: true,
    });
    expect(returned.status).toBe("changes_requested");
    expect(
      returned.blockers.some((message) =>
        message.includes("Separate independent source verification"),
      ),
    ).toBe(true);
    expect(
      (await curriculumCoverage(admin)).objectives.find(
        (objective) => objective.id === chstObjectives[1].id,
      )?.sourceVerified,
    ).toBe(0);
  });
});
