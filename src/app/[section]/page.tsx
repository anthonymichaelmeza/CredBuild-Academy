import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { actor, authConfigured, demoEnabled } from "@/modules/identity/auth";
import { history, pool, bookmarkList } from "@/modules/practice/service";
import { Performance } from "@/components/performance";
import { BrowserPerformance, BrowserSettings } from "@/components/browser-demo";
import { browserDemoEnabled } from "@/modules/runtime/mode";
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
