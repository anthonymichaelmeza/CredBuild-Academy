"use client";
import { useState } from "react";
import { Download, Upload } from "lucide-react";
import type { ImportPreview } from "@/modules/studio/model";
import { Field } from "./fields";
export function ImportQuestions({
  busy,
  preview,
  onPreview,
  onConfirm,
}: {
  busy: boolean;
  preview: ImportPreview | null;
  onPreview: (records: unknown[]) => Promise<void>;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="card studio-panel">
      <div className="eyebrow">VALIDATE BEFORE IMPORTING</div>
      <h2>Import original question drafts.</h2>
      <p>
        Import up to 50 structured records per batch. All imported material
        remains a draft with server-recorded authorship; source metadata does
        not establish verification.
      </p>
      <a
        className="button secondary"
        href="/api/studio?template=questions"
        download
      >
        <Download size={16} />
        Download JSON template
      </a>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            const records: unknown = JSON.parse(text);
            if (!Array.isArray(records))
              throw new Error(
                "The import must contain a JSON array of question records.",
              );
            await onPreview(records);
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "The import could not be previewed.",
            );
          }
        }}
      >
        <Field label="Choose a JSON question file">
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              setError("");
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 250_000) {
                setError("Choose a JSON file smaller than 250 KB.");
                return;
              }
              setText(await file.text());
            }}
          />
        </Field>
        <Field label="Question import JSON">
          <textarea
            className="studio-code"
            rows={12}
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
            spellCheck={false}
          />
        </Field>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button primary"
          disabled={busy || !text.trim()}
          type="submit"
        >
          <Upload size={16} />
          Preview and validate import
        </button>
      </form>
      {preview && (
        <div className="studio-repeated">
          <h3>Import preview</h3>
          <p>
            {preview.records.length} valid records · {preview.errors.length}{" "}
            validation errors · {preview.duplicates.length} duplicates
          </p>
          <p className="studio-help">
            This owner-bound preview expires at {preview.expiresAt}. Confirming
            imports the validated batch in one transaction.
          </p>
          {Boolean(preview.errors.length) && (
            <ul className="studio-import-errors">
              {preview.errors.map((issue, index) => (
                <li key={index}>
                  Record {issue.index + 1}: {issue.message}
                </li>
              ))}
            </ul>
          )}
          {Boolean(preview.duplicates.length) && (
            <ul className="studio-import-errors">
              {preview.duplicates.map((duplicate, index) => (
                <li key={index}>Duplicate: {duplicate}</li>
              ))}
            </ul>
          )}
          <ol>
            {preview.records.map((record, index) => (
              <li key={index}>
                {record.title} · {record.certificationId.toUpperCase()} · Domain{" "}
                {record.domain}
              </li>
            ))}
          </ol>
          <button
            className="button primary"
            disabled={
              busy ||
              preview.records.length === 0 ||
              preview.errors.length > 0 ||
              preview.duplicates.length > 0
            }
            onClick={() => {
              if (
                confirm(
                  `Import ${preview.records.length} original question records as unpublished drafts?`,
                )
              )
                void onConfirm(preview.id).catch(() => {});
            }}
          >
            Confirm draft-only import
          </button>
        </div>
      )}
    </section>
  );
}
