"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  EditorialSnapshot,
  EditorialItem,
} from "@/modules/studio/editorial-model";
import { Field } from "./studio/fields";
const emptyChecks = {
  clarity: false,
  originality: false,
  distractors: false,
  answerClues: false,
  rights: false,
};
export function QuestionQualityStudio({
  initial,
}: {
  initial: EditorialSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<EditorialSnapshot | null>(initial),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!snapshot)
    return (
      <div className="page-wrap narrow">
        <h1>Editorial access has ended.</h1>
        <p>
          Sign in with an authorized reviewer account and reload. Private
          content has been cleared from this workspace.
        </p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
      </div>
    );
  const items = snapshot.items.filter((item) =>
    `${item.id} ${item.data.title} ${item.data.topic} ${item.data.objectiveCode} ${item.stage}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const item = snapshot.items.find((item) => item.id === selected);
  const report = snapshot.quality;
  return (
    <div className="page-wrap studio-page">
      <div className="eyebrow">
        CREDBUILT QUALITY &amp; HUMAN EDITORIAL REVIEW
      </div>
      <h1>
        Examine the wording. Record the decision
        <span className="orange">.</span>
      </h1>
      <p className="lead">
        Draft → Source Check → Technical Review → Editorial Review → Approved →
        Published. Only an authorized human can record editorial approval.
      </p>
      <div className="studio-actions">
        <Link className="button secondary" href="/studio/questions">
          Question Bank
        </Link>
        <Link className="button secondary" href="/studio/questions/production">
          Content production
        </Link>
        <Link className="button secondary" href="/studio/research">
          Source research
        </Link>
      </div>
      <section className="notice compact-notice">
        <p>
          <strong>Flags need human judgment.</strong> These are mechanical
          checks and wording-similarity candidates. They do not verify answers,
          identify plagiarism, resolve source conflicts or establish regulatory
          currency. Sources and technical accuracy require their own reviews.
        </p>
      </section>
      {snapshot.access.localDevelopment && (
        <p className="notice compact-notice">
          Isolated development reviewer identity; this is not live provider
          validation.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="card studio-panel">
        <h2>Question writing checks</h2>
        <p>
          {report.inspected} current questions inspected · {report.errorCount}{" "}
          blocking structure/mapping issues · {report.warningCount} review flags
          · {report.duplicates.length} duplicate candidates
        </p>
        <p>
          Authored answer positions: A {report.answerPositions.a} · B{" "}
          {report.answerPositions.b} · C {report.answerPositions.c} · D{" "}
          {report.answerPositions.d}. The correct answer is uniquely longest in{" "}
          {report.longestCorrect} of {report.validQuestions} valid question
          records. Examination presentation is randomized separately.
        </p>
        {(snapshot.truncated || report.comparisonLimitReached) && (
          <p className="notice compact-notice">
            The bounded report reached an inventory or comparison limit. No
            claim of exhaustive duplicate detection is made. Narrow the content
            batch for further examination.
          </p>
        )}
        <p className="studio-help">
          Near duplicates use token overlap ≥82%, with at least eight meaningful
          tokens and a bounded comparison budget. Semantic duplication and
          source currency remain human review tasks.
        </p>
      </section>
      <Field label="Search quality and editorial content">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Title, topic, objective, ID or review stage"
        />
      </Field>
      <div className="studio-layout">
        <aside
          className="card studio-sidebar"
          aria-label="Quality and editorial content library"
        >
          <p>{items.length} matching records</p>
          <ul className="studio-list">
            {items.slice(0, 100).map((entry) => (
              <li key={entry.id}>
                <button
                  aria-pressed={selected === entry.id}
                  onClick={() => setSelected(entry.id)}
                >
                  <strong>{entry.data.title}</strong>
                  <small>
                    {entry.stage} · Domain {entry.data.domain} · Revision{" "}
                    {entry.revision}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {items.length > 100 && (
            <p className="studio-help">
              Showing the first 100 matches. Narrow the search to inspect
              another item.
            </p>
          )}
        </aside>
        <div className="studio-main">
          {item ? (
            <>
              <section className="card studio-panel">
                <div className="eyebrow">EXACT REVISION {item.revision}</div>
                <h2>{item.data.title}</h2>
                <p>
                  <strong>{item.stage}</strong>
                </p>
                <p>
                  {item.data.objectiveCode} · {item.data.topic} ·{" "}
                  {item.data.subtopic}
                </p>
                <p className="studio-help">
                  The legacy internal status “approved” records technical
                  approval. Final editorial approval is a separate,
                  revision-specific human decision required for every future
                  publication.
                </p>
                <Link
                  className="text-link"
                  href={`/studio?search=${encodeURIComponent(item.id)}`}
                >
                  Open immutable content, source evidence and revision history
                </Link>
                <ul>
                  {report.results
                    .find((result) => result.id === item.id)
                    ?.issues.map((issue, index) => (
                      <li key={`${issue.code}-${index}`}>
                        <strong>
                          {issue.severity === "error"
                            ? "Blocking check"
                            : "Review flag"}
                          :
                        </strong>{" "}
                        {issue.message}
                      </li>
                    ))}
                </ul>
                {item.data.kind === "question" && (
                  <>
                    <p>{item.data.body.stem}</p>
                    <ol type="A">
                      {item.data.body.choices.map((choice) => (
                        <li key={choice.id}>
                          <strong>{choice.text}</strong>
                          {choice.id ===
                          (item.data.kind === "question"
                            ? item.data.body.correctChoice
                            : null)
                            ? " — Intended key"
                            : ""}
                          <p>{choice.rationale}</p>
                        </li>
                      ))}
                    </ol>
                    <p>{item.data.body.explanation}</p>
                  </>
                )}
              </section>
              {item.canReview ? (
                <EditorialForm
                  key={`${item.revisionId}-${item.history[0]?.id || "new"}`}
                  item={item}
                  busy={busy}
                  onRecord={async (input) => {
                    setBusy(true);
                    setError("");
                    try {
                      const response = await fetch(
                          "/api/studio/questions/quality",
                          {
                            method: "POST",
                            credentials: "same-origin",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(input),
                          },
                        ),
                        data = await response.json();
                      if (!response.ok) {
                        if ([401, 403].includes(response.status)) {
                          setSnapshot(null);
                          setSelected(null);
                        }
                        throw new Error(
                          data.error ||
                            "The editorial decision could not be saved.",
                        );
                      }
                      setSnapshot(data);
                    } catch (caught) {
                      setError(
                        caught instanceof Error
                          ? caught.message
                          : "The editorial decision could not be saved.",
                      );
                      throw caught;
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ) : (
                <section className="card studio-panel">
                  <h3>Complete the preceding review stages.</h3>
                  <p>
                    Editorial decisions require an exact technically approved
                    revision and a trusted reviewer who has never contributed as
                    an author to this content. Administrator access alone does
                    not grant the reviewer role.
                  </p>
                </section>
              )}
              <section className="card studio-panel">
                <h3>Most recent editorial decisions for this revision</h3>
                {item.history.length ? (
                  <ol>
                    {item.history.map((event) => (
                      <li key={event.id}>
                        <strong>{event.decision.replaceAll("_", " ")}</strong> ·{" "}
                        {event.createdAt} · Reviewer {event.reviewerId}
                        <p>{event.findings}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No human editorial decision has been recorded.</p>
                )}
              </section>
            </>
          ) : (
            <section className="card studio-panel">
              <h2>Select content to inspect.</h2>
              <p>
                Source review, technical review and editorial review are
                separate. Imported drafts cannot skip them. A rejected editorial
                decision requires correction in a new draft revision.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
function EditorialForm({
  item,
  busy,
  onRecord,
}: {
  item: EditorialItem;
  busy: boolean;
  onRecord: (input: Record<string, unknown>) => Promise<void>;
}) {
  const [checks, setChecks] = useState({ ...emptyChecks }),
    [decision, setDecision] = useState("changes_requested"),
    [findings, setFindings] = useState(""),
    [attested, setAttested] = useState(false),
    [error, setError] = useState("");
  const labels = {
    clarity: "Clear wording and sufficient construction context",
    originality: "Original work; no copied examination or competitor questions",
    distractors:
      "Plausible, distinct distractors and choice-specific explanations",
    answerClues:
      "Answer length, positions and wording checked for unintended clues",
    rights: "Source attribution, applicability and distribution rights checked",
  };
  return (
    <form
      className="card studio-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setError("");
        try {
          if (!attested)
            throw new Error("An actual human review attestation is required.");
          await onRecord({
            id: item.id,
            revision: item.revision,
            rowVersion: item.rowVersion,
            editorialEvent: item.history[0]?.id || null,
            decision,
            findings,
            checks,
            humanAttestation: true,
          });
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Editorial review was not saved.",
          );
        }
      }}
    >
      <div className="eyebrow">SEPARATE HUMAN EDITORIAL REVIEW</div>
      <h2>Review presentation and originality.</h2>
      <p>
        Examine the exact source-checked, technically reviewed revision. These
        checks do not replace its technical evidence. A recorded decision is
        immutable.
      </p>
      {Object.entries(labels).map(([key, label]) => (
        <label className="studio-check-label" key={key}>
          <input
            type="checkbox"
            checked={checks[key as keyof typeof checks]}
            onChange={(event) =>
              setChecks({ ...checks, [key]: event.target.checked })
            }
          />
          {label}
        </label>
      ))}
      <Field label="Editorial decision">
        <select
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
        >
          <option value="changes_requested">
            Request a corrected revision
          </option>
          <option value="rejected">Reject this revision</option>
          <option value="approved">Approve editorial quality</option>
        </select>
      </Field>
      <Field label="Editorial findings">
        <textarea
          required
          maxLength={5000}
          value={findings}
          onChange={(event) => setFindings(event.target.value)}
          rows={5}
        />
      </Field>
      <label className="studio-check-label">
        <input
          type="checkbox"
          required
          checked={attested}
          onChange={(event) => setAttested(event.target.checked)}
        />
        I personally performed this editorial examination. This is my human
        decision, not an AI attestation.
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button
        className="button primary"
        disabled={
          busy ||
          !attested ||
          (decision === "approved" &&
            Object.values(checks).some((value) => !value))
        }
      >
        {busy
          ? "Saving editorial decision…"
          : "Record human editorial decision"}
      </button>
    </form>
  );
}
