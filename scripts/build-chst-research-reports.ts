import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  attachmentDocuments,
  chstBibliography,
  chstDomains,
  chstObjectives,
} from "../src/modules/curriculum/catalog";
import { chstMasterCurriculum } from "../src/modules/curriculum/master";
import { chstDraftRecords } from "../src/content/chst/draft-bank";
import { domain1Batch001 } from "../src/content/chst/domain1-batch-001";
import { questionQualityReport } from "../src/modules/studio/question-quality";
import { lessonResearchBriefs } from "../src/content/chst/lesson-briefs";

const directory = path.join(process.cwd(), "research/chst5");
const json = (value: unknown) => JSON.stringify(value);
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
type Attempt = {
  startedAt: string;
  targetHttpStatus: number | null;
  proxyConnectStatus: number | null;
  error: string | null;
  redirects: unknown[];
};
type Source = {
  sourceId: string;
  url: string;
  seedTitle: string;
  publisher: string;
  sourceCategory: string;
  group: string;
  discoveryBasis: string;
  formatHint: string;
  accessStatus: string;
  parseStatus: string;
  licensingStatus: string;
  attempts: Attempt[];
  errorNotes: string;
};
type Audit = {
  startedAt: string;
  finishedAt: string;
  summary: Record<string, number>;
  sources: Source[];
};
type PageProof = {
  locator: string;
  page: number | null;
  characters: number;
  textSha256: string;
  needsManualReview: boolean;
  notes: string[];
};
type LocalProof = {
  id: string;
  fileName: string;
  version: string;
  origin: string;
  processedAt: string;
  contentHash: string;
  pageCount: number;
  pagesProcessed: number[];
  status: string;
  sections: PageProof[];
};
type InputProof = {
  id: string;
  fileName: string;
  version: string;
  origin: string;
  processedAt: string;
  document: {
    contentHash: string;
    pageCount: number;
    pagesProcessed: number[];
    status: string;
    sections: {
      locator: string;
      page: number | null;
      text: string;
      needsManualReview: boolean;
      notes: string[];
    }[];
  };
};
type BootstrapSource = {
  auditId: string;
  entityKind: string;
  source: {
    originalUrl: string;
    title: string;
    publisher: string;
    publicationDate: null;
    classification: string;
    access: string;
    license: string;
    licensedIdentifier: string;
    rightsNotes: string;
  };
};

async function main() {
  await mkdir(directory, { recursive: true });
  const audit = JSON.parse(
    await readFile(path.join(directory, "CRAWL_AUDIT.json"), "utf8"),
  ) as Audit;
  if (
    audit.sources.length !== 43 ||
    new Set(audit.sources.map((s) => s.url)).size !== 43 ||
    audit.sources.filter((s) => s.group === "mandatory").length !== 14
  )
    throw new Error(
      "The actual access audit must retain all 43 unique requests and 14 mandatory URLs.",
    );
  if (chstMasterCurriculum.length !== 78 || chstBibliography.length !== 21)
    throw new Error("Canonical curriculum or bibliography is incomplete.");
  const proofArg = process.argv[2];
  let local: LocalProof[];
  if (proofArg) {
    const input = JSON.parse(await readFile(proofArg, "utf8")) as InputProof[];
    local = input.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      version: row.version,
      origin: row.origin,
      processedAt: row.processedAt,
      contentHash: row.document.contentHash,
      pageCount: row.document.pageCount,
      pagesProcessed: row.document.pagesProcessed,
      status: row.document.status,
      sections: row.document.sections.map((section) => ({
        locator: section.locator,
        page: section.page,
        characters: section.text.length,
        textSha256: hash(section.text),
        needsManualReview: section.needsManualReview,
        notes: section.notes,
      })),
    }));
    for (const document of Object.values(attachmentDocuments)) {
      const proof = local.find((row) => row.fileName === document.fileName);
      if (
        !proof ||
        proof.contentHash !== document.sha256 ||
        proof.pageCount !== document.pages ||
        proof.pagesProcessed.length !== document.pages ||
        proof.sections.some((section) => !section.characters)
      )
        throw new Error(
          "Actual page evidence does not match the supplied attachment.",
        );
    }
    await writeFile(
      path.join(directory, "LOCAL_DOCUMENT_PROCESSING.json"),
      JSON.stringify(
        {
          origin: "actual_private_attachment_processing",
          notice:
            "Page extraction evidence only; no underlying textbook text, latest-version confirmation or human technical verification.",
          documents: local,
        },
        null,
        2,
      ) + "\n",
    );
  } else {
    const recorded = JSON.parse(
      await readFile(
        path.join(directory, "LOCAL_DOCUMENT_PROCESSING.json"),
        "utf8",
      ),
    ) as { documents: LocalProof[] };
    local = recorded.documents;
  }
  const records = [...chstDraftRecords, ...domain1Batch001];
  const quality = questionQualityReport(
    records.map(({ id, content }) => ({
      id,
      data: content,
      sourceVerified: false,
    })),
  );
  await writeFile(
    path.join(directory, "QUESTION_QUALITY_AUDIT.json"),
    JSON.stringify(quality, null, 2) + "\n",
  );
  const candidates = new Map<
    string,
    { title: string; objectives: Set<string>; questions: Set<string> }
  >();
  for (const record of records)
    for (const reference of record.content.sources) {
      if (!reference.url) continue;
      const item = candidates.get(reference.url) || {
        title: reference.title,
        objectives: new Set<string>(),
        questions: new Set<string>(),
      };
      item.objectives.add(record.content.objectiveCode);
      item.questions.add(record.id);
      candidates.set(reference.url, item);
    }
  const rows: Record<string, unknown>[] = [];
  const bootstrap: BootstrapSource[] = [];
  function add(
    row: Record<string, unknown>,
    source: BootstrapSource["source"],
  ) {
    rows.push(row);
    bootstrap.push({
      auditId: String(row.source_id),
      entityKind: String(row.entity_kind),
      source,
    });
  }
  const classMap: Record<string, string> = {
    exam_objective: "examination_blueprint",
    bibliography: "bibliography",
    regulatory_requirement: "regulatory_requirement",
    technical_interpretation: "professional_guidance",
    technical_research: "technical_research",
    publisher_catalog: "publisher_metadata",
    professional_guidance: "professional_guidance",
  };
  for (const source of audit.sources) {
    const candidate = candidates.get(source.url);
    const last = source.attempts.at(-1)!;
    const book = chstBibliography.find(
      (book) => source.sourceId === `publisher-search-${book.id}`,
    );
    add(
      {
        source_id: source.sourceId,
        parent_source: book?.id || "",
        original_url: source.url,
        resolved_url: "",
        title: source.seedTitle,
        title_provenance:
          "Supplied or constructed seed title; page title not retrieved",
        publisher: source.publisher,
        format: source.formatHint,
        publication_date: "",
        retrieval_date: "",
        attempted_at: last.startedAt,
        access_status: source.accessStatus,
        parse_status: source.parseStatus,
        license_status: source.licensingStatus,
        page_count: "",
        pages_processed: 0,
        sections_processed: 0,
        mapped_objectives: json([...(candidate?.objectives || [])]),
        verification_status: "unverified",
        content_hash: "",
        http_status: last.targetHttpStatus ?? "",
        proxy_status: last.proxyConnectStatus ?? "",
        error_notes: source.errorNotes,
        entity_kind:
          source.group === "bibliography_title_query"
            ? "publisher_lookup"
            : "remote_url",
        discovery_basis: source.discoveryBasis,
        related_question_ids: json([...(candidate?.questions || [])]),
      },
      {
        originalUrl: source.url,
        title: source.seedTitle,
        publisher: source.publisher,
        publicationDate: null,
        classification:
          classMap[source.sourceCategory] || "professional_guidance",
        access: "public_link",
        license: "public_metadata_only",
        licensedIdentifier: "",
        rightsNotes: `${source.discoveryBasis}. Access attempt blocked by workspace CONNECT proxy; no publisher response, source text, current edition or distribution rights confirmed.`,
      },
    );
  }
  for (const book of chstBibliography) {
    add(
      {
        source_id: book.id,
        parent_source: "attachment-bibliography",
        original_url: book.listedUrl || "",
        resolved_url: "",
        title: book.title,
        title_provenance: "Exact supplied BCSP bibliography listing",
        publisher: book.publisher || "Publisher not printed",
        format: "underlying_publication_unknown",
        publication_date: book.publicationYear,
        retrieval_date: "",
        attempted_at: "",
        access_status: "bibliographic_information_only",
        parse_status: "underlying_text_not_available",
        license_status: "publisher_terms_not_examined",
        page_count: "",
        pages_processed: 0,
        sections_processed: 0,
        mapped_objectives: json(
          chstMasterCurriculum
            .filter((item) =>
              item.supportingBooks.some(
                (reference) => reference.id === book.id,
              ),
            )
            .map((item) => item.id),
        ),
        verification_status: "unverified",
        content_hash: "",
        http_status: "",
        proxy_status: "",
        error_notes:
          "Listed edition only. Book text, newer editions, authorized digital access, price, chapter coverage and distribution rights unconfirmed. Domain/objective associations are title-only planning inferences.",
        entity_kind: "bibliographic_publication",
        discovery_basis: "user_supplied_bibliography",
        related_question_ids: "[]",
      },
      {
        originalUrl: "",
        title: book.title,
        publisher:
          book.publisher || "Publisher not printed in supplied listing",
        publicationDate: null,
        classification: "bibliography",
        access: "licensed_reference",
        license: "public_metadata_only",
        licensedIdentifier: book.id,
        rightsNotes:
          "Bibliographic metadata only. Licensed access has NOT been obtained. Edition and year are the supplied listing, not current publisher confirmation. Obtain authorized text and processing rights before analysis.",
      },
    );
  }
  for (const proof of local) {
    add(
      {
        source_id: proof.id,
        parent_source: "",
        original_url: "",
        resolved_url: "",
        title: proof.fileName,
        title_provenance:
          "User-supplied attachment identity; printed version retained",
        publisher: "Board of Certified Safety Professionals",
        format: "pdf",
        publication_date: proof.version,
        retrieval_date: "",
        attempted_at: proof.processedAt,
        access_status: "user_supplied_private_attachment",
        parse_status: proof.status,
        license_status: "copyright_retained_private_processing_only",
        page_count: proof.pageCount,
        pages_processed: proof.pagesProcessed.length,
        sections_processed: proof.sections.length,
        mapped_objectives: json(
          proof.id === "attachment-blueprint"
            ? chstObjectives.map((objective) => objective.id)
            : [],
        ),
        verification_status: "text_extracted_not_human_technical_verified",
        content_hash: proof.contentHash,
        http_status: "",
        proxy_status: "",
        error_notes:
          "Local attachment, not a remote download. All page text extracted; technical tables/layout/figures require manual review. Current official online version remains unconfirmed.",
        entity_kind: "uploaded_document",
        discovery_basis: "user_supplied_attachment",
        related_question_ids: "[]",
      },
      {
        originalUrl: "",
        title: proof.fileName,
        publisher: "Board of Certified Safety Professionals",
        publicationDate: null,
        classification:
          proof.id === "attachment-blueprint"
            ? "examination_blueprint"
            : "bibliography",
        access: "user_supplied",
        license: "permission_required",
        licensedIdentifier: proof.contentHash,
        rightsNotes: `Supplied ${proof.fileName}, printed version ${proof.version}, SHA-256 ${proof.contentHash}. Authorized private analysis only; copyright and distribution rights remain with publisher. Transcription is not current-version confirmation or human question-source verification.`,
      },
    );
  }
  const attempted = new Set(audit.sources.map((source) => source.url));
  for (const [url, candidate] of candidates) {
    if (attempted.has(url)) continue;
    const publisher = new URL(url).hostname.endsWith("osha.gov")
      ? "Occupational Safety and Health Administration"
      : new URL(url).hostname.endsWith("cdc.gov")
        ? "CDC / NIOSH"
        : "Publisher requires confirmation";
    add(
      {
        source_id: `existing-candidate-${hash(url).slice(0, 16)}`,
        parent_source: "",
        original_url: url,
        resolved_url: "",
        title: candidate.title,
        title_provenance:
          "Existing unverified draft citation, not a retrieved page title",
        publisher,
        format: /\.pdf(?:\?|$)/i.test(url) ? "pdf_candidate" : "html_candidate",
        publication_date: "",
        retrieval_date: "",
        attempted_at: "",
        access_status: "not_attempted_in_this_network_audit",
        parse_status: "not_processed",
        license_status: "not_confirmed",
        page_count: "",
        pages_processed: 0,
        sections_processed: 0,
        mapped_objectives: json([...candidate.objectives]),
        verification_status: "unverified",
        content_hash: "",
        http_status: "",
        proxy_status: "",
        error_notes:
          "Repository candidate retained for subsequent bounded processing. Not counted among actual requests or discovered online links; the current host access limitation remains unresolved.",
        entity_kind: "existing_candidate_url",
        discovery_basis: "existing_repository_candidate",
        related_question_ids: json([...candidate.questions]),
      },
      {
        originalUrl: url,
        title: candidate.title.slice(0, 500),
        publisher,
        publicationDate: null,
        classification: "professional_guidance",
        access: "public_link",
        license: "public_metadata_only",
        licensedIdentifier: "",
        rightsNotes:
          "Existing draft candidate citation only; no text, edition, applicability or publication rights examined. Classification must be checked against the actual source before supporting claims.",
      },
    );
  }
  rows.forEach((row, index) => {
    row.source_classification = bootstrap[index].source.classification;
  });
  const headers = Object.keys(rows[0]);
  const quote = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  await writeFile(
    path.join(directory, "SOURCE_INVENTORY.csv"),
    [
      headers.join(","),
      ...rows.map((row) => headers.map((key) => quote(row[key])).join(",")),
    ].join("\n") + "\n",
  );
  await writeFile(
    path.join(directory, "SOURCE_BOOTSTRAP.json"),
    JSON.stringify(bootstrap, null, 2) + "\n",
  );
  const masterHeaders = [
    "certification",
    "blueprint_version",
    "domain",
    "domain_title",
    "official_kind",
    "official_number",
    "official_statement",
    "objective_id",
    "blueprint_page",
    "credbuilt_learning_objective_id",
    "credbuilt_learning_objective",
    "required_knowledge",
    "practical_application",
    "difficulty",
    "topic",
    "subtopics",
    "learning_levels",
    "candidate_regulations",
    "candidate_public_references",
    "technical_standards_status",
    "supporting_books",
    "page_section_citations",
    "related_lesson_candidates",
    "draft_question_ids",
    "lesson_brief_ids",
    "evidence_status",
    "review_status",
    "verified_coverage_score",
  ];
  const masterRows = chstMasterCurriculum.map((item) => [
    item.certificationId,
    item.blueprintVersion,
    item.domain,
    item.domainTitle,
    item.officialKind,
    item.officialNumber,
    item.officialStatement,
    item.id,
    item.blueprintPage,
    item.learningObjectiveId,
    item.credBuiltLearningObjective,
    json(item.requiredKnowledge),
    json(item.requiredPracticalApplication),
    item.recommendedDifficulty,
    item.topic,
    json(item.subtopics),
    json(item.levels),
    json(item.candidateRegulations),
    json(item.candidatePublicReferences),
    item.consensusStandards.status,
    json(item.supportingBooks),
    json([
      `Supplied blueprint page ${item.blueprintPage}; technical supporting citations remain unverified`,
      ...item.candidateRegulations.map((source) => source.locator),
    ]),
    json(item.candidateRelatedLessonIds),
    json(item.repositoryDraftQuestionIds),
    json(
      lessonResearchBriefs
        .filter((brief) => brief.objectiveId === item.id)
        .map((brief) => brief.id),
    ),
    item.supportingEvidenceStatus,
    item.contentReviewStatus,
    0,
  ]);
  await writeFile(
    path.join(directory, "CHST5_MASTER_CURRICULUM.csv"),
    [
      masterHeaders.join(","),
      ...masterRows.map((row) => row.map(quote).join(",")),
    ].join("\n") + "\n",
  );
  const domainRows = chstDomains.map((domain) => {
    const mapped = chstMasterCurriculum.filter(
      (item) => item.domain === domain.code,
    );
    const questions = records.filter(
      (record) => record.content.domain === domain.code,
    );
    return { domain, mapped, questions };
  });
  const table = [
    "| Domain | Official statements mapped | Repository drafts | Verified technical support | Approved lessons | Approved questions |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...domainRows.map(
      ({ domain, mapped, questions }) =>
        `| ${domain.code} — ${domain.title} (${domain.percentage}%) | ${mapped.length} | ${questions.length} | 0 | 0 | 0 |`,
    ),
  ];
  await writeFile(
    path.join(directory, "CHST5_COVERAGE_REPORT.md"),
    [
      "# CHST5 curriculum evidence coverage",
      "",
      "Repository research snapshot; live connected-database counts are available in the protected Curriculum Manager. Mapping, drafting, extraction and human technical verification are different facts.",
      "",
      `All **78 official statements** (55 knowledge, 23 skill) from the supplied CHST5 V.2022.04.12 are mapped to stable CredBuilt learning objectives. The supplied three-page blueprint and two-page bibliography were text-extracted; all five pages contain extracted text. Exact transcription validation matched all 78 statements and all 21 listings. Neither packaging dates nor successful parsing confirms the latest official online version.`,
      "",
      "**0 objectives have verified technical supporting evidence; all 78 retain evidence gaps.** A blueprint statement defines examination scope rather than verifies an answer. No objective is described as fully covered from a citation or a single question.",
      "",
      ...table,
      "",
      `All 78 objectives have at least one existing question draft among ${records.length} repository drafts. These are not reviewed instructional coverage. There are **0 completed new technical lessons**, **0 approved canonical lessons**, and **3 source-blocked lesson planning briefs** (${lessonResearchBriefs.map((brief) => brief.id).join(", ")}). They contain authoring steps and evidence gaps, not invented technical instruction or safety assessment answers. Existing demonstration lessons remain intact and are not promoted into canonical approved coverage.`,
      "",
      "## Priorities",
      "",
      "1. Restore lawful publisher access and compare the current official blueprint/reference list with the supplied versions.",
      "2. Retrieve applicable OSHA/NIOSH text and licensed literature; index exact sections, exceptions, applicability and visual/table evidence.",
      "3. Complete the excavation, fall-protection and JHA lesson briefs only after supporting claims can be examined.",
      "4. Independently source-check, technically review and editorially review the existing 50 Domain 1 drafts. Broaden the other domains before a full production exam.",
      "5. Resolve conflicts and semantic duplicate candidates through qualified human review; no automated checker certifies technical accuracy.",
      "",
      "The master CSV separates official wording/numbering from CredBuilt outcomes, tentative candidate sources, title-only book relevance and unverified evidence. UI evidence progress is deliberately capped below full coverage until comprehensive coverage is actually reviewed.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(directory, "QUESTION_BANK_PROGRESS.md"),
    [
      "# CHST question-bank progress",
      "",
      "This describes repository-supplied authored content, not a remote customer database. Ingestion remains explicit and idempotent; existing learner records, questions, sessions and publications are preserved.",
      "",
      "| Domain | Drafts available | Awaiting human source/technical/editorial review | Approved supplied | Published supplied | Full exam required | Additional eligible questions needed | 2,000-bank target |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...domainRows.map(
        ({ domain, questions }, i) =>
          `| ${domain.code} — ${domain.title} | ${questions.length} | ${questions.length} | 0 | 0 | ${[73, 40, 45, 42][i]} | ${[73, 40, 45, 42][i]} | ${[732, 398, 450, 420][i]} |`,
      ),
      "| Total | 150 | 150 | 0 | 0 | 200 | 200 | 2,000 |",
      "",
      "The prior 100 original drafts and the separate 50-question Domain 1 batch remain preserved. **0 additional unsupported questions were generated in this research milestone**, because the necessary technical references could not be examined. The 50-item initial milestone exists as provisional drafts, not a reference-verified deliverable. No new technical source verification, technical approval or publication is asserted.",
      "",
      `Repository topic inventory: ${new Set(records.map((record) => `${record.content.domain}:${record.content.topic}`)).size} domain/topic pairs. Exact objective coverage is listed per question in CHST5_MASTER_CURRICULUM.csv. Topic quantity is not topic mastery or completeness.`,
      "",
      `Mechanical question-writing audit: ${quality.inspected} inspected; ${quality.errorCount} structural errors; ${quality.warningCount} review warnings; ${quality.duplicates.length} exact/near wording candidate groups; ${quality.longestCorrect} items have a longest keyed choice. Authored answer positions: ${json(quality.answerPositions)}. These flags are not technical correctness or plagiarism judgments; see QUESTION_QUALITY_AUDIT.json.`,
      "",
      "The existing engine requires exactly 200 unique eligible published questions, allocated 73/40/45/42, and four hours. It never fills shortages with duplicate questions. Standard full attempts, flags, saved answer order, resume, expiration, results and history remain intact. The public browser demonstration and guarded local fixtures remain separate from instructional production selection.",
      "",
      "Human process: Draft → Source Check → Technical Review → Editorial Review → Approved → Published. Existing DB technical approval remains explicit; future publication requires a separate exact-revision editorial sign-off. Existing publications and historical attempts are preserved. AI drafts and automated quality checks never grant publication.",
      "",
      "Approved-question milestones remain 200 with domain sufficiency, 500 for the initial commercial bank, then 1,000 and 2,000. All supplied reviewed counts remain zero.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(directory, "RESEARCH_LIMITATIONS.md"),
    [
      "# Research limitations and unresolved access",
      "",
      `Actual network audit: **${audit.summary.distinctUrlsAttempted} distinct URLs attempted; 0 publisher URLs successfully accessed; 0 remote documents retrieved; 0 remote sections processed; 0 child links discovered or followed.** Every request was rejected by the workspace HTTPS CONNECT proxy with 403 before reaching the target. Target HTTP status therefore remains unknown, rather than falsely claiming that BCSP/OSHA itself returned 403. No bypass or permanent-error retry was attempted.`,
      "",
      "## URLs with failed access",
      "",
      ...audit.sources.map(
        (source) => `- ${source.url} — ${source.errorNotes}`,
      ),
      "",
      "## Local supplied documents",
      "",
      "Two user-supplied PDFs were processed locally: five of five page texts extracted and five page-level source sections indexed. Their content hashes and per-page extraction hashes/counts are in LOCAL_DOCUMENT_PROCESSING.json. The underlying page text stays private. Tables, multi-column layout, figures and formulas remain marked for visual/manual review. This is not a successful online retrieval or current-version verification. No unreadable page was inferred or filled in.",
      "",
      "## Literature and licensing",
      "",
      "All 21 BCSP bibliography entries were registered individually and received a separate publisher-title query. No underlying book, chapter, table of contents, ebook, sample, price, library entitlement, newer edition or download license was confirmed. No pirated material was searched for or obtained. Cost and purchase requirements are unknown, not assumed. Obtain lawful publisher/library access or an authorized upload before text analysis. See REFERENCE_ACQUISITION_REPORT.md for every title and priority rationale.",
      "",
      "## Content and processing gaps",
      "",
      `- ${rows.filter((row) => row.entity_kind === "existing_candidate_url").length} existing-candidate URL rows are separately catalogued when not among the 43 actual requests; they remain unprocessed. Consult SOURCE_INVENTORY.csv for exact status per row.`,
      "- OSHA Part 1926/1910 standards, interpretation dates/applicability, NIOSH publications and supplementary resources have no successfully indexed online text in this run. Standard-by-standard coverage remains zero; no exhaustive regulatory crawl is claimed.",
      "- All 78 objectives require verified technical support. Book relevance derived from titles is explicitly tentative; applicability and consensus-standard clauses remain unresolved.",
      "- The 150 existing AI drafts have no verified-source or technical-approval backfill. Correctness, numerical claims, distractor quality, ambiguity, rights and source conflicts require human review.",
      "- Three lesson briefs are source-blocked plans; no completed reference-supported technical module or additional 50-question batch was fabricated.",
      "- The source index is private. Restricted text must never be redistributed through public learner routes or sent to an AI provider without separate lawful authorization. No model is connected and no source text is transmitted automatically.",
      "- PDF tools are installed in this workspace but are not assumed available in Vercel. The trusted operator worker needs pdfinfo/pdftotext; missing tools produce manual-review blockers. Authorized HTML/text imports remain supported.",
      "- Parsing and mechanical quality flags are not human verification. Near-duplicate and contradiction flags are heuristic candidates, not definitive semantic judgments.",
      "- Hosted authentication/PostgreSQL, native Safari, deployment readiness, source currency and commercial launch readiness need separate validation. Development fixtures never count as production content.",
      "",
      "Continue with source acquisition and evidence review before technical authoring. The reproducible bounded queue can resume when access is available; a limitation must remain visible rather than replaced by unsupported content.",
      "",
    ].join("\n"),
  );
  console.log(
    JSON.stringify({
      inventoryRows: rows.length,
      actualDistinctNetworkUrls: 43,
      mandatoryUrls: 14,
      bibliography: 21,
      localDocuments: local.length,
      localPageSections: local.reduce(
        (sum, item) => sum + item.sections.length,
        0,
      ),
      masterObjectives: chstMasterCurriculum.length,
      drafts: records.length,
      newReferenceSupportedQuestions: 0,
    }),
  );
}
void main();
