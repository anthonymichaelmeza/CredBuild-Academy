"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  lessons,
  focusedPracticeLink,
  type Lesson,
} from "@/modules/learning/catalog";
import { domains } from "@/modules/catalog/blueprint";
import {
  canComplete,
  completedLesson,
  lessonAction,
} from "@/demo/learning-store";
import { useLearning } from "./use-learning";
function KnowledgeCheck({
  lesson,
  check,
  saved,
}: {
  lesson: Lesson;
  check: Lesson["checks"][number];
  saved?: { choiceId: string; correct: boolean; attempts: number };
}) {
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="lesson-check"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          lessonAction(lesson.id, {
            type: "check",
            checkId: check.id,
            choiceId: choice || saved?.choiceId || "",
          });
          setError("");
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <fieldset>
        <legend>{check.stem}</legend>
        {check.choices.map((c) => (
          <label key={c.id}>
            <input
              type="radio"
              name={check.id}
              checked={(choice || saved?.choiceId) === c.id}
              onChange={() => setChoice(c.id)}
              disabled={saved?.correct}
            />
            {c.text}
          </label>
        ))}
      </fieldset>
      {saved && (
        <div
          className={`knowledge-feedback ${saved.correct ? "positive" : ""}`}
          role="status"
        >
          <strong>
            {saved.correct
              ? "Correct — concept checked."
              : "Revisit the explanation and try again."}
          </strong>
          <p>{check.explanation}</p>
          <small>
            {saved.attempts} attempt{saved.attempts === 1 ? "" : "s"} ·
            demonstration only
          </small>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button secondary"
        disabled={saved?.correct || !(choice || saved?.choiceId)}
      >
        {saved?.correct ? "Check complete" : "Check understanding"}
      </button>
    </form>
  );
}
export function LessonReader({ lessonId }: { lessonId: string }) {
  const lesson = lessons.find((l) => l.id === lessonId)!;
  const { state, hydrated, error: storageError } = useLearning();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [error, setError] = useState("");
  const section = lesson.sections[sectionIndex];
  const progress = state?.progress[lesson.id];
  const done = Boolean(state && completedLesson(lesson.id, state));
  const next = lessons[lessons.indexOf(lesson) + 1];
  function act(action: Parameters<typeof lessonAction>[1]) {
    try {
      lessonAction(lesson.id, action);
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  return (
    <div className="page-wrap lesson-page">
      <Link className="text-link back-link" href="/learn">
        <ArrowLeft size={15} />
        Learning Academy
      </Link>
      <div className="reader-layout">
        <aside className="card course-navigation">
          <div className="eyebrow">CHST LEARNING PATH</div>
          <h2>Your next chapter</h2>
          {domains.map((d) => (
            <div key={d.code} className="course-domain">
              <h3>
                <span>0{d.code}</span>
                {d.short}
              </h3>
              {lessons
                .filter((l) => l.domain === d.code)
                .map((l) => (
                  <Link
                    key={l.id}
                    href={`/learn/${l.id}`}
                    aria-current={l.id === lesson.id ? "page" : undefined}
                  >
                    {state && completedLesson(l.id, state) ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <BookOpen size={15} />
                    )}
                    {l.title}
                  </Link>
                ))}
            </div>
          ))}
        </aside>
        <article className="lesson-content">
          <header className="lesson-header">
            <div className="eyebrow">
              DOMAIN {lesson.domain} / {lesson.topic.toUpperCase()}
            </div>
            <h1>{lesson.title}</h1>
            <p>{lesson.summary}</p>
            <div className="topic-chips">
              <span>Lesson v{lesson.version}</span>
              <span>{lesson.readingMinutes} min estimated</span>
              <span>{lesson.checks.length} knowledge checks</span>
              <span>Unreviewed demonstration</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Sections read"
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={progress?.sections.length || 0}
            >
              <span
                style={{
                  width: `${((progress?.sections.length || 0) / 3) * 100}%`,
                }}
              />
            </div>
            <small>
              {progress?.sections.length || 0} / 3 sections marked read
              {done ? " · Lesson completed" : ""}
            </small>
          </header>
          <section className="card learning-objectives">
            <h2>What you’ll explore</h2>
            <ul>
              {lesson.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <small>
              Original demo learning objectives. Official CHST blueprint
              objective mapping is pending review.
            </small>
          </section>
          <nav className="reader-tabs" aria-label="Lesson sections">
            {lesson.sections.map((s, i) => (
              <button
                key={s.id}
                aria-pressed={i === sectionIndex}
                onClick={() => setSectionIndex(i)}
              >
                <span>{progress?.sections.includes(s.id) ? "✓" : i + 1}</span>
                {s.title}
              </button>
            ))}
          </nav>
          <section className="card reading-section">
            <div className="eyebrow">
              SECTION {sectionIndex + 1} / {lesson.sections.length}
            </div>
            <h2>{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <div className="reflection">
              <span className="eyebrow">PAUSE AND REFLECT</span>
              <p>{section.reflection}</p>
            </div>
            <div className="question-actions">
              <button
                className="button secondary"
                disabled={!sectionIndex}
                onClick={() => setSectionIndex(sectionIndex - 1)}
              >
                <ArrowLeft size={15} />
                Previous section
              </button>
              <button
                className="button primary"
                disabled={!hydrated || !state}
                onClick={() => {
                  if (
                    act({ type: "visit", sectionId: section.id }) &&
                    sectionIndex < lesson.sections.length - 1
                  )
                    setSectionIndex(sectionIndex + 1);
                }}
              >
                {progress?.sections.includes(section.id)
                  ? "Section read — continue"
                  : "Mark section read"}
                <ArrowRight size={15} />
              </button>
            </div>
          </section>
          <section className="card knowledge-checks">
            <div className="eyebrow">RETRIEVE, DON’T JUST REREAD</div>
            <h2>Check your understanding</h2>
            <p>
              Original demonstration checks. Feedback is for learning, not a
              qualification assessment.
            </p>
            {lesson.checks.map((c) => (
              <KnowledgeCheck
                key={`${lesson.id}-${c.id}`}
                lesson={lesson}
                check={c}
                saved={progress?.checks[c.id]}
              />
            ))}
            {(storageError || error) && (
              <p className="error" role="alert">
                {error || storageError}
              </p>
            )}
            <div className="lesson-completion">
              <span>
                {done
                  ? "Demo lesson completed. No certification credit is awarded."
                  : "Mark all three sections read and pass both checks to complete this demo lesson."}
              </span>
              <button
                className="button primary"
                disabled={!state || done || !canComplete(lesson.id, state)}
                onClick={() => act({ type: "complete" })}
              >
                {done ? "Lesson completed" : "Complete lesson"}
                <CheckCircle2 size={16} />
              </button>
            </div>
          </section>
          <section className="card">
            <h2>References & further reading</h2>
            <p className="fine-print">
              Publisher discovery links. No technical source or exact regulatory
              section has been reviewed.
            </p>
            {lesson.references.map((ref) => (
              <div className="lesson-reference" key={ref.url}>
                <a
                  className="text-link"
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {ref.title}
                  <ExternalLink size={14} />
                </a>
                <p>{ref.section}</p>
                <span className="neutral-badge">Not verified</span>
              </div>
            ))}
          </section>
          <section className="card lesson-next">
            <div>
              <div className="eyebrow">CONNECT LEARNING TO PRACTICE</div>
              <h2>Try the concept in a question.</h2>
              <p>
                Focused practice uses a distinct question from the demo bank.
              </p>
            </div>
            <Link className="button primary" href={focusedPracticeLink(lesson)}>
              Practice this topic
              <ArrowRight size={16} />
            </Link>
          </section>
          {next && (
            <Link className="next-lesson-link" href={`/learn/${next.id}`}>
              Next lesson: {next.title}
              <ArrowRight size={17} />
            </Link>
          )}
          <p className="demo-disclosure">
            AI-generated draft · not technically reviewed · not a site procedure
            or a substitute for competent supervision. Progress is
            browser-local, even when using the separate server-backed practice
            mode.
          </p>
        </article>
      </div>
    </div>
  );
}
