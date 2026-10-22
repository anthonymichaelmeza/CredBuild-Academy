import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, LockKeyhole, ShieldAlert } from "lucide-react";
import { actor, authConfigured, demoEnabled } from "@/modules/identity/auth";
import { history, pool, bookmarkList } from "@/modules/practice/service";
import { aggregate } from "@/modules/practice/engine";
import { domains, allocateDomains } from "@/modules/catalog/blueprint";
import { ReferenceLibrary } from "@/components/reference-library";
import { AuthControls } from "@/components/auth-controls";
export const dynamic = "force-dynamic";
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === "reference") return <ReferenceLibrary />;
  if (section === "learn")
    return (
      <div className="page-wrap">
        <div className="eyebrow">UNDERSTANDING BEFORE MEMORIZATION</div>
        <h1>
          Build a stronger foundation<span className="orange">.</span>
        </h1>
        <p className="lead">
          A curriculum framework for your CHST preparation. Reviewed lessons are
          not published yet.
        </p>
        <div className="resource-grid">
          {domains.map((d, i) => (
            <article className="card lesson-card" key={d.code}>
              <span className="domain-number">0{i + 1}</span>
              <h2>{d.title}</h2>
              <p>
                Planned structure: objectives, instruction, source references,
                knowledge checks, and retention review.
              </p>
              <span className="neutral-badge">
                Awaiting blueprint and content review
              </span>
            </article>
          ))}
        </div>
        <p className="demo-disclosure">
          Domain titles and weights are user-supplied CHST5 data, pending
          official source verification. No lesson-completion progress is
          fabricated.
        </p>
        <Link className="button primary" href="/practice">
          Try demonstration practice
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  if (section === "exam") {
    const allocation = allocateDomains(
      200,
      domains.map((d) => d.weight),
    );
    return (
      <div className="page-wrap narrow">
        <div className="eyebrow">EXAM SIMULATOR · NEXT MILESTONE</div>
        <h1>
          Prepare for the full picture<span className="orange">.</span>
        </h1>
        <p className="lead">
          A 200-question practice exam is planned. It cannot start before the
          content and timing requirements are met.
        </p>
        <section className="card exam-requirements">
          <LockKeyhole size={30} />
          <h2>Not available yet</h2>
          <p>
            No approved instructional questions are published. At least 200
            distinct eligible questions and verified duration are required. The
            timer and exam engine are not implemented in this milestone.
          </p>
          <div className="result-domain">
            <span>Approved question pool</span>
            <strong>0 / 200</strong>
          </div>
          <div className="result-domain">
            <span>Official duration</span>
            <strong>Not verified</strong>
          </div>
          <h3>Provisional allocation — exactly 200 questions</h3>
          {domains.map((d, i) => (
            <div key={d.code} className="result-domain">
              <span>
                Domain {d.code} · {d.weight / 100}%
              </span>
              <strong>{allocation[i]} questions</strong>
            </div>
          ))}
          <p className="fine-print">
            Largest-remainder integer allocation from user-supplied weights. Not
            a verified official BCSP exam configuration. No official passing
            score is assumed.
          </p>
          <Link className="button primary" href="/practice">
            Use demonstration practice
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    );
  }
  if (section === "performance") {
    const who = await actor();
    const saved = who ? await history(who.id) : [];
    const stats = aggregate(saved);
    const questions = saved.length ? await pool() : [];
    const marked = who ? await bookmarkList(who.id) : [];
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
                  ([id]) =>
                    questions.find((q) => q.id === id)?.domain === d.code,
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
              <Link
                className="history-row"
                key={s.id}
                href={`/practice/${s.id}`}
              >
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
  if (section === "settings") {
    const who = await actor();
    const managed = authConfigured();
    return (
      <div className="page-wrap narrow">
        <div className="eyebrow">YOUR WORKSPACE</div>
        <h1>
          Account settings<span className="orange">.</span>
        </h1>
        <p className="lead">Know exactly where your progress lives.</p>
        <section className="card settings-card">
          <h2>
            {managed ? "Managed authentication" : "Local demonstration mode"}
          </h2>
          <p>
            {managed
              ? "Clerk handles sign-in and account security. Saved application progress belongs to the verified account."
              : demoEnabled()
                ? "No real account is created. An HTTP-only browser cookie identifies your local demo workspace; PostgreSQL-compatible local storage holds progress on this machine. Clearing the cookie loses access to that demo history. This is not cross-device synchronization."
                : "Configure Clerk credentials or explicitly enable ALLOW_LOCAL_DEMO to use practice."}
          </p>
          {managed ? (
            <AuthControls signedIn={Boolean(who)} />
          ) : (
            <span className="neutral-badge">
              Managed sign-in not configured
            </span>
          )}
          <dl>
            <div>
              <dt>Database</dt>
              <dd>
                {process.env.DATABASE_URL
                  ? "Managed PostgreSQL (configured, connectivity not shown here)"
                  : "Local PGlite / PostgreSQL"}
              </dd>
            </div>
            <div>
              <dt>Production content</dt>
              <dd>No approved questions published</dd>
            </div>
            <div>
              <dt>Track</dt>
              <dd>CHST preparation</dd>
            </div>
            <div>
              <dt>Blueprint</dt>
              <dd>User-supplied CHST5 · unverified</dd>
            </div>
            <div>
              <dt>Brand mark</dt>
              <dd>Temporary hard-hat placeholder; original logo pending</dd>
            </div>
          </dl>
        </section>
      </div>
    );
  }
  if (section === "admin")
    return (
      <div className="page-wrap narrow">
        <div className="notice">
          <ShieldAlert />
          <div>
            <h1>Administration is locked.</h1>
            <p>
              There is no author, reviewer, or publishing UI in this milestone.
              Public access cannot approve or publish content. Review
              permissions and the editorial workflow are scheduled for Milestone
              5.
            </p>
          </div>
        </div>
      </div>
    );
  const upcoming = {
    flashcards: [
      "Keep knowledge within reach.",
      "Flashcards & retention",
      "Saved decks, missed-question cards, and a documented spaced-repetition schedule will arrive in Milestone 4. No review schedule is simulated.",
    ],
    planner: [
      "Make room for your next step.",
      "Study planner",
      "Study goals and review scheduling are planned after the core practice and exam workflows. No calendar entries or reminders are created yet.",
    ],
  } as const;
  if (section in upcoming) {
    const [title, label, detail] = upcoming[section as keyof typeof upcoming];
    return (
      <div className="page-wrap narrow">
        <div className="eyebrow">{label.toUpperCase()}</div>
        <h1>{title}</h1>
        <section className="card empty-block">
          <LockKeyhole size={30} />
          <h2>Part of the path ahead</h2>
          <p>{detail}</p>
          <Link className="button primary" href="/practice">
            Practice while we build
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    );
  }
  notFound();
}
