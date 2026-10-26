import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { grantStudioRole, revokeStudioRole } from "@/modules/studio/roles";
import { chstObjectives } from "@/modules/curriculum/catalog";
import {
  researchAction,
  researchSnapshot,
  registerResearchSources,
  enqueueResearchSource,
  claimResearchJob,
  completeResearchJob,
  researchEvidenceForObjectives,
  importRecordedResearchAttempt,
  importResearchDocument,
} from "@/modules/research/service";
import { researchSourceSchema } from "@/modules/research/model";
import { processDocument } from "@/modules/research/processing";
process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
process.env.NEXT_PUBLIC_BROWSER_DEMO = "false";
delete process.env.DATABASE_URL;
const admin = { id: "research-integration-admin", mode: "managed" as const };
const author = { id: "research-integration-author", mode: "managed" as const };
const reviewer = {
  id: "research-integration-secondary-admin",
  mode: "managed" as const,
};
function candidate(tag: string) {
  return {
    originalUrl: `https://www.osha.gov/construction?credbuilt-software-qa=${tag}`,
    title: `Synthetic source QA ${tag}`,
    publisher: "Fictional software QA source; not OSHA content",
    classification: "professional_guidance" as const,
    access: "user_supplied" as const,
    license: "licensed_private" as const,
    rightsNotes:
      "Original synthetic test text; contains no government or copyrighted safety instruction.",
  };
}
const html = (text: string) =>
  new TextEncoder().encode(
    `<html><head><title>Synthetic software QA source</title></head><body><main><h1>Original software QA text</h1><h2 id="test-section">Evidence section</h2><p>${text}</p></main></body></html>`,
  );
async function create(tag: string) {
  return (await registerResearchSources(admin, [candidate(tag)]))[0];
}
beforeAll(async () => {
  await seedDemo();
  for (const who of [admin, author, reviewer])
    await (
      await connection()
    ).query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(admin.id, "administrator", "isolated-research-qa");
  await grantStudioRole(author.id, "author", "isolated-research-qa");
  await grantStudioRole(reviewer.id, "administrator", "isolated-research-qa");
});
afterAll(async () => (await connection()).close());
describe("private persistent research source pipeline", () => {
  it("imports prior access observations idempotently without pretending a new request or overwriting parsed content", async () => {
    const src = await create("recorded-access");
    const observed = {
      attemptedAt: "2026-10-26T10:00:00.000Z",
      httpStatus: null,
      proxyStatus: 403,
      error: "Synthetic recorded CONNECT denial; publisher was not reached.",
      resolvedUrl: null,
    };
    expect(
      (await importRecordedResearchAttempt(admin, src.id, observed)).imported,
    ).toBe(true);
    expect(
      (await importRecordedResearchAttempt(admin, src.id, observed)).imported,
    ).toBe(false);
    let snapshot = await researchSnapshot(admin);
    expect(
      snapshot.attempts.filter((row) => row.sourceId === src.id),
    ).toHaveLength(1);
    expect(
      snapshot.attempts.find((row) => row.sourceId === src.id),
    ).toMatchObject({
      kind: "operator_recorded_access_audit",
      attemptedAt: observed.attemptedAt,
      httpStatus: null,
      proxyStatus: 403,
    });
    const content = new TextDecoder().decode(
      html("Original synthetic manual source after prior failed retrieval."),
    );
    await researchAction(admin, {
      action: "import_document",
      sourceId: src.id,
      format: "html",
      content,
      rightsAttestation: true,
    });
    await importRecordedResearchAttempt(admin, src.id, {
      ...observed,
      attemptedAt: "2026-10-26T10:01:00.000Z",
    });
    snapshot = await researchSnapshot(admin);
    expect(snapshot.sources.find((row) => row.id === src.id)?.status).toBe(
      "parsed",
    );
    expect(
      snapshot.sources.find((row) => row.id === src.id)?.retrievedAt,
    ).toBeTruthy();
  });

  it("requires a connected administrator before reading or writing source records", async () => {
    await expect(researchSnapshot(author)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      registerResearchSources(author, [candidate("denied")]),
    ).rejects.toMatchObject({ status: 403 });
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    try {
      await expect(researchSnapshot(admin)).rejects.toMatchObject({
        status: 403,
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("deduplicates canonical source URLs and refuses invented verification metadata or unsupported network scope", async () => {
    const source = await create("idempotent");
    const duplicate = (
      await registerResearchSources(admin, [
        {
          ...candidate("idempotent"),
          title: "Changed title cannot overwrite original metadata",
        },
      ])
    )[0];
    expect(duplicate.id).toBe(source.id);
    expect(duplicate.title).toBe(source.title);
    expect(source.status).toBe("discovered");
    expect(source.publicationDate).toBeNull();
    for (const invalid of [
      { ...candidate("unsafe"), originalUrl: "https://127.0.0.1/private" },
      { ...candidate("bad"), verified: true },
      { ...candidate("date"), publicationDate: "2025-02-30" },
    ])
      expect(researchSourceSchema.safeParse(invalid).success).toBe(false);
  });
  it("parses actually imported HTML, preserves private section text, links exact objectives and never supplies question approvals", async () => {
    const source = await create("manual"),
      content = new TextDecoder().decode(
        html(
          "UNIQUE_RESEARCH_PHRASE is original synthetic text for software QA; it is not safety instruction.",
        ),
      );
    await researchAction(admin, {
      action: "import_document",
      sourceId: source.id,
      format: "html",
      content,
      rightsAttestation: true,
    });
    const snapshot = await researchSnapshot(admin, {
      search: "UNIQUE_RESEARCH_PHRASE",
    });
    expect(snapshot.sources.map((row) => row.id)).toContain(source.id);
    expect(
      snapshot.sections.some((section) =>
        section.text.includes("UNIQUE_RESEARCH_PHRASE"),
      ),
    ).toBe(true);
    const imported = snapshot.sources.find((row) => row.id === source.id)!;
    expect(imported.documentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(imported.status).toBe("parsed");
    const section = snapshot.sections.find(
      (row) => row.sourceId === source.id && !row.needsManualReview,
    )!;
    await researchAction(admin, {
      action: "link",
      sourceId: source.id,
      objectiveId: chstObjectives[0].id,
      sectionId: section.id,
      relationKind: "supports",
      notes:
        "Synthetic evidence relationship tests the software only, not safety accuracy.",
    });
    expect(
      (await researchEvidenceForObjectives(admin)).find(
        (row) => row.sourceId === source.id,
      )?.verified,
    ).toBe(false);
    await researchAction(reviewer, {
      action: "review_source",
      sourceId: source.id,
      documentHash: imported.documentHash,
      decision: "verified",
      findings:
        "Actual examination of the original synthetic QA text only. No real technical claim is validated.",
      humanAttestation: true,
    });
    expect(
      (await researchEvidenceForObjectives(admin)).find(
        (row) => row.sourceId === source.id,
      )?.verified,
    ).toBe(true);
    await revokeStudioRole(
      reviewer.id,
      "administrator",
      "isolated-research-qa",
    );
    expect(
      (await researchEvidenceForObjectives(admin)).find(
        (row) => row.sourceId === source.id,
      )?.verified,
    ).toBe(false);
    expect(
      (await researchSnapshot(admin, { search: "UNIQUE_RESEARCH_PHRASE" }))
        .sources[0].status,
    ).toBe("requires_manual_review");
    const [count] = (
      await (
        await connection()
      ).query("SELECT count(*) AS total FROM studio_source_verifications")
    ).rows;
    expect(Number(count.total)).toBe(0);
    const [published] = (
      await (
        await connection()
      ).query("SELECT count(*) AS total FROM published_questions")
    ).rows;
    expect(Number(published.total)).toBe(0);
  });
  it("persists immutable attempts, recovers expired leases, rejects stale writers and does not retry proxy restrictions", async () => {
    const source = await create("recovery"),
      jobId = await enqueueResearchSource(admin, source.id);
    expect(await enqueueResearchSource(admin, source.id)).toBe(jobId);
    const first = (await claimResearchJob(admin, "test-worker"))!;
    expect(first.jobId).toBe(jobId);
    await (
      await connection()
    ).query(
      "UPDATE research_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",
      [jobId],
    );
    const recovered = (await claimResearchJob(admin, "recovery-worker"))!;
    expect(recovered.attemptNumber).toBe(2);
    expect(recovered.leaseToken).not.toBe(first.leaseToken);
    const blocked = {
      attemptedAt: new Date().toISOString(),
      httpStatus: null,
      proxyStatus: 403,
      resolvedUrl: null,
      error: "Synthetic CONNECT proxy denial fixture; target was not reached.",
      restricted: true,
      redirects: [],
      requests: [
        {
          url: source.originalUrl,
          purpose: "document" as const,
          attemptedAt: new Date().toISOString(),
          httpStatus: null,
          proxyStatus: 403,
          resolvedUrl: null,
          error: "Synthetic proxy denial",
        },
      ],
    };
    await expect(
      completeResearchJob(admin, jobId, first.leaseToken, blocked),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      await completeResearchJob(admin, jobId, recovered.leaseToken, blocked),
    ).toMatchObject({
      sourceId: source.id,
      status: "restricted_access",
      childrenQueued: 0,
    });
    expect(await claimResearchJob(admin, "next-worker")).toBeNull();
    const snapshot = await researchSnapshot(admin);
    expect(
      snapshot.attempts.find((row) => row.sourceId === source.id),
    ).toMatchObject({ httpStatus: null, proxyStatus: 403 });
    await expect(
      (await connection()).query(
        "DELETE FROM research_attempts WHERE source_id=$1",
        [source.id],
      ),
    ).rejects.toThrow(/immutable/);
  });
  it("backs off transient responses, caps repeated attempts, and never treats HTTP 200 as parsed evidence", async () => {
    const source = await create("temporary"),
      jobId = await enqueueResearchSource(admin, source.id);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const job = (await claimResearchJob(admin, `retry-${attempt}`))!;
      expect(job.attemptNumber).toBe(attempt);
      await completeResearchJob(admin, jobId, job.leaseToken, {
        attemptedAt: new Date().toISOString(),
        httpStatus: 503,
        proxyStatus: null,
        error: "Synthetic temporary failure",
        redirects: [],
        retryAfterSeconds: 1,
      });
      const [stored] = (
        await (
          await connection()
        ).query("SELECT state,next_attempt_at FROM research_jobs WHERE id=$1", [
          jobId,
        ])
      ).rows;
      expect(stored.state).toBe(attempt === 3 ? "blocked" : "retry");
      if (attempt < 3) {
        expect(Date.parse(String(stored.next_attempt_at))).toBeGreaterThan(
          Date.now() - 1000,
        );
        await (
          await connection()
        ).query(
          "UPDATE research_jobs SET next_attempt_at=now()-interval '1 second' WHERE id=$1",
          [jobId],
        );
      }
    }
    const unparsed = await create("unparsed"),
      emptyJob = await enqueueResearchSource(admin, unparsed.id),
      claim = (await claimResearchJob(admin, "empty-http-worker"))!;
    await completeResearchJob(admin, emptyJob, claim.leaseToken, {
      attemptedAt: new Date().toISOString(),
      httpStatus: 200,
      proxyStatus: null,
      error: "HTML was retrieved but no extraction result was supplied.",
      redirects: [],
    });
    const result = (await researchSnapshot(admin)).sources.find(
      (row) => row.id === unparsed.id,
    )!;
    expect(result.status).toBe("retrieved");
    expect(result.sectionsProcessed).toBe(0);
    expect(result.documentHash).toBeNull();
  });
  it("limits child discovery by objective relevance, exact scope, document budget and configured depth", async () => {
    const root = await create("bounded-root"),
      jobId = await enqueueResearchSource(admin, root.id, {
        maxDepth: 1,
        maxDocuments: 2,
        delayMs: 1000,
      }),
      job = (await claimResearchJob(admin, "bounded-worker"))!;
    const document = await processDocument(
      html("This original synthetic source tests bounded discovery."),
      { format: "html" },
    );
    document.links = [
      {
        url: "https://evil.test/osha-construction",
        label: "Construction hazards",
      },
      {
        url: "https://www.osha.gov/construction?credbuilt-child=1",
        label: "Construction hazard assessment",
      },
      {
        url: "https://www.osha.gov/construction?credbuilt-child=2",
        label: "Construction safety",
      },
    ];
    expect(
      await completeResearchJob(admin, jobId, job.leaseToken, {
        attemptedAt: new Date().toISOString(),
        httpStatus: 200,
        proxyStatus: null,
        error: null,
        redirects: [],
        document,
      }),
    ).toMatchObject({ childrenQueued: 1 });
    const [count] = (
      await (
        await connection()
      ).query("SELECT count(*) AS total FROM research_jobs WHERE root_id=$1", [
        root.id,
      ])
    ).rows;
    expect(Number(count.total)).toBe(2);
    const [child] = (
      await (
        await connection()
      ).query("SELECT * FROM research_jobs WHERE root_id=$1 AND depth=1", [
        root.id,
      ])
    ).rows;
    await (
      await connection()
    ).query(
      "UPDATE research_jobs SET next_attempt_at=now()-interval '1 second' WHERE id=$1",
      [child.id],
    );
    const childJob = (await claimResearchJob(admin, "child-worker"))!;
    expect(
      await completeResearchJob(admin, childJob.jobId, childJob.leaseToken, {
        attemptedAt: new Date().toISOString(),
        httpStatus: 200,
        proxyStatus: null,
        error: null,
        redirects: [],
        document,
      }),
    ).toMatchObject({ childrenQueued: 0 });
  });
});

it("audits explicit metadata corrections, resets verification and rejects stale revisions", async () => {
  const source = await create("metadata-revision"),
    content = new TextDecoder().decode(
      html("Original synthetic content for metadata revision QA only."),
    );
  await researchAction(admin, {
    action: "import_document",
    sourceId: source.id,
    format: "html",
    content,
    rightsAttestation: true,
  });
  let current = (await researchSnapshot(admin)).sources.find(
    (row) => row.id === source.id,
  )!;
  await researchAction(admin, {
    action: "review_source",
    sourceId: source.id,
    documentHash: current.documentHash,
    decision: "verified",
    findings: "Reviewed the original synthetic software QA source only.",
    humanAttestation: true,
  });
  await researchAction(admin, {
    action: "update_metadata",
    sourceId: source.id,
    expectedRevision: current.metadataRevision,
    source: {
      ...candidate("metadata-revision"),
      publisher: "Corrected fictional QA publisher",
    },
  });
  current = (await researchSnapshot(admin)).sources.find(
    (row) => row.id === source.id,
  )!;
  expect(current.metadataRevision).toBe(2);
  expect(current.status).toBe("parsed");
  expect(current.publisher).toBe("Corrected fictional QA publisher");
  await expect(
    researchAction(admin, {
      action: "update_metadata",
      sourceId: source.id,
      expectedRevision: 1,
      source: candidate("metadata-revision"),
    }),
  ).rejects.toMatchObject({ status: 409 });
  const [review] = (
    await (
      await connection()
    ).query(
      "SELECT metadata_snapshot FROM research_source_reviews WHERE source_id=$1 ORDER BY event_number DESC LIMIT 1",
      [source.id],
    )
  ).rows;
  expect((review.metadata_snapshot as { publisher: string }).publisher).toBe(
    candidate("metadata-revision").publisher,
  );
});

it("pins conditional request headers to actually saved documents and invalidates stale indexing on unprocessed new bytes", async () => {
  const source = await create("conditional-cache"),
    document = await processDocument(
      html("Original synthetic conditional cache QA text."),
      { format: "html" },
    );
  const firstId = await enqueueResearchSource(admin, source.id),
    first = (await claimResearchJob(admin, "cache-initial"))!;
  await completeResearchJob(admin, firstId, first.leaseToken, {
    attemptedAt: new Date().toISOString(),
    httpStatus: 200,
    proxyStatus: null,
    error: null,
    redirects: [],
    etag: '"actual-v1"',
    document,
  });
  const secondId = await enqueueResearchSource(admin, source.id, {
      runKey: "cache-recheck",
    }),
    second = (await claimResearchJob(admin, "cache-recheck"))!;
  expect(second.etag).toBe('"actual-v1"');
  await completeResearchJob(admin, secondId, second.leaseToken, {
    attemptedAt: new Date().toISOString(),
    httpStatus: 304,
    proxyStatus: null,
    error: null,
    redirects: [],
    notModified: true,
  });
  expect(
    (await researchSnapshot(admin)).sources.find((row) => row.id === source.id)
      ?.status,
  ).toBe("parsed");
  const thirdId = await enqueueResearchSource(admin, source.id, {
      runKey: "changed-unprocessed",
    }),
    third = (await claimResearchJob(admin, "cache-new-bytes"))!;
  await completeResearchJob(admin, thirdId, third.leaseToken, {
    attemptedAt: new Date().toISOString(),
    httpStatus: 200,
    proxyStatus: null,
    error: "New bytes were not parsed.",
    redirects: [],
    etag: '"unprocessed-v2"',
  });
  const cleared = (await researchSnapshot(admin)).sources.find(
    (row) => row.id === source.id,
  )!;
  expect(cleared.documentHash).toBeNull();
  expect(cleared.sectionsProcessed).toBe(0);
  expect(cleared.status).toBe("retrieved");
  const [preserved] = (
    await (
      await connection()
    ).query(
      "SELECT count(*) AS total FROM research_sections WHERE source_id=$1",
      [source.id],
    )
  ).rows;
  expect(Number(preserved.total)).toBeGreaterThan(0);
  const fourthId = await enqueueResearchSource(admin, source.id, {
      runKey: "after-gap",
    }),
    fourth = (await claimResearchJob(admin, "cache-after-gap"))!;
  expect(fourth.etag).toBeNull();
  expect(fourth.lastModified).toBeNull();
  await expect(
    completeResearchJob(admin, fourthId, fourth.leaseToken, {
      attemptedAt: new Date().toISOString(),
      httpStatus: 304,
      proxyStatus: null,
      error: null,
      redirects: [],
      notModified: true,
    }),
  ).rejects.toMatchObject({ status: 422 });
  await completeResearchJob(admin, fourthId, fourth.leaseToken, {
    attemptedAt: new Date().toISOString(),
    httpStatus: null,
    proxyStatus: 403,
    error: "Synthetic restriction ends this isolated QA job.",
    redirects: [],
    restricted: true,
  });
});

function syntheticPdf(text: string) {
  const stream = text ? `BT /F1 12 Tf 50 740 Td (${text}) Tj ET` : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let value = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(value));
    value += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(value);
  value += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(value);
}

it("allows actual human resolution of readable PDF and plain-text flags while preserving parser evidence and invalidating revoked or edited review proof", async () => {
  for (const format of ["text", "pdf"] as const) {
    await grantStudioRole(
      reviewer.id,
      "administrator",
      "isolated-manual-section-qa",
    );
    const source = await create(`manual-resolution-${format}`),
      bytes =
        format === "pdf"
          ? syntheticPdf("Original synthetic manual review fixture only.")
          : new TextEncoder().encode(
              "Original synthetic manual source text for software QA only. This text is not construction safety instruction.",
            );
    await importResearchDocument(admin, source.id, bytes, {
      format,
      rightsAttestation: true,
    });
    let snapshot = await researchSnapshot(admin, { sourceId: source.id }),
      current = snapshot.sources.find((row) => row.id === source.id)!;
    if (format === "pdf" && !current.pageCount) {
      expect(current.extractionComplete).toBe(false);
      await expect(
        researchAction(admin, {
          action: "review_source",
          sourceId: source.id,
          documentHash: current.documentHash,
          decision: "verified",
          findings: "Cannot verify an extraction unavailable in this runtime.",
          humanAttestation: true,
        }),
      ).rejects.toMatchObject({ status: 422 });
      continue;
    }
    expect(current.extractionComplete).toBe(true);
    const section = snapshot.sections.find(
      (row) => row.sourceId === source.id,
    )!;
    expect(section.needsManualReview).toBe(true);
    expect(section.effectiveNeedsManualReview).toBe(true);
    await expect(
      researchAction(admin, {
        action: "review_source",
        sourceId: source.id,
        documentHash: current.documentHash,
        decision: "verified",
        findings: "Synthetic QA only; unresolved section cannot pass.",
        humanAttestation: true,
      }),
    ).rejects.toMatchObject({ status: 422 });
    await researchAction(reviewer, {
      action: "review_section",
      sourceId: source.id,
      sectionId: section.id,
      documentHash: current.documentHash,
      decision: "resolved",
      notes:
        "Personally examined the original synthetic QA text and its source scope; no real safety statement is verified.",
      humanAttestation: true,
    });
    snapshot = await researchSnapshot(admin, { sourceId: source.id });
    const resolved = snapshot.sections.find((row) => row.id === section.id)!;
    expect(resolved.needsManualReview).toBe(true);
    expect(resolved.manualReviewResolved).toBe(true);
    expect(resolved.effectiveNeedsManualReview).toBe(false);
    await researchAction(admin, {
      action: "review_source",
      sourceId: source.id,
      documentHash: current.documentHash,
      decision: "verified",
      findings:
        "Examined the complete original synthetic source and its exact extracted sections. Software QA only.",
      humanAttestation: true,
    });
    let [proof] = (
      await (
        await connection()
      ).query("SELECT research_source_evidence_is_current($1) AS valid", [
        source.id,
      ])
    ).rows;
    expect(proof.valid).toBe(true);
    await revokeStudioRole(
      reviewer.id,
      "administrator",
      "isolated-manual-section-qa",
    );
    [proof] = (
      await (
        await connection()
      ).query("SELECT research_source_evidence_is_current($1) AS valid", [
        source.id,
      ])
    ).rows;
    expect(proof.valid).toBe(false);
    expect(
      (await researchSnapshot(admin, { sourceId: source.id })).sections.find(
        (row) => row.id === section.id,
      )?.effectiveNeedsManualReview,
    ).toBe(true);
    await grantStudioRole(
      reviewer.id,
      "administrator",
      "isolated-manual-section-qa",
    );
    current = (await researchSnapshot(admin)).sources.find(
      (row) => row.id === source.id,
    )!;
    await researchAction(admin, {
      action: "update_metadata",
      sourceId: source.id,
      expectedRevision: current.metadataRevision,
      source: {
        ...candidate(`manual-resolution-${format}`),
        rightsNotes:
          "Changed original synthetic QA rights metadata needs a fresh attestation.",
      },
    });
    expect(
      (await researchSnapshot(admin, { sourceId: source.id })).sections.find(
        (row) => row.id === section.id,
      )?.manualReviewResolved,
    ).toBe(false);
    await expect(
      (await connection()).query(
        "DELETE FROM research_section_reviews WHERE section_id=$1",
        [section.id],
      ),
    ).rejects.toThrow(/immutable/);
  }
});

it("never resolves or globally verifies an unreadable blank PDF page without actual new extraction", async () => {
  const source = await create("blank-manual-resolution");
  await importResearchDocument(admin, source.id, syntheticPdf(""), {
    format: "pdf",
    rightsAttestation: true,
  });
  const snapshot = await researchSnapshot(admin, { sourceId: source.id }),
    current = snapshot.sources.find((row) => row.id === source.id)!;
  expect(current.extractionComplete).toBe(false);
  const section = snapshot.sections.find((row) => row.sourceId === source.id);
  if (section) {
    expect(section.text.trim()).toBe("");
    await expect(
      researchAction(admin, {
        action: "review_section",
        sourceId: source.id,
        sectionId: section.id,
        documentHash: current.documentHash,
        decision: "resolved",
        notes: "An attestation cannot invent missing image or page text.",
        humanAttestation: true,
      }),
    ).rejects.toMatchObject({ status: 422 });
  }
  await expect(
    researchAction(admin, {
      action: "review_source",
      sourceId: source.id,
      documentHash: current.documentHash,
      decision: "verified",
      findings:
        "No full source processing exists for this blank image-only fixture.",
      humanAttestation: true,
    }),
  ).rejects.toMatchObject({ status: 422 });
});
