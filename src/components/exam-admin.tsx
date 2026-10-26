import Link from "next/link";
import { ClipboardCheck, LockKeyhole } from "lucide-react";
import type { ExamAdminSummary } from "@/modules/exams/types";

/** Authorized server-rendered metadata. This view never receives answer keys. */
export function ExamAdmin({
  summary,
  domain = "all",
}: {
  summary: ExamAdminSummary;
  domain?: string;
}) {
  const availability = summary.availability;
  const statistics = summary.questionStatistics.filter(
    (row) => domain === "all" || row.domain === domain,
  );
  const metrics = [
    ["Technically approved records", summary.approvedTotal],
    ["Active published questions", summary.publishedTotal],
    ["Eligible full-exam questions", availability.eligibleTotal],
    ["Draft records", summary.draftCount],
    ["Awaiting technical approval", summary.unreviewedCount],
    ["Ineligible published records", summary.invalidPublished],
    ["Completed full exams", summary.completedAttempts],
    ["Unfinished full exams", summary.inProgressAttempts],
  ] as const;

  return (
    <div className="page-wrap curriculum-page exam-admin-page">
      <div className="eyebrow">ADMINISTRATION · ACTUAL DATABASE RECORDS</div>
      <h1>
        Know when the bank is ready<span className="orange">.</span>
      </h1>
      <p className="lead">
        Full-length exam eligibility, domain shortfalls and completed-attempt
        evidence. Draft quantity alone does not unlock an examination.
      </p>
      <div className="results-actions">
        <Link className="text-link" href="/studio">
          ← Content Studio
        </Link>
        <Link className="text-link" href="/studio/coverage">
          Curriculum coverage
        </Link>
        <Link className="text-link" href="/studio/questions">
          Question Bank
        </Link>
        <Link className="text-link" href="/exam">
          Learner exam overview
        </Link>
      </div>

      <section className="card coverage-panel">
        {availability.canStart ? (
          <ClipboardCheck size={28} aria-hidden="true" />
        ) : (
          <LockKeyhole size={28} aria-hidden="true" />
        )}
        <h2>
          {availability.canStart
            ? "The current bank meets generation checks"
            : "Full-length exam initiation is locked"}
        </h2>
        <p>
          Exactly 200 distinct published questions · 240 minutes · CHST5 V.
          {availability.blueprintVersion}.
        </p>
        <p className="fine-print">
          Standard examination setting: four hours. Supplied CHST5 domain
          numbering is preserved. Current document-version checks are recorded
          in the source provenance documentation. No official passing score or
          exam-readiness prediction is applied.
        </p>
        {availability.blockers.length > 0 && (
          <ul>
            {availability.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
        {availability.developmentFixture && (
          <p className="notice">
            Development fixture provider is active. Synthetic arithmetic data is
            not reviewed CHST instruction and must not be counted as a
            production-ready bank.
          </p>
        )}
      </section>

      <section
        className="card coverage-panel"
        aria-label="Independent examination readiness"
      >
        <h2>Production and demonstration readiness</h2>
        <dl className="result-domain">
          <dt>Approved eligible questions</dt>
          <dd>
            {availability.productionEligibleTotal ?? availability.eligibleTotal}{" "}
            / 200
          </dd>
        </dl>
        <dl className="result-domain">
          <dt>Production exam</dt>
          <dd>
            {(availability.productionReady ?? availability.canStart)
              ? "Ready"
              : "Not ready"}
          </dd>
        </dl>
        <dl className="result-domain">
          <dt>Development simulator</dt>
          <dd>
            {availability.developmentSimulatorAvailable
              ? "Available locally"
              : "Not enabled in this environment"}
          </dd>
        </dl>
        <p className="fine-print">
          A demonstration provider never contributes approved questions or makes
          the production exam ready. Browser demonstrations use their own
          explicitly labeled sample bank and local history.
        </p>
      </section>

      <p className="fine-print">
        Counts below describe the production question bank and production-bank
        full-exam attempts. Synthetic development attempts are excluded.
      </p>
      <div className="coverage-metrics">
        {metrics.map(([label, count]) => (
          <div className="card coverage-metric" key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <section className="card coverage-panel">
        <h2>Domain eligibility and exact shortfalls</h2>
        <p>
          Eligibility requires a published, technically approved revision with
          valid canonical mapping, four choices, a single answer key,
          explanation and source evidence. A publication that fails validation
          is excluded.
        </p>
        <div
          className="coverage-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Scrollable domain eligibility table"
        >
          <table className="coverage-table">
            <thead>
              <tr>
                <th scope="col">CHST5 domain</th>
                <th scope="col">Required</th>
                <th scope="col">Approved</th>
                <th scope="col">Published</th>
                <th scope="col">Eligible</th>
                <th scope="col">Shortfall</th>
                <th scope="col">Draft</th>
                <th scope="col">Awaiting approval</th>
              </tr>
            </thead>
            <tbody>
              {availability.domains.map((row) => {
                const counts = summary.domainCounts.find(
                  (item) => item.code === row.code,
                );
                return (
                  <tr key={row.code}>
                    <th scope="row">
                      <Link
                        className="text-link"
                        href={`/studio?domain=${row.code}`}
                      >
                        {row.code}. {row.title}
                      </Link>
                    </th>
                    <td>{row.required}</td>
                    <td>{counts?.approved ?? 0}</td>
                    <td>{counts?.published ?? 0}</td>
                    <td>{row.eligible}</td>
                    <td>{row.shortfall}</td>
                    <td>{counts?.draft ?? 0}</td>
                    <td>{counts?.unreviewed ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="fine-print">
          Production question counts exclude synthetic development fixtures.
          Approval and publication are distinct states; active publication
          pointers determine the exam candidate bank.
        </p>
      </section>

      <section className="card coverage-panel">
        <h2>Observed question performance</h2>
        <p>
          Completed production full-exam answers only. Unfinished answers and
          synthetic development attempts do not contribute to these statistics.
          These observations do not establish item validity or mastery.
        </p>
        <p className="fine-print">
          Up to 200 most-answered question revisions are loaded across all
          domains. The domain filter applies to those loaded rows, rather than
          querying every question revision in the bank.
        </p>
        <form className="coverage-filters" method="get">
          <label htmlFor="exam-admin-domain">
            Question statistics domain
            <select name="domain" id="exam-admin-domain" defaultValue={domain}>
              <option value="all">All domains</option>
              {availability.domains.map((row) => (
                <option key={row.code} value={row.code}>
                  Domain {row.code}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" type="submit">
            Refresh exam validation
          </button>
        </form>
        {statistics.length === 0 ? (
          <p className="notice">
            No completed production question responses are available for this
            selection. No performance values have been fabricated.
          </p>
        ) : (
          <div
            className="coverage-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Scrollable question performance table"
          >
            <table className="coverage-table">
              <thead>
                <tr>
                  <th scope="col">Question revision</th>
                  <th scope="col">Domain</th>
                  <th scope="col">Topic</th>
                  <th scope="col">Answered</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {statistics.map((row) => (
                  <tr key={`${row.id}:v${row.version}`}>
                    <th scope="row">
                      <Link
                        className="text-link"
                        href={`/studio?search=${encodeURIComponent(row.id)}`}
                      >
                        {row.id} · v{row.version}
                      </Link>
                    </th>
                    <td>{row.domain}</td>
                    <td>{row.topic}</td>
                    <td>{row.answered}</td>
                    <td>{row.correct}</td>
                    <td>
                      {row.accuracy === null
                        ? "No responses"
                        : `${row.accuracy}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="demo-disclosure">
        Administrator-only metadata. Statistics reflect stored records; they do
        not verify live authentication, source correctness or readiness for a
        commercial launch.
      </p>
    </div>
  );
}
