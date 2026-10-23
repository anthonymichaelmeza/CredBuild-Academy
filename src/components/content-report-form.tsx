"use client";
import { useId, useRef, useState } from "react";

export function ContentReportForm({
  contentId,
  revision,
}: {
  contentId: string;
  revision?: number;
}) {
  const id = useId();
  const [category, setCategory] = useState("accuracy");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  return (
    <details className="curriculum-report">
      <summary>Report a content concern</summary>
      {saved ? (
        <p role="status">
          Your concern was saved for editorial review. Reporting does not change
          this question’s approval or your saved answer.
        </p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            setError("");
            try {
              const response = await fetch("/api/content-reports", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contentId,
                  ...(revision ? { revision } : {}),
                  category,
                  message,
                }),
              });
              const data = await response.json();
              if (!response.ok)
                throw new Error(
                  data.error ||
                    "Your concern could not be saved. Please retry.",
                );
              setMessage("");
              setSaved(true);
            } catch (caught) {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Your concern could not be saved.",
              );
            } finally {
              pending.current = false;
              setBusy(false);
            }
          }}
        >
          <p>
            Describe the question, answer, or citation concern. An authorized
            editor will triage it; no automatic source approval is created.
          </p>
          <label htmlFor={`${id}-category`}>Concern type</label>
          <select
            id={`${id}-category`}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="accuracy">Technical accuracy</option>
            <option value="citation">Reference or citation</option>
            <option value="ambiguity">Ambiguous wording</option>
            <option value="other">Other content concern</option>
          </select>
          <label htmlFor={`${id}-message`}>Describe the content concern</label>
          <textarea
            id={`${id}-message`}
            rows={4}
            maxLength={5000}
            minLength={10}
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button secondary" disabled={busy}>
            {busy ? "Saving concern…" : "Send for editorial review"}
          </button>
        </form>
      )}
    </details>
  );
}
