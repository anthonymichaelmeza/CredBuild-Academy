"use client";
import { useState } from "react";
import { ShieldCheck, LockKeyhole } from "lucide-react";
import { demoQuestions } from "@/demo/questions";
import {
  approvalBlockers,
  transitionReview,
  type ReviewContent,
  type ReviewStatus,
} from "@/modules/content/review";
export function ContentReview() {
  const [id, setId] = useState(demoQuestions[0].id);
  const [target, setTarget] = useState<ReviewStatus>("approved");
  const [result, setResult] = useState("");
  const q = demoQuestions.find((q) => q.id === id)!;
  const content: ReviewContent = {
    id: q.id,
    revision: q.version,
    authorId: "demo-ai-draft",
    contentKind: "demonstration",
    status: target === "published" ? "approved" : "technical_review",
    blueprint: {
      version: "CHST5",
      domain: q.domain,
      objective: "",
      verified: false,
    },
    explanation: q.explanation,
    sources: [
      {
        title: q.reference.title,
        url: q.reference.url,
        section: "",
        edition: "",
        reviewedBy: null,
        reviewedAt: null,
        notes: "",
        supportsClaim: false,
      },
    ],
    review: null,
    events: [],
  };
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">CONTENT INTEGRITY / WORKFLOW INSPECTOR</div>
      <h1>
        Review before release<span className="orange">.</span>
      </h1>
      <p className="lead">
        Inspect the real quality gates. This public demo cannot assign roles,
        certify a source, change review status, or publish material.
      </p>
      <div className="review-stages">
        {["Draft", "Technical review", "Approved", "Published", "Retired"].map(
          (s, i) => (
            <span key={s}>
              <small>0{i + 1}</small>
              {s}
            </span>
          ),
        )}
      </div>
      <div className="notice compact-notice">
        <LockKeyhole size={20} />
        <p>
          Production administration stays locked. This inspector uses a
          hypothetical transition to explain rejection rules; the actual draft
          and production bank are unchanged.
        </p>
      </div>
      <section className="card">
        <label className="field-label" htmlFor="review-question">
          Inspect demonstration question
        </label>
        <select
          id="review-question"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setResult("");
          }}
        >
          {demoQuestions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.id} — {q.topic}
            </option>
          ))}
        </select>
        <h2 className="review-question-title">{q.stem}</h2>
        <span className="neutral-badge">
          Actual status: draft · AI-generated demonstration
        </span>
        <dl>
          <div>
            <dt>Domain</dt>
            <dd>{q.domain}</dd>
          </div>
          <div>
            <dt>Blueprint objective</dt>
            <dd>Unverified / not assigned</dd>
          </div>
          <div>
            <dt>Source review</dt>
            <dd>Not performed</dd>
          </div>
          <div>
            <dt>Independent review record</dt>
            <dd>Missing</dd>
          </div>
          <div>
            <dt>Explanation</dt>
            <dd>Present as unreviewed draft</dd>
          </div>
        </dl>
        <h3 className="review-question-title">What blocks approval?</h3>
        <ul className="quality-blockers">
          {approvalBlockers(content).map((b) => (
            <li key={b}>
              <ShieldCheck size={17} />
              {b}
            </li>
          ))}
        </ul>
        <label className="field-label" htmlFor="review-target">
          Check a hypothetical gate
        </label>
        <select
          id="review-target"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value as ReviewStatus);
            setResult("");
          }}
        >
          <option value="approved">Technical review → Approved</option>
          <option value="published">Approved → Published</option>
        </select>
        <button
          className="button secondary"
          onClick={() => {
            try {
              transitionReview(content, target, {
                id: "demo-reviewer",
                role: target === "published" ? "administrator" : "reviewer",
              });
              setResult("No changes made. This is a gate inspection only.");
            } catch (e) {
              setResult((e as Error).message);
            }
          }}
        >
          Inspect gate — no changes
        </button>
        {result && (
          <p className="error" role="status">
            Blocked: {result}
          </p>
        )}
      </section>
      <p className="demo-disclosure">
        The tested workflow engine preserves review records by revision and
        appends transition events. A complete authenticated editor, role
        management, and connection of this policy to production publication are
        still required. Existing database publication constraints remain in
        place and public mutation endpoints deny access.
      </p>
    </div>
  );
}
