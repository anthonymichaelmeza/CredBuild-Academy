import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Crosshair,
  Timer,
  Target,
  CheckCheck,
  Clock3,
  Flame,
  LockKeyhole,
  ChevronRight,
} from "lucide-react";
import { domains } from "@/modules/catalog/blueprint";
import { aggregate } from "@/modules/practice/engine";
import type { Session } from "@/modules/practice/types";
export function Dashboard({
  sessions,
  browserOnly = false,
  managed = false,
  learning,
}: {
  sessions: Session[];
  browserOnly?: boolean;
  managed?: boolean;
  learning?: { completed: number; title: string; href: string };
}) {
  const stats = aggregate(sessions);
  const resume = sessions.find((s) => s.status === "in_progress");
  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>
            Welcome to your workspace<span className="orange">.</span>
          </h1>
          <p>A little progress today. A stronger professional tomorrow.</p>
        </div>
        <span className="outline-badge">
          <span className="status-dot" />
          CHST preparation
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">KNOWLEDGE THAT BUILDS CONFIDENCE</span>
          <h2>
            Build your knowledge.
            <br />
            Earn your next credential.
          </h2>
          <p>
            Turn your field experience into focused learning.
            <br className="desktop-break" /> Your CHST preparation starts with
            one good session.
          </p>
          <div className="hero-actions">
            <Link
              className="button primary"
              href={resume ? `/practice/${resume.id}` : "/practice"}
            >
              {resume ? "Resume your session" : "Start practicing"}
              <ArrowRight size={17} />
            </Link>
            <Link className="hero-link" href="/learn">
              Explore the learning path <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link className="hero-link" href="/planner">
            Build my study plan <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="grid-pattern" />
          <div className="beam beam-one" />
          <div className="beam beam-two" />
          <div className="beam beam-three" />
          <div className="hero-stamp">
            <span>CHST</span>
            <small>BUILD WHAT’S NEXT</small>
          </div>
          <span className="art-coordinate">01 / FOUNDATION</span>
        </div>
      </section>
      <div className="section-heading">
        <h2>Your progress, at a glance</h2>
        <span className="subtle-label">DEMONSTRATION ACTIVITY ONLY</span>
      </div>
      <div className="stats-grid">
        {[
          {
            title: "Questions answered",
            value: stats.answered.toString(),
            note: "Every question is a step forward",
            icon: CheckCheck,
          },
          {
            title: "Practice accuracy",
            value: stats.accuracy === null ? "—" : `${stats.accuracy}%`,
            note: stats.answered
              ? `${stats.correct} correct of ${stats.answered} answered`
              : "Complete a session to see your accuracy",
            icon: Target,
          },
          {
            title: "Study time",
            value: `${stats.studyMinutes}`,
            suffix: "min",
            note: "Time recorded on answered questions",
            icon: Clock3,
          },
          {
            title: "Sessions completed",
            value: stats.completed.toString(),
            note: "Build a routine that works for you",
            icon: Flame,
          },
        ].map(({ title, value, suffix, note, icon: Icon }) => (
          <div className="stat-card" key={title}>
            <div className="stat-top">
              <span>{title}</span>
              <Icon size={18} />
            </div>
            <div className="stat-value">
              {value}
              <small>{suffix}</small>
            </div>
            <p>{note}</p>
          </div>
        ))}
      </div>
      {learning && (
        <section className="card learning-dashboard-link">
          <div>
            <div className="eyebrow">YOUR LEARNING ACADEMY</div>
            <h2>{learning.completed} / 8 demo lessons completed</h2>
            <p>Next: {learning.title}</p>
          </div>
          <Link className="button primary" href={learning.href}>
            Continue learning
            <ArrowRight size={16} />
          </Link>
        </section>
      )}
      <div className="dashboard-columns">
        <section className="card domain-card">
          <div className="card-heading">
            <div>
              <div className="eyebrow">THE BIG PICTURE</div>
              <h2>Your CHST study map</h2>
            </div>
            <Link className="text-link" href="/performance">
              View performance <ArrowUpRight size={15} />
            </Link>
          </div>
          <p className="card-description">
            Four domains. One foundation for your next step.
          </p>
          <div className="domains">
            {domains.map((d, i) => (
              <div className="domain-row" key={d.code}>
                <div className="domain-number">0{i + 1}</div>
                <div className="domain-details">
                  <div>
                    <strong>{d.short}</strong>
                    <span>{d.weight / 100}%</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: "0%" }} />
                  </div>
                  <small>
                    Mastery not assessed · blueprint supplied by user
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="soft-note">
            <LockKeyhole size={15} />
            <span>
              Official blueprint verification is pending. These weights are
              provisional, not a readiness assessment.
            </span>
          </div>
        </section>
        <section className="card next-card">
          <div className="eyebrow">MAKE YOUR NEXT MOVE</div>
          <h2>Choose your momentum.</h2>
          <p className="card-description">
            Focused tools for the way you learn.
          </p>
          {[
            {
              href: "/practice",
              title: "Practice with purpose",
              text: "Original demo questions with instant feedback.",
              icon: Crosshair,
              tag: "AVAILABLE",
            },
            {
              href: "/learn",
              title: "Understand the fundamentals",
              text: "Read demo lessons and check your understanding.",
              icon: BookOpen,
              tag: "FRAMEWORK",
            },
            {
              href: "/exam",
              title: "Prepare for exam day",
              text: "Try a short rehearsal and see full-exam requirements.",
              icon: Timer,
              tag: "DEMO REHEARSAL",
            },
          ].map(({ href, title, text, icon: Icon, tag }) => (
            <Link href={href} key={href} className="next-action">
              <span className="action-icon">
                <Icon size={21} />
              </span>
              <span>
                <small>{tag}</small>
                <strong>{title}</strong>
                <p>{text}</p>
              </span>
              <ChevronRight size={17} />
            </Link>
          ))}
        </section>
      </div>
      <section className="card activity">
        <div className="card-heading">
          <div>
            <div className="eyebrow">KEEP BUILDING</div>
            <h2>Recent activity</h2>
          </div>
          <Link className="text-link" href="/performance">
            Session history <ArrowUpRight size={15} />
          </Link>
        </div>
        {sessions.length ? (
          <div className="activity-list">
            {sessions.slice(0, 3).map((s) => (
              <Link key={s.id} href={`/practice/${s.id}`}>
                <span className="action-icon">
                  <Crosshair size={19} />
                </span>
                <span>
                  <strong>
                    {
                      {
                        adaptive: "Adaptive",
                        learning: "Learning",
                        timed: "Timed",
                        exam: "Exam rehearsal",
                      }[s.mode]
                    }{" "}
                    practice · demo
                  </strong>
                  <small>
                    {Object.keys(s.answers).length} of {s.questionIds.length}{" "}
                    answered ·{" "}
                    {s.status === "submitted" ? "Completed" : "In progress"}
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-activity">
            <span className="empty-icon">
              <BookOpen size={24} />
            </span>
            <div>
              <h3>Your story starts with a first session.</h3>
              <p>
                Practice activity will appear here once you begin. No made-up
                progress, just yours.
              </p>
            </div>
            <Link className="button secondary" href="/practice">
              Begin a session <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <p className="demo-disclosure">
        Foundation preview · AI-generated demonstration questions are unreviewed
        and excluded from the production bank.{" "}
        {browserOnly
          ? "Progress is saved only in this browser’s site storage; there is no account or server database."
          : managed
            ? "Learning activity is saved to your verified account."
            : "Local demo progress is stored on this development machine and belongs to this browser cookie."}{" "}
        Logo mark is a temporary placeholder.
      </p>
    </div>
  );
}
