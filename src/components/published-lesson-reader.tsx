"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonAction, LessonProgress } from "@/modules/learning/progress";
import type { PublishedLessonView } from "@/modules/learning/published-types";
type Resource = {
  lesson: PublishedLessonView;
  progress: LessonProgress | null;
  revision: number;
  feedback: Record<string, { correctChoice: string; explanation: string }>;
};
export function PublishedLessonReader({ lessonId }: { lessonId: string }) {
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const requests = useRef({
    generation: 0,
    active: false,
    saving: false,
    controller: null as AbortController | null,
  });
  const reload = useCallback(async () => {
    const transport = requests.current;
    transport.controller?.abort();
    const controller = new AbortController();
    transport.controller = controller;
    const generation = ++transport.generation;
    const response = await fetch(
      `/api/published-learning?lessonId=${encodeURIComponent(lessonId)}`,
      { cache: "no-store", signal: controller.signal },
    );
    const result = await response.json();
    if (
      transport.active &&
      !controller.signal.aborted &&
      transport.generation === generation
    ) {
      if (!response.ok) {
        setResource(null);
        throw new Error(
          result.error || "Published lesson could not be loaded.",
        );
      }
      setResource(result);
      setError("");
    }
  }, [lessonId]);
  useEffect(() => {
    const transport = requests.current;
    transport.active = true;
    function load() {
      if (transport.saving) return;
      void reload().catch((caught) => {
        if (transport.active && caught.name !== "AbortError")
          setError(caught.message || "Lesson could not be loaded.");
      });
    }
    load();
    window.addEventListener("focus", load);
    return () => {
      transport.active = false;
      transport.generation++;
      transport.controller?.abort();
      window.removeEventListener("focus", load);
    };
  }, [reload]);
  async function save(action: LessonAction) {
    if (!resource || requests.current.saving) return;
    requests.current.saving = true;
    setBusy(true);
    setError("");
    const generation = ++requests.current.generation;
    requests.current.controller?.abort();
    try {
      const response = await fetch("/api/published-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          lessonVersion: resource.lesson.version,
          revision: resource.revision,
          action,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) setResource(null);
        if (response.status === 409) await reload();
        throw new Error(result.error || "Lesson progress was not saved.");
      }
      if (requests.current.active && requests.current.generation === generation)
        setResource(result);
    } catch (caught) {
      if (requests.current.active)
        setError(
          caught instanceof Error
            ? caught.message
            : "Lesson progress was not saved.",
        );
    } finally {
      requests.current.saving = false;
      if (requests.current.active) setBusy(false);
    }
  }
  if (!resource)
    return (
      <div className="page-wrap narrow">
        <Link className="text-link" href="/learn">
          Back to learning
        </Link>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          <p role="status">Loading published lesson…</p>
        )}
      </div>
    );
  const { lesson, progress, feedback } = resource;
  const section = lesson.sections[sectionIndex];
  const complete = Boolean(progress?.completedAt);
  const ready =
    lesson.sections.every((item) => progress?.sections.includes(item.id)) &&
    lesson.checks.every((check) => progress?.checks[check.id]?.correct);
  return (
    <div className="page-wrap">
      <Link className="text-link" href="/learn">
        Back to learning
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            PUBLISHED INSTRUCTION · DOMAIN {lesson.domain} · REVISION{" "}
            {lesson.version}
          </div>
          <h1>{lesson.title}</h1>
          <p className="lead">{lesson.summary}</p>
        </div>
        <span className="outline-badge">
          {complete ? "Lesson completed" : "Connected account progress"}
        </span>
      </div>
      <p className="fine-print">
        Independent CredBuilt preparation. Publication records independent
        technical review of this revision; it does not imply BCSP affiliation or
        an official examination outcome.
      </p>
      <section className="card settings-card">
        <h2>Learning objectives</h2>
        <ul>
          {lesson.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
        <p>
          {progress?.sections.length || 0} / {lesson.sections.length} sections
          marked read ·{" "}
          {
            Object.values(progress?.checks || {}).filter(
              (check) => check.correct,
            ).length
          }{" "}
          / {lesson.checks.length} checks correct
        </p>
        <progress
          aria-label="Published lesson section progress"
          max={lesson.sections.length}
          value={progress?.sections.length || 0}
        />
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">Saving lesson progress…</p>}
      <div
        className="auth-actions"
        role="navigation"
        aria-label="Published lesson topics"
      >
        {lesson.sections.map((item, index) => (
          <button
            className="button secondary"
            key={item.id}
            aria-current={index === sectionIndex ? "step" : undefined}
            onClick={() => setSectionIndex(index)}
          >
            {index + 1}. {item.title}
          </button>
        ))}
      </div>
      {section && (
        <section className="card settings-card reading-section">
          <div className="eyebrow">
            SECTION {sectionIndex + 1} / {lesson.sections.length}
          </div>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index} style={{ whiteSpace: "pre-wrap" }}>
              {paragraph}
            </p>
          ))}
          {section.reflection && (
            <div className="reflection">
              <p>{section.reflection}</p>
            </div>
          )}
          <div className="auth-actions">
            <button
              className="button secondary"
              disabled={!sectionIndex}
              onClick={() => setSectionIndex(sectionIndex - 1)}
            >
              Previous section
            </button>
            <button
              className="button primary"
              disabled={
                busy || Boolean(progress?.sections.includes(section.id))
              }
              onClick={() =>
                void save({ type: "visit", sectionId: section.id })
              }
            >
              {progress?.sections.includes(section.id)
                ? "Section read"
                : "Mark section read"}
            </button>
            <button
              className="button secondary"
              disabled={sectionIndex >= lesson.sections.length - 1}
              onClick={() => setSectionIndex(sectionIndex + 1)}
            >
              Next section
            </button>
          </div>
        </section>
      )}
      {lesson.media.length > 0 && (
        <section className="card settings-card">
          <h2>Lesson media</h2>
          {lesson.media.map((media) => (
            <figure key={media.url}>
              {media.kind === "image" ? (
                <Image
                  src={media.url}
                  alt={media.title}
                  width={960}
                  height={540}
                  unoptimized
                  style={{ width: "100%", height: "auto" }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p>
                  Reviewed {media.kind} asset:{" "}
                  <a
                    className="text-link"
                    href={media.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {media.title}
                  </a>
                  . This opens the reviewed asset. Embedded instructional
                  playback is planned for a later release.
                </p>
              )}
              <figcaption>{media.caption}</figcaption>
            </figure>
          ))}
        </section>
      )}
      <section className="card settings-card">
        <h2>Check your understanding</h2>
        {lesson.checks.map((check) => (
          <form
            className="lesson-check"
            key={check.id}
            onSubmit={(event) => {
              event.preventDefault();
              const choiceId =
                choices[check.id] || progress?.checks[check.id]?.choiceId;
              if (choiceId)
                void save({ type: "check", checkId: check.id, choiceId });
            }}
          >
            <fieldset disabled={busy}>
              <legend>{check.stem}</legend>
              {check.choices.map((choice) => (
                <label key={choice.id}>
                  <input
                    type="radio"
                    name={check.id}
                    value={choice.id}
                    checked={
                      (choices[check.id] ||
                        progress?.checks[check.id]?.choiceId) === choice.id
                    }
                    onChange={() =>
                      setChoices({ ...choices, [check.id]: choice.id })
                    }
                  />
                  {choice.text}
                </label>
              ))}
            </fieldset>
            <button
              className="button secondary"
              disabled={
                busy ||
                !(choices[check.id] || progress?.checks[check.id]?.choiceId)
              }
            >
              Check understanding
            </button>
            {feedback[check.id] && (
              <div
                className={`knowledge-feedback ${progress?.checks[check.id]?.correct ? "positive" : ""}`}
              >
                <strong>
                  {progress?.checks[check.id]?.correct
                    ? "Correct"
                    : "Review this concept"}
                </strong>
                <p>{feedback[check.id].explanation}</p>
                <p>
                  Correct answer:{" "}
                  {
                    check.choices.find(
                      (choice) =>
                        choice.id === feedback[check.id].correctChoice,
                    )?.text
                  }
                </p>
              </div>
            )}
          </form>
        ))}
        <button
          className="button primary"
          disabled={busy || !ready || complete}
          onClick={() => void save({ type: "complete" })}
        >
          {complete ? "Lesson completed" : "Complete lesson"}
        </button>
      </section>
      <section className="card settings-card">
        <h2>Technical references</h2>
        {lesson.references.map((reference) => (
          <article
            className="lesson-reference"
            key={`${reference.url}:${reference.section}`}
          >
            <a
              className="text-link"
              href={reference.url}
              target="_blank"
              rel="noreferrer"
            >
              {reference.title}
            </a>
            <p>
              {reference.edition} · {reference.section}
            </p>
            <small>
              Review recorded:{" "}
              {reference.verifiedAt
                ? new Date(reference.verifiedAt).toLocaleDateString()
                : "No date recorded"}
            </small>
          </article>
        ))}
        <p className="fine-print">
          References remain with their publishers. Restricted standards are not
          reproduced here.
        </p>
      </section>
      <div className="auth-actions">
        <Link
          className="button primary"
          href={`/practice?bank=published&certification=${encodeURIComponent(lesson.certification)}&topic=${encodeURIComponent(lesson.topic)}&count=1`}
        >
          Practice this topic
        </Link>
        {lesson.relatedLessonIds.map((id) => (
          <Link className="button secondary" key={id} href={`/learn/${id}`}>
            Related lesson
          </Link>
        ))}
      </div>
      {lesson.transcript && (
        <details className="card settings-card">
          <summary>Lesson transcript</summary>
          <p style={{ whiteSpace: "pre-wrap" }}>{lesson.transcript}</p>
        </details>
      )}
    </div>
  );
}
