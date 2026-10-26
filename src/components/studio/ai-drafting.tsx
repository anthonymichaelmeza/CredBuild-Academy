"use client";
import { useState } from "react";
import { chstDomains, chstObjectives } from "@/modules/curriculum/catalog";
import { buildQuestionDraftingBrief } from "@/modules/studio/ai-drafting";
import { Field } from "./fields";
import { QuestionDraftingJobs } from "./drafting-jobs";

export function QuestionDrafting({
  busy,
  onPrepareBatch,
}: {
  busy: boolean;
  onPrepareBatch: (text: string) => Promise<void>;
}) {
  const [domain, setDomain] = useState("1");
  const [objective, setObjective] = useState(chstObjectives[0].id);
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<
    "introductory" | "intermediate" | "advanced"
  >("intermediate");
  const [reference, setReference] = useState("");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  return (
    <div className="studio-main">
      <section className="card studio-panel">
        <div className="eyebrow">
          AI-ASSISTED AUTHORING · HUMAN REVIEW REQUIRED
        </div>
        <h2>Prepare original question drafts.</h2>
        <p>
          Build an objective-specific drafting brief for your chosen AI tool,
          then validate its JSON in Question import. No model is connected and
          no prompt is sent automatically. This workspace never approves
          material.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            try {
              setBrief(
                buildQuestionDraftingBrief({
                  objectiveCode: objective,
                  topic,
                  subtopic,
                  count,
                  difficulty,
                  candidateReference: reference,
                }),
              );
            } catch {
              setError(
                "Choose a canonical objective, topic, and 1–50 questions.",
              );
            }
          }}
        >
          <div className="studio-field-grid">
            <Field label="Drafting domain">
              <select
                value={domain}
                onChange={(event) => {
                  setDomain(event.target.value);
                  setObjective(
                    chstObjectives.find(
                      (item) => item.domain === event.target.value,
                    )!.id,
                  );
                  setBrief("");
                }}
              >
                {chstDomains.map((item) => (
                  <option key={item.code} value={item.code}>
                    Domain {item.code} — {item.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Drafting blueprint objective">
              <select
                value={objective}
                onChange={(event) => {
                  setObjective(event.target.value);
                  setBrief("");
                }}
              >
                {chstObjectives
                  .filter((item) => item.domain === domain)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id.split("-").at(-1)} — {item.statement}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Drafting topic">
              <input
                required
                maxLength={300}
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setBrief("");
                }}
              />
            </Field>
            <Field label="Drafting subtopic">
              <input
                maxLength={300}
                value={subtopic}
                onChange={(event) => {
                  setSubtopic(event.target.value);
                  setBrief("");
                }}
              />
            </Field>
            <Field label="Drafting question count">
              <input
                type="number"
                min={1}
                max={50}
                required
                value={count}
                onChange={(event) => {
                  setCount(Number(event.target.value));
                  setBrief("");
                }}
              />
            </Field>
            <Field label="Drafting difficulty">
              <select
                value={difficulty}
                onChange={(event) => {
                  setDifficulty(event.target.value as typeof difficulty);
                  setBrief("");
                }}
              >
                <option value="introductory">Foundational</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
          </div>
          <Field
            label="Candidate reference notes"
            hint="Supply titles and exact locators only when known. Do not paste restricted publications or confidential information."
          >
            <textarea
              maxLength={4000}
              rows={4}
              value={reference}
              onChange={(event) => {
                setReference(event.target.value);
                setBrief("");
              }}
            />
          </Field>
          <button className="button primary" disabled={busy} type="submit">
            Prepare AI drafting brief
          </button>
        </form>
        {brief && (
          <Field
            label="Generated AI drafting brief"
            hint="Copy this brief into your chosen AI tool. Return JSON to Question import; every result remains an unverified draft."
          >
            <textarea
              readOnly
              rows={14}
              value={brief}
              onFocus={(event) => event.target.select()}
            />
          </Field>
        )}
      </section>
      <section className="card studio-panel">
        <div className="eyebrow">DOMAIN 1 · INITIAL CONTENT BATCH</div>
        <h2>50 original drafts awaiting technical review.</h2>
        <p>
          Construction scenarios covering hazard identification, job hazard
          analysis, risk assessment, controls, excavations, falls, electrical
          work, cranes, mobile equipment, confined spaces, hazardous energy, and
          industrial hygiene.
        </p>
        <div className="notice compact-notice">
          <p>
            <strong>Unverified candidate citations.</strong> Source retrieval
            was blocked by the development environment. These are provisional AI
            drafts, not reference-verified instructional material. Importing
            does not change production exam readiness.
          </p>
        </div>
        <div className="studio-actions">
          <button
            className="button primary"
            disabled={busy || preparing}
            onClick={async () => {
              if (preparing) return;
              setPreparing(true);
              setError("");
              try {
                const response = await fetch("/api/studio/questions/drafts", {
                  cache: "no-store",
                  credentials: "same-origin",
                });
                const data = await response.json();
                if (!response.ok)
                  throw new Error(
                    data.error || "The draft batch could not be loaded.",
                  );
                await onPrepareBatch(JSON.stringify(data));
              } catch (caught) {
                setError(
                  caught instanceof Error
                    ? caught.message
                    : "The draft batch could not be loaded.",
                );
              } finally {
                setPreparing(false);
              }
            }}
          >
            {preparing
              ? "Preparing draft preview…"
              : "Preview 50 Domain 1 drafts"}
          </button>
          <a
            className="button secondary"
            href="/api/studio/questions/drafts"
            download="credbuilt-domain1-batch001-unverified-drafts.json"
          >
            Download draft batch JSON
          </a>
        </div>
        <p className="studio-help">
          The preview checks schema, exact blueprint mapping, duplicate stems,
          and imported IDs before an administrator explicitly confirms. Existing
          questions and reviews are preserved.
        </p>
      </section>
      <QuestionDraftingJobs />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
