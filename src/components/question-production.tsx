import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  questionBankTargets,
  type QuestionProductionSummary,
} from "@/modules/studio/production-model";

export function QuestionProduction({
  summary,
}: {
  summary: QuestionProductionSummary;
}) {
  const { totals, exam } = summary;
  const eligible = exam.productionEligibleTotal ?? exam.eligibleTotal;
  const ready = exam.productionReady ?? exam.canStart;
  const domains = exam.productionDomains ?? exam.domains;
  const metrics = [
    ["total", "Active bank questions", totals.total],
    ["draft", "Draft questions", totals.draft],
    [
      "awaiting-review",
      "Awaiting source or technical review",
      totals.awaitingReview,
    ],
    ["approved", "Approved, awaiting publication", totals.approved],
    ["published", "Published questions", totals.published],
    [
      "source-gaps",
      "Questions needing source verification",
      totals.needsSourceVerification,
    ],
    ["duplicate-groups", "Duplicate candidate groups", totals.duplicateGroups],
    [
      "missing-objectives",
      "Objectives without active questions",
      totals.missingObjectives,
    ],
  ] as const;
  return (
    <div className="page-wrap studio-page production-page">
      <div className="studio-heading">
        <div>
          <div className="eyebrow">
            CREDBUILT QUESTION BANK · ADMINISTRATION
          </div>
          <h1>
            Question production<span className="orange">.</span>
          </h1>
          <p className="lead">
            Develop the bank. Review the evidence. Measure what is ready.
          </p>
        </div>
        <span className="outline-badge">
          <ShieldCheck size={15} aria-hidden="true" />
          Administrator
        </span>
      </div>
      <nav
        className="studio-actions"
        aria-label="Question production navigation"
      >
        <Link className="button primary" href="/studio/questions">
          Manage questions
        </Link>
        <Link className="button secondary" href="/studio/references">
          Reference registry
        </Link>
        <Link className="button secondary" href="/studio/coverage">
          Detailed objective coverage
        </Link>
        <Link className="button secondary" href="/studio/exams">
          Examination administration
        </Link>
      </nav>
      <section className="notice compact-notice">
        <p>
          Live connected database counts. Each question contributes one current
          editorial revision; retired items and demonstration fixtures are
          excluded from the active bank. Published counts use the actual
          publication pointer, even when a newer draft is being edited.
        </p>
        <p>
          The curriculum uses the supplied CHST5 2022.04.12 blueprint. Its
          latest online version has not been independently confirmed. Draft
          quantities, bibliography entries and AI output never establish
          technical approval.
        </p>
      </section>
      {summary.access.localDevelopment && (
        <p className="notice compact-notice">
          Isolated development identity. These local database metrics do not
          validate live managed authentication or a hosted production bank.
        </p>
      )}
      <div className="coverage-metrics production-metrics">
        {metrics.map(([id, label, value]) => (
          <div
            className="card coverage-metric"
            key={id}
            data-testid={`production-metric-${id}`}
          >
            <strong>{value.toLocaleString("en-US")}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="card coverage-panel" aria-label="Publication targets">
        <h2>Publication targets</h2>
        <p>
          Progress uses questions eligible for production examination selection,
          including the required source, review, publication and blueprint
          evidence. {totals.total} active questions are in development;{" "}
          {eligible} meet the production eligibility gate.
        </p>
        <div className="production-targets">
          {[
            ["500-question launch target", questionBankTargets.launch],
            ["2,000-question bank target", questionBankTargets.eventual],
          ].map(([label, target]) => (
            <div key={label} className="production-target">
              <div>
                <strong>{label}</strong>
                <span>
                  {eligible.toLocaleString("en-US")} /{" "}
                  {Number(target).toLocaleString("en-US")}
                </span>
              </div>
              <progress
                aria-label={String(label)}
                value={Math.min(eligible, Number(target))}
                max={Number(target)}
              />
              <small>
                {Math.max(0, Number(target) - eligible).toLocaleString("en-US")}{" "}
                additional eligible questions needed
              </small>
            </div>
          ))}
        </div>
      </section>
      <section
        className="card coverage-panel"
        aria-label="Full-length examination readiness"
      >
        <h2>Full-length examination readiness</h2>
        <p className="production-readiness" data-ready={ready}>
          <strong>Production Exam: {ready ? "Ready" : "Not Ready"}</strong>
          <span>
            {eligible} eligible questions · 200 unique questions per examination
            · four hours
          </span>
        </p>
        <p>
          Every domain must meet its own requirement. Extra questions in one
          domain cannot fill another domain’s shortfall.
        </p>
        <div className="coverage-table-wrap">
          <table className="coverage-table">
            <caption className="sr-only">
              Production examination domain shortfalls
            </caption>
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Eligible</th>
                <th scope="col">Required</th>
                <th scope="col">Still needed</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => (
                <tr key={domain.code}>
                  <th scope="row">
                    {domain.code}. {domain.title}
                  </th>
                  <td>{domain.eligible}</td>
                  <td>{domain.required}</td>
                  <td>{domain.shortfall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card coverage-panel">
        <h2>Domain production goals</h2>
        <p>
          Targets preserve the supplied blueprint weights across the eventual
          2,000-question bank. Approved counts below mean current revisions
          awaiting publication.
        </p>
        <div className="coverage-table-wrap">
          <table className="coverage-table">
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Weight</th>
                <th scope="col">Active</th>
                <th scope="col">Approved</th>
                <th scope="col">Published</th>
                <th scope="col">2,000-bank target</th>
                <th scope="col">Source gaps</th>
              </tr>
            </thead>
            <tbody>
              {summary.domains.map((domain) => (
                <tr key={domain.code}>
                  <th scope="row">
                    <Link
                      className="text-link"
                      href={`/studio/questions?domain=${domain.code}`}
                    >
                      {domain.code}. {domain.title}
                    </Link>
                  </th>
                  <td>{domain.weight}%</td>
                  <td>{domain.total}</td>
                  <td>{domain.approved}</td>
                  <td>{domain.published}</td>
                  <td>{domain.target}</td>
                  <td>{domain.needsSourceVerification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card coverage-panel">
        <h2>Questions by topic</h2>
        {summary.topics.length ? (
          <details className="production-details">
            <summary>Inspect {summary.topics.length} topics</summary>
            <div className="coverage-table-wrap">
              <table className="coverage-table">
                <thead>
                  <tr>
                    <th scope="col">Domain</th>
                    <th scope="col">Topic</th>
                    <th scope="col">Active</th>
                    <th scope="col">Approved</th>
                    <th scope="col">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topics.map((topic) => (
                    <tr key={JSON.stringify([topic.domain, topic.topic])}>
                      <td>{topic.domain}</td>
                      <th scope="row">{topic.topic}</th>
                      <td>{topic.total}</td>
                      <td>{topic.approved}</td>
                      <td>{topic.published}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : (
          <p>
            No active instructional questions have been saved to this editorial
            database.
          </p>
        )}
      </section>
      <section className="card coverage-panel">
        <h2>Blueprint coverage gaps</h2>
        <p>
          {totals.missingObjectives} of 78 objectives lack an active question.{" "}
          {totals.unpublishedObjectives} lack a published question. A mapping
          alone does not prove instructional coverage or source accuracy.
        </p>
        {summary.missingObjectives.length > 0 && (
          <details className="production-details">
            <summary>Inspect objectives without active questions</summary>
            <ul>
              {summary.missingObjectives.map((objective) => (
                <li key={objective.id}>
                  <Link
                    className="text-link"
                    href={`/studio/questions?objective=${encodeURIComponent(objective.id)}`}
                  >
                    {objective.id}
                  </Link>
                  <p>{objective.statement}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <section className="card coverage-panel">
        <h2>Duplicate candidates</h2>
        <p>
          {totals.duplicateQuestions} questions in {totals.duplicateGroups}{" "}
          wording-match groups. Matching ignores punctuation, case and spacing.
          This flags candidates for human review; it does not detect paraphrases
          or automatically delete records.
        </p>
        {summary.duplicateCandidates.length ? (
          <ul className="production-duplicates">
            {summary.duplicateCandidates.map((candidate) => (
              <li key={candidate.questionIds[0]}>
                <strong>{candidate.title}</strong>
                <p>
                  {candidate.questionIds.map((id, index) => (
                    <span key={id}>
                      {index > 0 ? " · " : ""}
                      <Link
                        className="text-link"
                        href={`/studio/questions?search=${encodeURIComponent(id)}`}
                      >
                        {id}
                      </Link>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No matching active stems were found.</p>
        )}
      </section>
      <section className="card coverage-panel">
        <h2>Review queue details</h2>
        <p>
          {totals.sourceVerifiedAwaitingSubmission} source-verified revisions
          await technical submission · {totals.changesRequested} need changes ·{" "}
          {totals.rejected} rejected · {totals.retired} retired questions
          retained in history.
        </p>
        <p>
          Use the Question Bank to examine an exact revision, request
          independent source verification, submit technical review, and publish
          only after authorized human approval.
        </p>
        <Link className="text-link" href="/studio/questions">
          Open the review workflow
        </Link>
      </section>
    </div>
  );
}
