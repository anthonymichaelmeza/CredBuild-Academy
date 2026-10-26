"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, History, RefreshCw } from "lucide-react";
import { summarizeExamHistory } from "@/modules/exams/results";
import type { ExamHistoryItem } from "@/modules/exams/types";

function readableDate(value: string) {
  return `${new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
}

export function FullExamHistory({
  initial = [],
  browserOnly = false,
  signedIn = false,
}: {
  initial?: ExamHistoryItem[];
  browserOnly?: boolean;
  signedIn?: boolean;
}) {
  const [attempts, setAttempts] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(() =>
    initial.length === 50 ? initial.at(-1)!.id : null,
  );
  const summary = summarizeExamHistory(attempts);
  async function refresh(more = false) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/exams?view=history${more && nextCursor ? `&before=${encodeURIComponent(nextCursor)}` : ""}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to refresh Exam History.");
      setAttempts((previous) =>
        more
          ? [
              ...previous,
              ...data.attempts.filter(
                (item: ExamHistoryItem) =>
                  !previous.some((saved) => saved.id === item.id),
              ),
            ]
          : data.attempts,
      );
      setNextCursor(
        typeof data.nextCursor === "string" ? data.nextCursor : null,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to refresh Exam History.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-wrap full-exam-history">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR EXAMINATION RECORD</div>
          <h1>
            Exam History<span className="orange">.</span>
          </h1>
          <p>
            Resume unfinished full-length attempts and learn from your completed
            examinations.
          </p>
        </div>
        <Link className="button primary" href="/exam">
          Exam Simulator
          <ArrowRight size={17} />
        </Link>
      </div>
      {browserOnly || !signedIn ? (
        <section className="card full-exam-empty">
          <History size={30} />
          <h2>
            {browserOnly
              ? "Full-length exams require a connected account"
              : "Sign in to view your examination record"}
          </h2>
          <p>
            {browserOnly
              ? "This browser demonstration has no server-backed examination records. Short rehearsal history remains in Performance. No full-length exam results have been generated."
              : "Your full-length attempts belong to your authenticated account. Sign in to resume across devices or review completed attempts."}
          </p>
          <Link
            className="button secondary"
            href={browserOnly ? "/performance" : "/settings"}
          >
            {browserOnly
              ? "View browser practice history"
              : "Open account settings"}
          </Link>
        </section>
      ) : (
        <>
          <div className="full-exam-history-summary">
            <div className="card">
              <span>Completed examinations shown</span>
              <strong>{summary.completedCount}</strong>
            </div>
            <div className="card">
              <span>Average score shown</span>
              <strong>
                {summary.averagePercentage === null
                  ? "—"
                  : `${summary.averagePercentage}%`}
              </strong>
            </div>
            <div className="card">
              <span>In progress shown</span>
              <strong>
                {
                  attempts.filter((attempt) => attempt.status === "in_progress")
                    .length
                }
              </strong>
            </div>
          </div>
          <section className="card full-exam-history-list">
            <div className="card-heading">
              <h2>Your full-length attempts</h2>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void refresh()}
              >
                <RefreshCw size={16} />
                {busy ? "Refreshing…" : "Refresh history"}
              </button>
            </div>
            <p className="fine-print">
              Showing {attempts.length} saved attempts, newest first. Summaries
              and comparisons on this page use the loaded records. Load older
              examinations below when available. Dates are shown in UTC.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {attempts.length ? (
              <div>
                {attempts.map((attempt) => (
                  <Link
                    className="full-exam-history-item"
                    key={attempt.id}
                    href={`/exam/${attempt.id}`}
                  >
                    <span className="action-icon">
                      <History size={21} />
                    </span>
                    <div>
                      <strong>
                        {attempt.status === "submitted"
                          ? "Completed examination"
                          : "Resume examination"}
                        {attempt.developmentFixture
                          ? " · Development-only fixtures"
                          : ""}
                      </strong>
                      <small>
                        {readableDate(attempt.createdAt)} · {attempt.answered} /
                        200 answered
                        {attempt.submissionReason === "expired"
                          ? " · Time expired"
                          : ""}
                      </small>
                      {attempt.status === "in_progress" && (
                        <small>
                          Deadline: {readableDate(attempt.deadlineAt)} · Your
                          timer continues while away
                        </small>
                      )}
                    </div>
                    <span className="full-exam-history-score">
                      {attempt.status === "submitted"
                        ? `${attempt.percentage ?? 0}%`
                        : `Question ${attempt.currentQuestionIndex + 1}`}
                      <ArrowRight size={17} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="full-exam-empty">
                <h3>No full-length attempts yet</h3>
                <p>
                  Your completed scores and unfinished exams will appear here.
                  Short practice rehearsals stay in your existing Performance
                  history.
                </p>
                <Link className="button secondary" href="/exam">
                  Check full-exam availability
                </Link>
              </div>
            )}
          </section>
          {nextCursor && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void refresh(true)}
            >
              {busy ? "Loading…" : "Load older examinations"}
            </button>
          )}
          {!!summary.domainTrends.length && (
            <section className="card full-exam-results-section">
              <h2>Domain performance across attempts</h2>
              <p>
                Each percentage uses all sampled questions in that domain,
                including unanswered items. Comparisons describe practice
                evidence, not official examination readiness.
              </p>
              <div className="full-exam-domain-trends">
                {summary.domainTrends.map((domain) => (
                  <section key={domain.key}>
                    <h3>{domain.label}</h3>
                    <div className="full-exam-trend-items">
                      {domain.attempts.map((attempt) => (
                        <Link
                          key={attempt.attemptId}
                          href={`/exam/${attempt.attemptId}`}
                        >
                          <span>
                            {new Date(attempt.submittedAt!).toLocaleDateString(
                              "en-US",
                              { timeZone: "UTC" },
                            )}
                          </span>
                          <div className="full-exam-bar">
                            <span style={{ width: `${attempt.accuracy}%` }} />
                          </div>
                          <strong>{attempt.accuracy}%</strong>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}
          <section className="card full-exam-results-section">
            <h2>Repeated knowledge gaps</h2>
            {summary.repeatedDomainGaps.length ? (
              <>
                <p>
                  These domains contained incorrect or unanswered items in at
                  least two completed attempts. This is an observation, not a
                  validated mastery threshold.
                </p>
                <div className="full-exam-recommendations">
                  {summary.repeatedDomainGaps.map((gap) => (
                    <Link
                      className="full-exam-recommendation"
                      key={gap.key}
                      href={`/practice?bank=published&domain=${encodeURIComponent(gap.key)}&count=10`}
                    >
                      <strong>
                        {gap.label}
                        <ArrowRight size={16} />
                      </strong>
                      <small>
                        Missed items in {gap.attemptsWithMisses} of{" "}
                        {gap.totalAttempts} attempts · latest{" "}
                        {gap.latestAccuracy}%
                      </small>
                      <small>
                        Practice this domain · availability depends on the
                        published bank
                      </small>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <p>
                {summary.completedCount < 2
                  ? "Complete at least two full-length attempts to look for recurring domain gaps."
                  : "No recurring domain gaps were observed in these saved attempts."}
              </p>
            )}
          </section>
        </>
      )}
      <p className="demo-disclosure">
        Full-length history is separate from short rehearsals. Account records
        require connected storage; the browser demonstration cannot supply
        cross-device examination history.
      </p>
    </div>
  );
}
