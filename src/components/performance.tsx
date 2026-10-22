"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { domains } from "@/modules/catalog/blueprint";
import {
  analyzeSessions,
  recommendedLessons,
} from "@/modules/performance/analytics";
import { focusedPracticeLink } from "@/modules/learning/catalog";
import type { Question, Session } from "@/modules/practice/types";
export function Performance({
  saved,
  questions,
  marked,
  completedLessonIds = [],
}: {
  saved: Session[];
  questions: Question[];
  marked: string[];
  completedLessonIds?: string[];
}) {
  const [domain, setDomain] = useState("all");
  const [topic, setTopic] = useState("all");
  const [days, setDays] = useState("all");
  const [now] = useState(() => Date.now());
  const stats = analyzeSessions(saved, questions, {
    domain,
    topic,
    ...(days === "all" ? {} : { since: now - Number(days) * 86400000 }),
  });
  const recommendations = recommendedLessons(
    saved,
    questions,
    completedLessonIds,
  );
  const visibleHistory = saved.filter(
    (s) =>
      (days === "all" ||
        Date.parse(s.createdAt) >= now - Number(days) * 86400000) &&
      s.questionIds.some((id) => {
        const q = questions.find((q) => q.id === id);
        return (
          q &&
          (domain === "all" || q.domain === domain) &&
          (topic === "all" || q.topic === topic)
        );
      }),
  );
  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORK, MADE VISIBLE</div>
          <h1>
            Progress you can trace<span className="orange">.</span>
          </h1>
          <p>Every recommendation starts with something you actually did.</p>
        </div>
        <span className="outline-badge">Demonstration activity only</span>
      </div>
      <div className="analytics-filters card">
        <label>
          Domain
          <select
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setTopic("all");
            }}
          >
            <option value="all">All domains</option>
            {domains.map((d) => (
              <option key={d.code} value={d.code}>
                {d.short}
              </option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="all">All topics</option>
            {[
              ...new Set(
                questions
                  .filter((q) => domain === "all" || q.domain === domain)
                  .map((q) => q.topic),
              ),
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Activity range
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="all">All saved history</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
      </div>
      <div className="stats-grid">
        {[
          ["Questions answered", stats.answered],
          [
            "Accuracy on answered questions",
            stats.accuracy === null ? "—" : `${stats.accuracy}%`,
          ],
          [
            "Completed sessions",
            visibleHistory.filter((s) => s.status === "submitted").length,
          ],
          ["Bookmarks", marked.length],
        ].map(([label, value]) => (
          <div key={label} className="stat-card">
            <span>{label}</span>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="analytics-grid">
        <section className="card">
          <div className="eyebrow">FIND YOUR FOCUS</div>
          <h2>Accuracy by domain</h2>
          {domains
            .filter((d) => domain === "all" || d.code === domain)
            .map((d) => {
              const data = stats.domains.find((t) => t.value === d.code);
              return (
                <div className="accuracy-row" key={d.code}>
                  <div>
                    <strong>{d.short}</strong>
                    <span>
                      {data
                        ? `${data.accuracy}% · ${data.answered} answers`
                        : "Not assessed"}
                    </span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${data?.accuracy || 0}%` }} />
                  </div>
                </div>
              );
            })}
          <p className="fine-print">
            Accuracy describes this sample. It is not domain mastery or an
            exam-readiness prediction.
          </p>
        </section>
        <section className="card">
          <div className="eyebrow">MAKE THE NEXT SESSION COUNT</div>
          <h2>Recommended next lessons</h2>
          {recommendations.length ? (
            recommendations.map(({ lesson, reason }) => (
              <div className="recommendation" key={lesson.id}>
                <small>{reason}</small>
                <Link href={`/learn/${lesson.id}`}>
                  <BookOpen size={18} />
                  <strong>{lesson.title}</strong>
                  <ArrowRight size={16} />
                </Link>
                <Link className="text-link" href={focusedPracticeLink(lesson)}>
                  Practice this topic instead
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))
          ) : (
            <p className="fine-print">
              All representative lessons are complete. Revisit them or choose
              another practice set.
            </p>
          )}
        </section>
      </div>
      <section className="card analytics-section">
        <h2>Accuracy by topic</h2>
        {stats.topics.length ? (
          <div className="topic-stat-list">
            {stats.topics.map((t) => (
              <article key={t.value}>
                <div>
                  <strong>{t.value}</strong>
                  <span>
                    {t.correct} correct / {t.answered} answers · {t.accuracy}%
                  </span>
                </div>
                <div className="topic-stat-actions">
                  <Link
                    className="text-link"
                    href={`/practice?topic=${encodeURIComponent(t.value)}&count=1`}
                  >
                    Focused practice
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    className="text-link"
                    href={`/practice/${t.sessionIds[0]}`}
                  >
                    Underlying session
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="fine-print">
            No answered questions match these filters. Unattempted topics are
            not assigned zero accuracy.
          </p>
        )}
      </section>
      <div className="analytics-grid analytics-section">
        <section className="card">
          <h2>Repeatedly missed concepts</h2>
          <p className="fine-print">
            Two or more recorded misses on the same question. Small samples are
            shown explicitly.
          </p>
          {stats.repeated.length ? (
            stats.repeated.map((item) => (
              <div className="missed-concept" key={item.question.id}>
                <strong>{item.question.topic}</strong>
                <p>
                  {item.misses} misses / {item.attempts} attempts
                </p>
                <Link
                  className="text-link"
                  href={`/practice/${item.sessionIds[0]}`}
                >
                  Review a contributing session
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))
          ) : (
            <p className="fine-print">No repeated misses in this sample yet.</p>
          )}
        </section>
        <section className="card">
          <h2>
            <CalendarDays size={19} />
            Study activity
          </h2>
          <p className="fine-print">
            Recorded answer activity by UTC date · {stats.studyMinutes}{" "}
            browser-reported minutes.
          </p>
          {stats.activity.length ? (
            stats.activity.slice(-7).map((day) => (
              <div key={day.day} className="activity-day">
                <span>{day.day}</span>
                <div>
                  <span
                    style={{
                      width: `${Math.max(3, (day.answers / Math.max(...stats.activity.map((d) => d.answers))) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{day.answers} answers</strong>
              </div>
            ))
          ) : (
            <p className="fine-print">
              Your first checked answer starts the activity record.
            </p>
          )}
        </section>
      </div>
      <section className="card history-card">
        <h2>Session history</h2>
        {visibleHistory.length ? (
          visibleHistory.map((s) => (
            <Link className="history-row" key={s.id} href={`/practice/${s.id}`}>
              <span>
                <strong>
                  {s.mode === "adaptive"
                    ? "Adaptive"
                    : s.mode === "exam"
                      ? "Exam rehearsal"
                      : s.mode === "timed"
                        ? "Timed"
                        : "Learning"}{" "}
                  practice · demo
                </strong>
                <small>
                  {new Date(s.createdAt).toISOString().slice(0, 10)} ·{" "}
                  {Object.keys(s.answers).length} / {s.questionIds.length}{" "}
                  answered
                  {s.submissionReason === "expired" ? " · Time expired" : ""}
                </small>
              </span>
              <span>
                {s.status === "submitted" ? "View results" : "Resume"}
                <ArrowRight size={15} />
              </span>
            </Link>
          ))
        ) : (
          <div className="empty-block">
            <BookOpen size={27} />
            <h3>Your first session will appear here.</h3>
            <p>
              Start a practice session to build your history, or broaden the
              filters.
            </p>
            <Link className="button primary" href="/practice">
              Start practicing
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <p className="demo-disclosure">
        All numbers come from saved browser activity and the selected filters.
        In-progress exam-rehearsal accuracy is excluded until submission.
        Completed-session results count unanswered questions as incorrect;
        accuracy above uses answered questions. No pass prediction or validated
        retention estimate is claimed.
      </p>
    </div>
  );
}
