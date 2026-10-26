"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { chstObjectives } from "@/modules/curriculum/catalog";
import type { ResearchSnapshot } from "@/modules/research/model";
import type {
  DraftingJobsSnapshot,
  QuestionDraftingJob,
} from "@/modules/studio/drafting-jobs";
import { Field } from "./fields";

/** Private planning records. This component never invokes an AI provider. */
export function QuestionDraftingJobs() {
  const [snapshot, setSnapshot] = useState<DraftingJobsSnapshot | null>(null),
    [inventory, setInventory] = useState<ResearchSnapshot | null>(null);
  const [page, setPage] = useState(1),
    [sourcePage, setSourcePage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [objectiveId, setObjectiveId] = useState(chstObjectives[0].id),
    [count, setCount] = useState(5),
    [difficulty, setDifficulty] = useState("intermediate"),
    [sourceText, setSourceText] = useState("");
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const requestKey = useRef<string | null>(null),
    pending = useRef(false),
    mounted = useRef(true),
    readTracker = useRef({ epoch: 0 });
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const epoch = ++readTracker.current.epoch;
      const [jobsResponse, sourceResponse] = await Promise.all([
        fetch(`/api/studio/drafting-jobs?page=${page}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal,
        }),
        fetch(`/api/studio/research?page=${sourcePage}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal,
        }),
      ]);
      const [jobs, sources] = await Promise.all([
        jobsResponse.json(),
        sourceResponse.json(),
      ]);
      if (
        signal?.aborted ||
        !mounted.current ||
        epoch !== readTracker.current.epoch
      )
        return;
      if (!jobsResponse.ok || !sourceResponse.ok) {
        if (
          [401, 403].includes(jobsResponse.status) ||
          [401, 403].includes(sourceResponse.status)
        ) {
          setSnapshot(null);
          setInventory(null);
        }
        throw new Error(
          jobs.error ||
            sources.error ||
            "Private drafting records could not be loaded.",
        );
      }
      setSnapshot(jobs);
      setInventory(sources);
    },
    [page, sourcePage],
  );
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    const tracker = readTracker.current;
    queueMicrotask(() => {
      if (!controller.signal.aborted)
        void load(controller.signal).catch((caught) => {
          if (!controller.signal.aborted)
            setError(
              caught instanceof Error
                ? caught.message
                : "Drafting jobs could not be loaded.",
            );
        });
    });
    return () => {
      mounted.current = false;
      tracker.epoch++;
      controller.abort();
    };
  }, [load]);
  async function act(input: Record<string, unknown>) {
    if (pending.current) return;
    pending.current = true;
    readTracker.current.epoch++;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/studio/drafting-jobs", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
        data = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          setSnapshot(null);
          setInventory(null);
        }
        throw new Error(data.error || "The drafting job was not saved.");
      }
      if (mounted.current) {
        if (input.action === "create") {
          requestKey.current = null;
          setPage(1);
        }
        await load();
      }
    } catch (caught) {
      if (mounted.current)
        setError(
          caught instanceof Error
            ? caught.message
            : "The drafting job was not saved.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const changed = () => {
    requestKey.current = null;
  };
  return (
    <section className="card studio-panel">
      <div className="eyebrow">PERSISTENT SOURCE-GATED DRAFTING JOBS</div>
      <h2>Plan drafts from reviewed evidence.</h2>
      <p>
        Save an objective-specific request and track real imported drafts. A job
        stays blocked until its technical sources have current human
        verification and exact supporting sections. A discovered URL, blueprint,
        bibliography or authored lesson cannot unlock it.
      </p>
      <p className="studio-help">
        <strong>No AI model is connected.</strong> Preparing a brief saves
        citation metadata only. No private document text is included or sent to
        a provider. Use an authorized external tool, then explicitly import and
        review its output in Question Bank.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          requestKey.current ||= crypto.randomUUID();
          void act({
            action: "create",
            requestKey: requestKey.current,
            request: {
              objectiveId,
              count,
              difficulty,
              sourceIds: [
                ...new Set(
                  sourceText
                    .split(/\r?\n/)
                    .map((value) => value.trim())
                    .filter(Boolean),
                ),
              ],
            },
          });
        }}
      >
        <div className="studio-field-grid">
          <Field label="Job blueprint objective">
            <select
              value={objectiveId}
              onChange={(event) => {
                setObjectiveId(event.target.value);
                changed();
              }}
            >
              {chstObjectives.map((item) => (
                <option key={item.id} value={item.id}>
                  D{item.domain} {item.id.split("-").at(-1)} — {item.statement}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Requested draft count">
            <input
              type="number"
              required
              min={1}
              max={50}
              value={count}
              onChange={(event) => {
                setCount(Number(event.target.value));
                changed();
              }}
            />
          </Field>
          <Field label="Job difficulty">
            <select
              value={difficulty}
              onChange={(event) => {
                setDifficulty(event.target.value);
                changed();
              }}
            >
              <option value="introductory">Foundational</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Add source from private inventory">
            <select
              value=""
              disabled={busy}
              onChange={(event) => {
                if (event.target.value) {
                  setSourceText((value) =>
                    [
                      ...new Set([
                        ...value.split(/\r?\n/).filter(Boolean),
                        event.target.value,
                      ]),
                    ].join("\n"),
                  );
                  changed();
                }
              }}
            >
              <option value="">Choose a source to add</option>
              {inventory?.sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title} — {source.status}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {inventory && inventory.pagination.pages > 1 && (
          <div
            className="studio-actions"
            aria-label="Drafting source inventory pages"
          >
            <button
              type="button"
              className="button secondary"
              disabled={busy || sourcePage <= 1}
              onClick={() => setSourcePage((value) => value - 1)}
            >
              Previous source page
            </button>
            <span>
              Source page {sourcePage} of {inventory.pagination.pages}
            </span>
            <button
              type="button"
              className="button secondary"
              disabled={busy || sourcePage >= inventory.pagination.pages}
              onClick={() => setSourcePage((value) => value + 1)}
            >
              Next source page
            </button>
          </div>
        )}
        <Field
          label="Job source IDs"
          hint="One existing research source ID per line; choose 1–10 distinct sources. Citation metadata is not proof of an answer."
        >
          <textarea
            required
            rows={3}
            value={sourceText}
            maxLength={1100}
            onChange={(event) => {
              setSourceText(event.target.value);
              changed();
            }}
          />
        </Field>
        <button
          className="button primary"
          disabled={busy || !snapshot || !sourceText.trim()}
          type="submit"
        >
          Save source-gated drafting job
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">Saving the drafting request…</p>}
      <div className="studio-actions">
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={() => {
            setError("");
            void load().catch((caught) => setError(caught.message));
          }}
        >
          Refresh drafting jobs
        </button>
        <Link className="text-link" href="/studio/research">
          Review source evidence
        </Link>
      </div>
      {!snapshot && !error && <p>Loading your private drafting jobs…</p>}
      {snapshot?.jobs.length === 0 && (
        <p>No drafting jobs have been saved by this administrator.</p>
      )}
      {snapshot?.jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          busy={busy}
          questionIds={linkInputs[job.id] || ""}
          onQuestionIds={(value) =>
            setLinkInputs((previous) => ({ ...previous, [job.id]: value }))
          }
          onAction={(input) => void act(input)}
        />
      ))}
      {snapshot && snapshot.pagination.pages > 1 && (
        <nav className="studio-actions" aria-label="Drafting job pages">
          <button
            className="button secondary"
            disabled={busy || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous drafting jobs
          </button>
          <span>
            Page {page} of {snapshot.pagination.pages}
          </span>
          <button
            className="button secondary"
            disabled={busy || page >= snapshot.pagination.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next drafting jobs
          </button>
        </nav>
      )}
    </section>
  );
}
function JobCard({
  job,
  busy,
  questionIds,
  onQuestionIds,
  onAction,
}: {
  job: QuestionDraftingJob;
  busy: boolean;
  questionIds: string;
  onQuestionIds: (value: string) => void;
  onAction: (input: Record<string, unknown>) => void;
}) {
  const cancelled = job.status === "cancelled";
  return (
    <article className="studio-repeated">
      <div className="eyebrow">
        {job.status.replaceAll("_", " ").toUpperCase()} · REVISION{" "}
        {job.revision}
      </div>
      <h3>
        {job.request.objectiveId} · {job.request.count} requested
      </h3>
      <p>{job.objectiveStatement}</p>
      <p className="studio-help">
        Job {job.id} · {job.linkedQuestions.length} actual imported drafts
        linked · no approvals created
      </p>
      {job.blockers.length > 0 && (
        <div className="notice compact-notice">
          <div>
            <strong>Evidence gaps</strong>
            <ul>
              {job.blockers.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {!cancelled && (
        <div className="studio-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              onAction({
                action: "prepare",
                id: job.id,
                revision: job.revision,
              })
            }
          >
            Check sources and prepare brief
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              onAction({ action: "cancel", id: job.id, revision: job.revision })
            }
          >
            Cancel drafting job
          </button>
        </div>
      )}
      {job.brief && (
        <details>
          <summary>Inspect saved citation-only drafting brief</summary>
          <Field label={`Saved brief for job ${job.id}`}>
            <textarea
              rows={12}
              readOnly
              value={job.brief}
              onFocus={(event) => event.target.select()}
            />
          </Field>
          <p>
            Use the existing CSV/JSON importer for real output. Import and
            source research never create question approval.
          </p>
        </details>
      )}
      {!cancelled &&
        job.evidenceCurrent &&
        ["awaiting_output", "drafts_linked"].includes(job.status) &&
        job.linkedQuestions.length < job.request.count && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onAction({
                action: "link_imports",
                id: job.id,
                revision: job.revision,
                questionIds: [
                  ...new Set(
                    questionIds
                      .split(/\r?\n/)
                      .map((value) => value.trim())
                      .filter(Boolean),
                  ),
                ],
              });
            }}
          >
            <Field
              label={`Imported question IDs for job ${job.id}`}
              hint="One saved logical Question Bank ID per line. Only your imported, AI-generated drafts matching this exact objective may be linked."
            >
              <textarea
                required
                rows={3}
                maxLength={5100}
                value={questionIds}
                onChange={(event) => onQuestionIds(event.target.value)}
              />
            </Field>
            <button
              className="button secondary"
              disabled={busy || !questionIds.trim()}
            >
              Link actual imported drafts
            </button>
          </form>
        )}
      {job.linkedQuestions.length > 0 && (
        <details>
          <summary>Inspect actual imported draft links</summary>
          <ul>
            {job.linkedQuestions.map((question) => (
              <li key={question.id}>
                <Link
                  className="text-link"
                  href={`/studio/questions?search=${encodeURIComponent(question.id)}`}
                >
                  {question.id}
                </Link>{" "}
                · {question.revisionId}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
