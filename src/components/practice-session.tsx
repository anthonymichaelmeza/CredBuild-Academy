"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Flag,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { SessionClock } from "./session-clock";
import { browserPracticeAction } from "@/demo/browser-store";
import { lessonForQuestion } from "@/modules/learning/catalog";
import type { Confidence, SessionView } from "@/modules/practice/types";
export function PracticeSession({
  initial,
  initialBookmarks,
  browserOnly = false,
}: {
  initial: SessionView;
  initialBookmarks: string[];
  browserOnly?: boolean;
}) {
  const [session, setSession] = useState(initial);
  const [saved, setSaved] = useState(initialBookmarks);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState("");
  const [confidence, setConfidence] = useState<Confidence>(
    () => initial.answers[initial.questionIds[0]]?.confidence || "medium",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [reviewMissed, setReviewMissed] = useState(false);
  const [navigationFilter, setNavigationFilter] = useState("all");
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, [index]);
  const question = session.questions[index];
  const answer = session.answers[question.id];
  const feedback = session.feedback[question.id];
  const isExam = session.mode === "exam";
  const relatedLesson = lessonForQuestion(question.id);
  const answered = Object.keys(session.answers).length;
  const correct = Object.values(session.answers).filter(
    (a) => a.correct,
  ).length;
  const allowedIndexes = session.questions
    .map((q, i) => ({ q, i }))
    .filter(
      ({ q }) => !review || !reviewMissed || !session.answers[q.id]?.correct,
    )
    .map(({ i }) => i);
  const previousIndex = allowedIndexes.filter((i) => i < index).at(-1);
  const nextIndex = allowedIndexes.find((i) => i > index);
  async function mutate(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      if (browserOnly) {
        const data = browserPracticeAction(
          { action, sessionId: session.id, ...extra },
          session.revision,
        );
        if ("bookmarks" in data) setSaved(data.bookmarks);
        else setSession(data);
        return;
      }
      const r = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sessionId: session.id, ...extra }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (action === "bookmark") setSaved(data.bookmarks);
      else setSession(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save your progress.",
      );
    } finally {
      setBusy(false);
    }
  }
  function go(i: number) {
    setIndex(i);
    setChoice("");
    setConfidence(
      session.answers[session.questionIds[i]]?.confidence || "medium",
    );
    setError("");
  }
  if (session.status === "submitted" && !review)
    return (
      <div className="page-wrap narrow">
        <div className="eyebrow">SESSION COMPLETE · DEMONSTRATION</div>
        <h1>
          You put in the work<span className="orange">.</span>
        </h1>
        <p className="lead">
          Here’s what this practice session showed. These are demo results, not
          a prediction of exam performance.{" "}
          {session.submissionReason === "expired" && (
            <strong>
              Time expired — this session was automatically submitted.
            </strong>
          )}
        </p>
        <div className="results-grid">
          <div className="card result-main">
            <CheckCircle2 size={35} />
            <strong>
              {Math.round((correct / session.questions.length) * 100)}%
            </strong>
            <p>
              {correct} correct of {session.questions.length} questions
            </p>
            <small>
              {session.questions.length - answered} unanswered · counted as
              incorrect
            </small>
          </div>
          <div className="card">
            <h2>By domain</h2>
            {["1", "2", "3", "4"].map((domain) => {
              const qs = session.questions.filter((q) => q.domain === domain);
              const right = qs.filter(
                (q) => session.answers[q.id]?.correct,
              ).length;
              return (
                <div className="result-domain" key={domain}>
                  <span>Domain {domain}</span>
                  <strong>
                    {qs.length ? `${right} / ${qs.length}` : "Not sampled"}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
        <section className="card analytics-section">
          <h2>Results by topic</h2>
          {[...new Set(session.questions.map((q) => q.topic))].map((topic) => {
            const items = session.questions.filter((q) => q.topic === topic);
            return (
              <div className="result-domain" key={topic}>
                <span>{topic}</span>
                <strong>
                  {items.filter((q) => session.answers[q.id]?.correct).length} /{" "}
                  {items.length} correct
                </strong>
              </div>
            );
          })}
        </section>
        <div className="results-actions">
          <button
            className="button primary"
            onClick={() => {
              setReviewMissed(false);
              setReview(true);
              go(0);
            }}
          >
            Review all questions <ArrowRight size={16} />
          </button>
          <button
            className="button secondary"
            disabled={correct === session.questions.length}
            onClick={() => {
              setReviewMissed(true);
              setReview(true);
              go(
                Math.max(
                  0,
                  session.questions.findIndex(
                    (q) => !session.answers[q.id]?.correct,
                  ),
                ),
              );
            }}
          >
            Review missed questions
          </button>
          <Link className="text-link" href="/performance">
            View saved history
          </Link>
        </div>
        <p className="demo-disclosure">
          AI-generated demonstration content · technical sources not verified ·
          no official passing score applied.
        </p>
      </div>
    );
  return (
    <div className="page-wrap">
      <div className="session-top">
        <div>
          <div className="eyebrow">
            {session.mode.toUpperCase()} PRACTICE · UNVERIFIED DEMONSTRATION
          </div>
          <h1>
            {review ? "Learn from every answer." : "One question at a time."}
          </h1>
        </div>
        <span className="outline-badge">
          {answered} / {session.questions.length} answered
        </span>
      </div>
      {session.deadlineAt && session.status === "in_progress" && (
        <SessionClock
          deadline={session.deadlineAt}
          onExpire={() => {
            if (!busy) void mutate("submit");
          }}
        />
      )}
      {isExam && !review && (
        <p className="exam-mode-note">
          Short demonstration rehearsal, not a full CHST exam. Choices autosave
          and remain editable until submission. Explanations are hidden until
          results.
        </p>
      )}
      <div className="session-progress">
        <span
          style={{ width: `${(answered / session.questions.length) * 100}%` }}
        />
      </div>
      <div className="question-layout">
        <section className="card question-card">
          <div className="question-meta">
            <span>
              QUESTION {index + 1} OF {session.questions.length}
            </span>
            <div>
              <button
                className={`icon-button ${saved.includes(question.id) ? "is-saved" : ""}`}
                disabled={busy}
                aria-label={
                  saved.includes(question.id)
                    ? "Remove bookmark"
                    : "Bookmark question"
                }
                aria-pressed={saved.includes(question.id)}
                onClick={() =>
                  void mutate("bookmark", {
                    questionId: question.id,
                    enabled: !saved.includes(question.id),
                  })
                }
              >
                <Bookmark size={19} />
              </button>
              {!review && (
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label="Flag for review"
                  aria-pressed={session.flags.includes(question.id)}
                  onClick={() =>
                    void mutate("flag", { questionId: question.id })
                  }
                >
                  <Flag size={19} />
                </button>
              )}
            </div>
          </div>
          <span className="topic-label">
            Domain {question.domain} · {question.topic}
          </span>
          <h2 className="question-stem">{question.stem}</h2>
          <fieldset className="answer-options">
            <legend className="sr-only">Choose your answer</legend>
            {question.choices.map((c, i) => (
              <label
                key={c.id}
                className={`answer-option ${(answer?.choiceId || choice) === c.id ? "chosen" : ""} ${feedback?.correctChoice === c.id ? "correct" : ""} ${answer && !answer.correct && answer.choiceId === c.id ? "incorrect" : ""}`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={c.id}
                  checked={(choice || answer?.choiceId) === c.id}
                  disabled={(!isExam && Boolean(answer)) || review || busy}
                  onChange={() => {
                    setChoice(c.id);
                    if (isExam) {
                      const elapsed = Math.max(
                        0,
                        Math.min(Date.now() - started.current, 86400000),
                      );
                      started.current = Date.now();
                      void mutate("answer", {
                        input: {
                          questionId: question.id,
                          choiceId: c.id,
                          confidence,
                          responseMs: elapsed,
                        },
                      });
                    }
                  }}
                />
                <span className="choice-letter">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{c.text}</span>
                {feedback?.correctChoice === c.id && <CheckCircle2 size={19} />}
              </label>
            ))}
          </fieldset>
          {(!answer || isExam) && !review && (
            <fieldset className="confidence">
              <legend>How confident are you?</legend>
              {(["low", "medium", "high"] as Confidence[]).map((c) => (
                <label key={c}>
                  <input
                    type="radio"
                    name="confidence"
                    checked={confidence === c}
                    disabled={busy}
                    onChange={() => {
                      setConfidence(c);
                      if (isExam && answer)
                        void mutate("answer", {
                          input: {
                            questionId: question.id,
                            choiceId: answer.choiceId,
                            confidence: c,
                            responseMs: 0,
                          },
                        });
                    }}
                  />
                  {c[0].toUpperCase() + c.slice(1)}
                </label>
              ))}
            </fieldset>
          )}
          {isExam && answer && !review && (
            <p role="status" className="save-status">
              Answer saved in this workspace. You can change it before
              submission.
            </p>
          )}
          {feedback && (
            <section
              className={`feedback ${answer?.correct ? "positive" : ""}`}
              aria-live="polite"
            >
              <h3>
                {answer?.correct ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <XCircle size={20} />
                )}
                {answer
                  ? answer.correct
                    ? "Correct. Keep building."
                    : "A useful learning moment."
                  : "Unanswered question"}
              </h3>
              <p>{feedback.explanation}</p>
              <details>
                <summary>Why the other choices don’t fit</summary>
                <ul>
                  {feedback.rationales
                    .filter((c) => c.id !== feedback.correctChoice)
                    .map((c) => (
                      <li key={c.id}>
                        <strong>{c.text}</strong>
                        <p>{c.rationale}</p>
                      </li>
                    ))}
                </ul>
              </details>
              <a href={feedback.reference.url} target="_blank" rel="noreferrer">
                {feedback.reference.title}
                <ExternalLink size={14} />
              </a>
              <small>
                {feedback.reference.locator} · Source not verified. Objective
                mapping pending editorial review.
              </small>
              {relatedLesson && (
                <Link
                  className="button secondary related-lesson"
                  href={`/learn/${relatedLesson.id}`}
                >
                  Understand this concept: {relatedLesson.title}
                  <ArrowRight size={15} />
                </Link>
              )}
            </section>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="question-actions">
            <button
              className="button secondary"
              disabled={previousIndex === undefined || busy}
              onClick={() => previousIndex !== undefined && go(previousIndex)}
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            {!answer && !review && !isExam ? (
              <button
                className="button primary"
                disabled={!choice || busy}
                onClick={() =>
                  void mutate("answer", {
                    input: {
                      questionId: question.id,
                      choiceId: choice,
                      confidence,
                      responseMs: Math.min(
                        Date.now() - started.current,
                        86_400_000,
                      ),
                    },
                  })
                }
              >
                {busy ? "Saving…" : "Check answer"}
                <ArrowRight size={16} />
              </button>
            ) : nextIndex !== undefined ? (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => nextIndex !== undefined && go(nextIndex)}
              >
                Next question
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="button secondary"
                onClick={() => setReview(false)}
                disabled={!review}
              >
                View results
              </button>
            )}
          </div>
        </section>
        <aside className="card question-navigator">
          <h2>Your session</h2>
          <p>
            {isExam
              ? "Choices autosave. Review flags and unanswered questions before submitting."
              : "Move freely between questions. First checked answers are final."}
          </p>
          {!review && (
            <label className="navigator-filter">
              Show questions
              <select
                aria-label="Filter question navigator"
                value={navigationFilter}
                onChange={(e) => setNavigationFilter(e.target.value)}
              >
                <option value="all">All questions</option>
                <option value="flagged">Flagged for review</option>
                <option value="unanswered">Unanswered</option>
              </select>
            </label>
          )}
          <div className="question-grid">
            {session.questions
              .map((q, i) => ({ q, i }))
              .filter(
                ({ q, i }) =>
                  allowedIndexes.includes(i) &&
                  (review ||
                    navigationFilter === "all" ||
                    (navigationFilter === "flagged" &&
                      session.flags.includes(q.id)) ||
                    (navigationFilter === "unanswered" &&
                      !session.answers[q.id])),
              )
              .map(({ q, i }) => (
                <button
                  key={q.id}
                  aria-label={`Go to question ${i + 1}${session.answers[q.id] ? ", answered" : ""}${session.flags.includes(q.id) ? ", flagged" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                  className={`${i === index ? "current" : ""} ${session.answers[q.id] ? "answered" : ""} ${session.flags.includes(q.id) ? "flagged" : ""}`}
                  onClick={() => go(i)}
                  disabled={busy}
                >
                  {i + 1}
                </button>
              ))}
          </div>
          <small>
            Orange outline: current · Filled: answered · Dot: flagged
          </small>
          {!review ? (
            <button
              className="button secondary full"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Submit this session? ${session.questions.length - answered} unanswered questions will count as incorrect.`,
                  )
                )
                  void mutate("submit");
              }}
            >
              Submit session
            </button>
          ) : (
            <button
              className="button secondary full"
              onClick={() => setReview(false)}
            >
              Back to results
            </button>
          )}
          <div className="soft-note">
            {isExam
              ? "Saved after each choice. "
              : "Saved after every checked answer. "}
            Demo results are not part of an approved question bank.
          </div>
        </aside>
      </div>
    </div>
  );
}
