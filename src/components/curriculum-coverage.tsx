"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  ContentReport,
  CurriculumCoverage,
} from "@/modules/curriculum/coverage-types";
import { chstObjectives } from "@/modules/curriculum/catalog";
import { studioStatuses } from "@/modules/studio/model";
import { Field, statusLabel } from "./studio/fields";

function ReportTriage({
  report,
  busy,
  onSave,
}: {
  report: ContentReport;
  busy: boolean;
  onSave: (input: Record<string, unknown>) => Promise<void>;
}) {
  const [status, setStatus] = useState<ContentReport["status"]>(
    report.status === "open" ? "under_review" : report.status,
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  return (
    <article className="coverage-triage">
      <span className="outline-badge">{statusLabel(report.status)}</span>
      <h3>
        {statusLabel(report.category)} · {report.contentId}
      </h3>
      <p>{report.message}</p>
      <p className="fine-print">
        Revision {report.revisionId} · Reported {report.createdAt}
      </p>
      {report.resolution && <p>Latest triage note: {report.resolution}</p>}
      <Link
        className="text-link"
        href={`/studio?search=${encodeURIComponent(report.contentId)}`}
      >
        Inspect the content revision and audit
      </Link>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await onSave({ id: report.id, status, notes });
            setNotes("");
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "The triage decision could not be saved.",
            );
          }
        }}
      >
        <Field label="Report status">
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ContentReport["status"])
            }
          >
            <option value="under_review">Under review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </Field>
        <Field label="Editorial triage notes">
          <textarea
            rows={3}
            required
            minLength={10}
            maxLength={5000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button secondary" type="submit" disabled={busy}>
          Save report triage
        </button>
      </form>
    </article>
  );
}

export function CurriculumCoverageDashboard({
  initial,
}: {
  initial: CurriculumCoverage;
}) {
  const [snapshot, setSnapshot] = useState<CurriculumCoverage | null>(initial);
  const [domain, setDomain] = useState(initial.filters.domain || "all");
  const [objective, setObjective] = useState(
    initial.filters.objective || "all",
  );
  const [status, setStatus] = useState(initial.filters.status || "all");
  const [search, setSearch] = useState(initial.filters.search || "");
  const [gap, setGap] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const lifecycle = useRef({
    mounted: false,
    epoch: 0,
    controller: null as AbortController | null,
  });
  useEffect(() => {
    const tracker = lifecycle.current;
    tracker.mounted = true;
    return () => {
      tracker.mounted = false;
      tracker.epoch++;
      tracker.controller?.abort();
    };
  }, []);
  async function reload() {
    lifecycle.current.controller?.abort();
    const controller = new AbortController();
    lifecycle.current.controller = controller;
    const epoch = ++lifecycle.current.epoch;
    const params = new URLSearchParams();
    Object.entries({ domain, objective, status, search }).forEach(
      ([key, value]) => {
        if (value && value !== "all") params.set(key, value);
      },
    );
    const response = await fetch(
      `/api/curriculum/coverage${params.size ? `?${params}` : ""}`,
      {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      },
    );
    const data = await response.json();
    if (
      !lifecycle.current.mounted ||
      controller.signal.aborted ||
      epoch !== lifecycle.current.epoch
    )
      return;
    if (!response.ok) {
      if ([401, 403].includes(response.status)) setSnapshot(null);
      throw new Error(data.error || "Coverage could not be loaded.");
    }
    setSnapshot(data);
  }
  async function filteredReload() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await reload();
    } catch (caught) {
      if (caught instanceof Error && caught.name !== "AbortError")
        setError(caught.message);
    } finally {
      pending.current = false;
      if (lifecycle.current.mounted) setBusy(false);
    }
  }
  async function triage(input: Record<string, unknown>) {
    if (pending.current)
      throw new Error("Wait for the current editorial operation.");
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/curriculum/coverage", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) setSnapshot(null);
        throw new Error(data.error || "The report triage was not saved.");
      }
      await reload();
      setNotice(
        "Report triage saved. Content approval and publication remain separate decisions.",
      );
    } finally {
      pending.current = false;
      if (lifecycle.current.mounted) setBusy(false);
    }
  }
  if (!snapshot)
    return (
      <div className="page-wrap narrow">
        <h1>Editorial access ended.</h1>
        <p className="error" role="alert">
          {error ||
            "Sign in with an authorized reviewer or administrator account."}
        </p>
        <Link className="button secondary" href="/settings">
          Open account settings
        </Link>
      </div>
    );
  const metrics: [string, number][] = [
    ["Questions", snapshot.totals.questions],
    ["Draft questions", snapshot.totals.draft],
    ["Source verified", snapshot.totals.sourceVerified],
    ["Technically approved", snapshot.totals.approved],
    ["Published", snapshot.totals.published],
    ["Source verification pending", snapshot.totals.sourcePending],
    ["Technical review pending", snapshot.totals.technicalReview],
    ["Open / active reports", snapshot.totals.reportedErrors],
  ];
  const objectives = snapshot.objectives.filter(
    (row) =>
      gap === "all" ||
      (gap === "empty" ? row.questions === 0 : row.questions < 2),
  );
  return (
    <div className="page-wrap curriculum-page">
      <div className="eyebrow">
        CREDBUILT CONTENT STUDIO · ACTUAL DATABASE COVERAGE
      </div>
      <h1>
        See the gaps. Review the evidence<span className="orange">.</span>
      </h1>
      <p className="lead">
        CHST5 V.{snapshot.blueprint.version} · Every official statement remains
        visible, including objectives with no question records.
      </p>
      <Link className="text-link" href="/studio">
        ← Return to Content Studio
      </Link>
      <p className="notice curriculum-provenance">
        These counts come from saved editorial records under the selected
        filters. Source verification and technical approval are separate. The
        attached blueprint’s latest official-version status remains unconfirmed.
        Fewer than two drafts is a planning flag, not a validated measure of
        learning sufficiency.
      </p>
      {snapshot.access.localDevelopment && (
        <p className="notice">
          Isolated development identity. This view does not validate live
          managed-provider access.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="studio-success" role="status">
          {notice}
        </p>
      )}
      <form
        className="coverage-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void filteredReload();
        }}
      >
        <Field label="Coverage domain">
          <select
            value={domain}
            onChange={(event) => {
              setDomain(event.target.value);
              setObjective("all");
            }}
          >
            <option value="all">All domains</option>
            {snapshot.domains.map((row) => (
              <option key={row.code} value={row.code}>
                Domain {row.code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Coverage objective">
          <select
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          >
            <option value="all">All official objectives</option>
            {chstObjectives
              .filter((row) => domain === "all" || row.domain === domain)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.id}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Editorial status">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All states</option>
            {studioStatuses.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Search coverage content">
          <input
            value={search}
            maxLength={200}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Question title or topic"
          />
        </Field>
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Loading records…" : "Apply coverage filters"}
        </button>
      </form>
      <div className="coverage-metrics">
        {metrics.map(([label, count]) => (
          <div className="card coverage-metric" key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="card coverage-panel">
        <h2>Domain distribution</h2>
        <div className="coverage-table-wrap">
          <table className="coverage-table">
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Blueprint weight</th>
                <th scope="col">Questions</th>
                <th scope="col">Source verified</th>
                <th scope="col">Approved</th>
                <th scope="col">Published</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.domains.map((row) => (
                <tr key={row.code}>
                  <td>
                    <Link
                      className="text-link"
                      href={`/studio?domain=${row.code}`}
                    >
                      {row.code}. {row.title}
                    </Link>
                  </td>
                  <td>{row.weight / 100}%</td>
                  <td>{row.questions}</td>
                  <td>{row.sourceVerified}</td>
                  <td>{row.approved}</td>
                  <td>{row.published}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card coverage-panel">
        <h2>Coverage for all 78 statements</h2>
        <p>
          {snapshot.totals.objectivesWithoutQuestions} objectives without
          questions · {snapshot.totals.objectivesInsufficientCoverage} with
          fewer than two draft records under these filters.
        </p>
        <label className="curriculum-select">
          Coverage gap filter
          <select value={gap} onChange={(event) => setGap(event.target.value)}>
            <option value="all">All mapped statements</option>
            <option value="empty">No questions</option>
            <option value="thin">Fewer than two questions</option>
          </select>
        </label>
        <div className="coverage-table-wrap">
          <table className="coverage-table">
            <thead>
              <tr>
                <th scope="col">Objective</th>
                <th scope="col">Questions</th>
                <th scope="col">Source verified</th>
                <th scope="col">Approved</th>
                <th scope="col">Published</th>
                <th scope="col">Drill down</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="text-link" href={`/curriculum/${row.id}`}>
                      {row.statement}
                    </Link>
                    <small>
                      {row.id} · supplied page {row.page}
                    </small>
                  </td>
                  <td>{row.questions}</td>
                  <td>{row.sourceVerified}</td>
                  <td>{row.approved}</td>
                  <td>{row.published}</td>
                  <td>
                    <Link
                      className="text-link"
                      href={`/studio?objective=${encodeURIComponent(row.id)}`}
                    >
                      Inspect records
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!objectives.length && (
          <p>No objectives match this coverage gap filter.</p>
        )}
      </section>
      <section className="card coverage-panel">
        <h2>Source freshness and access</h2>
        <p>
          No source is labeled outdated without evidence. Bibliography
          publication years are not verification dates; current-edition and link
          status remain unknown until examined.
        </p>
        <div className="coverage-table-wrap">
          <table className="coverage-table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Classification</th>
                <th scope="col">Technical source review</th>
                <th scope="col">Edition freshness</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.references.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.url ? (
                      <a
                        className="text-link"
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.title}
                      </a>
                    ) : (
                      row.title
                    )}
                    <small>
                      {row.edition || "Edition not established"}
                      {row.bibliographyListed
                        ? " · BCSP-listed bibliography"
                        : ""}
                    </small>
                  </td>
                  <td>{statusLabel(row.classification)}</td>
                  <td>{statusLabel(row.verificationStatus)}</td>
                  <td>{row.freshness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card coverage-panel">
        <h2>Reported content concerns</h2>
        <p>
          Reports trigger editorial attention. Triage does not automatically
          approve, revise, or publish material.
        </p>
        {snapshot.reports.length ? (
          snapshot.reports.map((report) => (
            <ReportTriage
              key={`${report.id}:${report.updatedAt}`}
              report={report}
              busy={busy}
              onSave={triage}
            />
          ))
        ) : (
          <p>No content concerns have been reported.</p>
        )}
      </section>
    </div>
  );
}
