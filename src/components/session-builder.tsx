"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, SlidersHorizontal, Info, ShieldAlert } from "lucide-react";
import { useHydrated } from "./use-hydrated";
import { domains } from "@/modules/catalog/blueprint";
export function SessionBuilder({ available }: { available: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [count, setCount] = useState(25);
  const [mode, setMode] = useState("adaptive");
  const [domain, setDomain] = useState("all");
  const [prioritizeMissed, setPrioritizeMissed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          config: { count, mode, domain, prioritizeMissed },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      router.push(`/practice/${data.id}`);
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
          <p>
            A focused set. Clear explanations. Progress you can come back to.
          </p>
        </div>
      </div>
      <div className="notice">
        <ShieldAlert size={20} />
        <div>
          <strong>Demonstration question bank</strong>
          <p>
            12 original AI-generated drafts. Sources and CHST alignment have not
            been verified. This is not an approved instructional bank.
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
          </div>
          <fieldset>
            <legend>How many questions?</legend>
            <div className="count-options">
              {[10, 25, 50, 100, 200].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setCount(n)}
                  aria-pressed={count === n}
                  className={count === n ? "selected" : ""}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>How would you like to practice?</legend>
            <div className="mode-options">
              {[
                [
                  "adaptive",
                  "Adaptive",
                  "Prioritize learning gaps using a transparent rule-based score.",
                ],
                [
                  "learning",
                  "Learning",
                  "A varied question set, with immediate feedback.",
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
          <label className="field-label" htmlFor="domain">
            Focus domain
          </label>
          <select
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="all">All four domains</option>
            {domains.map((d) => (
              <option key={d.code} value={d.code}>
                Domain {d.code} — {d.short}
              </option>
            ))}
          </select>
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
              Instant explanations are on. Timed practice and the exam simulator
              are scheduled for a later milestone.
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
              <dd>{count}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{mode === "adaptive" ? "Adaptive" : "Learning"}</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>{domain === "all" ? "All domains" : `Domain ${domain}`}</dd>
            </div>
            <div>
              <dt>Feedback</dt>
              <dd>Instant</dd>
            </div>
            <div>
              <dt>Missed priority</dt>
              <dd>{prioritizeMissed ? "On" : "Off"}</dd>
            </div>
            <div>
              <dt>Content</dt>
              <dd>Unverified demo</dd>
            </div>
          </dl>
          <div className="summary-tip">
            <strong>Start with 10.</strong>
            <p>
              The demo bank holds 12 questions (3 per domain). Choose 10 and all
              domains to try a complete session. Larger or narrower sets are
              blocked until enough distinct content exists.
            </p>
          </div>
          <p className="fine-print">
            Adaptive v1 ranks recent misses, repeated errors, low confidence,
            and time since review. It is an experimental recommendation, not an
            exam-readiness prediction.
          </p>
        </aside>
      </div>
    </div>
  );
}
