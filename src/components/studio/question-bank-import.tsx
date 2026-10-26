"use client";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import type { QuestionImportPreview } from "@/modules/studio/batch-import";
import { Field } from "./fields";
export function QuestionBankImport({
  busy,
  preview,
  onPreview,
  onConfirm,
}: {
  busy: boolean;
  preview: QuestionImportPreview | null;
  onPreview: (
    format: "csv" | "json",
    text: string,
  ) => Promise<QuestionImportPreview>;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewedInput, setPreviewedInput] = useState<{
    id: string;
    format: "csv" | "json";
    text: string;
  } | null>(null);
  const requestInFlight = useRef(false);
  const previewMatchesInput = Boolean(
    preview &&
    previewedInput?.id === preview.id &&
    previewedInput.format === format &&
    previewedInput.text === text,
  );
  return (
    <section className="card studio-panel">
      <div className="eyebrow">ADMINISTRATOR QUESTION INGESTION</div>
      <h2>Import question drafts from CSV or JSON.</h2>
      <p>
        Up to 50 records and 250 KB per batch. External IDs are tracked
        permanently to prevent re-imports. A preview never approves or publishes
        a question.
      </p>
      <div className="auth-actions">
        {(["csv", "json"] as const).map((kind) => (
          <a
            key={kind}
            className="button secondary"
            href={`/api/studio/questions?template=${kind}`}
            download
          >
            <Download size={16} />
            Download {kind.toUpperCase()} template
          </a>
        ))}
      </div>
      <p className="studio-help">
        Use the exact CHST5 objective ID and domain. Provide four choices,
        explanations and candidate references. Keep unknown editions or sections
        blank; they require actual examination before approval. Preserve
        AI-generated provenance when applicable.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (requestInFlight.current) return;
          requestInFlight.current = true;
          setPreviewing(true);
          setPreviewedInput(null);
          setError("");
          const submittedInput = { format, text };
          try {
            const result = await onPreview(
              submittedInput.format,
              submittedInput.text,
            );
            setPreviewedInput({ ...submittedInput, id: result.id });
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "The batch could not be previewed.",
            );
          } finally {
            requestInFlight.current = false;
            setPreviewing(false);
          }
        }}
      >
        <Field label="Question file format">
          <select
            value={format}
            onChange={(event) => {
              setPreviewedInput(null);
              setFormat(event.target.value as "csv" | "json");
            }}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </Field>
        <Field label="Choose a CSV or JSON question file">
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={async (event) => {
              setError("");
              setPreviewedInput(null);
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 250_000) {
                setError("Choose a file smaller than 250 KB.");
                return;
              }
              setFormat(
                file.name.toLowerCase().endsWith(".csv") ? "csv" : "json",
              );
              setText(await file.text());
            }}
          />
        </Field>
        <Field label="Question batch content">
          <textarea
            className="studio-code"
            rows={12}
            value={text}
            onChange={(event) => {
              setPreviewedInput(null);
              setText(event.target.value);
            }}
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
          disabled={busy || previewing || !text.trim()}
        >
          <Upload size={16} />
          Preview CSV or JSON import
        </button>
      </form>
      {preview && (
        <div className="studio-repeated">
          <h3>Question Bank import preview</h3>
          <p>
            {preview.records.length} valid records · {preview.errors.length}{" "}
            errors · {preview.duplicates.length} duplicates
          </p>
          <p className="studio-help">
            Owner-bound preview expires {preview.expiresAt}. Confirmation
            imports the whole valid batch atomically as drafts. Any error or
            duplicate blocks the entire import.
          </p>
          {!previewMatchesInput && (
            <p role="status" className="notice compact-notice">
              This preview no longer matches the selected format or batch
              content. Preview and validate the current batch again before
              confirming.
            </p>
          )}
          {!!preview.errors.length && (
            <ul className="studio-import-errors">
              {preview.errors.map((issue, index) => (
                <li key={index}>
                  Row {issue.index + 1}: {issue.message}
                </li>
              ))}
            </ul>
          )}
          {!!preview.duplicates.length && (
            <ul className="studio-import-errors">
              {preview.duplicates.map((duplicate, index) => (
                <li key={index}>{duplicate}</li>
              ))}
            </ul>
          )}
          <ol>
            {preview.records.map((record, index) => (
              <li key={index}>
                Row {preview.sourceRows[index]} ·{" "}
                {preview.externalIds[index] || "No external ID"} ·{" "}
                {record.title} · Domain {record.domain}
              </li>
            ))}
          </ol>
          <button
            className="button primary"
            disabled={
              busy ||
              previewing ||
              !previewMatchesInput ||
              !preview.records.length ||
              !!preview.errors.length ||
              !!preview.duplicates.length
            }
            onClick={() => void onConfirm(preview.id)}
          >
            Confirm draft-only Question Bank import
          </button>
        </div>
      )}
    </section>
  );
}
