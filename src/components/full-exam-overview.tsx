"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, History, ShieldCheck } from "lucide-react";
import { chstDomains } from "@/modules/curriculum/catalog";
import type { ExamAvailability } from "@/modules/exams/types";

const requiredByDomain = [73, 40, 45, 42];

export function FullExamOverview({ browserOnly }: { browserOnly: boolean }) {
  const router = useRouter();
  const [availability, setAvailability] = useState<ExamAvailability | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    if (browserOnly) return;
    const controller = new AbortController();
    void fetch("/api/exams?view=availability", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to check exam availability.");
        setAvailability(data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to check exam availability.",
          );
      });
    return () => controller.abort();
  }, [browserOnly]);

  async function start() {
    if (!availability?.canStart || busy) return;
    setBusy(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", requestId: requestId.current }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to prepare your exam.");
      router.push(`/exam/${data.id}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to prepare your exam.",
      );
      setBusy(false);
    }
  }

  return (
    <section
      className="card full-exam-gate full-exam-overview"
      aria-labelledby="full-exam-title"
    >
      <div className="full-exam-kicker">
        <ShieldCheck size={25} />
        <span className="eyebrow">BUILD YOUR EXAM-DAY ROUTINE</span>
      </div>
      <h2 id="full-exam-title">CHST Full-Length Exam Simulation</h2>
      <p className="full-exam-spec">
        200 distinct questions <span>·</span> 240 minutes <span>·</span> Four
        domains
      </p>
      <p>
        One question at a time. Your answers, review flags and position save to
        your account. The server deadline continues when you leave.
      </p>
      <div className="full-exam-domain-plan">
        {chstDomains.map((domain, index) => {
          const actual = availability?.bankConnected
            ? availability.domains.find((item) => item.code === domain.code)
            : undefined;
          return (
            <div className="full-exam-domain-plan-row" key={domain.code}>
              <span>
                <small>DOMAIN {domain.code}</small>
                {domain.title}
              </span>
              <strong>
                {requiredByDomain[index]}
                <small>questions</small>
              </strong>
              {actual && (
                <small
                  className={
                    actual.shortfall ? "exam-shortfall" : "exam-eligible"
                  }
                >
                  {actual.eligible} eligible · {actual.shortfall} short
                </small>
              )}
            </div>
          );
        })}
      </div>
      {browserOnly ? (
        <div className="notice compact-notice">
          <h3>Not available yet</h3>
          <p>
            The supplied bank contains zero approved, published exam questions.
            The browser demonstration has no account or editorial database and
            cannot launch a full exam. Short rehearsals remain available.
          </p>
        </div>
      ) : availability ? (
        <div
          className={`notice compact-notice ${availability.canStart ? "exam-ready-notice" : ""}`}
        >
          {availability.canStart ? (
            <strong>
              {availability.developmentFixture
                ? "Development-only engine test"
                : "Your exam is ready"}
            </strong>
          ) : (
            <h3>Not available yet</h3>
          )}
          {availability.developmentFixture && (
            <p>
              Synthetic engineering fixtures only. This is not validated CHST
              content and cannot establish study readiness.
            </p>
          )}
          {!availability.developmentFixture && (
            <p>
              {availability.bankConnected
                ? `${availability.eligibleTotal} approved, published questions currently meet exam eligibility.`
                : "Sign in to check the connected question bank. Live content counts are unavailable in this view."}
            </p>
          )}
          {!!availability.blockers.length && (
            <ul>
              {availability.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div>
          {error && <h3>Not available yet</h3>}
          <p role="status">
            {error
              ? "Exam availability could not be confirmed."
              : "Checking eligible question bank…"}
          </p>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="full-exam-overview-actions">
        <button
          className="button primary"
          disabled={browserOnly || !availability?.canStart || busy}
          onClick={() => void start()}
        >
          {busy
            ? "Preparing your exam…"
            : availability?.developmentFixture
              ? "Start development-only exam"
              : "Start full-length exam"}
          <ArrowRight size={17} />
        </button>
        <Link className="button secondary" href="/exam/history">
          <History size={17} /> Exam History
        </Link>
      </div>
      {!browserOnly && availability && !availability.signedIn && (
        <Link className="text-link" href="/settings">
          Sign in to save and resume examinations
        </Link>
      )}
      <p className="fine-print">
        Blueprint CHST5 V.2022.04.12 from the supplied document; latest official
        version not confirmed. Four hours is the CredBuilt practice
        configuration, not a verified official duration. No official passing
        score is applied.
      </p>
    </section>
  );
}
