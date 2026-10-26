"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import type {
  BlueprintSummary,
  StudioAccess,
  StudioItem,
} from "@/modules/studio/model";
import { Field, Status, statusLabel } from "./fields";
import {
  SourceVerificationForm,
  SourceVerificationHistory,
} from "./source-verification";
import {
  CHST_BLUEPRINT_ID,
  chstObjectives,
} from "@/modules/curriculum/catalog";
function ReviewForm({
  item,
  busy,
  onReview,
}: {
  item: StudioItem;
  busy: boolean;
  onReview: (input: Record<string, unknown>) => Promise<void>;
}) {
  const attestationId = useId();
  const [decision, setDecision] = useState<
    "approved" | "changes_requested" | "rejected"
  >("changes_requested");
  const [findings, setFindings] = useState("");
  const [attestation, setAttestation] = useState(false);
  const [checks, setChecks] = useState(() =>
    item.data.sources.map((source) => ({
      sourceId: source.id,
      outcome: "insufficient" as "supports" | "contradicts" | "insufficient",
      notes: "",
    })),
  );
  const [error, setError] = useState("");
  return (
    <form
      className="card studio-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          if (!attestation)
            throw new Error(
              "Confirm your independent review before recording a decision.",
            );
          if (
            !confirm(
              `Record ${statusLabel(decision)} for revision ${item.revision}? This decision and its source findings are retained in the audit history.`,
            )
          )
            return;
          await onReview({
            decision,
            findings,
            sourceChecks: checks,
            humanAttestation: true,
          });
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "The review could not be recorded.",
          );
        }
      }}
    >
      <div className="eyebrow">INDEPENDENT TECHNICAL REVIEW</div>
      <h2>Review this exact revision.</h2>
      <p>
        Record source findings and calculations you actually checked. Approval
        does not transfer to a changed revision.
      </p>
      {item.data.sources.length ? (
        item.data.sources.map((source, index) => (
          <div className="studio-repeated" key={source.id}>
            <div className="studio-review-source">
              <div>
                <h3>{source.title}</h3>
                <p>
                  {source.edition} · {source.section}
                </p>
                {source.url ? (
                  <a
                    className="text-link studio-wrap"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open cited source
                  </a>
                ) : (
                  <p className="studio-help">Source URL not established.</p>
                )}
              </div>
              <Field label={`Source ${index + 1} finding`}>
                <select
                  value={checks[index]?.outcome || "insufficient"}
                  onChange={(event) =>
                    setChecks(
                      checks.map((check, position) =>
                        position === index
                          ? {
                              ...check,
                              outcome: event.target
                                .value as typeof check.outcome,
                            }
                          : check,
                      ),
                    )
                  }
                >
                  <option value="insufficient">Insufficient evidence</option>
                  <option value="supports">Supports the content</option>
                  <option value="contradicts">Contradicts the content</option>
                </select>
              </Field>
            </div>
            <Field
              label={`Source ${index + 1} review notes`}
              hint="Identify the claims, answer choices, calculations, or media you examined and any limitations."
            >
              <textarea
                rows={3}
                value={checks[index]?.notes || ""}
                onChange={(event) =>
                  setChecks(
                    checks.map((check, position) =>
                      position === index
                        ? { ...check, notes: event.target.value }
                        : check,
                    ),
                  )
                }
                required
              />
            </Field>
          </div>
        ))
      ) : (
        <p className="notice">
          No sources are cited. Request revision or reject the draft;
          publication requires reviewed supporting sources.
        </p>
      )}
      <Field label="Review decision">
        <select
          value={decision}
          onChange={(event) =>
            setDecision(event.target.value as typeof decision)
          }
        >
          <option value="changes_requested">Request revision</option>
          <option value="rejected">Reject this revision</option>
          <option
            value="approved"
            disabled={
              !item.sourceVerifications?.some(
                (record) =>
                  record.revisionId === item.revisionId &&
                  record.decision === "verified",
              )
            }
          >
            Approve this revision
          </option>
        </select>
      </Field>
      <Field label="Technical findings and required changes">
        <textarea
          rows={5}
          value={findings}
          onChange={(event) => setFindings(event.target.value)}
          required
        />
      </Field>
      <div className="studio-check-label">
        <input
          id={attestationId}
          type="checkbox"
          checked={attestation}
          onChange={(event) => setAttestation(event.target.checked)}
          required
        />
        <label htmlFor={attestationId}>
          These are my own independent findings. Any supporting assessment
          refers to the cited edition and exact section I personally examined.
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary"
        disabled={busy || !attestation}
        type="submit"
      >
        <FileCheck2 size={17} />
        {busy ? "Recording review…" : "Record review decision"}
      </button>
    </form>
  );
}

function ContentPreview({ item }: { item: StudioItem }) {
  const data = item.data;
  return (
    <section className="card studio-panel">
      <div className="eyebrow">IMMUTABLE REVISION {item.revision}</div>
      <h2>Content preview</h2>
      {data.kind === "question" ? (
        <>
          <p className="studio-section-content">{data.body.stem}</p>
          <ol type="A">
            {data.body.choices.map((choice) => (
              <li className="studio-section-content" key={choice.id}>
                {choice.text}
                {choice.id === data.body.correctChoice && (
                  <strong> · Correct answer</strong>
                )}
                <p>{choice.rationale}</p>
              </li>
            ))}
          </ol>
          <div className="studio-definition">
            <strong>Correct-answer explanation</strong>
            {data.body.explanation}
          </div>
          {Boolean(data.body.solutionSteps.length) && (
            <ol>
              {data.body.solutionSteps.map((step, index) => (
                <li className="studio-section-content" key={index}>
                  {step}
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <>
          <p>{data.body.summary}</p>
          <h3>Learning objectives</h3>
          <ul>
            {data.body.objectives.map((objective, index) => (
              <li className="studio-section-content" key={index}>
                {objective}
              </li>
            ))}
          </ul>
          {data.body.sections.map((section) => (
            <div className="studio-definition" key={section.id}>
              <strong>{section.title}</strong>
              {section.paragraphs.map((paragraph, index) => (
                <p className="studio-section-content" key={index}>
                  {paragraph}
                </p>
              ))}
              {section.reflection && <p>{section.reflection}</p>}
            </div>
          ))}
          <h3>{data.body.checks.length} knowledge checks</h3>
          {data.body.checks.map((check) => (
            <details className="studio-definition" key={check.id}>
              <summary>{check.stem}</summary>
              <p>{check.explanation}</p>
              <p>
                Correct choice:{" "}
                {
                  check.choices.find(
                    (choice) => choice.id === check.correctChoice,
                  )?.text
                }
              </p>
            </details>
          ))}
        </>
      )}
      {Boolean(data.body.media.length) && (
        <details>
          <summary>{data.body.media.length} attached media records</summary>
          <ul>
            {data.body.media.map((media, index) => (
              <li key={index}>
                <a
                  className="text-link studio-wrap"
                  href={media.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {media.alt}
                </a>
                <p>{media.rights}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export function ItemDetails({
  item,
  access,
  busy,
  onAction,
  onEdit,
}: {
  item: StudioItem;
  access: StudioAccess;
  busy: boolean;
  onAction: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  onEdit: () => void;
}) {
  const administrator = access.roles.includes("administrator");
  const displayStatus =
    item.status === "approved" && item.editorialApproved !== true
      ? "editorial_review"
      : item.status;
  const canEdit =
    administrator ||
    (access.roles.includes("author") && item.ownerId === access.actorId);
  const canReview =
    access.roles.includes("reviewer") && item.ownerId !== access.actorId;
  const canSubmit =
    canEdit &&
    ["draft", "changes_requested", "source_verified"].includes(item.status);
  const canRequestSources =
    canEdit &&
    ["draft", "changes_requested", "technical_review"].includes(item.status);
  const independent =
    item.ownerId !== access.actorId &&
    !item.versions.some((version) => version.authorId === access.actorId);
  return (
    <>
      <section className="card studio-panel">
        <div className="studio-item-heading">
          <h2>{item.data.title}</h2>
          <Status value={displayStatus} />
        </div>
        <div className="studio-meta">
          <span>
            {item.kind === "question" ? "Question" : "Lesson"} · Revision{" "}
            {item.revision}
          </span>
          <span>
            {item.data.certificationId.toUpperCase()} · Domain{" "}
            {item.data.domain}
          </span>
          <span>Topic: {item.data.topic}</span>
        </div>
        <div className="studio-flow" aria-label="Content workflow">
          {[
            "draft",
            "source_verification_pending",
            "source_verified",
            "technical_review",
            "editorial_review",
            "approved",
            "published",
            "retired",
          ].map((status) => (
            <span
              key={status}
              aria-current={displayStatus === status ? "step" : undefined}
            >
              {statusLabel(status)}
            </span>
          ))}
        </div>
        {item.status === "approved" && (
          <p className="notice compact-notice">
            {item.editorialApproved
              ? "Separate technical and human editorial approval are recorded for this exact revision. An administrator may publish it."
              : "Technical approval is recorded. A separate human editorial sign-off on this exact revision is required before final approval and publication."}{" "}
            <Link className="text-link" href="/studio/questions/quality">
              Open editorial review
            </Link>
          </p>
        )}
        {item.publishedRevisionId && (
          <p className="studio-help">
            A published revision is retained while a newer draft is reviewed.
            Learner attempts keep the revision they studied.
          </p>
        )}
        {item.blockers.length > 0 && (
          <details open>
            <summary>Approval and publication requirements</summary>
            <ul className="studio-import-errors">
              {item.blockers.map((blocker, index) => (
                <li key={index}>{blocker}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="studio-actions">
          {canEdit && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={onEdit}
            >
              Create a new draft revision
            </button>
          )}
          {canSubmit && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void onAction("submit").catch(() => {})}
            >
              Submit for technical review
            </button>
          )}
          {canRequestSources && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void onAction("request_source_verification").catch(() => {})
              }
            >
              Request source verification
            </button>
          )}
          {administrator && item.status === "approved" && (
            <button
              className="button primary"
              disabled={busy || item.editorialApproved !== true}
              onClick={() => {
                if (
                  confirm(
                    `Publish revision ${item.revision} of “${item.data.title}”? Publication requires independent approval and supporting source review.`,
                  )
                )
                  void onAction("publish").catch(() => {});
              }}
            >
              Publish approved revision
            </button>
          )}
          {administrator &&
            (item.publishedRevisionId || item.status === "approved") && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      item.publishedRevisionId
                        ? `Retire the published revision of “${item.data.title}”? It will no longer be selected for new learning activity. A newer draft, if present, will remain available for editing.`
                        : `Retire approved revision ${item.revision} of “${item.data.title}”? It will remain in revision history and will not be published.`,
                    )
                  )
                    void onAction("retire").catch(() => {});
                }}
              >
                {item.publishedRevisionId
                  ? "Retire published content"
                  : "Retire approved revision"}
              </button>
            )}
        </div>
        {["technical_review", "source_verification_pending"].includes(
          item.status,
        ) &&
          !independent && (
            <p className="studio-help">
              You authored this revision. A different authorized reviewer must
              record the technical decision.
            </p>
          )}
      </section>
      <ContentPreview item={item} />
      {item.status === "source_verification_pending" &&
        canReview &&
        independent && (
          <SourceVerificationForm
            key={item.revisionId}
            item={item}
            busy={busy}
            onRecord={(input) => onAction("verify_sources", input)}
          />
        )}
      <SourceVerificationHistory item={item} />
      {item.status === "technical_review" && canReview && independent && (
        <ReviewForm
          key={item.revisionId}
          item={item}
          busy={busy}
          onReview={(input) => onAction("review", input)}
        />
      )}
      <section className="card studio-panel">
        <h2>Revision history</h2>
        <ol className="studio-audit">
          {item.versions.map((version) => (
            <li key={version.revisionId}>
              <strong>
                Revision {version.revision} · {statusLabel(version.status)}
              </strong>
              <small>Author: {version.authorId}</small>
            </li>
          ))}
        </ol>
        <h2>Technical reviews</h2>
        {item.reviews.length ? (
          <ol className="studio-audit">
            {item.reviews.map((review) => (
              <li key={review.id}>
                <strong>{statusLabel(review.decision)}</strong>
                <small>
                  {review.createdAt} · Reviewer: {review.reviewerId} · Revision:{" "}
                  {review.revisionId}
                </small>
                <p>{review.findings}</p>
                {review.sourceChecks.map((check, index) => (
                  <p key={index}>
                    <strong>
                      {check.sourceId} · {statusLabel(check.outcome)}
                    </strong>
                    {check.notes}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        ) : (
          <p>No technical review has been recorded for this content.</p>
        )}
        <h2>Editorial audit</h2>
        <ol className="studio-audit">
          {item.events.map((event) => (
            <li key={event.id}>
              <strong>{statusLabel(event.event)}</strong>
              <small>
                {event.createdAt} · Actor: {event.actorId}
              </small>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function BlueprintReview({
  blueprints,
  busy,
  onRecord,
}: {
  blueprints: BlueprintSummary[];
  busy: boolean;
  onRecord: (input: Record<string, unknown>) => Promise<void>;
}) {
  const attestationId = useId();
  const [blueprintRevisionId, setBlueprint] = useState(blueprints[0]?.id || "");
  const [sourceUrl, setUrl] = useState("");
  const [edition, setEdition] = useState("");
  const [section, setSection] = useState("");
  const [notes, setNotes] = useState("");
  const [objectives, setObjectives] = useState([
    { code: "", domain: "1", title: "" },
  ]);
  const [attestation, setAttestation] = useState(false);
  const [error, setError] = useState("");
  const chosen = blueprints.find(
    (blueprint) => blueprint.id === blueprintRevisionId,
  );
  const canonical = blueprintRevisionId === CHST_BLUEPRINT_ID;
  const canonicalObjectives = chstObjectives.map((objective) => ({
    code: objective.id,
    domain: objective.domain,
    title: objective.statement,
  }));
  return (
    <form
      className="card studio-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          if (!attestation)
            throw new Error(
              "Record a blueprint review only after personally examining the official source.",
            );
          if (
            !confirm(
              "Record your blueprint source review and objective mappings? This does not approve any question or lesson.",
            )
          )
            return;
          await onRecord({
            blueprintRevisionId,
            sourceUrl,
            edition,
            section,
            notes,
            objectives: canonical ? canonicalObjectives : objectives,
            humanAttestation: true,
          });
          setAttestation(false);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "The blueprint review could not be recorded.",
          );
        }
      }}
    >
      <div className="eyebrow">ADMINISTRATOR SOURCE RECORD</div>
      <h2>Record a blueprint review.</h2>
      <p>
        Enter only the official document and objective mappings you actually
        examined. The supplied CHST5 V.2022.04.12 map preserves all 78
        statements; transcription does not establish that it is the latest
        official version or independently verify instructional claims.
      </p>
      <Field label="Blueprint to review">
        <select
          value={blueprintRevisionId}
          onChange={(event) => {
            setBlueprint(event.target.value);
            setAttestation(false);
          }}
          required
        >
          <option value="" disabled>
            Select a blueprint revision
          </option>
          {blueprints.map((blueprint) => (
            <option key={blueprint.id} value={blueprint.id}>
              {blueprint.certificationId.toUpperCase()} · {blueprint.version} ·{" "}
              {blueprint.verified ? "review recorded" : "unverified"}
            </option>
          ))}
        </select>
      </Field>
      {chosen && (
        <p className="studio-help">
          Domains recorded:{" "}
          {chosen.domains
            .map((domain) => `${domain.code} — ${domain.title}`)
            .join("; ")}
        </p>
      )}
      <Field label="Official blueprint source URL">
        <input
          type="url"
          value={sourceUrl}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://official-publisher.example/…"
          required
        />
      </Field>
      <div className="studio-field-grid">
        <Field label="Document edition or version">
          <input
            value={edition}
            onChange={(event) => setEdition(event.target.value)}
            required
          />
        </Field>
        <Field label="Exact reviewed section or pages">
          <input
            value={section}
            onChange={(event) => setSection(event.target.value)}
            required
          />
        </Field>
      </div>
      <fieldset>
        <legend>Verified objective mappings</legend>
        {canonical ? (
          <>
            <p>
              The canonical 78-statement map is read-only. Review every
              statement against the supplied document; this action cannot
              replace its wording or add invented objectives.
            </p>
            <details>
              <summary>Inspect all 78 canonical mappings</summary>
              <ol>
                {canonicalObjectives.map((objective) => (
                  <li key={objective.code}>
                    <strong>
                      {objective.code} · Domain {objective.domain}
                    </strong>
                    <p>{objective.title}</p>
                  </li>
                ))}
              </ol>
            </details>
          </>
        ) : (
          <>
            {objectives.map((objective, index) => (
              <div className="studio-repeated" key={index}>
                <div className="studio-field-grid">
                  <Field label={`Objective ${index + 1} code`}>
                    <input
                      value={objective.code}
                      onChange={(event) =>
                        setObjectives(
                          objectives.map((item, position) =>
                            position === index
                              ? { ...item, code: event.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                    />
                  </Field>
                  <Field label={`Objective ${index + 1} domain`}>
                    <input
                      value={objective.domain}
                      onChange={(event) =>
                        setObjectives(
                          objectives.map((item, position) =>
                            position === index
                              ? { ...item, domain: event.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                    />
                  </Field>
                </div>
                <Field label={`Objective ${index + 1} title`}>
                  <input
                    value={objective.title}
                    onChange={(event) =>
                      setObjectives(
                        objectives.map((item, position) =>
                          position === index
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      )
                    }
                    required
                  />
                </Field>
                {objectives.length > 1 && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      setObjectives(
                        objectives.filter((_, position) => position !== index),
                      )
                    }
                  >
                    Remove objective {index + 1}
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setObjectives([
                  ...objectives,
                  { code: "", domain: "", title: "" },
                ])
              }
            >
              Add objective mapping
            </button>
          </>
        )}
      </fieldset>
      <Field label="Blueprint review findings">
        <textarea
          rows={5}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          required
        />
      </Field>
      <div className="studio-check-label">
        <input
          id={attestationId}
          type="checkbox"
          checked={attestation}
          onChange={(event) => setAttestation(event.target.checked)}
          required
        />
        <label htmlFor={attestationId}>
          I personally examined the official source, its edition, domains, and
          the objective mappings entered above. This is my review record, not an
          automated verification claim.
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary"
        type="submit"
        disabled={busy || !attestation}
      >
        Record blueprint source review
      </button>
    </form>
  );
}
