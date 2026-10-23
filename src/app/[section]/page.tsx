import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { actor, authConfigured, demoEnabled } from "@/modules/identity/auth";
import {
  history,
  historyQuestionPool,
  bookmarkList,
} from "@/modules/practice/service";
import { Performance } from "@/components/performance";
import { BrowserPerformance, BrowserSettings } from "@/components/browser-demo";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { ReferenceLibrary } from "@/components/reference-library";
import { AuthControls } from "@/components/auth-controls";
import { performanceData } from "@/modules/performance/dto";
import { readLearning } from "@/modules/learning/service";
import { completedLesson } from "@/modules/learning/progress";
import { lessons } from "@/modules/learning/catalog";
export const dynamic = "force-dynamic";
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === "reference") return <ReferenceLibrary />;
  if (section === "performance") {
    if (browserDemoEnabled()) return <BrowserPerformance />;
    const who = await actor();
    const saved = who ? await history(who.id) : [];
    const learning = who ? (await readLearning(who.id)).state : null;
    return (
      <Performance
        {...performanceData(
          saved,
          saved.length
            ? (await historyQuestionPool()).filter((q) =>
                saved.some(
                  (s) =>
                    s.questionIds.includes(q.id) &&
                    (s.questionVersions?.[q.id] ?? 1) === q.version,
                ),
              )
            : [],
        )}
        marked={who ? await bookmarkList(who.id) : []}
        completedLessonIds={
          learning
            ? lessons
                .filter((l) => completedLesson(l.id, learning))
                .map((l) => l.id)
            : []
        }
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
          <div className="auth-actions">
            <Link className="button secondary" href="/onboarding">
              Set study goals
            </Link>
            <Link className="button secondary" href="/planner">
              Open study planner
            </Link>
            {who && (
              <a
                className="button secondary"
                href="/api/account/export"
                download
              >
                Export my learning data
              </a>
            )}
          </div>
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
          <h2>Account and subscription</h2>
          <p>
            No paid plan or billing provider is active. Upgrades, charges, and
            team seats are unavailable.
          </p>
          <p className="fine-print">
            Managed sign-in supports provider-configured password recovery and
            email verification. Live account registration and hosted database
            persistence still require configuration and validation.
          </p>
        </section>
      </div>
    );
  }
  const upcoming = {
    flashcards: [
      "Keep knowledge within reach.",
      "Flashcards & retention",
      "Saved decks, missed-question cards, and a documented spaced-repetition schedule will arrive in Milestone 4. No review schedule is simulated.",
    ],
  } as const;
  if (Object.hasOwn(upcoming, section)) {
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
