"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flag,
  History,
  Target,
  XCircle,
} from "lucide-react";
import { chstDomains } from "@/modules/curriculum/catalog";
import {
  analyzeExam,
  filterExamReview,
  missedExamConcepts,
  type ExamResultGroup,
  type ExamReviewFilter,
} from "@/modules/exams/results";
import type { ExamHistoryItem } from "@/modules/exams/types";
import type { SessionView } from "@/modules/practice/types";
import { QuestionReferences } from "./question-references";
import { formatExamTime } from "./full-exam-clock";

function PerformanceBars({ groups }: { groups: ExamResultGroup[] }) {
  return (
    <div className="full-exam-performance-bars">
      {groups.map((group) => (
        <div className="full-exam-performance-row" key={group.key}>
          <div>
            <strong>{group.label}</strong>
            <span>
              {group.correct} / {group.total} correct · {group.accuracy}%
            </span>
          </div>
          <div
            className="full-exam-bar"
            role="img"
            aria-label={`${group.label}: ${group.accuracy}% correct`}
          >
            <span style={{ width: `${group.accuracy}%` }} />
          </div>
          <small>
            {group.incorrect} incorrect · {group.unanswered} unanswered
            {group.averageResponseMs !== null
              ? ` · ${Math.round(group.averageResponseMs / 1000)}s average response`
              : ""}
          </small>
        </div>
      ))}
    </div>
  );
}

export function FullExamResults({
  session,
  history = [],
  comparisonUnavailable = false,
}: {
  session: SessionView;
  history?: ExamHistoryItem[];
  comparisonUnavailable?: boolean;
}) {
  const router = useRouter();
  const [review, setReview] = useState(false);
  const [filter, setFilter] = useState<ExamReviewFilter>({
    outcome: "all",
    domain: "all",
    topic: "all",
  });
  const [position, setPosition] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();
  const results = analyzeExam(session, history);
  if (!results)
    return (
      <div className="page-wrap narrow">
        <h1>Results are not available</h1>
        <p>
          Only a finalized, complete full-length attempt can display exam
          results.
        </p>
        <Link href="/exam/history" className="button secondary">
          Return to Exam History
        </Link>
      </div>
    );
  const missed = missedExamConcepts(session);
  const reviewItems = filterExamReview(session, filter);
  const item =
    reviewItems[Math.min(position, Math.max(0, reviewItems.length - 1))];
  const topics = [
    ...new Set(session.questions.map((question) => question.topic)),
  ].sort();
  function changeFilter(next: ExamReviewFilter) {
    setFilter(next);
    setPosition(0);
  }
  async function studyMissed() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "study_missed", sessionId: session.id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to create targeted practice.");
      router.push(`/practice/${data.id}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to create targeted practice.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="page-wrap full-exam-results">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            CREDBUILT · FULL-LENGTH PRACTICE COMPLETE
          </div>
          <h1>
            Your exam results<span className="orange">.</span>
          </h1>
          <p>
            {session.submissionReason === "expired"
              ? "Time expired. The server finalized your saved answers at the examination deadline."
              : "Your answers are final. Use this evidence to plan your next study session."}
          </p>
        </div>
        <Link className="button secondary" href="/exam/history">
          <History size={17} />
          Exam History
        </Link>
      </div>
      {session.developmentFixture && (
        <div className="notice compact-notice">
          <strong>Development-only results.</strong> These synthetic engineering
          fixtures do not measure CHST knowledge or readiness.
        </div>
      )}
      <div className="full-exam-results-summary">
        <section className="card full-exam-score">
          <Target size={30} />
          <strong>{results.accuracy}%</strong>
          <h2>{results.correct} of 200 correct</h2>
          <p>No official pass/fail score is applied.</p>
        </section>
        <section className="card full-exam-result-facts">
          <div>
            <span>Correct</span>
            <strong>{results.correct}</strong>
          </div>
          <div>
            <span>Incorrect answers</span>
            <strong>{results.incorrect}</strong>
          </div>
          <div>
            <span>Unanswered</span>
            <strong>{results.unanswered}</strong>
          </div>
          <div>
            <span>Time used</span>
            <strong>{formatExamTime(results.timeUsedSeconds)}</strong>
          </div>
          <div>
            <span>Average response</span>
            <strong>
              {results.averageResponseMs === null
                ? "Not recorded"
                : `${Math.round(results.averageResponseMs / 1000)} sec`}
            </strong>
          </div>
          <p className="fine-print">
            Score uses all 200 questions; unanswered items receive no credit.
            Response time is browser-reported. Four hours is the CredBuilt
            practice configuration.
          </p>
        </section>
      </div>
      <div className="full-exam-results-actions">
        <button
          className="button primary"
          onClick={() => {
            setReview(true);
            changeFilter({ outcome: "all", domain: "all", topic: "all" });
          }}
        >
          Review all questions
          <ArrowRight size={17} />
        </button>
        <button
          className="button secondary"
          disabled={!missed.total || busy}
          onClick={() => void studyMissed()}
        >
          {busy ? "Preparing practice…" : "Study My Missed Questions"}
        </button>
      </div>
      <p className="fine-print">
        Targeted practice uses missed concepts and prefers eligible alternatives
        when available. It never fills a shortage with duplicate questions.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!review ? (
        <>
          <section className="card full-exam-results-section">
            <h2>Performance by domain</h2>
            <PerformanceBars groups={results.domains} />
          </section>
          <div className="full-exam-results-columns">
            <section className="card full-exam-results-section">
              <h2>Performance by topic</h2>
              <PerformanceBars groups={results.topics} />
            </section>
            <section className="card full-exam-results-section">
              <h2>Question difficulty</h2>
              <PerformanceBars groups={results.difficulties} />
            </section>
          </div>
          <section className="card full-exam-results-section">
            <h2>Compared with your previous exam</h2>
            {results.comparison ? (
              <>
                <p>
                  <strong>
                    {results.comparison.percentagePointChange > 0 ? "+" : ""}
                    {results.comparison.percentagePointChange} percentage points
                  </strong>{" "}
                  from {results.comparison.previousPercentage}% in your{" "}
                  <Link
                    className="text-link"
                    href={`/exam/${results.comparison.previousAttemptId}`}
                  >
                    previous completed attempt
                  </Link>
                  .
                </p>
                <div
                  className="full-exam-comparison-table"
                  role="table"
                  aria-label="Domain comparison"
                >
                  <div role="row" className="comparison-heading">
                    <span role="columnheader">Domain</span>
                    <span role="columnheader">Previous</span>
                    <span role="columnheader">This attempt</span>
                  </div>
                  {results.comparison.domains.map((domain) => (
                    <div role="row" key={domain.key}>
                      <span role="cell">{domain.label}</span>
                      <strong role="cell">{domain.previousAccuracy}%</strong>
                      <strong role="cell">{domain.currentAccuracy}%</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p>
                {comparisonUnavailable
                  ? "Comparison history could not be loaded. Refresh this page to try again; your finalized results remain saved."
                  : "Complete another full-length exam to compare scores and domain performance. Short rehearsals are kept separate."}
              </p>
            )}
          </section>
          <section className="card full-exam-results-section">
            <h2>Your next study session</h2>
            {results.weakestAreas.length ? (
              <p>
                Start with:{" "}
                {results.weakestAreas.map((area) => area.label).join(" · ")}.
                These are the lowest-scoring sampled topics, not a validated
                mastery assessment.
              </p>
            ) : (
              <p>
                All questions were answered correctly in this attempt. Continue
                reviewing source-supported material across the blueprint.
              </p>
            )}
            <div className="full-exam-recommendations">
              {results.recommendations.map((recommendation) => (
                <Link
                  className="full-exam-recommendation"
                  href={recommendation.href}
                  key={`${recommendation.kind}:${recommendation.href}`}
                >
                  <span className="eyebrow">{recommendation.kind}</span>
                  <strong>
                    {recommendation.label}
                    <ArrowRight size={16} />
                  </strong>
                  <small>{recommendation.reason}</small>
                </Link>
              ))}
            </div>
            {!results.recommendations.length && (
              <Link className="text-link" href="/curriculum">
                Explore the CHST5 study map
              </Link>
            )}
          </section>
        </>
      ) : (
        <section
          className="card full-exam-review-section"
          aria-labelledby="full-exam-review-title"
        >
          <div className="card-heading">
            <h2 id="full-exam-review-title">Review your examination</h2>
            <button
              className="button secondary"
              onClick={() => setReview(false)}
            >
              Back to results
            </button>
          </div>
          <div className="full-exam-review-filters">
            <div className="field-label">
              <label htmlFor={`${fieldId}-outcome`}>Show results</label>
              <select
                id={`${fieldId}-outcome`}
                value={filter.outcome || "all"}
                onChange={(event) =>
                  changeFilter({
                    ...filter,
                    outcome: event.target.value as ExamReviewFilter["outcome"],
                  })
                }
              >
                <option value="all">All questions</option>
                <option value="incorrect">Incorrect answers</option>
                <option value="correct">Correct answers</option>
                <option value="unanswered">Unanswered questions</option>
                <option value="flagged">Flagged questions</option>
              </select>
            </div>
            <div className="field-label">
              <label htmlFor={`${fieldId}-domain`}>Review domain</label>
              <select
                id={`${fieldId}-domain`}
                value={filter.domain || "all"}
                onChange={(event) =>
                  changeFilter({ ...filter, domain: event.target.value })
                }
              >
                <option value="all">All domains</option>
                {chstDomains.map((domain) => (
                  <option key={domain.code} value={domain.code}>
                    Domain {domain.code} · {domain.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-label">
              <label htmlFor={`${fieldId}-topic`}>Review topic</label>
              <select
                id={`${fieldId}-topic`}
                value={filter.topic || "all"}
                onChange={(event) =>
                  changeFilter({ ...filter, topic: event.target.value })
                }
              >
                <option value="all">All topics</option>
                {topics.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </div>
          </div>
          <p role="status">
            {reviewItems.length} of 200 questions match these filters.
            {item
              ? ` Reviewing ${Math.min(position + 1, reviewItems.length)} of ${reviewItems.length}.`
              : ""}
          </p>
          {item ? (
            <article className="full-exam-review-question">
              <div className="full-exam-question-meta">
                <span>ORIGINAL QUESTION {item.index + 1} OF 200</span>
                <span>
                  {item.flagged && <Flag size={16} />}{" "}
                  {item.answer
                    ? item.answer.correct
                      ? "Correct"
                      : "Incorrect"
                    : "Unanswered"}
                </span>
              </div>
              <span className="topic-label">
                Domain {item.question.domain} · {item.question.topic} ·{" "}
                {item.question.difficulty}
              </span>
              <h3>{item.question.stem}</h3>
              <div className="answer-options">
                {item.question.choices.map((choice, choiceIndex) => (
                  <div
                    className={`answer-option ${item.feedback?.correctChoice === choice.id ? "correct" : item.answer?.choiceId === choice.id ? "incorrect" : ""}`}
                    key={choice.id}
                  >
                    <span className="choice-letter">
                      {String.fromCharCode(65 + choiceIndex)}
                    </span>
                    <span>
                      {choice.text}
                      {item.answer?.choiceId === choice.id && (
                        <small>Your answer</small>
                      )}
                      {item.feedback?.correctChoice === choice.id && (
                        <small>Correct answer</small>
                      )}
                    </span>
                    {item.feedback?.correctChoice === choice.id ? (
                      <CheckCircle2 size={19} />
                    ) : item.answer?.choiceId === choice.id ? (
                      <XCircle size={19} />
                    ) : null}
                  </div>
                ))}
              </div>
              {item.feedback ? (
                <div className="full-exam-review-explanation">
                  <h4>Answer explanation</h4>
                  <p>{item.feedback.explanation}</p>
                  {!!item.feedback.solutionSteps?.length && (
                    <>
                      <h4>Worked solution</h4>
                      <ol>
                        {item.feedback.solutionSteps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </>
                  )}
                  {item.feedback.rationales.some(
                    (choice) =>
                      choice.id !== item.feedback?.correctChoice &&
                      choice.rationale,
                  ) && (
                    <details>
                      <summary>
                        Why the other answers are less appropriate
                      </summary>
                      <ul>
                        {item.feedback.rationales
                          .filter(
                            (choice) =>
                              choice.id !== item.feedback?.correctChoice &&
                              choice.rationale,
                          )
                          .map((choice) => (
                            <li key={choice.id}>
                              <strong>{choice.text}</strong>
                              <p>{choice.rationale}</p>
                            </li>
                          ))}
                      </ul>
                    </details>
                  )}
                  <QuestionReferences
                    references={
                      item.feedback.references?.length
                        ? item.feedback.references
                        : [item.feedback.reference]
                    }
                    instructional={!session.developmentFixture}
                  />
                  {item.question.blueprint?.objective && (
                    <Link
                      className="text-link"
                      href={`/curriculum/${encodeURIComponent(item.question.blueprint.objective)}`}
                    >
                      Study this blueprint objective
                      <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              ) : (
                <p>
                  Feedback is unavailable for this pinned revision. No
                  explanation has been fabricated.
                </p>
              )}
              <div className="question-actions">
                <button
                  className="button secondary"
                  disabled={position === 0}
                  onClick={() =>
                    setPosition((current) => Math.max(0, current - 1))
                  }
                >
                  <ArrowLeft size={16} />
                  Previous review question
                </button>
                <button
                  className="button primary"
                  disabled={position >= reviewItems.length - 1}
                  onClick={() =>
                    setPosition((current) =>
                      Math.min(reviewItems.length - 1, current + 1),
                    )
                  }
                >
                  Next review question
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ) : (
            <div className="full-exam-empty">
              <h3>No questions match</h3>
              <p>
                Change the outcome, domain or topic filters to continue your
                review.
              </p>
            </div>
          )}
        </section>
      )}
      <p className="demo-disclosure">
        Independent CredBuilt practice · no official BCSP passing score or
        exam-result prediction. Question revisions and this attempt’s saved
        order remain fixed.
      </p>
    </div>
  );
}
