import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { aggregate } from "@/modules/practice/engine";
import { domains } from "@/modules/catalog/blueprint";
import type { Question, Session } from "@/modules/practice/types";

export function Performance({
  saved,
  questions,
  marked,
}: {
  saved: Session[];
  questions: Question[];
  marked: string[];
}) {
  const stats = aggregate(saved);
  return (
    <div className="page-wrap">
      <div className="eyebrow">YOUR WORK, MADE VISIBLE</div>
      <h1>
        Progress you can trace<span className="orange">.</span>
      </h1>
      <p className="lead">
        Real saved demo activity. No readiness predictions, no invented
        statistics.
      </p>
      <div className="stats-grid">
        {[
          ["Questions answered", stats.answered],
          [
            "Accuracy on answered questions",
            stats.accuracy === null ? "—" : `${stats.accuracy}%`,
          ],
          ["Completed sessions", stats.completed],
          ["Bookmarks", marked.length],
        ].map(([label, value]) => (
          <div key={label} className="stat-card">
            <span>{label}</span>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
      <section className="card">
        <h2>Domain accuracy</h2>
        {domains.map((d) => {
          const attempts = saved.flatMap((s) =>
            Object.entries(s.answers)
              .filter(
                ([id]) => questions.find((q) => q.id === id)?.domain === d.code,
              )
              .map(([, a]) => a),
          );
          const correct = attempts.filter((a) => a.correct).length;
          return (
            <div className="result-domain" key={d.code}>
              <span>{d.short}</span>
              <strong>
                {attempts.length
                  ? `${Math.round((correct / attempts.length) * 100)}% · ${attempts.length} answers`
                  : "Not assessed"}
              </strong>
            </div>
          );
        })}
      </section>
      <section className="card history-card">
        <h2>Session history</h2>
        {saved.length ? (
          saved.map((s) => (
            <Link className="history-row" key={s.id} href={`/practice/${s.id}`}>
              <span>
                <strong>
                  {s.mode === "adaptive" ? "Adaptive" : "Learning"} practice ·
                  demo
                </strong>
                <small>
                  {new Date(s.createdAt).toISOString().slice(0, 10)} ·{" "}
                  {Object.keys(s.answers).length} / {s.questionIds.length}{" "}
                  answered
                </small>
              </span>
              <span>
                {s.status === "submitted" ? "View results" : "Resume"}{" "}
                <ArrowRight size={15} />
              </span>
            </Link>
          ))
        ) : (
          <div className="empty-block">
            <BookOpen size={27} />
            <h3>Your first session will appear here.</h3>
            <p>Start a practice session to build your history.</p>
            <Link className="button primary" href="/practice">
              Start practicing
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <p className="demo-disclosure">
        Demo results only. Accuracy is based on checked first answers;
        completed-session scores also count unanswered questions as incorrect.
        Streaks, mastery, readiness, and retention metrics are not yet
        calculated.
      </p>
    </div>
  );
}
