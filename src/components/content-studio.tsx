"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, FileCheck2, Plus, Search, ShieldCheck } from "lucide-react";
import type {
  ContentDraft,
  ImportPreview,
  StudioItem,
  StudioSnapshot as Snapshot,
} from "@/modules/studio/model";
import { DraftEditor, newDraft } from "./studio/editor";
import { ItemDetails, BlueprintReview } from "./studio/review";
import { ImportQuestions } from "./studio/importer";
import { Status, statusLabel, uid } from "./studio/fields";
type Task = "library" | "editor" | "import" | "blueprint";
export function ContentStudio({ initial }: { initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initial);
  const [task, setTask] = useState<Task>("library");
  const [selectedId, setSelected] = useState<string | null>(
    initial.items[0]?.id || null,
  );
  const [editor, setEditor] = useState<{
    draft: ContentDraft;
    original: StudioItem | null;
    key: string;
  } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const mounted = useRef(false);
  const reads = useRef({
    epoch: 0,
    controller: null as AbortController | null,
  });
  const clearPrivate = useCallback(() => {
    reads.current.epoch++;
    reads.current.controller?.abort();
    setSnapshot(null);
    setEditor(null);
    setPreview(null);
    setSelected(null);
  }, []);
  const reload = useCallback(
    async (preferred?: string) => {
      if (!mounted.current) return;
      reads.current.controller?.abort();
      const controller = new AbortController();
      reads.current.controller = controller;
      const epoch = ++reads.current.epoch;
      const response = await fetch("/api/studio", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      const data = await response.json();
      if (
        !mounted.current ||
        controller.signal.aborted ||
        epoch !== reads.current.epoch
      )
        return;
      if (!response.ok) {
        if ([401, 403].includes(response.status)) clearPrivate();
        throw new Error(data.error || "Content Studio could not be reloaded.");
      }
      setSnapshot(data as Snapshot);
      if (preferred) setSelected(preferred);
    },
    [clearPrivate],
  );
  useEffect(() => {
    mounted.current = true;
    const tracker = reads.current;
    const focus = () => {
      if (!pending.current)
        void reload().catch((caught) => {
          if (
            mounted.current &&
            caught instanceof Error &&
            caught.name !== "AbortError"
          )
            setError(caught.message);
        });
    };
    window.addEventListener("focus", focus);
    return () => {
      mounted.current = false;
      tracker.epoch++;
      tracker.controller?.abort();
      window.removeEventListener("focus", focus);
    };
  }, [reload]);
  async function request(input: Record<string, unknown>) {
    if (pending.current)
      throw new Error("Wait for the current Studio operation to finish.");
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    reads.current.epoch++;
    reads.current.controller?.abort();
    try {
      const response = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          clearPrivate();
        }
        if (response.status === 409) await reload();
        throw new Error(data.error || "This Studio operation was not saved.");
      }
      return data;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "This Studio operation was not saved.",
      );
      throw caught;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const access = snapshot?.access;
  const canAuthor = Boolean(
    access?.roles.some((role) => role === "author" || role === "administrator"),
  );
  const administrator = Boolean(access?.roles.includes("administrator"));
  const selected =
    snapshot?.items.find((item) => item.id === selectedId) || null;
  const filtered =
    snapshot?.items.filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (status === "all" || item.status === status) &&
        `${item.data.title} ${item.data.topic} ${item.id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  async function workflow(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    await request({
      action,
      id: selected.id,
      revision: selected.revision,
      rowVersion: selected.rowVersion,
      ...extra,
    });
    await reload(selected.id);
    setNotice(
      `${statusLabel(action)} completed. The saved revision and audit history are shown below.`,
    );
  }
  function create(kind: ContentDraft["kind"]) {
    if (!snapshot) return;
    setEditor({
      draft: newDraft(kind, snapshot.blueprints),
      original: null,
      key: uid("editor"),
    });
    setTask("editor");
    setError("");
    setNotice("");
  }
  if (!snapshot)
    return (
      <div className="page-wrap narrow">
        <div className="eyebrow">CONTENT STUDIO</div>
        <h1>Editorial access ended.</h1>
        <section className="card studio-panel">
          <p className="error" role="alert">
            {error ||
              "Sign in with an authorized editorial account to continue."}
          </p>
          <p>No private content is retained in browser storage.</p>
          <Link className="button primary" href="/settings">
            Open account settings
          </Link>
        </section>
      </div>
    );
  return (
    <div className="page-wrap studio-page">
      <div className="studio-heading">
        <div>
          <div className="eyebrow">CREDBUILT CONTENT STUDIO</div>
          <h1>
            Build knowledge with a clear record<span className="orange">.</span>
          </h1>
          <p className="lead">
            Create original material. Examine the evidence. Publish only
            reviewed revisions.
          </p>
        </div>
        <span className="outline-badge">
          <ShieldCheck size={15} />
          {snapshot.access.roles.map(statusLabel).join(" · ")}
        </span>
      </div>
      {snapshot.access.localDevelopment && (
        <div className="notice compact-notice">
          <ShieldCheck size={18} />
          <p>
            <strong>Isolated development identity.</strong> This editor uses
            server-side development roles for testing. It does not establish
            live managed account validation.
          </p>
        </div>
      )}
      <div className="studio-tab-nav" aria-label="Content Studio workspace">
        <button
          aria-pressed={task === "library" || task === "editor"}
          onClick={() => {
            setTask("library");
            setEditor(null);
          }}
        >
          Content library
        </button>
        {canAuthor && (
          <button
            aria-pressed={task === "import"}
            onClick={() => setTask("import")}
          >
            Question import
          </button>
        )}
        {administrator && (
          <button
            aria-pressed={task === "blueprint"}
            onClick={() => setTask("blueprint")}
          >
            Blueprint source review
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="studio-help">
          Saving your editorial change…
        </p>
      )}
      {notice && (
        <p role="status" className="studio-success">
          {notice}
        </p>
      )}
      {task === "editor" && editor ? (
        <DraftEditor
          key={editor.key}
          initial={editor.draft}
          original={editor.original}
          blueprints={snapshot.blueprints}
          busy={busy}
          onCancel={() => {
            setTask("library");
            setEditor(null);
          }}
          onSave={async (content) => {
            const saved: StudioItem = editor.original
              ? await request({
                  action: "revise",
                  id: editor.original.id,
                  revision: editor.original.revision,
                  rowVersion: editor.original.rowVersion,
                  content,
                })
              : await request({ action: "create", content });
            await reload(saved.id);
            setEditor(null);
            setTask("library");
            setNotice(
              "Draft saved. Independent technical review is required before publication.",
            );
          }}
        />
      ) : task === "import" && canAuthor ? (
        <ImportQuestions
          busy={busy}
          preview={preview}
          onPreview={async (records) => {
            const result = await request({ action: "preview_import", records });
            setPreview(result);
          }}
          onConfirm={async (previewId) => {
            const result = await request({
              action: "confirm_import",
              previewId,
            });
            setPreview(null);
            await reload(result.imported?.[0]?.id);
            setNotice(
              `${result.imported?.length || 0} records imported as drafts. No content was approved or published.`,
            );
          }}
        />
      ) : task === "blueprint" && administrator ? (
        <BlueprintReview
          blueprints={snapshot.blueprints}
          busy={busy}
          onRecord={async (input) => {
            await request({ action: "verify_blueprint", ...input });
            await reload();
            setNotice(
              "Blueprint source review recorded. Each content revision still requires its own independent technical review.",
            );
          }}
        />
      ) : (
        <>
          <div className="studio-toolbar">
            <label className="search-box">
              <Search size={18} />
              <span className="sr-only">Search Studio content</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, topic or content ID…"
              />
            </label>
            <label className="sr-only" htmlFor="studio-kind-filter">
              Filter Studio content type
            </label>
            <select
              id="studio-kind-filter"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="all">All content types</option>
              <option value="question">Questions</option>
              <option value="lesson">Lessons</option>
            </select>
            <label className="sr-only" htmlFor="studio-status-filter">
              Filter Studio content status
            </label>
            <select
              id="studio-status-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All review states</option>
              {[
                "draft",
                "technical_review",
                "changes_requested",
                "rejected",
                "approved",
                "published",
                "retired",
              ].map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
            {canAuthor && (
              <>
                <button
                  className="button primary"
                  onClick={() => create("question")}
                >
                  <Plus size={16} />
                  New question
                </button>
                <button
                  className="button secondary"
                  onClick={() => create("lesson")}
                >
                  <BookOpen size={16} />
                  New lesson
                </button>
              </>
            )}
          </div>
          <div className="studio-layout">
            <aside
              className="card studio-sidebar"
              aria-label="Editorial content library"
            >
              <div className="eyebrow">SAVED CONTENT</div>
              <p className="studio-help">
                {filtered.length} records match your filters
              </p>
              <ul className="studio-list">
                {filtered.map((item) => (
                  <li key={item.id}>
                    <button
                      aria-pressed={selectedId === item.id}
                      onClick={() => {
                        setSelected(item.id);
                        setError("");
                        setNotice("");
                      }}
                    >
                      <Status value={item.status} />
                      <strong>{item.data.title}</strong>
                      <small>
                        {item.kind} · Revision {item.revision} · Domain{" "}
                        {item.data.domain}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
              {filtered.length === 0 && (
                <p className="studio-help">
                  No content matches. Create an original draft or adjust the
                  filters.
                </p>
              )}
            </aside>
            <div className="studio-main">
              {selected ? (
                <ItemDetails
                  item={selected}
                  access={snapshot.access}
                  busy={busy}
                  onAction={workflow}
                  onEdit={() => {
                    setEditor({
                      draft: structuredClone(selected.data),
                      original: selected,
                      key: uid("editor"),
                    });
                    setTask("editor");
                  }}
                />
              ) : (
                <section className="card studio-panel studio-empty">
                  <FileCheck2 size={32} />
                  <h2>Start with an original draft.</h2>
                  <p>
                    The demonstration bank remains separate. No content is
                    approved automatically, and sources need independent human
                    review.
                  </p>
                  {canAuthor && (
                    <button
                      className="button primary"
                      onClick={() => create("question")}
                    >
                      Create first question draft
                    </button>
                  )}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
