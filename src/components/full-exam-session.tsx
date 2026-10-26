"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { SessionView } from "@/modules/practice/types";
import type { ExamHistoryItem } from "@/modules/exams/types";
import { FullExamClock } from "./full-exam-clock";
import { FullExamResults } from "./full-exam-results";

type Mutation =
  | {
      action: "answer";
      questionId: string;
      choiceId: string;
      responseMs: number;
    }
  | { action: "flag"; questionId: string; enabled: boolean }
  | { action: "navigate"; index: number }
  | { action: "submit" };

export function FullExamSession({
  initial,
  browserOnly = false,
}: {
  initial: SessionView;
  browserOnly?: boolean;
}) {
  const [session, setSession] = useState(initial);
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [navigationFilter, setNavigationFilter] = useState("all");
  const [deadlineReached, setDeadlineReached] = useState(false);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const latest = useRef(initial);
  const locked = useRef(false);
  const expiryPending = useRef(false);
  const failed = useRef<Mutation | null>(null);
  const viewingSince = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const index = session.currentQuestionIndex || 0;
  const question = session.questions[index];
  const answered = Object.keys(session.answers).length;

  const accept = useCallback((next: SessionView) => {
    if (
      next.id !== latest.current.id ||
      next.revision < latest.current.revision ||
      (next.revision === latest.current.revision &&
        next.serverNow &&
        latest.current.serverNow &&
        Date.parse(next.serverNow) < Date.parse(latest.current.serverNow))
    )
      return;
    latest.current = next;
    setSession(next);
    if (
      next.status === "in_progress" &&
      next.serverNow &&
      next.deadlineAt &&
      Date.parse(next.serverNow) < Date.parse(next.deadlineAt)
    )
      setDeadlineReached(false);
    if (next.status === "submitted") {
      setConfirming(false);
      setUnsaved(false);
      setPendingChoice(null);
      setError("");
      failed.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (locked.current) return;
    try {
      if (browserOnly) {
        const { browserFullExamView } = await import("@/demo/browser-store");
        const data = browserFullExamView(initial.id);
        if (!failed.current || data.status === "submitted") accept(data);
        return;
      }
      const response = await fetch(
        `/api/exams?id=${encodeURIComponent(initial.id)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to refresh your exam.");
      // A background response must never replace a newer save from this tab.
      if (!failed.current || data.status === "submitted") accept(data);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to refresh your exam.",
      );
    }
  }, [accept, initial.id, browserOnly]);

  async function mutate(command: Mutation, retry = false) {
    if (
      locked.current ||
      latest.current.status !== "in_progress" ||
      (failed.current && !retry)
    )
      return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      let data: SessionView;
      if (browserOnly) {
        const { browserFullExamAction } = await import("@/demo/browser-store");
        const result = browserFullExamAction(
          { ...command, sessionId: initial.id },
          latest.current.revision,
        );
        if (!("questions" in result))
          throw new Error("Unexpected demonstration response.");
        data = result;
      } else {
        const response = await fetch("/api/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...command, sessionId: initial.id }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error || "Your change was not saved. Please retry.",
          );
        data = result;
      }
      accept(data);
      failed.current = null;
      setUnsaved(false);
      setPendingChoice(null);
      if (command.action === "answer") viewingSince.current = performance.now();
    } catch (failure) {
      failed.current = command;
      setUnsaved(true);
      setError(
        failure instanceof Error
          ? failure.message
          : "Your change was not saved. Please retry.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
      if (
        command.action !== "submit" &&
        expiryPending.current &&
        latest.current.status === "in_progress"
      ) {
        expiryPending.current = false;
        void refresh();
      }
    }
  }

  useEffect(() => {
    viewingSince.current = performance.now();
    if (index !== (initial.currentQuestionIndex || 0))
      questionHeading.current?.focus({ preventScroll: true });
  }, [index, initial.currentQuestionIndex]);

  useEffect(() => {
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("online", focus);
    const interval = window.setInterval(() => void refresh(), 30_000);
    let unsubscribe = () => {};
    let disposed = false;
    if (browserOnly)
      void import("@/demo/browser-store").then(({ subscribeBrowserDemo }) => {
        if (!disposed) unsubscribe = subscribeBrowserDemo(() => void refresh());
      });
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("online", focus);
      window.clearInterval(interval);
      disposed = true;
      unsubscribe();
    };
  }, [refresh, browserOnly]);

  useEffect(() => {
    if (!busy && !unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, unsaved]);

  useEffect(() => {
    if (confirming) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirming]);

  useEffect(() => {
    if (session.status !== "submitted") return;
    const controller = new AbortController();
    if (browserOnly) {
      void import("@/demo/browser-store")
        .then(({ browserFullExamHistory }) => {
          if (!controller.signal.aborted) setHistory(browserFullExamHistory());
        })
        .catch(() => {
          if (!controller.signal.aborted) setHistoryUnavailable(true);
        });
      return () => controller.abort();
    }
    void fetch("/api/exams?view=history", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Comparison history unavailable");
        const data = await response.json();
        setHistory(data.attempts || []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryUnavailable(true);
      });
    return () => controller.abort();
  }, [session.status, browserOnly]);

  if (session.status === "submitted")
    return (
      <FullExamResults
        session={session}
        history={history}
        comparisonUnavailable={historyUnavailable}
        browserOnly={browserOnly}
      />
    );
  const flagged = session.flags.includes(question.id);
  const selected =
    pendingChoice || session.answers[question.id]?.choiceId || "";
  const controlsDisabled = busy || deadlineReached || unsaved;

  return (
    <div className="page-wrap full-exam-active">
      <header className="full-exam-session-header">
        <div>
          <div className="eyebrow">CREDBUILT EXAM SIMULATOR</div>
          <h1>CHST Full-Length Exam Simulation</h1>
          <p>200 questions · Explanations available after submission</p>
        </div>
        {session.serverNow ? (
          <FullExamClock
            deadline={session.deadlineAt!}
            serverNow={session.serverNow}
            onExpire={() => {
              setDeadlineReached(true);
              expiryPending.current = true;
              if (!locked.current) {
                expiryPending.current = false;
                void refresh();
              }
            }}
          />
        ) : (
          <p role="alert">
            {browserOnly
              ? "Browser timer unavailable. Refresh to recover your saved deadline."
              : "Server timer unavailable. Refresh to synchronize your deadline."}
          </p>
        )}
      </header>
      {session.developmentFixture && (
        <div
          className="notice compact-notice full-exam-fixture-note"
          role="note"
        >
          <strong>
            {browserOnly
              ? "Demonstration content · browser-only storage."
              : "Development-only engineering fixtures."}
          </strong>{" "}
          Synthetic questions test this exam engine. They are not validated CHST
          questions and these results do not measure readiness.{" "}
          {browserOnly &&
            "Your browser clock, answers and scores are inspectable and editable. Progress does not sync to accounts or other devices."}
        </div>
      )}
      {session.developmentFixture &&
        session.durationSeconds !== undefined &&
        session.durationSeconds !== 14400 && (
          <p className="notice compact-notice">
            <strong>Local QA timer: {session.durationSeconds} seconds.</strong>{" "}
            The standard examination setting remains four hours. Shortened
            timers are disabled for production examinations.
          </p>
        )}
      <div className="full-exam-progress-line">
        <span>
          <strong>{answered}</strong> / 200 answered
        </span>
        <span>{session.flags.length} marked for review</span>
      </div>
      <div
        className="session-progress"
        role="progressbar"
        aria-label="Questions answered"
        aria-valuemin={0}
        aria-valuemax={200}
        aria-valuenow={answered}
      >
        <span style={{ width: `${answered / 2}%` }} />
      </div>
      <div className="full-exam-workspace">
        <section
          className="card full-exam-question"
          aria-labelledby="exam-question-title"
        >
          <div className="full-exam-question-meta">
            <span>QUESTION {index + 1} OF 200</span>
            <button
              className={`button secondary exam-flag ${flagged ? "is-flagged" : ""}`}
              aria-label={flagged ? "Remove review flag" : "Mark for review"}
              aria-pressed={flagged}
              disabled={controlsDisabled}
              onClick={() =>
                void mutate({
                  action: "flag",
                  questionId: question.id,
                  enabled: !flagged,
                })
              }
            >
              <Flag size={17} />
              {flagged ? "Marked for review" : "Mark for review"}
            </button>
          </div>
          <h2 id="exam-question-title" tabIndex={-1} ref={questionHeading}>
            {question.stem}
          </h2>
          {question.media?.map((media) => (
            <figure className="question-media" key={media.url}>
              <Image
                src={media.url}
                alt={media.alt}
                width={960}
                height={540}
                unoptimized
                referrerPolicy="no-referrer"
              />
            </figure>
          ))}
          <fieldset className="answer-options full-exam-answers">
            <legend className="sr-only">Choose your answer</legend>
            {question.choices.map((choice, choiceIndex) => (
              <label
                className={`answer-option ${selected === choice.id ? "chosen" : ""}`}
                key={choice.id}
              >
                <input
                  type="radio"
                  name={`exam-answer-${question.id}`}
                  aria-label={`${String.fromCharCode(65 + choiceIndex)}. ${choice.text}`}
                  checked={selected === choice.id}
                  disabled={controlsDisabled}
                  onChange={() => {
                    setPendingChoice(choice.id);
                    void mutate({
                      action: "answer",
                      questionId: question.id,
                      choiceId: choice.id,
                      responseMs: Math.max(
                        0,
                        Math.min(
                          86_400_000,
                          Math.round(performance.now() - viewingSince.current),
                        ),
                      ),
                    });
                  }}
                />
                <span className="choice-letter">
                  {String.fromCharCode(65 + choiceIndex)}
                </span>
                <span>{choice.text}</span>
              </label>
            ))}
          </fieldset>
          <div className="full-exam-save-status" role="status">
            {busy
              ? "Saving your change…"
              : error
                ? "Changes could not be confirmed. Please retry before leaving."
                : deadlineReached
                  ? "Time expired. Finalizing your exam…"
                  : browserOnly
                    ? "All changes saved in this browser."
                    : "All changes saved to your account."}
          </div>
          {error && (
            <div className="full-exam-save-error" role="alert">
              <p>{error}</p>
              <p>
                Your attempted change remains here. Retry saving before
                navigating or leaving.
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  failed.current
                    ? void mutate(failed.current, true)
                    : void refresh()
                }
              >
                <RefreshCw size={16} />
                Retry saving
              </button>
            </div>
          )}
          <div className="question-actions">
            <button
              className="button secondary"
              disabled={index === 0 || controlsDisabled}
              onClick={() =>
                void mutate({ action: "navigate", index: index - 1 })
              }
            >
              <ArrowLeft size={16} />
              Previous question
            </button>
            <button
              className="button primary"
              disabled={index === 199 || controlsDisabled}
              onClick={() =>
                void mutate({ action: "navigate", index: index + 1 })
              }
            >
              Next question
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
        <aside
          className="card full-exam-navigator"
          aria-label="Exam question navigation"
        >
          <div className="card-heading">
            <h2>Your examination</h2>
            <ShieldCheck size={20} />
          </div>
          <label className="field-label">
            Show questions
            <select
              value={navigationFilter}
              onChange={(event) => setNavigationFilter(event.target.value)}
            >
              <option value="all">All 200 questions</option>
              <option value="unanswered">Unanswered questions</option>
              <option value="flagged">Marked for review</option>
            </select>
          </label>
          <div
            className="full-exam-grid"
            role="group"
            aria-label="Question navigator"
          >
            {session.questionIds.map((id, position) => {
              const hasAnswer = Boolean(session.answers[id]);
              const isFlagged = session.flags.includes(id);
              if (
                (navigationFilter === "unanswered" && hasAnswer) ||
                (navigationFilter === "flagged" && !isFlagged)
              )
                return null;
              return (
                <button
                  key={id}
                  className={`${position === index ? "is-current" : ""} ${hasAnswer ? "is-answered" : ""} ${isFlagged ? "is-flagged" : ""}`}
                  aria-label={`Go to question ${position + 1}, ${hasAnswer ? "answered" : "unanswered"}${isFlagged ? ", flagged" : ""}`}
                  aria-current={position === index ? "step" : undefined}
                  disabled={controlsDisabled}
                  onClick={() =>
                    void mutate({ action: "navigate", index: position })
                  }
                >
                  {position + 1}
                  {isFlagged && (
                    <span className="exam-flag-dot" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="fine-print exam-grid-key">
            Filled: answered · Dot: flagged · Orange outline: current
          </p>
          <button
            className="button primary full-exam-submit"
            disabled={controlsDisabled}
            onClick={() => setConfirming(true)}
          >
            Submit Exam
          </button>
          <p className="fine-print">
            Answers remain editable until submission. Closing this page does not
            pause or extend your deadline.
          </p>
          <Link
            className="text-link"
            href="/exam/history"
            aria-disabled={busy || unsaved}
            tabIndex={busy || unsaved ? -1 : undefined}
            onClick={(event) => {
              if (busy || unsaved) event.preventDefault();
            }}
          >
            Save and leave to Exam History
          </Link>
        </aside>
      </div>
      <dialog
        ref={dialog}
        className="full-exam-confirm"
        aria-labelledby="exam-submit-title"
        onCancel={() => setConfirming(false)}
        onClose={() => setConfirming(false)}
      >
        <h2 id="exam-submit-title">Submit your exam?</h2>
        <p>
          You have answered {answered} of 200 questions.{" "}
          <strong>{200 - answered} unanswered questions</strong> will count
          toward your total score with no credit.
        </p>
        <p>
          {session.flags.length} questions are marked for review. Once
          submitted, your answers are final and explanations become available.
        </p>
        <div className="full-exam-dialog-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            Continue exam
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              setConfirming(false);
              void mutate({ action: "submit" });
            }}
          >
            Confirm submission
          </button>
        </div>
      </dialog>
    </div>
  );
}
