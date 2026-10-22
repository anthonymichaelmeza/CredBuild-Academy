"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Dashboard } from "./dashboard";
import { PracticeSession } from "./practice-session";
import { Performance } from "./performance";
import { useHydrated } from "./use-hydrated";
import { useLearning } from "./use-learning";
import { completedLesson, resetLearning } from "@/demo/learning-store";
import { lessons } from "@/modules/learning/catalog";
import { demoQuestions } from "@/demo/questions";
import {
  browserSnapshot,
  subscribeBrowserDemo,
  parseBrowserSnapshot,
  browserSessionView,
  resetBrowserDemo,
} from "@/demo/browser-store";

function useBrowserState() {
  const raw = useSyncExternalStore(
    subscribeBrowserDemo,
    browserSnapshot,
    () => null,
  );
  const hydrated = useHydrated();
  try {
    return { hydrated, state: parseBrowserSnapshot(raw), error: null };
  } catch (error) {
    return {
      hydrated,
      state: null,
      error:
        error instanceof Error
          ? error.message
          : "Demo storage could not be read.",
    };
  }
}
function Loading() {
  return (
    <div className="page-wrap">
      <p role="status">Loading browser demo…</p>
    </div>
  );
}
function StorageError({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow">
      <p className="error" role="alert">
        {message}
      </p>
      <Link className="button secondary" href="/settings">
        Open demo settings
      </Link>
    </div>
  );
}
export function BrowserDashboard() {
  const learning = useLearning();
  const { hydrated, state, error } = useBrowserState();
  if (!hydrated) return <Loading />;
  if (!state) return <StorageError message={error!} />;
  const completed = learning.state
    ? lessons.filter((l) => completedLesson(l.id, learning.state!)).length
    : 0;
  const next = learning.state
    ? lessons.find((l) => !completedLesson(l.id, learning.state!))
    : lessons[0];
  return (
    <Dashboard
      sessions={state.sessions}
      browserOnly
      learning={{
        completed,
        title: next?.title || "All representative lessons completed",
        href: next ? `/learn/${next.id}` : "/learn",
      }}
    />
  );
}
export function BrowserSession({ id }: { id: string }) {
  const { hydrated, state, error } = useBrowserState();
  if (!hydrated) return <Loading />;
  if (!state) return <StorageError message={error!} />;
  const session = state.sessions.find((s) => s.id === id);
  if (!session)
    return (
      <div className="page-wrap narrow">
        <section className="card empty-block">
          <h1>This demo session isn’t stored in this browser.</h1>
          <p>
            Demo progress stays on this browser and website address. It does not
            follow shared links, other devices, private windows, or new
            deployment addresses.
          </p>
          <Link className="button primary" href="/practice">
            Start a new demo session
          </Link>
        </section>
      </div>
    );
  return (
    <PracticeSession
      key={id}
      initial={browserSessionView(session)}
      initialBookmarks={state.bookmarks}
      browserOnly
    />
  );
}
export function BrowserPerformance() {
  const learning = useLearning();
  const { hydrated, state, error } = useBrowserState();
  if (!hydrated) return <Loading />;
  if (!state) return <StorageError message={error!} />;
  return (
    <Performance
      saved={state.sessions}
      questions={demoQuestions}
      marked={state.bookmarks}
      completedLessonIds={
        learning.state
          ? lessons
              .filter((l) => completedLesson(l.id, learning.state!))
              .map((l) => l.id)
          : []
      }
    />
  );
}
export function BrowserSettings() {
  const { hydrated, state, error } = useBrowserState();
  const [resetError, setResetError] = useState("");
  function reset() {
    if (
      !window.confirm(
        "Delete CredBuilt demo sessions, bookmarks, and lesson progress on this website? This cannot be undone.",
      )
    )
      return;
    try {
      resetBrowserDemo();
      resetLearning();
      setResetError("");
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Reset failed.");
    }
  }
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">NO ACCOUNT REQUIRED</div>
      <h1>
        Browser demo settings<span className="orange">.</span>
      </h1>
      <p className="lead">
        A demonstration on this browser, without Clerk, a database, or
        server-side progress storage.
      </p>
      <section className="card settings-card">
        <h2>Your progress stays here.</h2>
        <p>
          Answers, bookmarks, confidence, and history are saved in this
          browser’s site storage. They are not uploaded to the application
          server. Clearing site data, changing the website address, using
          another browser, or leaving private browsing loses access to this
          progress. Anyone using the same browser profile can see it. Do not
          enter private or sensitive information.
        </p>
        <p>
          <Link className="text-link" href="/admin">
            Inspect content review requirements
          </Link>
        </p>
        <dl>
          <div>
            <dt>Accounts / cross-device sync</dt>
            <dd>Not provided</dd>
          </div>
          <div>
            <dt>Database / Clerk</dt>
            <dd>Not used in browser demo</dd>
          </div>
          <div>
            <dt>Saved sessions</dt>
            <dd>
              {hydrated && state
                ? `${state.sessions.length} / 100`
                : "Not available yet"}
            </dd>
          </div>
          <div>
            <dt>Question bank</dt>
            <dd>12 unverified AI-generated demo drafts</dd>
          </div>
          <div>
            <dt>Scoring</dt>
            <dd>Demonstration only; inspectable and editable in the browser</dd>
          </div>
        </dl>
        <p>
          No official exam questions, approved instruction, protected exam
          scoring, content publishing, or real accounts are provided. Lessons
          and short exam rehearsals are demonstrations; the full 200-question
          simulation, flashcards, and planner remain unavailable.
        </p>
        {(error || resetError) && (
          <p className="error" role="alert">
            {resetError || error}
          </p>
        )}
        <button
          className="button secondary"
          disabled={!hydrated}
          onClick={reset}
        >
          Reset browser demo
        </button>
      </section>
    </div>
  );
}
