"use client";
import Link from "next/link";
import { useState } from "react";
import type { CurriculumManagerSnapshot } from "@/modules/curriculum/manager-service";
import { Field } from "./studio/fields";

export function CurriculumManager({
  initial,
}: {
  initial: CurriculumManagerSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<CurriculumManagerSnapshot | null>(
    initial,
  );
  const [domain, setDomain] = useState("all"),
    [search, setSearch] = useState(""),
    [evidenceFilter, setEvidenceFilter] = useState("all");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function reload() {
    const response = await fetch("/api/studio/curriculum", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await response.json();
    if (!response.ok) {
      if ([401, 403].includes(response.status)) setSnapshot(null);
      throw new Error(
        data.error || "Curriculum evidence could not be reloaded.",
      );
    }
    setSnapshot(data);
  }
  if (!snapshot)
    return (
      <div className="page-wrap narrow">
        <h1>Curriculum access changed.</h1>
        <p role="alert">
          {error || "Sign in again with an authorized administrator account."}
        </p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
      </div>
    );
  const rows = snapshot.objectives.filter(
    (row) =>
      (domain === "all" || row.domain === domain) &&
      (evidenceFilter === "all" ||
        (evidenceFilter === "gaps"
          ? row.counts.verifiedSourceSections === 0
          : row.counts.verifiedSourceSections > 0)) &&
      `${row.id} ${row.officialStatement} ${row.credBuiltLearningObjective} ${row.topic}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="page-wrap studio-page curriculum-manager">
      <div className="eyebrow">CREDBUILT · CURRICULUM RESEARCH AND REVIEW</div>
      <h1>
        CHST5 Curriculum Manager<span className="orange">.</span>
      </h1>
      <p className="lead">
        Keep examination scope, authored learning objectives and technical
        evidence distinct.
      </p>
      <div className="curriculum-actions">
        <Link className="button primary" href="/studio/research">
          Open research library
        </Link>
        <Link className="button secondary" href="/studio/questions">
          Question Bank
        </Link>
        <Link className="button secondary" href="/studio/coverage">
          Content review and reports
        </Link>
      </div>
      <section className="notice compact-notice">
        <p>
          The supplied CHST5 V.2022.04.12 blueprint contains 78 official
          knowledge and skill statements. Its latest online version has not been
          confirmed. CredBuilt learning outcomes, reading candidates and lesson
          briefs are authoring work, not additions to the official blueprint or
          verified instruction.
        </p>
      </section>
      {snapshot.access.localDevelopment && (
        <div className="notice compact-notice">
          <p>
            <strong>Isolated development identity.</strong> These are actual
            local editorial records, not validated hosted-provider or customer
            statistics.
          </p>
        </div>
      )}
      <div className="coverage-metrics">
        <div className="card coverage-metric">
          <strong>{snapshot.totals.objectives}</strong>
          <span>Official statements mapped</span>
        </div>
        <div className="card coverage-metric">
          <strong>{snapshot.totals.withVerifiedEvidence}</strong>
          <span>Objectives with reviewed section support</span>
        </div>
        <div className="card coverage-metric">
          <strong>{snapshot.totals.sourceGaps}</strong>
          <span>Objectives needing additional source review</span>
        </div>
        <div className="card coverage-metric">
          <strong>{snapshot.totals.withApprovedLessons}</strong>
          <span>Objectives with approved or published lessons</span>
        </div>
      </div>
      <section className="card studio-panel">
        <h2>Coverage means evidence, instruction and assessment.</h2>
        <p>
          Mapped statements: {snapshot.totals.objectives}/78. Reviewed section
          support: {snapshot.totals.withVerifiedEvidence}/78 (
          {Math.round((snapshot.totals.withVerifiedEvidence / 78) * 100)}%).
          Draft lesson coverage: {snapshot.totals.withDraftLessons}/78. Approved
          or published assessment coverage:{" "}
          {snapshot.totals.withApprovedQuestions}/78.
        </p>
        <p>
          {snapshot.totals.comprehensivelyReviewedObjectives}/78 objectives have
          a comprehensive coverage determination. The evidence progress score
          awards 25 points each for reviewed section support, approved/published
          instruction and approved/published assessment, capped at 75. It is not
          a measure of learner mastery or proof that the whole objective is
          covered. One citation or loosely related regulation cannot establish
          full coverage. Blueprint-scope metadata and CredBuilt-authored
          explanations do not count as independent technical source support.
        </p>
      </section>
      <div className="curriculum-domain-grid">
        {snapshot.domains.map((item) => (
          <section className="card studio-panel" key={item.code}>
            <div className="eyebrow">
              DOMAIN {item.code} · {item.percentage}%
            </div>
            <h2>{item.title}</h2>
            <p>
              {item.objectives} statements · {item.withVerifiedEvidence} with
              reviewed source support · {item.withApprovedLessons} with
              approved/published lessons · {item.withApprovedQuestions} with
              approved/published questions.
            </p>
          </section>
        ))}
      </div>
      <section className="card studio-panel">
        <h2>Prioritized lesson authoring briefs</h2>
        <p>
          Three original briefs plan excavation, work-at-height and
          job-hazard-analysis lessons. Technical explanations and technical
          assessment answers are blocked until authoritative sources can be
          examined. These are not three completed technical lessons.
        </p>
        <ul>
          {snapshot.objectives.flatMap((row) =>
            row.lessonBriefs.map((brief) => (
              <li key={brief.id}>
                <strong>{brief.title}</strong> — source-blocked.{" "}
                <Link
                  className="text-link"
                  href={`/studio?lessonBrief=${encodeURIComponent(brief.id)}`}
                >
                  Open lesson authoring
                </Link>{" "}
                ·{" "}
                <a
                  className="text-link"
                  href={`/api/studio/curriculum?brief=${encodeURIComponent(brief.id)}`}
                  download={`${brief.id}-SOURCE-BLOCKED.json`}
                >
                  Download authoring brief JSON
                </a>
              </li>
            )),
          )}
        </ul>
      </section>
      <div className="curriculum-filter">
        <Field label="Search curriculum statements">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Statement, topic or stable ID"
          />
        </Field>
        <Field label="Curriculum domain">
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          >
            <option value="all">All four domains</option>
            {snapshot.domains.map((item) => (
              <option key={item.code} value={item.code}>
                Domain {item.code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Curriculum evidence filter">
          <select
            value={evidenceFilter}
            onChange={(event) => setEvidenceFilter(event.target.value)}
          >
            <option value="all">All evidence states</option>
            <option value="gaps">Source-review gaps</option>
            <option value="supported">Reviewed section support</option>
          </select>
        </Field>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="studio-success" role="status">
          {notice}
        </p>
      )}
      <p className="curriculum-meta">
        {rows.length} of 78 statements match. Current editorial heads and actual
        publication pointers are counted separately. Demonstration fixtures and
        retired heads do not inflate the instructional bank.
      </p>
      <div className="curriculum-objectives">
        {rows.map((row) => (
          <details className="card curriculum-objective" key={row.id}>
            <summary>
              Domain {row.domain} ·{" "}
              {row.officialKind === "knowledge" ? "K" : "S"}
              {String(row.officialNumber).padStart(2, "0")} —{" "}
              {row.officialStatement}
              <small>
                {row.id} · {row.counts.draftQuestions} draft questions ·{" "}
                {row.counts.awaitingReviewQuestions} awaiting review ·{" "}
                {row.counts.technicallyApprovedQuestions} technically approved ·{" "}
                {row.counts.approvedQuestions} with final approval ·{" "}
                {row.counts.publishedQuestions} published · Evidence progress{" "}
                {row.coverageScore}/100
              </small>
            </summary>
            <h3>Official blueprint scope</h3>
            <p>{row.officialStatement}</p>
            <p className="curriculum-meta">
              Supplied blueprint page {row.blueprintPage}; original domain,
              statement kind and printed numbering preserved.
            </p>
            <h3>CredBuilt learning objective</h3>
            <p>{row.credBuiltLearningObjective}</p>
            <p className="curriculum-meta">
              Internal outcome {row.learningObjectiveId} · Recommended starting
              level: {row.recommendedDifficulty}. These are proposed authoring
              decisions requiring curriculum review.
            </p>
            <h4>Required knowledge to develop</h4>
            <ul>
              {row.requiredKnowledge.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h4>Required practical application</h4>
            <ul>
              {row.requiredPracticalApplication.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h4>Learning depth</h4>
            <ul className="curriculum-levels">
              {row.levels.map((level) => (
                <li key={level.id}>
                  <strong>{level.title}</strong>
                  <p>{level.outcome}</p>
                </li>
              ))}
            </ul>
            <h3>Supporting evidence</h3>
            <p>
              {row.counts.verifiedSourceSections} reviewed supporting sections.
              Status: {row.liveEvidenceStatus.replaceAll("_", " ")}.
              Comprehensive curriculum review remains pending.
            </p>
            {row.counts.sourceConflicts > 0 && (
              <div className="notice compact-notice">
                <p>
                  <strong>
                    {row.counts.sourceConflicts} source conflict relationships
                    require manual resolution.
                  </strong>{" "}
                  This objective receives no technical source-support points
                  while current conflicting evidence remains. A supporting
                  citation does not override a recorded conflict. Link history
                  is preserved; conflicts need explicit human curation rather
                  than an automatic choice of source.
                </p>
              </div>
            )}
            {row.sources.length ? (
              row.sources.map((source) => (
                <div
                  className="curriculum-evidence"
                  key={`${source.sourceId}:${source.sectionId}:${source.relationKind}`}
                >
                  <strong>{source.sourceTitle}</strong>
                  <p className="curriculum-meta">
                    {(
                      source.classification || "classification not recorded"
                    ).replaceAll("_", " ")}
                  </p>
                  <p>
                    {source.locator || "No exact section linked"} ·
                    Relationship: {source.relationKind} ·{" "}
                    {source.verified
                      ? "Current source human review recorded"
                      : "Not verified as support"}
                  </p>
                  <p>{source.notes}</p>
                  <p className="curriculum-meta">
                    Source {source.sourceId}
                    {source.sectionId ? ` · Section ${source.sectionId}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p>
                No research source relationship has been saved for this
                objective.
              </p>
            )}
            <details>
              <summary>Link an existing research source</summary>
              <p className="curriculum-meta">
                Use IDs from the protected research library. A relationship
                never verifies a source. Supporting evidence requires an exact
                section, actual source examination and an authorized reviewer.
              </p>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy) return;
                  const fields = new FormData(event.currentTarget);
                  setBusy(true);
                  setError("");
                  setNotice("");
                  try {
                    const response = await fetch("/api/studio/research", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify({
                        action: "link",
                        sourceId: String(fields.get("sourceId") || "").trim(),
                        objectiveId: row.id,
                        sectionId:
                          String(fields.get("sectionId") || "").trim() || null,
                        relationKind: String(fields.get("relationKind")),
                        notes: String(fields.get("notes") || "").trim(),
                      }),
                    });
                    const data = await response.json();
                    if (!response.ok) {
                      if ([401, 403].includes(response.status))
                        setSnapshot(null);
                      throw new Error(
                        data.error || "Source relationship was not saved.",
                      );
                    }
                    await reload();
                    setNotice(
                      "Source relationship saved. No source or instructional content was verified or approved.",
                    );
                  } catch (caught) {
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : "The source relationship was not saved.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="studio-field-grid">
                  <Field label={`Source ID for ${row.id}`}>
                    <input name="sourceId" required maxLength={100} />
                  </Field>
                  <Field label={`Section ID for ${row.id}`}>
                    <input name="sectionId" maxLength={150} />
                  </Field>
                  <Field label={`Source relationship for ${row.id}`}>
                    <select name="relationKind" defaultValue="candidate">
                      <option value="candidate">
                        Candidate — research required
                      </option>
                      <option value="supports">
                        Supporting section — requires verification
                      </option>
                      <option value="conflicts">
                        Potential source conflict
                      </option>
                    </select>
                  </Field>
                </div>
                <Field label={`Relationship notes for ${row.id}`}>
                  <textarea name="notes" required maxLength={3000} />
                </Field>
                <button className="button primary" disabled={busy}>
                  Save source relationship
                </button>
              </form>
            </details>
            <h3>Candidate references — not examined</h3>
            <p>
              No candidate below establishes answer support or confirms legal
              applicability. Exact supporting sections, editions and relevance
              need human examination.
            </p>
            <ul>
              {[
                ...row.candidateRegulations,
                ...row.candidatePublicReferences,
              ].map((source, index) => (
                <li key={`${source.url}:${index}`}>
                  <strong>{source.title}</strong> ·{" "}
                  {source.classification.replaceAll("_", " ")}
                  <p className="curriculum-meta">
                    {source.locator} · Existing unreviewed draft candidate only.{" "}
                    {source.url && (
                      <a
                        className="text-link"
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open candidate publisher link
                      </a>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            <p>{row.consensusStandards.note}</p>
            <h4>Book research candidates</h4>
            <p className="curriculum-meta">
              Selected by tentative study planning and title-level inference.
              Only the supplied bibliography listing is available; book contents
              and current editions have not been examined.
            </p>
            <ul>
              {row.supportingBooks.map((book) => (
                <li key={book.id}>
                  {book.title} — {book.availability.replaceAll("_", " ")};
                  relevance inferred, not confirmed chapter coverage.
                </li>
              ))}
            </ul>
            <h3>Saved content and missing instruction</h3>
            <p>
              {row.counts.lessons} saved lesson records ·{" "}
              {row.counts.draftLessons} technical lesson drafts ·{" "}
              {row.counts.sourceBlockedLessonBriefs} source-blocked authoring
              briefs · {row.counts.approvedLessons} final approvals ·{" "}
              {row.counts.publishedLessons} published lessons.{" "}
              {row.counts.lessons === 0
                ? "A source-supported lesson still needs authoring."
                : "Saved drafts still need evidence and the applicable independent reviews."}
            </p>
            {row.content.length ? (
              <ul>
                {row.content.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="text-link"
                      href={`/studio?search=${encodeURIComponent(item.id)}`}
                    >
                      {item.title}
                    </Link>{" "}
                    · {item.kind} · {item.status.replaceAll("_", " ")}
                    {item.finalApproval
                      ? " · Final human-review evidence present"
                      : " · Final approval not established"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No instructional content has been saved for this objective.</p>
            )}
            {!!row.candidateRelatedLessonIds.length && (
              <p className="curriculum-meta">
                Existing demonstration lesson connections:{" "}
                {row.candidateRelatedLessonIds.join(", ")}. These tentative
                relationships do not count as approved curriculum coverage.
              </p>
            )}
          </details>
        ))}
      </div>
      {rows.length === 0 && (
        <section className="card studio-panel">
          <h2>No matching curriculum statements.</h2>
          <p>Adjust the search or evidence filters.</p>
        </section>
      )}
    </div>
  );
}
