"use client";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, SlidersHorizontal, Info, ShieldAlert } from "lucide-react";
import { useHydrated } from "./use-hydrated";
import { domains } from "@/modules/catalog/blueprint";
import {
  eligibleQuestions,
  selectionHistory,
  sessionConfigSchema,
} from "@/modules/practice/engine";
import type {
  PerformanceQuestion,
  PerformanceSession,
} from "@/modules/performance/dto";
import type { PracticeBank } from "@/modules/practice/types";
import {
  browserSnapshot,
  parseBrowserSnapshot,
  subscribeBrowserDemo,
} from "@/demo/browser-store";
import { getChstObjective } from "@/modules/curriculum/catalog";
const noSubscribe = () => () => {};
const noSnapshot = () => null;
export function SessionBuilder({
  available,
  inventory,
  browserOnly = false,
  initialDomain = "all",
  initialTopic = "all",
  initialCount = 25,
  initialObjective = "all",
  initialDifficulty = "all",
  initialAnswered = "all",
  initialReview = "all",
  bank = "demonstration",
  certification = "chst",
  certificationOptions = ["chst"],
  saved = [],
  marked = [],
}: {
  available: boolean;
  inventory: PerformanceQuestion[];
  browserOnly?: boolean;
  initialDomain?: string;
  initialTopic?: string;
  initialCount?: number;
  initialObjective?: string;
  initialDifficulty?: string;
  initialAnswered?: string;
  initialReview?: string;
  bank?: PracticeBank;
  certification?: string;
  certificationOptions?: string[];
  saved?: PerformanceSession[];
  marked?: string[];
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [count, setCount] = useState(initialCount);
  const [mode, setMode] = useState("adaptive");
  const [domain, setDomain] = useState(initialDomain);
  const [topic, setTopic] = useState(initialTopic);
  const [objective, setObjective] = useState(initialObjective);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [answeredFilter, setAnsweredFilter] = useState(initialAnswered);
  const [reviewFilter, setReviewFilter] = useState(initialReview);
  const [minutes, setMinutes] = useState(10);
  const [prioritizeMissed, setPrioritizeMissed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const raw = useSyncExternalStore(
    browserOnly ? subscribeBrowserDemo : noSubscribe,
    browserOnly ? browserSnapshot : noSnapshot,
    noSnapshot,
  );
  let learnerSessions = saved;
  let learnerBookmarks = marked;
  let historyError = "";
  if (browserOnly) {
    try {
      const state = parseBrowserSnapshot(raw);
      learnerSessions = state.sessions;
      learnerBookmarks = state.bookmarks;
    } catch (caught) {
      historyError =
        caught instanceof Error
          ? caught.message
          : "Saved history is unavailable.";
    }
  }
  const history = selectionHistory(learnerSessions);
  const topics = [
    ...new Set(
      inventory
        .filter((q) => domain === "all" || q.domain === domain)
        .map((q) => q.topic),
    ),
  ];
  const filterConfig = {
    bank,
    certification,
    domain,
    topic,
    ...(objective !== "all" ? { objective } : {}),
    ...(["introductory", "intermediate", "advanced"].includes(difficulty)
      ? {
          difficulty: difficulty as
            "introductory" | "intermediate" | "advanced",
        }
      : {}),
    answered: answeredFilter as "all" | "answered" | "unanswered",
    review: reviewFilter as "all" | "missed" | "bookmarked",
  };
  const eligible = eligibleQuestions(
    inventory,
    filterConfig,
    history,
    learnerBookmarks,
  ).length;
  const objectiveIds = [
    ...new Set(
      inventory
        .filter((q) => domain === "all" || q.domain === domain)
        .flatMap((q) =>
          q.blueprint?.objective ? [q.blueprint.objective] : [],
        ),
    ),
  ];
  const timed = mode === "timed" || mode === "exam";
  async function start() {
    setBusy(true);
    setError("");
    try {
      const config = sessionConfigSchema.parse({
        count,
        mode,
        domain,
        topic,
        prioritizeMissed,
        ...(bank !== "demonstration" ? { bank, certification } : {}),
        ...(objective !== "all" ? { objective } : {}),
        ...(difficulty !== "all" ? { difficulty } : {}),
        ...(answeredFilter !== "all" ? { answered: answeredFilter } : {}),
        ...(reviewFilter !== "all" ? { review: reviewFilter } : {}),
        ...(timed ? { durationSeconds: minutes * 60 } : {}),
      });
      let id: string;
      if (browserOnly) {
        const { createBrowserSession } = await import("@/demo/browser-store");
        id = createBrowserSession(config);
      } else {
        const r = await fetch("/api/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", config }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        id = data.id;
      }
      router.push(`/practice/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start session.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-wrap narrow">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PRACTICE WITH PURPOSE</div>
          <h1>
            Build your next session<span className="orange">.</span>
          </h1>
          <p>Choose a focus, set your pace, and make the feedback count.</p>
        </div>
      </div>
      <div className="notice compact-notice">
        <ShieldAlert size={20} />
        <div>
          <strong>
            {bank === "published"
              ? "Published instructional bank"
              : bank === "curriculum_drafts"
                ? "CHST5 curriculum drafts · unreviewed demonstration"
                : "Demonstration question bank"}
          </strong>
          <p>
            {bank === "published"
              ? `${inventory.length} distinct questions are currently published after independent source review. Availability is checked again when your session starts. This is independent preparation, not an official examination.`
              : bank === "curriculum_drafts"
                ? `${inventory.length} original AI-generated drafts mapped to the supplied 2022.04.12 blueprint statements. Their answers, technical sources and instructional accuracy are unreviewed. This browser-only bank is excluded from connected production study. It is not a complete CHST examination.`
                : `${inventory.length} distinct original AI-generated drafts available here. Sources and CHST alignment have not been verified. Focused sets of 1, 3, or 5 help you explore the small bank; larger sets need more distinct content.`}
          </p>
        </div>
      </div>
      <div className="builder-grid">
        <form
          className="card builder"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <div className="card-heading">
            <h2>
              <SlidersHorizontal size={20} />
              Session configuration
            </h2>
            <span className="neutral-badge">{eligible} eligible questions</span>
          </div>
          <fieldset>
            <legend>How many questions?</legend>
            <div className="count-options expanded">
              {[1, 3, 5, 10, 25, 50, 100, 200].map((n) => (
                <button
                  type="button"
                  key={n}
                  disabled={!hydrated}
                  onClick={() => setCount(n)}
                  aria-pressed={count === n}
                  className={count === n ? "selected" : ""}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="fine-print">
              {bank === "published"
                ? "Short focused sets are available when the bank is small. Questions are never duplicated."
                : "1 / 3 / 5 are short demonstration sets. Questions are never duplicated."}
            </p>
          </fieldset>
          <fieldset>
            <legend>How would you like to practice?</legend>
            <div className="mode-options">
              {[
                [
                  "adaptive",
                  "Adaptive",
                  "Prioritize misses, low confidence, and time since review.",
                ],
                [
                  "learning",
                  "Learning",
                  "Untimed practice with immediate explanations.",
                ],
                [
                  "timed",
                  "Timed practice",
                  "A countdown and immediate feedback; first checked answers are final.",
                ],
                [
                  "exam",
                  "Exam rehearsal",
                  "Autosave answers, change choices, and reveal explanations after submission.",
                ],
              ].map(([value, label, text]) => (
                <label
                  key={value}
                  className={
                    mode === value ? "mode-option selected" : "mode-option"
                  }
                >
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>{text}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field-grid">
            {bank === "published" && (
              <div>
                <label className="field-label" htmlFor="certification">
                  Certification
                </label>
                <select
                  id="certification"
                  value={certification}
                  onChange={(event) =>
                    router.push(
                      `/practice?bank=published&certification=${encodeURIComponent(event.target.value)}`,
                    )
                  }
                >
                  {certificationOptions.map((id) => (
                    <option key={id} value={id}>
                      {id.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="domain">
                Focus domain
              </label>
              <select
                id="domain"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setTopic("all");
                  setObjective("all");
                }}
              >
                <option value="all">
                  {bank === "published"
                    ? "All published domains"
                    : "All four domains"}
                </option>
                {bank === "published"
                  ? [...new Set(inventory.map((q) => q.domain))].map((code) => (
                      <option key={code} value={code}>
                        Domain {code}
                      </option>
                    ))
                  : domains.map((d) => (
                      <option key={d.code} value={d.code}>
                        Domain {d.code} — {d.short}
                      </option>
                    ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="topic">
                Focus topic
              </label>
              <select
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="all">All topics</option>
                {topics.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="objective">
                Focus objective
              </label>
              <select
                id="objective"
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
              >
                <option value="all">All mapped objectives</option>
                {objective !== "all" && !objectiveIds.includes(objective) && (
                  <option value={objective}>
                    {objective} · no eligible questions
                  </option>
                )}
                {objectiveIds.map((id) => (
                  <option key={id} value={id}>
                    {getChstObjective(id)?.statement || id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="difficulty">
                Difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="all">All difficulties</option>
                <option value="introductory">Foundational</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced reasoning</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="answer-history">
                Answer history
              </label>
              <select
                id="answer-history"
                value={answeredFilter}
                onChange={(event) => setAnsweredFilter(event.target.value)}
              >
                <option value="all">All questions</option>
                <option value="answered">Previously answered</option>
                <option value="unanswered">Not answered before</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="review-selection">
                Review selection
              </label>
              <select
                id="review-selection"
                value={reviewFilter}
                onChange={(event) => setReviewFilter(event.target.value)}
              >
                <option value="all">All eligible questions</option>
                <option value="missed">Previously missed questions</option>
                <option value="bookmarked">Bookmarked questions</option>
              </select>
            </div>
          </div>
          {timed && (
            <label className="duration-field">
              {bank === "published"
                ? "Practice duration (minutes)"
                : "Demonstration duration (minutes)"}
              <input
                type="number"
                min={1}
                max={240}
                step={1}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                required
              />
              <small>
                Your choice, not a verified BCSP exam duration. Expired sessions
                submit on the open page or when reopened.
              </small>
            </label>
          )}
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={prioritizeMissed}
              onChange={(e) => setPrioritizeMissed(e.target.checked)}
            />
            Prioritize previously missed questions
          </label>
          <div className="soft-note">
            <Info size={16} />
            <span>
              {mode === "exam"
                ? bank === "published"
                  ? "This practice rehearsal uses a duration you choose. It is not a full official CHST simulation. Feedback stays hidden until submission; server deadlines enforce the saved duration."
                  : "This is a short unverified demo rehearsal, not a full CHST simulation. Feedback stays hidden until submission; the browser clock and scores are inspectable."
                : "Instant explanations are on. Your first checked answer is final; start a new session to retry."}
            </span>
          </div>
          {(error || historyError) && (
            <p className="error" role="alert">
              {error || historyError}
            </p>
          )}
          <button
            className="button primary"
            type="submit"
            disabled={busy || !available || !hydrated || Boolean(historyError)}
          >
            {busy ? "Preparing your session…" : "Start session"}
            <ArrowRight size={17} />
          </button>
          {!available && (
            <p className="error">
              Sign in from Account Settings, or configure local demo mode.
            </p>
          )}
        </form>
        <aside className="card session-summary">
          <div className="eyebrow">YOUR PLAN</div>
          <h2>A little focus goes a long way.</h2>
          <dl>
            <div>
              <dt>Questions</dt>
              <dd>
                {count} / {eligible} eligible
              </dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>
                {mode === "exam"
                  ? bank === "published"
                    ? "Practice exam rehearsal"
                    : "Demo exam rehearsal"
                  : mode === "timed"
                    ? "Timed practice"
                    : mode === "adaptive"
                      ? "Adaptive"
                      : "Learning"}
              </dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>{domain === "all" ? "All domains" : `Domain ${domain}`}</dd>
            </div>
            <div>
              <dt>Topic</dt>
              <dd>{topic === "all" ? "Mixed topics" : topic}</dd>
            </div>
            <div>
              <dt>Feedback</dt>
              <dd>{mode === "exam" ? "After submission" : "Instant"}</dd>
            </div>
            <div>
              <dt>Timer</dt>
              <dd>
                {timed
                  ? `${minutes} min${bank === "published" ? "" : " (demo)"}`
                  : "Untimed"}
              </dd>
            </div>
            <div>
              <dt>Content</dt>
              <dd>
                {bank === "published"
                  ? "Published instruction"
                  : "Unverified demo"}
              </dd>
            </div>
          </dl>
          <div className="summary-tip">
            <strong>
              {count > eligible
                ? "This set needs more questions."
                : "Your focus is ready."}
            </strong>
            <p>
              {count > eligible
                ? `Only ${eligible} distinct items match. Choose a smaller size or broaden your filters. The default 25-question request is intentionally blocked.`
                : "Use your results to find a related lesson, revisit missed concepts, and try another short set."}
            </p>
          </div>
          <p className="fine-print">
            Adaptive recommendations are transparent rules, not a validated
            readiness prediction.{" "}
            {browserOnly
              ? "Browser demo progress stays on this device and website address."
              : "Connected practice progress saves to your learner identity."}
          </p>
        </aside>
      </div>
    </div>
  );
}
