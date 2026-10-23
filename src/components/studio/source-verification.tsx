"use client";
import { useId, useState } from "react";
import type {
  StudioItem,
  SourceVerificationCheck,
} from "@/modules/studio/model";
import { Field, statusLabel } from "./fields";

export function SourceVerificationForm({
  item,
  busy,
  onRecord,
}: {
  item: StudioItem;
  busy: boolean;
  onRecord: (input: Record<string, unknown>) => Promise<void>;
}) {
  const attestationId = useId();
  const [decision, setDecision] = useState<"verified" | "changes_requested">(
    "changes_requested",
  );
  const [findings, setFindings] = useState("");
  const [attestation, setAttestation] = useState(false);
  const [checks, setChecks] = useState<SourceVerificationCheck[]>(() =>
    item.data.sources.map((source) => ({
      sourceId: source.id,
      outcome: "insufficient",
      notes: "",
      edition: source.edition,
      section: source.section,
      url: source.url,
    })),
  );
  const [error, setError] = useState("");
  function edit(
    index: number,
    key: keyof SourceVerificationCheck,
    value: string,
  ) {
    setChecks(
      checks.map((check, position) =>
        position === index ? { ...check, [key]: value } : check,
      ),
    );
  }
  return (
    <form
      className="card studio-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          if (!attestation)
            throw new Error(
              "Confirm the source work you personally performed.",
            );
          if (
            !confirm(
              `Record ${statusLabel(decision)} source evidence for revision ${item.revision}? Technical approval remains a separate decision.`,
            )
          )
            return;
          await onRecord({
            decision,
            findings,
            sourceChecks: checks,
            humanAttestation: true,
          });
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Source findings could not be recorded.",
          );
        }
      }}
    >
      <div className="eyebrow">
        SOURCE VERIFICATION · SEPARATE FROM TECHNICAL REVIEW
      </div>
      <h2>Examine the supporting evidence.</h2>
      <p>
        Inspect the actual source text, edition, exact section, and claims.
        Being listed in a bibliography does not establish answer support. Source
        verification records this revision only and does not technically approve
        or publish it.
      </p>
      {item.data.sources.length ? (
        item.data.sources.map((source, index) => (
          <fieldset className="studio-repeated" key={source.id}>
            <legend>{source.title}</legend>
            <p className="studio-help">
              {source.classification
                ? statusLabel(source.classification)
                : "Source classification pending"}
            </p>
            {source.url && (
              <a
                href={source.url}
                className="text-link"
                rel="noreferrer"
                target="_blank"
              >
                Open cited source
              </a>
            )}
            <div className="studio-field-grid">
              <Field
                label={`Examined source ${index + 1} edition`}
                hint="Must match this immutable draft citation for a supporting finding."
              >
                <input
                  value={checks[index]?.edition || ""}
                  onChange={(event) =>
                    edit(index, "edition", event.target.value)
                  }
                />
              </Field>
              <Field label={`Examined source ${index + 1} exact section`}>
                <input
                  value={checks[index]?.section || ""}
                  onChange={(event) =>
                    edit(index, "section", event.target.value)
                  }
                />
              </Field>
            </div>
            <Field label={`Examined source ${index + 1} URL`}>
              <input
                type="url"
                value={checks[index]?.url || ""}
                onChange={(event) => edit(index, "url", event.target.value)}
              />
            </Field>
            <Field label={`Source verification ${index + 1} outcome`}>
              <select
                value={checks[index]?.outcome || "insufficient"}
                onChange={(event) => edit(index, "outcome", event.target.value)}
              >
                <option value="insufficient">
                  Not examined / insufficient evidence
                </option>
                <option value="contradicts">
                  Source contradicts the claim
                </option>
                <option value="supports">
                  Examined section supports the claim
                </option>
              </select>
            </Field>
            <Field
              label={`Source verification ${index + 1} evidence notes`}
              hint="Identify the claim, answer choice, calculation, or diagram examined and record limitations."
            >
              <textarea
                required
                rows={4}
                value={checks[index]?.notes || ""}
                onChange={(event) => edit(index, "notes", event.target.value)}
              />
            </Field>
          </fieldset>
        ))
      ) : (
        <p className="notice">
          No sources are cited. Request changes rather than asserting source
          verification.
        </p>
      )}
      <Field label="Source verification decision">
        <select
          value={decision}
          onChange={(event) =>
            setDecision(event.target.value as typeof decision)
          }
        >
          <option value="changes_requested">
            Request source corrections or access
          </option>
          <option value="verified">Record verified supporting evidence</option>
        </select>
      </Field>
      <Field label="Source verification findings">
        <textarea
          required
          rows={5}
          value={findings}
          onChange={(event) => setFindings(event.target.value)}
        />
      </Field>
      <div className="studio-check-label">
        <input
          id={attestationId}
          type="checkbox"
          required
          checked={attestation}
          onChange={(event) => setAttestation(event.target.checked)}
        />
        <label htmlFor={attestationId}>
          These source findings are my own. Any supporting finding identifies
          the actual edition and section I personally examined; no bibliography
          listing or generated citation substitutes for that work.
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="button primary"
        disabled={busy || !attestation}
      >
        Record source verification
      </button>
    </form>
  );
}

export function SourceVerificationHistory({ item }: { item: StudioItem }) {
  return (
    <section className="card studio-panel">
      <h2>Source verification history</h2>
      {item.sourceVerifications?.length ? (
        <ol className="studio-audit">
          {item.sourceVerifications.map((record) => (
            <li key={record.id}>
              <strong>{statusLabel(record.decision)}</strong>
              <small>
                {record.createdAt} · Source reviewer: {record.reviewerId} ·
                Revision: {record.revisionId}
              </small>
              <p>{record.findings}</p>
              {record.sourceChecks.map((check) => (
                <div key={check.sourceId}>
                  <p>
                    <strong>
                      {check.sourceId} · {statusLabel(check.outcome)}
                    </strong>
                    {check.edition || "Edition not established"} ·{" "}
                    {check.section || "Exact section not established"}
                  </p>
                  <p>{check.notes}</p>
                  {check.url && (
                    <a
                      className="text-link studio-wrap"
                      href={check.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Examined source link
                    </a>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ol>
      ) : (
        <p>
          No separate source verification has been recorded for this content.
          Technical review and publication cannot substitute for this evidence.
        </p>
      )}
    </section>
  );
}
