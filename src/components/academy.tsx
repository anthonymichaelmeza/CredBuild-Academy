"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Search,
} from "lucide-react";
import { domains } from "@/modules/catalog/blueprint";
import { lessons } from "@/modules/learning/catalog";
import { completedLesson } from "@/modules/learning/progress";
import { useLearning } from "./use-learning";
export function Academy() {
  const { state, hydrated, error, reset, storageMode } = useLearning();
  const [domain, setDomain] = useState("all");
  const [query, setQuery] = useState("");
  const [resetError, setResetError] = useState("");
  const completed = state
    ? lessons.filter((l) => completedLesson(l.id, state)).length
    : 0;
  const filtered = lessons.filter(
    (l) =>
      (domain === "all" || l.domain === domain) &&
      `${l.title} ${l.topic} ${l.subtopics.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const next = state
    ? lessons.find((l) => !completedLesson(l.id, state))
    : lessons[0];
  return (
    <div className="page-wrap academy-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE CREDBUILT LEARNING ACADEMY</div>
          <h1>
            Understand it. Apply it. Build on it
            <span className="orange">.</span>
          </h1>
          <p>From a useful principle to a better question about the work.</p>
        </div>
        <span className="outline-badge">CHST · curriculum preview</span>
      </div>
      <section className="academy-hero">
        <div>
          <span className="hero-label">BUILD KNOWLEDGE. EARN CREDENTIALS.</span>
          <h2>
            Your experience is the starting point.
            <br />
            Make understanding the next step.
          </h2>
          <p>
            Eight representative lessons across the four CHST domain headings.
            Learn a principle, explore a scenario, and check your understanding.
          </p>
          {next ? (
            <Link className="button primary" href={`/learn/${next.id}`}>
              Continue learning <ArrowRight size={17} />
            </Link>
          ) : (
            <Link className="button primary" href="/practice">
              Put it into practice <ArrowRight size={17} />
            </Link>
          )}
        </div>
        <div className="academy-progress">
          <BookOpen size={28} />
          <strong>
            {hydrated ? completed : "—"}
            <span> / {lessons.length}</span>
          </strong>
          <p>Demo lessons completed</p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Lesson completion"
            aria-valuemin={0}
            aria-valuemax={8}
            aria-valuenow={completed}
          >
            <span style={{ width: `${(completed / lessons.length) * 100}%` }} />
          </div>
          <small>
            {storageMode === "browser"
              ? "Browser-local progress"
              : "Server-saved progress"}{" "}
            · no certification credit
          </small>
        </div>
      </section>
      <div className="notice compact-notice">
        <BookOpen size={18} />
        <p>
          <strong>Demonstration curriculum.</strong> Original AI-generated
          drafts. Sources and CHST5 objective mapping have not been
          independently verified. Domain headings are supplied blueprint data;
          these are not approved technical lessons or field procedures.
        </p>
      </div>
      {(error || resetError) && (
        <div className="error" role="alert">
          {resetError || error}
          <button
            className="button secondary"
            onClick={async () => {
              if (
                storageMode !== "browser" ||
                window.confirm(
                  "Reset only demo lesson progress? Practice history will be kept.",
                )
              ) {
                try {
                  await reset();
                  setResetError("");
                } catch (e) {
                  setResetError((e as Error).message);
                }
              }
            }}
          >
            {storageMode === "browser"
              ? "Reset learning progress"
              : "Reload learning progress"}
          </button>
        </div>
      )}
      <div className="academy-tools">
        <div className="filter-tabs" aria-label="Filter lessons by domain">
          {[
            ["all", "All domains"],
            ...domains.map((d) => [d.code, `Domain ${d.code}`]),
          ].map(([code, label]) => (
            <button
              key={code}
              aria-pressed={domain === code}
              onClick={() => setDomain(code)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">Search lessons</span>
          <input
            disabled={!hydrated}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a topic or subtopic…"
          />
        </label>
      </div>
      <p className="fine-print" aria-live="polite">
        {filtered.length} lessons · reading times are estimates
      </p>
      <div className="lesson-grid">
        {filtered.map((lesson) => {
          const done = state && completedLesson(lesson.id, state);
          const progress = state?.progress[lesson.id];
          return (
            <article className="card academy-lesson" key={lesson.id}>
              <div className="lesson-card-top">
                <span className="domain-number">0{lesson.domain}</span>
                <span
                  className={`neutral-badge ${done ? "completed-badge" : ""}`}
                >
                  {done ? (
                    <>
                      <CheckCircle2 size={13} />
                      Completed
                    </>
                  ) : progress ? (
                    "In progress"
                  ) : (
                    "Demo lesson"
                  )}
                </span>
              </div>
              <div className="eyebrow">
                DOMAIN {lesson.domain} · {lesson.topic.toUpperCase()}
              </div>
              <h2>
                <Link href={`/learn/${lesson.id}`}>{lesson.title}</Link>
              </h2>
              <p>{lesson.summary}</p>
              <div className="topic-chips">
                {lesson.subtopics.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <footer>
                <span>
                  <Clock3 size={13} />
                  {lesson.readingMinutes} min read · {lesson.checks.length}{" "}
                  checks
                </span>
                <Link className="text-link" href={`/learn/${lesson.id}`}>
                  {done
                    ? "Revisit lesson"
                    : progress
                      ? "Resume lesson"
                      : "Open lesson"}
                  <ArrowRight size={15} />
                </Link>
              </footer>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="card empty-block">
          <h2>No lessons match that search.</h2>
          <p>Try another topic or select all domains.</p>
        </div>
      )}
    </div>
  );
}
