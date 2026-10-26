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
  const [demoDuration, setDemoDuration] = useState(14400);
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
    if ((!browserOnly && !availability?.canStart) || busy) return;
    setBusy(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      if (browserOnly) {
        const { createBrowserFullExam } = await import("@/demo/browser-store");
        router.push(
          `/exam/${createBrowserFullExam({ durationSeconds: demoDuration })}`,
        );
        return;
      }
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

  const productionReady =
    availability?.productionReady ??
    Boolean(
      availability?.bankConnected &&
      !availability.developmentFixture &&
      availability.canStart,
    );

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
        {browserOnly
          ? "Try the complete examination experience now. Answers, review flags, position and the fixed deadline save in this browser."
          : "One question at a time. Your answers, review flags and position save to your account. The server deadline continues when you leave."}
      </p>
      <div className="full-exam-domain-plan">
        {chstDomains.map((domain, index) => {
          const actual = availability?.bankConnected
            ? (availability.productionDomains || availability.domains).find(
                (item) => item.code === domain.code,
              )
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
      <section
        className="notice compact-notice"
        aria-label="Production examination readiness"
      >
        <h3>
          {browserOnly || !productionReady
            ? "Production Exam: Not Ready"
            : "Production Exam: Ready"}
        </h3>
        <p>
          {browserOnly
            ? "Supplied approved questions: 0 / 200. No editorial database is connected to this browser demonstration. Sample questions never become approved production content."
            : availability?.bankConnected
              ? `${availability.productionEligibleTotal ?? (availability.developmentFixture ? 0 : availability.eligibleTotal)} approved eligible questions / 200 required. Production exams require enough reviewed, published questions in every domain.`
              : "Connect an authorized account to inspect the published question bank. Production readiness has not been queried."}
        </p>
        {!browserOnly && availability && !availability.canStart && (
          <h3>Not available yet</h3>
        )}
        {!browserOnly && !availability && error && <h3>Not available yet</h3>}
        {!browserOnly &&
          availability?.productionDomains?.some(
            (domain) => domain.shortfall > 0,
          ) && (
            <ul>
              {availability.productionDomains
                .filter((domain) => domain.shortfall > 0)
                .map((domain) => (
                  <li key={domain.code}>
                    Domain {domain.code}: {domain.eligible} approved eligible;{" "}
                    {domain.shortfall} additional questions needed.
                  </li>
                ))}
            </ul>
          )}
      </section>
      {(browserOnly || availability?.developmentFixture) && (
        <section
          className="notice compact-notice exam-ready-notice"
          aria-label="Demonstration simulator availability"
        >
          <h3>
            {browserOnly
              ? "Demonstration Exam Simulator: Available"
              : "Development Exam Simulator: Available"}
          </h3>
          <p>
            200 distinct sample questions exercise timing, navigation, autosave,
            scoring, results and question review. They are synthetic
            demonstrations, not validated CHST questions or approved study
            content.
          </p>
          <p>
            {browserOnly
              ? "No account or database is needed. Progress stays on this browser and website address. The browser clock, answers and scores are inspectable and editable; there is no cross-device sync."
              : "This isolated development workspace uses server-saved test records. These fixtures never enter the approved production bank."}
          </p>
          {!browserOnly &&
            availability &&
            availability.durationSeconds !== 14400 && (
              <p>
                <strong>
                  Local QA timer: {availability.durationSeconds} seconds.
                </strong>{" "}
                The standard examination setting remains four hours.
              </p>
            )}
        </section>
      )}
      {!browserOnly &&
        availability &&
        !availability.developmentFixture &&
        availability.canStart && (
          <p className="notice compact-notice">
            Your reviewed production examination is ready.
          </p>
        )}
      {!browserOnly && !availability && !error && (
        <p role="status">Checking eligible question bank…</p>
      )}
      {browserOnly && process.env.NODE_ENV === "development" && (
        <label className="field-label" htmlFor="browser-exam-qa-duration">
          Local QA duration (seconds)
          <input
            id="browser-exam-qa-duration"
            type="number"
            min={5}
            max={14400}
            value={demoDuration}
            onChange={(event) => setDemoDuration(Number(event.target.value))}
          />
          <small>
            Development only. The standard setting is 14,400 seconds; shortened
            timers are disabled in production builds.
          </small>
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="full-exam-overview-actions">
        <button
          className="button primary"
          disabled={
            (!browserOnly && !availability?.canStart) ||
            busy ||
            !Number.isInteger(demoDuration) ||
            demoDuration < 5 ||
            demoDuration > 14400
          }
          onClick={() => void start()}
        >
          {busy
            ? "Preparing your exam…"
            : browserOnly
              ? "Start 200-question demonstration exam"
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
        version confirmation is documented separately. Standard examination
        setting: four hours. No official passing score is applied.
      </p>
    </section>
  );
}
