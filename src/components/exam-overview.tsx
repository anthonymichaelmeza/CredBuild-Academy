"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Timer } from "lucide-react";
import { fullExamBlockers, fullExamPolicy } from "@/modules/exams/policy";
export function ExamOverview({ browserOnly }: { browserOnly: boolean }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(10);
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      const { createBrowserSession } = await import("@/demo/browser-store");
      const id = createBrowserSession({
        count,
        mode: "exam",
        domain: "all",
        durationSeconds: minutes * 60,
        prioritizeMissed: false,
      });
      router.push(`/practice/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            PRACTICE THE EXPERIENCE, NOT AN OFFICIAL EXAM
          </div>
          <h1>
            Get comfortable with exam day<span className="orange">.</span>
          </h1>
          <p>
            A short rehearsal today. A complete simulation when the reviewed
            bank is ready.
          </p>
        </div>
      </div>
      <div className="exam-overview-grid">
        <section className="card rehearsal-card">
          <Timer size={29} />
          <h2>A short demo rehearsal</h2>
          <p>
            Try the countdown, autosave, question navigator, flags, answer
            changes, and end-of-session review. Explanations stay hidden until
            submission.
          </p>
          <div className="field-grid">
            <label className="field-label">
              Demo questions
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                <option value={5}>5 distinct questions</option>
                <option value={10}>10 distinct questions</option>
              </select>
            </label>
            <label className="field-label">
              Demo minutes
              <input
                type="number"
                min={1}
                max={240}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="notice compact-notice">
            <p>
              <strong>This is not a full CHST simulation.</strong> It uses
              unverified demonstration content and a duration you choose.
              Browser time, answers, and scores are inspectable and editable. An
              inactive or closed browser finalizes on reopening; no server
              background scheduler is used.
            </p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {browserOnly ? (
            <button
              className="button primary"
              disabled={
                busy ||
                !Number.isInteger(minutes) ||
                minutes < 1 ||
                minutes > 240
              }
              onClick={() => void start()}
            >
              {busy ? "Preparing…" : "Start demo rehearsal"}
              <ArrowRight size={17} />
            </button>
          ) : (
            <Link className="button primary" href="/practice">
              Configure an exam rehearsal
              <ArrowRight size={17} />
            </Link>
          )}
        </section>
        <section className="card full-exam-gate">
          <LockKeyhole size={28} />
          <span className="eyebrow">FULL-LENGTH CHST PREPARATION</span>
          <h2>Not available yet</h2>
          <p>
            The architecture supports a 200-question policy, versioned domain
            allocation, pinned session questions, deadlines, autosave,
            submission, and results. The full exam cannot start until its
            content and timing gates pass.
          </p>
          <div className="result-domain">
            <span>Reviewed production pool</span>
            <strong>0 / 200</strong>
          </div>
          {fullExamPolicy.allocation.map((n, i) => (
            <div className="result-domain" key={i}>
              <span>Domain {i + 1} · provisional allocation</span>
              <strong>{n} questions</strong>
            </div>
          ))}
          <details>
            <summary>What is still required?</summary>
            <ul>
              {fullExamBlockers([0, 0, 0, 0], null).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </details>
          <p className="fine-print">
            Current domain headings/weights are user-supplied CHST5 data, not
            independently verified. No passing score or official duration is
            fabricated.
          </p>
        </section>
      </div>
    </div>
  );
}
