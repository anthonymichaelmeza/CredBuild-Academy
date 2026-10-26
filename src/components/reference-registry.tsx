"use client";
import Link from "next/link";
import { useState } from "react";
import {
  newRegistryReference,
  type RegistryReference,
  type RegistryReferenceData,
} from "@/modules/references/model";
import { Field } from "@/components/studio/fields";

export function ReferenceRegistry({
  initial,
}: {
  initial: RegistryReference[];
}) {
  const [items, setItems] = useState(initial),
    [selected, setSelected] = useState<RegistryReference | null>(null),
    [data, setData] = useState<RegistryReferenceData>({
      ...newRegistryReference,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [findings, setFindings] = useState(""),
    [attested, setAttested] = useState(false),
    [decision, setDecision] = useState<"verified" | "needs_revision">(
      "needs_revision",
    );
  const change = <K extends keyof RegistryReferenceData>(
    key: K,
    value: RegistryReferenceData[K],
  ) => setData((old) => ({ ...old, [key]: value }));
  function choose(item: RegistryReference | null) {
    setSelected(item);
    setData(item ? structuredClone(item.data) : { ...newRegistryReference });
    setFindings("");
    setAttested(false);
    setError("");
    setNotice("");
  }
  const dirty = Boolean(
    selected && JSON.stringify(data) !== JSON.stringify(selected.data),
  );
  async function send(action: unknown, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/studio/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to save reference.");
      setItems(result as RegistryReference[]);
      choose(null);
      setNotice(message);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to save reference.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-wrap studio-page">
      <div className="eyebrow">CREDBUILT CONTENT OPERATIONS</div>
      <h1>
        Technical Reference Registry<span className="orange">.</span>
      </h1>
      <p className="lead">
        Track authoritative candidate sources and actual human examinations. A
        verified registry entry does not verify any question or replace
        independent technical review.
      </p>
      <div className="studio-toolbar">
        <Link className="button secondary" href="/studio/questions">
          Question Bank
        </Link>
        <Link className="button secondary" href="/studio/questions/production">
          Content production
        </Link>
      </div>
      <section className="card studio-panel">
        <h2>Reference access and rights</h2>
        <p>
          Store citation metadata and links only. Do not paste or upload
          restricted publications. Publication dates and editions remain unknown
          until examined; candidate links are unverified. Changes create a new
          metadata revision that requires a new examination.
        </p>
      </section>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <section className="card studio-panel">
        <h2>Registered sources ({items.length})</h2>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => choose(null)}
        >
          New reference
        </button>
        <div className="reference-registry-grid">
          {items.map((item) => (
            <article key={item.id} className="reference-registry-entry">
              <h3>{item.data.title}</h3>
              <p>
                {item.data.issuer} · {item.status.replaceAll("_", " ")} ·
                revision {item.revision}
              </p>
              <p>{item.data.section}</p>
              <p>
                Domains {item.data.domains.join(", ")} ·{" "}
                {item.data.topics.join(", ")}
              </p>
              <button
                className="button secondary"
                aria-label={`Manage ${item.id}`}
                disabled={busy}
                onClick={() => choose(item)}
              >
                Manage reference
              </button>
              {item.data.url && (
                <p>
                  <a
                    className="text-link"
                    href={item.data.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source link
                  </a>
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="card studio-panel">
        <h2>
          {selected ? "Edit reference metadata" : "Create candidate reference"}
        </h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(
              selected
                ? {
                    action: "edit",
                    id: selected.id,
                    revision: selected.revision,
                    data,
                  }
                : { action: "create", data },
              "Reference saved as unverified metadata.",
            );
          }}
        >
          <fieldset disabled={busy}>
            <legend>Citation metadata</legend>
            <div className="studio-field-grid">
              <Field label="Document title">
                <input
                  required
                  maxLength={500}
                  value={data.title}
                  onChange={(e) => change("title", e.target.value)}
                />
              </Field>
              <Field label="Issuing organization">
                <input
                  required
                  maxLength={300}
                  value={data.issuer}
                  onChange={(e) => change("issuer", e.target.value)}
                />
              </Field>
              <Field label="Publication or revision date (leave unknown if unexamined)">
                <input
                  type="date"
                  value={data.publicationDate || ""}
                  onChange={(e) =>
                    change("publicationDate", e.target.value || null)
                  }
                />
              </Field>
              <Field label="Edition (if known)">
                <input
                  maxLength={300}
                  value={data.edition}
                  onChange={(e) => change("edition", e.target.value)}
                />
              </Field>
              <Field label="Section or chapter">
                <input
                  required
                  maxLength={1000}
                  value={data.section}
                  onChange={(e) => change("section", e.target.value)}
                />
              </Field>
              <Field label="Source URL">
                <input
                  type="url"
                  maxLength={2000}
                  value={data.url}
                  onChange={(e) => change("url", e.target.value)}
                />
              </Field>
              <Field label="Access">
                <select
                  value={data.access}
                  onChange={(e) =>
                    change(
                      "access",
                      e.target.value as RegistryReferenceData["access"],
                    )
                  }
                >
                  <option value="public_link">Public source link</option>
                  <option value="licensed_reference">
                    Licensed reference identifier
                  </option>
                </select>
              </Field>
              <Field label="Licensed reference identifier">
                <input
                  maxLength={500}
                  value={data.licensedIdentifier}
                  onChange={(e) => change("licensedIdentifier", e.target.value)}
                />
              </Field>
              <Field label="CHST domains">
                <select
                  multiple
                  value={data.domains}
                  onChange={(e) =>
                    change(
                      "domains",
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value as "1" | "2" | "3" | "4",
                      ),
                    )
                  }
                >
                  {["1", "2", "3", "4"].map((domain) => (
                    <option key={domain} value={domain}>
                      Domain {domain}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Topics (one per line)">
                <textarea
                  required
                  value={data.topics.join("\n")}
                  onChange={(e) => change("topics", e.target.value.split("\n"))}
                />
              </Field>
              <Field label="Rights and access limitations">
                <textarea
                  required
                  maxLength={2000}
                  value={data.rights}
                  onChange={(e) => change("rights", e.target.value)}
                />
              </Field>
            </div>
            <button className="button primary" type="submit">
              {busy ? "Saving…" : "Save unverified metadata"}
            </button>
          </fieldset>
        </form>
      </section>
      {selected && (
        <section className="card studio-panel">
          <h2>Record actual human source examination</h2>
          <p>
            Review the exact current source, edition, relevant sections,
            currency and rights before attesting. This is source-registry
            metadata review only. Question authors must still obtain
            question-specific source verification and independent technical
            approval.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(
                {
                  action: "review",
                  id: selected.id,
                  revision: selected.revision,
                  decision,
                  findings,
                  humanAttestation: attested,
                },
                "Human source examination recorded for the exact metadata revision.",
              );
            }}
          >
            <fieldset disabled={busy || dirty}>
              <legend>Revision {selected.revision} examination</legend>
              <Field label="Examination outcome">
                <select
                  value={decision}
                  onChange={(e) =>
                    setDecision(e.target.value as typeof decision)
                  }
                >
                  <option value="needs_revision">Needs revision</option>
                  <option value="verified">
                    Source metadata examined and verified
                  </option>
                </select>
              </Field>
              <Field label="Findings, examined edition, sections and access conditions">
                <textarea
                  required
                  maxLength={5000}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                />
              </Field>
              <label className="studio-check-label">
                <input
                  type="checkbox"
                  required
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                />
                I personally examined this source and recorded accurate
                findings. This is not an AI attestation or question approval.
              </label>
              <button className="button primary" type="submit">
                Record human examination
              </button>
            </fieldset>
          </form>
          {dirty && (
            <p role="status">
              Save changed metadata and reopen this reference before reviewing
              it.
            </p>
          )}
          <h3>Preserved examination history</h3>
          {selected.reviews.length ? (
            selected.reviews.map((review) => (
              <p key={review.id}>
                Revision {review.revision} ·{" "}
                {review.decision.replaceAll("_", " ")} · {review.reviewerId} ·{" "}
                {review.createdAt}: {review.findings}
              </p>
            ))
          ) : (
            <p>No human examination recorded.</p>
          )}
        </section>
      )}
    </div>
  );
}
