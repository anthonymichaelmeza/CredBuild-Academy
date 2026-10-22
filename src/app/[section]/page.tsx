import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, LockKeyhole, ShieldAlert } from "lucide-react";
import { actor, authConfigured, demoEnabled } from "@/modules/identity/auth";
import { history, pool, bookmarkList } from "@/modules/practice/service";
import { Performance } from "@/components/performance";
import { BrowserPerformance, BrowserSettings } from "@/components/browser-demo";
import { browserDemoEnabled } from "@/modules/runtime/mode";
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
    if (browserDemoEnabled()) return <BrowserPerformance />;
    const who = await actor();
    const saved = who ? await history(who.id) : [];
    return (
      <Performance
        saved={saved}
        questions={saved.length ? await pool() : []}
        marked={who ? await bookmarkList(who.id) : []}
      />
    );
  }
  if (section === "settings") {
    if (browserDemoEnabled()) return <BrowserSettings />;
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
