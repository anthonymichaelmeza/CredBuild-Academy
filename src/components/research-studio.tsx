"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { chstObjectives } from "@/modules/curriculum/catalog";
import { Field } from "@/components/studio/fields";
import type {
  ResearchSnapshot,
  ResearchSource,
  ResearchSourceInput,
  ResearchSection,
} from "@/modules/research/model";

const classificationOptions = [
  ["unclassified", "Unclassified — human classification required"],
  ["examination_blueprint", "Official examination objectives"],
  ["regulatory_requirement", "Regulatory requirement"],
  ["consensus_standard", "Consensus standard"],
  ["professional_guidance", "Professional guidance / best practice"],
  ["technical_research", "Technical research"],
  ["credbuilt_instruction", "CredBuilt-authored explanation"],
] as const;
const readable = (value: string) => value.replaceAll("_", " ");
const sourceStatuses = [
  "discovered",
  "queued",
  "retrieved",
  "parsed",
  "partially_parsed",
  "verified",
  "restricted_access",
  "paywalled",
  "not_found",
  "failed",
  "requires_manual_review",
];

function MetadataEditor({
  source,
  busy,
  onSave,
}: {
  source: ResearchSource;
  busy: boolean;
  onSave: (action: unknown, message: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ResearchSourceInput>(() => ({
    originalUrl: source.originalUrl,
    parentId: source.parentId,
    title: source.metadataTitle || source.title,
    publisher: source.publisher,
    publicationDate: source.publicationDate,
    classification: source.classification,
    access: source.access,
    license: source.license,
    licensedIdentifier: source.licensedIdentifier,
    rightsNotes: source.rightsNotes,
  }));
  const change = <K extends keyof ResearchSourceInput>(
    key: K,
    value: ResearchSourceInput[K],
  ) => setDraft((old) => ({ ...old, [key]: value }));
  return (
    <section className="card studio-panel">
      <details>
        <summary>Edit selected source metadata</summary>
        <p>
          Correct the source classification, bibliographic details and
          processing rights after examining them. Saving preserves the original
          URL and source identity, records the change, and requires a new source
          examination. Earlier review evidence remains in history.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await onSave(
              {
                action: "update_metadata",
                sourceId: source.id,
                expectedRevision: source.metadataRevision || 1,
                source: draft,
              },
              "Source metadata corrected. Previous verification is no longer current; examine the exact source again before recording a new review.",
            );
          }}
        >
          <fieldset disabled={busy} className="research-edit-fields">
            <div className="studio-field-grid">
              <Field label="Metadata original source URL">
                <input
                  readOnly
                  value={source.originalUrl || "Private user-supplied document"}
                />
              </Field>
              <Field label="Metadata document title">
                <input
                  required
                  value={draft.title}
                  onChange={(event) => change("title", event.target.value)}
                  maxLength={500}
                />
              </Field>
              <Field label="Metadata publisher">
                <input
                  required
                  value={draft.publisher}
                  onChange={(event) => change("publisher", event.target.value)}
                  maxLength={300}
                />
              </Field>
              <Field label="Metadata publication or revision date">
                <input
                  type="date"
                  value={draft.publicationDate || ""}
                  onChange={(event) =>
                    change("publicationDate", event.target.value || null)
                  }
                />
              </Field>
              <Field label="Metadata source classification">
                <select
                  value={draft.classification}
                  onChange={(event) =>
                    change(
                      "classification",
                      event.target
                        .value as ResearchSourceInput["classification"],
                    )
                  }
                >
                  {classificationOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Metadata access classification">
                <select
                  value={draft.access}
                  onChange={(event) =>
                    change(
                      "access",
                      event.target.value as ResearchSourceInput["access"],
                    )
                  }
                >
                  <option value="public_link">Public link</option>
                  <option value="licensed_reference">Licensed reference</option>
                  <option value="user_supplied">User supplied</option>
                  <option value="unknown">Unknown</option>
                </select>
              </Field>
              <Field label="Metadata licensing classification">
                <select
                  value={draft.license}
                  onChange={(event) =>
                    change(
                      "license",
                      event.target.value as ResearchSourceInput["license"],
                    )
                  }
                >
                  <option value="unknown">
                    Unknown; permission review required
                  </option>
                  <option value="public_metadata_only">
                    Public metadata only
                  </option>
                  <option value="public_reproduction_permitted">
                    Reproduction permission established
                  </option>
                  <option value="licensed_private">Licensed private use</option>
                  <option value="permission_required">
                    Permission required
                  </option>
                </select>
              </Field>
              <Field label="Metadata licensed identifier">
                <input
                  value={draft.licensedIdentifier}
                  onChange={(event) =>
                    change("licensedIdentifier", event.target.value)
                  }
                  maxLength={500}
                />
              </Field>
            </div>
            <Field label="Metadata rights and applicability notes">
              <textarea
                value={draft.rightsNotes}
                onChange={(event) => change("rightsNotes", event.target.value)}
                maxLength={3000}
              />
            </Field>
            <button className="button secondary">
              Save source metadata correction
            </button>
          </fieldset>
        </form>
      </details>
    </section>
  );
}

function SectionExamination({
  section,
  source,
  busy,
  onSave,
}: {
  section: ResearchSection;
  source: ResearchSource;
  busy: boolean;
  onSave: (action: unknown, message: string) => Promise<void>;
}) {
  const [decision, setDecision] = useState<"resolved" | "needs_revision">(
    "needs_revision",
  );
  const [notes, setNotes] = useState("");
  const [attested, setAttested] = useState(false);
  const unreadable = !section.text.trim();
  return (
    <div className="research-section-review">
      <h4>Examine this exact section</h4>
      <p>
        {section.manualReviewResolved
          ? "A human resolution is current for this document and metadata revision. The original extraction warning remains preserved."
          : "The extraction warning needs actual human examination of the original page or section, including its tables, figures and notes."}
      </p>
      {unreadable && (
        <p className="error">
          This section has no extracted text. Supply an actual readable
          extraction before resolving it; attestation cannot replace missing
          content.
        </p>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!source.documentHash) return;
          await onSave(
            {
              action: "review_section",
              sourceId: source.id,
              sectionId: section.id,
              documentHash: source.documentHash,
              decision,
              notes,
              humanAttestation: attested,
            },
            "Section examination recorded for the exact document and metadata revision. Original extraction warnings remain in the audit; source and instructional reviews are separate.",
          );
          setAttested(false);
        }}
      >
        <fieldset disabled={busy} className="research-edit-fields">
          <Field label="Section examination outcome">
            <select
              value={decision}
              onChange={(event) =>
                setDecision(event.target.value as typeof decision)
              }
            >
              <option value="needs_revision">
                Needs correction or additional extraction
              </option>
              <option value="resolved" disabled={unreadable}>
                Original content examined; extraction flag resolved
              </option>
            </select>
          </Field>
          <Field label="Section examination findings">
            <textarea
              required
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <label className="studio-check">
            <input
              required
              type="checkbox"
              checked={attested}
              onChange={(event) => setAttested(event.target.checked)}
            />{" "}
            I personally examined this exact original page or section and
            recorded accurate findings. This is not an AI attestation.
          </label>
          <button
            className="button secondary"
            disabled={
              !attested ||
              !source.documentHash ||
              (decision === "resolved" && unreadable)
            }
          >
            Save section examination
          </button>
        </fieldset>
      </form>
    </div>
  );
}

export function ResearchStudio({ initial }: { initial: ResearchSnapshot }) {
  const [snapshot, setSnapshot] = useState<ResearchSnapshot | null>(initial);
  const [selectedId, setSelectedId] = useState(initial.sources[0]?.id || "");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [classification, setClassification] = useState("professional_guidance");
  const [access, setAccess] = useState("public_link");
  const [license, setLicense] = useState("unknown");
  const [licensedIdentifier, setLicensedIdentifier] = useState("");
  const [rightsNotes, setRightsNotes] = useState("");
  const [format, setFormat] = useState<"html" | "text">("html");
  const [content, setContent] = useState("");
  const [rightsAttested, setRightsAttested] = useState(false);
  const [objectiveId, setObjectiveId] = useState(chstObjectives[0].id);
  const [sectionId, setSectionId] = useState("");
  const [relationKind, setRelationKind] = useState("candidate");
  const [linkNotes, setLinkNotes] = useState("");
  const [findings, setFindings] = useState("");
  const [decision, setDecision] = useState("needs_revision");
  const [attested, setAttested] = useState(false);
  const pending = useRef(false);
  const fileReads = useRef(0);
  const reads = useRef({
    epoch: 0,
    controller: null as AbortController | null,
  });
  useEffect(
    () => () => {
      fileReads.current++;
      reads.current.epoch++;
      reads.current.controller?.abort();
    },
    [],
  );
  const selected =
    snapshot?.sources.find((item) => item.id === selectedId) || null;

  async function load(sourceId = selectedId, page = 1) {
    reads.current.controller?.abort();
    const controller = new AbortController();
    reads.current.controller = controller;
    const epoch = ++reads.current.epoch;
    const parameters = new URLSearchParams({ page: String(page) });
    if (search) parameters.set("search", search);
    if (status) parameters.set("status", status);
    if (sourceId) parameters.set("sourceId", sourceId);
    const response = await fetch(`/api/studio/research?${parameters}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const result = await response.json();
    if (controller.signal.aborted || epoch !== reads.current.epoch) return;
    if (!response.ok) {
      if ([401, 403].includes(response.status)) {
        fileReads.current++;
        setSnapshot(null);
        setSelectedId("");
        setContent("");
      }
      throw new Error(result.error || "Research records could not be loaded.");
    }
    setSnapshot(result);
    if (!result.sources.some((item: { id: string }) => item.id === sourceId))
      setSelectedId(result.sources[0]?.id || "");
  }
  async function mutate(action: unknown, message: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    reads.current.epoch++;
    reads.current.controller?.abort();
    try {
      const response = await fetch("/api/studio/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(action),
      });
      const result = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          fileReads.current++;
          setSnapshot(null);
          setSelectedId("");
          setContent("");
        }
        throw new Error(
          result.error || "This research operation was not saved.",
        );
      }
      setSnapshot(result);
      const next =
        result.sources.find((item: { id: string }) => item.id === selectedId)
          ?.id ||
        result.sources[0]?.id ||
        "";
      setSelectedId(next);
      setNotice(message);
      setAttested(false);
      setFindings("");
      setSectionId("");
      await load(next);
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setError(
        caught instanceof Error
          ? caught.message
          : "This research operation was not saved.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function choose(id: string) {
    fileReads.current++;
    setSelectedId(id);
    setContent("");
    setSectionId("");
    setRightsAttested(false);
    setFindings("");
    setAttested(false);
    setError("");
    setNotice("");
    void load(id).catch((caught) => {
      if (caught.name !== "AbortError") setError(caught.message);
    });
  }
  if (!snapshot)
    return (
      <div className="page-wrap narrow">
        <h1>Research access changed.</h1>
        <p>
          Reconnect with an authorized administrator account. Private source
          records have been cleared from this workspace.
        </p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
      </div>
    );
  const sections = snapshot.sections.filter(
    (section) => section.sourceId === selectedId,
  );
  const jobs = snapshot.jobs.filter((job) => job.sourceId === selectedId);
  const attempts = snapshot.attempts.filter(
    (attempt) => attempt.sourceId === selectedId,
  );
  return (
    <div className="page-wrap studio-page research-studio">
      <div className="research-heading">
        <div>
          <div className="eyebrow">
            CREDBUILT SOURCE RESEARCH · ADMINISTRATION
          </div>
          <h1>
            Research Studio<span className="orange">.</span>
          </h1>
          <p className="lead">
            Track what was retrieved. Inspect what was processed. Record what
            still needs evidence.
          </p>
        </div>
        <span className="outline-badge">Administrator</span>
      </div>
      <div className="studio-actions">
        <Link className="button secondary" href="/studio/references">
          Reference registry
        </Link>
        <Link className="button secondary" href="/studio/curriculum">
          Curriculum manager
        </Link>
        <Link className="button secondary" href="/studio/questions">
          Question Bank
        </Link>
      </div>
      <section className="notice compact-notice question-bank-summary">
        <strong>
          Parsing and mapping do not establish technical verification.
        </strong>
        <p>
          Private licensed or user-supplied text stays in this protected
          workspace. A source can be technically verified only after an
          authorized person actually examines it. This never approves a question
          or lesson.
        </p>
      </section>
      {snapshot.access.localDevelopment && (
        <div className="notice compact-notice">
          <p>
            <strong>Isolated development identity.</strong> These records come
            from a local test database and do not validate hosted authentication
            or a production research bank.
          </p>
        </div>
      )}
      <div
        className="research-metrics"
        aria-label="Actual research inventory counts"
      >
        {[
          ["Sources", snapshot.metrics.sources],
          ["Parsed sources", snapshot.metrics.parsed],
          ["Human-verified sources", snapshot.metrics.verified],
          ["Indexed sections", snapshot.metrics.sections],
          ["Restricted sources", snapshot.metrics.restricted],
          ["Failed sources", snapshot.metrics.failed],
          ["Pending jobs", snapshot.metrics.pendingJobs],
        ].map(([label, count]) => (
          <div
            className="card research-metric"
            key={label}
            data-testid={`research-${String(label).toLowerCase().replaceAll(" ", "-")}`}
          >
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
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
      {busy && <p role="status">Saving research records…</p>}
      <section className="card studio-panel">
        <details>
          <summary>Register a source or licensed reference</summary>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await mutate(
                {
                  action: "register",
                  source: {
                    originalUrl: url,
                    title,
                    publisher,
                    classification,
                    access,
                    license,
                    publicationDate: publicationDate || null,
                    licensedIdentifier,
                    rightsNotes,
                  },
                },
                "Source registered as unverified. No document was downloaded or processed.",
              );
            }}
          >
            <div className="studio-field-grid">
              <Field label="Research source URL">
                <input
                  disabled={busy}
                  required={access === "public_link" || access === "unknown"}
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://www.osha.gov/…"
                  maxLength={2000}
                />
              </Field>
              <Field label="Research source title">
                <input
                  disabled={busy}
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={500}
                />
              </Field>
              <Field label="Research publisher">
                <input
                  disabled={busy}
                  required
                  value={publisher}
                  onChange={(event) => setPublisher(event.target.value)}
                  maxLength={300}
                />
              </Field>
              <Field label="Research source classification">
                <select
                  disabled={busy}
                  value={classification}
                  onChange={(event) => setClassification(event.target.value)}
                >
                  {classificationOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Research publication or revision date"
                hint="Leave unknown unless the document actually identifies its date."
              >
                <input
                  disabled={busy}
                  type="date"
                  value={publicationDate}
                  onChange={(event) => setPublicationDate(event.target.value)}
                />
              </Field>
              <Field label="Research access classification">
                <select
                  disabled={busy}
                  value={access}
                  onChange={(event) => setAccess(event.target.value)}
                >
                  <option value="public_link">Public link</option>
                  <option value="licensed_reference">Licensed reference</option>
                  <option value="user_supplied">User supplied</option>
                  <option value="unknown">Unknown</option>
                </select>
              </Field>
              <Field label="Research licensing classification">
                <select
                  disabled={busy}
                  value={license}
                  onChange={(event) => setLicense(event.target.value)}
                >
                  <option value="unknown">
                    Unknown; permission review required
                  </option>
                  <option value="public_metadata_only">
                    Public metadata only
                  </option>
                  <option value="public_reproduction_permitted">
                    Reproduction permission established
                  </option>
                  <option value="licensed_private">Licensed private use</option>
                  <option value="permission_required">
                    Permission required
                  </option>
                </select>
              </Field>
              <Field label="Research licensed identifier">
                <input
                  disabled={busy}
                  value={licensedIdentifier}
                  onChange={(event) =>
                    setLicensedIdentifier(event.target.value)
                  }
                  maxLength={500}
                />
              </Field>
            </div>
            <Field
              label="Research access and rights notes"
              hint="Identify what may be processed. Do not treat public access as a grant to redistribute restricted text."
            >
              <textarea
                disabled={busy}
                required
                value={rightsNotes}
                onChange={(event) => setRightsNotes(event.target.value)}
                maxLength={3000}
              />
            </Field>
            <button className="button primary" disabled={busy}>
              Register unverified source
            </button>
          </form>
        </details>
      </section>
      <div className="research-grid">
        <section className="card studio-panel">
          <h2>Source inventory</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              void load("").catch((caught) => setError(caught.message));
            }}
          >
            <Field label="Search research sources and sections">
              <input
                disabled={busy}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={200}
                type="search"
              />
            </Field>
            <Field label="Research source status">
              <select
                disabled={busy}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                {sourceStatuses.map((value) => (
                  <option key={value} value={value}>
                    {readable(value)}
                  </option>
                ))}
              </select>
            </Field>
            <button className="button secondary" disabled={busy}>
              Search research inventory
            </button>
          </form>
          <p className="studio-help">
            {snapshot.pagination.total} matching records · page{" "}
            {snapshot.pagination.page} of {snapshot.pagination.pages}
          </p>
          <ul className="research-source-list">
            {snapshot.sources.map((source) => (
              <li key={source.id}>
                <button
                  aria-pressed={selectedId === source.id}
                  onClick={() => choose(source.id)}
                  disabled={busy}
                >
                  <span className="research-status">
                    {readable(source.status)}
                  </span>
                  <strong>{source.title}</strong>
                  <small>
                    {source.publisher} · {readable(source.classification)}
                    <br />
                    {source.sectionsProcessed} indexed sections ·{" "}
                    {source.objectiveIds.length} objective links
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {!snapshot.sources.length && (
            <p>
              No sources match these filters. Register a source or clear the
              search.
            </p>
          )}
          <div className="research-toolbar">
            <button
              className="button secondary"
              disabled={busy || snapshot.pagination.page <= 1}
              onClick={() =>
                void load(selectedId, snapshot.pagination.page - 1).catch(
                  (caught) => setError(caught.message),
                )
              }
            >
              Previous source page
            </button>
            <button
              className="button secondary"
              disabled={
                busy || snapshot.pagination.page >= snapshot.pagination.pages
              }
              onClick={() =>
                void load(selectedId, snapshot.pagination.page + 1).catch(
                  (caught) => setError(caught.message),
                )
              }
            >
              Next source page
            </button>
          </div>
        </section>
        <div className="research-main">
          {selected ? (
            <>
              <section
                className="card studio-panel"
                aria-label="Selected research source"
              >
                <div className="eyebrow">PRIVATE SOURCE RECORD</div>
                <h2>{selected.title}</h2>
                <span className="research-status">
                  {readable(selected.status)}
                </span>
                <p className="research-source-url">
                  {selected.originalUrl ? (
                    <a
                      className="text-link"
                      href={selected.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open original source
                    </a>
                  ) : (
                    `Private source identifier: ${selected.licensedIdentifier || selected.id}`
                  )}
                </p>
                <dl className="research-meta">
                  <div>
                    <dt>Catalog title</dt>
                    <dd>{selected.metadataTitle || selected.title}</dd>
                  </div>
                  <div>
                    <dt>Metadata revision</dt>
                    <dd>{selected.metadataRevision || 1}</dd>
                  </div>
                  <div>
                    <dt>Publisher</dt>
                    <dd>{selected.publisher}</dd>
                  </div>
                  <div>
                    <dt>Content class</dt>
                    <dd>{readable(selected.classification)}</dd>
                  </div>
                  <div>
                    <dt>Access / rights</dt>
                    <dd>
                      {readable(selected.access)} / {readable(selected.license)}
                    </dd>
                  </div>
                  <div>
                    <dt>Publication date</dt>
                    <dd>
                      {selected.publicationDate || "Unknown — not inferred"}
                    </dd>
                  </div>
                  <div>
                    <dt>Parse status</dt>
                    <dd>{readable(selected.parseStatus)}</dd>
                  </div>
                  <div>
                    <dt>Processed pages</dt>
                    <dd>
                      {selected.pagesProcessed.length} of{" "}
                      {selected.pageCount ?? "unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt>Indexed sections</dt>
                    <dd>{selected.sectionsProcessed}</dd>
                  </div>
                  <div>
                    <dt>Resolved destination</dt>
                    <dd>
                      {selected.resolvedUrl ||
                        "No successful retrieval recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt>Checksum</dt>
                    <dd>{selected.documentHash || "No processed document"}</dd>
                  </div>
                  <div>
                    <dt>Last inventory update</dt>
                    <dd>{selected.updatedAt}</dd>
                  </div>
                </dl>
                {selected.error && <p className="error">{selected.error}</p>}
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      {
                        action: "enqueue",
                        sourceId: selected.id,
                        runKey: `manual-${crypto.randomUUID()}`,
                      },
                      "Retrieval job queued. A trusted operator must run the bounded research worker; this page does not start a background crawler.",
                    )
                  }
                >
                  Queue source retrieval
                </button>
                <p className="studio-help">
                  A queued job is not a successful download. The trusted worker
                  applies allowlists, publisher policies, limits and retries; it
                  records blocked access without bypassing restrictions.
                </p>
              </section>
              <MetadataEditor
                key={`metadata-${selected.id}-${selected.metadataRevision || 1}`}
                source={selected}
                busy={busy}
                onSave={mutate}
              />
              <section
                className="card studio-panel"
                key={`document-${selected.id}`}
              >
                <h2>Import authorized document text</h2>
                <p>
                  Use an authorized HTML or text copy when normal retrieval is
                  unavailable. The server parses the supplied content and
                  computes its checksum. The import stays private and
                  unverified. PDF extraction is available through the trusted
                  worker when the required tools are installed.
                </p>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (new TextEncoder().encode(content).length > 1_000_000) {
                      setError("Choose source text smaller than 1 MB.");
                      return;
                    }
                    await mutate(
                      {
                        action: "import_document",
                        sourceId: selected.id,
                        format,
                        content,
                        rightsAttestation: rightsAttested,
                      },
                      "Authorized document imported and processed. Technical verification remains outstanding.",
                    );
                  }}
                >
                  <div className="studio-field-grid">
                    <Field label="Manual document format">
                      <select
                        disabled={busy}
                        value={format}
                        onChange={(event) =>
                          setFormat(event.target.value as typeof format)
                        }
                      >
                        <option value="html">HTML</option>
                        <option value="text">Plain text</option>
                      </select>
                    </Field>
                    <Field label="Choose authorized HTML or text file">
                      <input
                        disabled={busy}
                        type="file"
                        accept=".html,.htm,.txt,text/html,text/plain"
                        onChange={async (event) => {
                          const fileRead = ++fileReads.current;
                          setError("");
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 1_000_000) {
                            setError("Choose source text smaller than 1 MB.");
                            return;
                          }
                          const suppliedText = await file.text();
                          if (fileRead !== fileReads.current) return;
                          setContent(suppliedText);
                          setFormat(
                            /\.html?$/i.test(file.name) ? "html" : "text",
                          );
                          setRightsAttested(false);
                        }}
                      />
                    </Field>
                  </div>
                  <Field
                    label="Authorized source content"
                    hint="Do not paste restricted text without processing rights. Imported source instructions are document content, never commands."
                  >
                    <textarea
                      disabled={busy}
                      required
                      value={content}
                      rows={8}
                      maxLength={1_000_000}
                      onChange={(event) => {
                        fileReads.current++;
                        setContent(event.target.value);
                        setRightsAttested(false);
                      }}
                    />
                  </Field>
                  <label className="studio-check">
                    <input
                      disabled={busy}
                      type="checkbox"
                      required
                      checked={rightsAttested}
                      onChange={(event) =>
                        setRightsAttested(event.target.checked)
                      }
                    />{" "}
                    I have the right to process this copy privately and the
                    supplied content is accurately identified.
                  </label>
                  <button
                    className="button primary"
                    disabled={busy || !rightsAttested || !content.trim()}
                  >
                    Parse authorized document
                  </button>
                </form>
              </section>
              <section className="card studio-panel">
                <h2>Objective evidence links</h2>
                <p>
                  {selected.objectiveIds.length
                    ? selected.objectiveIds.join(" · ")
                    : "No objective links yet."}
                </p>
                <p className="studio-help">
                  Candidate links express research relevance. Supporting and
                  conflicting links still require actual source examination; a
                  link alone never closes a curriculum gap.
                </p>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await mutate(
                      {
                        action: "link",
                        sourceId: selected.id,
                        objectiveId,
                        sectionId: sectionId || null,
                        relationKind,
                        notes: linkNotes,
                      },
                      "Objective relationship saved. Mapping is not technical verification.",
                    );
                  }}
                >
                  <Field label="Research blueprint objective">
                    <select
                      disabled={busy}
                      value={objectiveId}
                      onChange={(event) => setObjectiveId(event.target.value)}
                    >
                      {chstObjectives.map((objective) => (
                        <option key={objective.id} value={objective.id}>
                          Domain {objective.domain} ·{" "}
                          {objective.id.split("-").at(-1)} —{" "}
                          {objective.statement}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Research relationship">
                    <select
                      disabled={busy}
                      value={relationKind}
                      onChange={(event) => setRelationKind(event.target.value)}
                    >
                      <option value="candidate">Candidate relevance</option>
                      <option value="supports">
                        Supporting evidence — examine first
                      </option>
                      <option value="conflicts">
                        Conflicting evidence — resolve before instruction
                      </option>
                    </select>
                  </Field>
                  <Field
                    label="Research supporting section"
                    hint="Select the exact extracted locator for supporting or conflicting evidence. Source-level candidate links may remain unassigned."
                  >
                    <select
                      disabled={busy}
                      value={sectionId}
                      onChange={(event) => setSectionId(event.target.value)}
                      required={relationKind !== "candidate"}
                    >
                      <option value="">Source-level candidate only</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.locator} — {section.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Research objective relationship notes">
                    <textarea
                      disabled={busy}
                      required
                      value={linkNotes}
                      onChange={(event) => setLinkNotes(event.target.value)}
                      maxLength={3000}
                    />
                  </Field>
                  <button className="button secondary" disabled={busy}>
                    Save objective relationship
                  </button>
                </form>
              </section>
              <section className="card studio-panel">
                <h2>Processed source sections</h2>
                <p className="studio-help">
                  Only extracted content appears below. Tables, figures,
                  formulas and unreadable pages require manual examination;
                  extraction is not interpretation.
                </p>
                <p className="studio-help">
                  Showing {sections.length} of {selected.sectionsProcessed}{" "}
                  indexed sections. Large documents may require a narrower
                  source search or the trusted audit export to inspect the
                  complete index.
                </p>
                {sections.length ? (
                  sections.map((section) => (
                    <article className="research-section" key={section.id}>
                      <h3>{section.title}</h3>
                      <small>
                        {section.locator}
                        {section.page ? ` · Page ${section.page}` : ""}
                      </small>
                      {section.needsManualReview && (
                        <p className="notice compact-notice">
                          Original extraction warning: {section.notes.join(" ")}
                          {section.manualReviewResolved
                            ? " Human resolution recorded for the current document and metadata."
                            : " Manual examination remains outstanding."}
                        </p>
                      )}
                      <p>{section.text}</p>
                      {(section.needsManualReview ||
                        section.effectiveNeedsManualReview ||
                        !section.text.trim()) && (
                        <SectionExamination
                          key={`${section.id}-${selected.documentHash}-${selected.metadataRevision || 1}`}
                          section={section}
                          source={selected}
                          busy={busy}
                          onSave={mutate}
                        />
                      )}
                    </article>
                  ))
                ) : (
                  <p>No extracted sections are available for this source.</p>
                )}
              </section>
              <section className="card studio-panel">
                <h2>Processing history and queue</h2>
                {jobs.length ? (
                  <ul className="research-history">
                    {jobs.map((job) => (
                      <li key={job.id}>
                        <strong>{readable(job.state)}</strong> · {job.attempts}{" "}
                        attempts
                        <p>
                          Next attempt: {job.nextAttemptAt || "not scheduled"} ·
                          Lease: {job.leaseUntil || "not claimed"}
                        </p>
                        {job.error && <p className="error">{job.error}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No retrieval job has been queued.</p>
                )}
                <h3>Processing and retrieval attempts</h3>
                {attempts.length ? (
                  <ol className="research-history">
                    {attempts.map((attempt) => (
                      <li key={attempt.id}>
                        <strong>{readable(attempt.kind)}</strong>
                        <p>{attempt.attemptedAt}</p>
                        <p>
                          Publisher HTTP status:{" "}
                          {attempt.httpStatus ?? "not received"} · Proxy status:{" "}
                          {attempt.proxyStatus ?? "not recorded"}
                        </p>
                        {attempt.resolvedUrl && (
                          <p className="research-source-url">
                            {attempt.resolvedUrl}
                          </p>
                        )}
                        {attempt.error && (
                          <p className="error">{attempt.error}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>
                    No processing or network attempt has been recorded. Manual
                    imports do not imply a successful publisher download.
                  </p>
                )}
              </section>
              <section className="card studio-panel">
                <h2>Record actual human examination</h2>
                <p>
                  Examine the exact processed document, supporting sections,
                  currency, applicability and rights before attesting. This
                  source-level review does not approve a question or lesson.
                </p>
                {selected.documentHash ? (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await mutate(
                        {
                          action: "review_source",
                          sourceId: selected.id,
                          documentHash: selected.documentHash,
                          decision,
                          findings,
                          humanAttestation: attested,
                        },
                        "Human source examination recorded for this exact document checksum. Question and lesson review remain separate.",
                      );
                    }}
                  >
                    <Field label="Research examination outcome">
                      <select
                        disabled={busy}
                        value={decision}
                        onChange={(event) => setDecision(event.target.value)}
                      >
                        <option value="needs_revision">
                          Requires corrections or additional evidence
                        </option>
                        <option value="verified">
                          Actual source examination completed
                        </option>
                      </select>
                    </Field>
                    <Field label="Research examination findings">
                      <textarea
                        disabled={busy}
                        required
                        value={findings}
                        rows={4}
                        maxLength={5000}
                        onChange={(event) => setFindings(event.target.value)}
                      />
                    </Field>
                    <label className="studio-check">
                      <input
                        disabled={busy}
                        type="checkbox"
                        required
                        checked={attested}
                        onChange={(event) => setAttested(event.target.checked)}
                      />{" "}
                      I personally examined this exact document and recorded
                      accurate findings. This is not an AI attestation.
                    </label>
                    <button
                      className="button primary"
                      disabled={busy || !attested}
                    >
                      Save human source examination
                    </button>
                  </form>
                ) : (
                  <p>
                    A processed document and checksum are required before
                    recording examination.
                  </p>
                )}
              </section>
            </>
          ) : (
            <section className="card studio-panel">
              <h2>Select a source to inspect its evidence.</h2>
              <p>
                Register a source, import an authorized document, or select a
                saved inventory item. Retrieval failures and incomplete
                extraction remain visible.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
