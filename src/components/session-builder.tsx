"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, SlidersHorizontal, Info, ShieldAlert } from "lucide-react";
import { useHydrated } from "./use-hydrated";
import { domains } from "@/modules/catalog/blueprint";
import { sessionConfigSchema } from "@/modules/practice/engine";
import type { PerformanceQuestion } from "@/modules/performance/dto";
export function SessionBuilder({
  available,
  inventory,
  browserOnly = false,
  initialDomain = "all",
  initialTopic = "all",
  initialCount = 25,
}: {
  available: boolean;
  inventory: PerformanceQuestion[];
  browserOnly?: boolean;
  initialDomain?: string;
  initialTopic?: string;
  initialCount?: number;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [count, setCount] = useState(initialCount);
  const [mode, setMode] = useState("adaptive");
  const [domain, setDomain] = useState(initialDomain);
  const [topic, setTopic] = useState(initialTopic);
  const [minutes, setMinutes] = useState(10);
  const [prioritizeMissed, setPrioritizeMissed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const topics = [
    ...new Set(
      inventory
        .filter((q) => domain === "all" || q.domain === domain)
        .map((q) => q.topic),
    ),
  ];
  const eligible = inventory.filter(
    (q) =>
      (domain === "all" || q.domain === domain) &&
      (topic === "all" || q.topic === topic),
  ).length;
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
          <strong>Demonstration question bank</strong>
          <p>
            {inventory.length} distinct original AI-generated drafts available
            here. Sources and CHST alignment have not been verified. Focused
            sets of 1, 3, or 5 help you explore the small bank; larger sets need
            more distinct content.
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
              1 / 3 / 5 are short demonstration sets. Questions are never
              duplicated.
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
                }}
              >
                <option value="all">All four domains</option>
                {domains.map((d) => (
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
          </div>
          {timed && (
            <label className="duration-field">
              Demonstration duration (minutes)
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
                ? "This is a short unverified demo rehearsal, not a full CHST simulation. Feedback stays hidden until submission; the browser clock and scores are inspectable."
                : "Instant explanations are on. Your first checked answer is final; start a new session to retry."}
            </span>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button primary"
            type="submit"
            disabled={busy || !available || !hydrated}
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
                  ? "Demo exam rehearsal"
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
              <dd>{timed ? `${minutes} min (demo)` : "Untimed"}</dd>
            </div>
            <div>
              <dt>Content</dt>
              <dd>Unverified demo</dd>
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
            readiness prediction. Browser demo progress stays on this device and
            website address.
          </p>
        </aside>
      </div>
    </div>
  );
}
