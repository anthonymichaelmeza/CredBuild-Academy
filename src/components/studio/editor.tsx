"use client";
import { useRef, useState } from "react";
import { ArrowLeft, FilePlus2, Plus } from "lucide-react";
import { contentDraftSchema } from "@/modules/studio/model";
import type {
  BlueprintSummary,
  ContentDraft,
  LessonBody,
  MediaAsset,
  QuestionBody,
  SourceReference,
  StudioItem,
} from "@/modules/studio/model";
import { Field, ListTextArea, uid } from "./fields";
function newQuestion(): QuestionBody {
  return {
    type: "multiple_choice",
    stem: "",
    choices: [0, 1, 2, 3].map((index) => ({
      id: `c${index}`,
      text: "",
      rationale: "",
    })),
    correctChoice: "c0",
    explanation: "",
    difficulty: "introductory",
    media: [],
    solutionSteps: [],
  };
}
function newLesson(): LessonBody {
  return {
    summary: "",
    objectives: [],
    sections: [{ id: "section-1", title: "", paragraphs: [], reflection: "" }],
    checks: [
      {
        id: "check-1",
        stem: "",
        choices: [0, 1, 2, 3].map((position) => ({
          id: `c${position}`,
          text: "",
        })),
        correctChoice: "c0",
        explanation: "",
      },
    ],
    readingMinutes: 6,
    questionIds: [],
    relatedLessonIds: [],
    prerequisites: [],
    media: [],
    transcript: "",
  };
}
export function newDraft(
  kind: ContentDraft["kind"],
  blueprints: BlueprintSummary[],
): ContentDraft {
  const common = {
    certificationId: "chst",
    blueprintRevisionId: blueprints[0]?.id || "chst5-unverified",
    domain: "1",
    objectiveCode: "",
    topic: "",
    subtopic: "",
    title: "",
    contentKind: "instructional" as const,
    origin: "human_authored" as const,
    sources: [],
  };
  return kind === "question"
    ? { ...common, kind, body: newQuestion() }
    : { ...common, kind, body: newLesson() };
}

function MediaEditor({
  value,
  onChange,
}: {
  value: MediaAsset[];
  onChange: (items: MediaAsset[]) => void;
}) {
  function edit(index: number, key: keyof MediaAsset, text: string) {
    onChange(
      value.map((item, position) =>
        position === index ? { ...item, [key]: text } : item,
      ),
    );
  }
  return (
    <fieldset>
      <legend>Authorized media</legend>
      <p className="studio-help">
        Attach a licensed image or video URL and record its rights. No media
        generation or upload service is activated.
      </p>
      {value.map((item, index) => (
        <div className="studio-repeated" key={index}>
          <div className="studio-field-heading">
            <h3>Media {index + 1}</h3>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                onChange(value.filter((_, position) => position !== index))
              }
            >
              Remove media {index + 1}
            </button>
          </div>
          <Field label={`Media ${index + 1} type`}>
            <select
              value={item.kind}
              onChange={(event) => edit(index, "kind", event.target.value)}
            >
              <option value="image">Image or diagram</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </Field>
          <Field label={`Media ${index + 1} URL`}>
            <input
              value={item.url}
              onChange={(event) => edit(index, "url", event.target.value)}
              placeholder="https://… or /media/…"
              required
            />
          </Field>
          <Field label={`Media ${index + 1} description`}>
            <input
              value={item.alt}
              onChange={(event) => edit(index, "alt", event.target.value)}
              required
            />
          </Field>
          <Field label={`Media ${index + 1} rights or permission`}>
            <input
              value={item.rights}
              onChange={(event) => edit(index, "rights", event.target.value)}
              required
            />
          </Field>
          {item.kind !== "image" && (
            <>
              <Field
                label={`Media ${index + 1} captions URL`}
                hint="Use a WebVTT caption asset for video where available."
              >
                <input
                  value={item.captionsUrl || ""}
                  onChange={(event) =>
                    onChange(
                      value.map((media, position) =>
                        position === index
                          ? {
                              ...media,
                              captionsUrl: event.target.value || undefined,
                            }
                          : media,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={`Media ${index + 1} transcript`}>
                <textarea
                  rows={4}
                  value={item.transcript || ""}
                  onChange={(event) =>
                    edit(index, "transcript", event.target.value)
                  }
                />
              </Field>
            </>
          )}
        </div>
      ))}
      <button
        className="button secondary"
        type="button"
        onClick={() =>
          onChange([...value, { kind: "image", url: "", alt: "", rights: "" }])
        }
      >
        <Plus size={15} />
        Add authorized media
      </button>
    </fieldset>
  );
}
function SourceEditor({
  value,
  onChange,
}: {
  value: SourceReference[];
  onChange: (items: SourceReference[]) => void;
}) {
  function edit(index: number, key: keyof SourceReference, text: string) {
    onChange(
      value.map((item, position) =>
        position === index ? { ...item, [key]: text } : item,
      ),
    );
  }
  return (
    <fieldset>
      <legend>Technical source references</legend>
      <p className="studio-help">
        Draft citations are not verified evidence. An independent reviewer must
        examine the cited edition and exact supporting section before approval.
      </p>
      {value.map((source, index) => (
        <div className="studio-repeated" key={source.id}>
          <div className="studio-field-heading">
            <h3>Source {index + 1}</h3>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                onChange(value.filter((_, position) => position !== index))
              }
            >
              Remove source {index + 1}
            </button>
          </div>
          <Field label={`Source ${index + 1} title`}>
            <input
              value={source.title}
              onChange={(event) => edit(index, "title", event.target.value)}
              required
            />
          </Field>
          <Field label={`Source ${index + 1} URL`}>
            <input
              type="url"
              value={source.url}
              onChange={(event) => edit(index, "url", event.target.value)}
              placeholder="https://publisher.example/…"
              required
            />
          </Field>
          <div className="studio-field-grid">
            <Field label={`Source ${index + 1} edition`}>
              <input
                value={source.edition}
                onChange={(event) => edit(index, "edition", event.target.value)}
                required
              />
            </Field>
            <Field label={`Source ${index + 1} exact section`}>
              <input
                value={source.section}
                onChange={(event) => edit(index, "section", event.target.value)}
                required
              />
            </Field>
          </div>
        </div>
      ))}
      <button
        className="button secondary"
        type="button"
        onClick={() =>
          onChange([
            ...value,
            { id: uid("source"), title: "", url: "", edition: "", section: "" },
          ])
        }
      >
        <Plus size={15} />
        Add technical source
      </button>
    </fieldset>
  );
}

function QuestionEditor({
  value,
  onChange,
}: {
  value: QuestionBody;
  onChange: (body: QuestionBody) => void;
}) {
  function choice(index: number, key: "text" | "rationale", text: string) {
    onChange({
      ...value,
      choices: value.choices.map((item, position) =>
        position === index ? { ...item, [key]: text } : item,
      ),
    });
  }
  return (
    <>
      <div className="studio-field-grid">
        <Field label="Question type">
          <select
            value={value.type}
            onChange={(event) =>
              onChange({
                ...value,
                type: event.target.value as QuestionBody["type"],
              })
            }
          >
            <option value="multiple_choice">Multiple choice</option>
            <option value="scenario">Scenario</option>
            <option value="calculation">Calculation</option>
            <option value="image_hazard">
              Image-supported hazard identification
            </option>
            <option value="multi_step">Multi-step applied reasoning</option>
          </select>
        </Field>
        <Field label="Difficulty">
          <select
            value={value.difficulty}
            onChange={(event) =>
              onChange({
                ...value,
                difficulty: event.target.value as QuestionBody["difficulty"],
              })
            }
          >
            <option value="introductory">Introductory</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </Field>
      </div>
      <Field label="Question text">
        <textarea
          value={value.stem}
          onChange={(event) => onChange({ ...value, stem: event.target.value })}
          rows={4}
          required
        />
      </Field>
      <fieldset>
        <legend>Answer choices and distractor explanations</legend>
        {value.choices.map((item, index) => (
          <div className="studio-repeated" key={item.id}>
            <div className="studio-field-heading">
              <h3>Choice {String.fromCharCode(65 + index)}</h3>
              {value.choices.length > 2 && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    const choices = value.choices.filter(
                      (_, position) => position !== index,
                    );
                    onChange({
                      ...value,
                      choices,
                      correctChoice:
                        item.id === value.correctChoice
                          ? choices[0].id
                          : value.correctChoice,
                    });
                  }}
                >
                  Remove choice {String.fromCharCode(65 + index)}
                </button>
              )}
            </div>
            <Field label={`Choice ${String.fromCharCode(65 + index)} text`}>
              <textarea
                rows={2}
                value={item.text}
                onChange={(event) => choice(index, "text", event.target.value)}
                required
              />
            </Field>
            <Field
              label={`Choice ${String.fromCharCode(65 + index)} explanation`}
            >
              <textarea
                rows={2}
                value={item.rationale}
                onChange={(event) =>
                  choice(index, "rationale", event.target.value)
                }
                required
              />
            </Field>
          </div>
        ))}
        {value.choices.length < 6 && (
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              onChange({
                ...value,
                choices: [
                  ...value.choices,
                  { id: uid("choice"), text: "", rationale: "" },
                ],
              })
            }
          >
            <Plus size={15} />
            Add answer choice
          </button>
        )}
        <Field label="Correct answer">
          <select
            value={value.correctChoice}
            onChange={(event) =>
              onChange({ ...value, correctChoice: event.target.value })
            }
          >
            {value.choices.map((item, index) => (
              <option key={item.id} value={item.id}>
                Choice {String.fromCharCode(65 + index)}
                {item.text ? ` — ${item.text.slice(0, 60)}` : ""}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>
      <Field label="Correct-answer explanation">
        <textarea
          value={value.explanation}
          onChange={(event) =>
            onChange({ ...value, explanation: event.target.value })
          }
          rows={4}
          required
        />
      </Field>
      <Field
        label="Calculation or worked-solution steps"
        hint="One step per line. Include the formula, units, assumptions, and result where applicable."
      >
        <ListTextArea
          rows={4}
          value={value.solutionSteps}
          onChange={(solutionSteps) => onChange({ ...value, solutionSteps })}
        />
      </Field>
      <MediaEditor
        value={value.media}
        onChange={(media) => onChange({ ...value, media })}
      />
    </>
  );
}

function LessonEditor({
  value,
  onChange,
}: {
  value: LessonBody;
  onChange: (body: LessonBody) => void;
}) {
  function section(
    index: number,
    patch: Partial<LessonBody["sections"][number]>,
  ) {
    onChange({
      ...value,
      sections: value.sections.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    });
  }
  function check(index: number, patch: Partial<LessonBody["checks"][number]>) {
    onChange({
      ...value,
      checks: value.checks.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    });
  }
  return (
    <>
      <Field label="Lesson summary">
        <textarea
          rows={3}
          value={value.summary}
          onChange={(event) =>
            onChange({ ...value, summary: event.target.value })
          }
          required
        />
      </Field>
      <Field
        label="Learning objectives"
        hint="One learning objective per line."
      >
        <ListTextArea
          value={value.objectives}
          onChange={(objectives) => onChange({ ...value, objectives })}
          required
        />
      </Field>
      <Field label="Estimated reading minutes">
        <input
          type="number"
          min={1}
          max={240}
          value={value.readingMinutes}
          onChange={(event) =>
            onChange({ ...value, readingMinutes: Number(event.target.value) })
          }
          required
        />
      </Field>
      <fieldset>
        <legend>Structured educational sections</legend>
        {value.sections.map((item, index) => (
          <div className="studio-repeated" key={item.id}>
            <div className="studio-field-heading">
              <h3>Section {index + 1}</h3>
              {value.sections.length > 1 && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      sections: value.sections.filter(
                        (_, position) => position !== index,
                      ),
                    })
                  }
                >
                  Remove section {index + 1}
                </button>
              )}
            </div>
            <Field label={`Section ${index + 1} title`}>
              <input
                value={item.title}
                onChange={(event) =>
                  section(index, { title: event.target.value })
                }
                required
              />
            </Field>
            <Field
              label={`Section ${index + 1} educational content`}
              hint="Separate paragraphs with a blank line; use plain-text formulas and units."
            >
              <ListTextArea
                rows={6}
                value={item.paragraphs}
                paragraphs
                onChange={(paragraphs) => section(index, { paragraphs })}
                required
              />
            </Field>
            <Field
              label={`Section ${index + 1} reflection or practical example`}
            >
              <textarea
                rows={3}
                value={item.reflection}
                onChange={(event) =>
                  section(index, { reflection: event.target.value })
                }
              />
            </Field>
          </div>
        ))}
        <button
          className="button secondary"
          type="button"
          onClick={() =>
            onChange({
              ...value,
              sections: [
                ...value.sections,
                {
                  id: uid("section"),
                  title: "",
                  paragraphs: [],
                  reflection: "",
                },
              ],
            })
          }
        >
          <Plus size={15} />
          Add lesson section
        </button>
      </fieldset>
      <fieldset>
        <legend>Knowledge checks</legend>
        {value.checks.map((item, index) => (
          <div className="studio-repeated" key={item.id}>
            <div className="studio-field-heading">
              <h3>Knowledge check {index + 1}</h3>
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    checks: value.checks.filter(
                      (_, position) => position !== index,
                    ),
                  })
                }
              >
                Remove knowledge check {index + 1}
              </button>
            </div>
            <Field label={`Knowledge check ${index + 1} question`}>
              <textarea
                value={item.stem}
                onChange={(event) => check(index, { stem: event.target.value })}
                required
              />
            </Field>
            {item.choices.map((answer, position) => (
              <Field
                key={answer.id}
                label={`Knowledge check ${index + 1} choice ${String.fromCharCode(65 + position)}`}
              >
                <input
                  value={answer.text}
                  onChange={(event) =>
                    check(index, {
                      choices: item.choices.map((choice, choiceIndex) =>
                        choiceIndex === position
                          ? { ...choice, text: event.target.value }
                          : choice,
                      ),
                    })
                  }
                  required
                />
              </Field>
            ))}
            <Field label={`Knowledge check ${index + 1} correct answer`}>
              <select
                value={item.correctChoice}
                onChange={(event) =>
                  check(index, { correctChoice: event.target.value })
                }
              >
                {item.choices.map((answer, position) => (
                  <option key={answer.id} value={answer.id}>
                    Choice {String.fromCharCode(65 + position)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Knowledge check ${index + 1} explanation`}>
              <textarea
                value={item.explanation}
                onChange={(event) =>
                  check(index, { explanation: event.target.value })
                }
                required
              />
            </Field>
          </div>
        ))}
        <button
          className="button secondary"
          type="button"
          onClick={() =>
            onChange({
              ...value,
              checks: [
                ...value.checks,
                {
                  id: uid("check"),
                  stem: "",
                  choices: [0, 1, 2, 3].map((position) => ({
                    id: `c${position}`,
                    text: "",
                  })),
                  correctChoice: "c0",
                  explanation: "",
                },
              ],
            })
          }
        >
          <Plus size={15} />
          Add knowledge check
        </button>
      </fieldset>
      <div className="studio-field-grid">
        <Field label="Related question IDs" hint="One ID per line.">
          <ListTextArea
            value={value.questionIds}
            onChange={(questionIds) => onChange({ ...value, questionIds })}
          />
        </Field>
        <Field label="Related lesson IDs" hint="One ID per line.">
          <ListTextArea
            value={value.relatedLessonIds}
            onChange={(relatedLessonIds) =>
              onChange({ ...value, relatedLessonIds })
            }
          />
        </Field>
      </div>
      <Field
        label="Prerequisite lesson IDs"
        hint="One ID per line. Prerequisites must be available in the published learning pathway."
      >
        <ListTextArea
          value={value.prerequisites}
          onChange={(prerequisites) => onChange({ ...value, prerequisites })}
        />
      </Field>
      <MediaEditor
        value={value.media}
        onChange={(media) => onChange({ ...value, media })}
      />
      <Field label="Video transcript or narration script">
        <textarea
          value={value.transcript}
          onChange={(event) =>
            onChange({ ...value, transcript: event.target.value })
          }
          rows={6}
        />
      </Field>
    </>
  );
}

export function DraftEditor({
  initial,
  original,
  blueprints,
  busy,
  onSave,
  onCancel,
}: {
  initial: ContentDraft;
  original: StudioItem | null;
  blueprints: BlueprintSummary[];
  busy: boolean;
  onSave: (content: ContentDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ContentDraft>(() =>
    structuredClone(initial),
  );
  const [error, setError] = useState("");
  const savePending = useRef(false);
  const [saving, setSaving] = useState(false);
  const blueprint = blueprints.find(
    (item) => item.id === draft.blueprintRevisionId,
  );
  return (
    <form
      className="card studio-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || savePending.current) return;
        savePending.current = true;
        setSaving(true);
        setError("");
        try {
          const checked = contentDraftSchema.safeParse(draft);
          if (!checked.success)
            throw new Error(
              checked.error.issues
                .map((issue) => `${issue.path.join(" → ")}: ${issue.message}`)
                .slice(0, 4)
                .join("; "),
            );
          await onSave(checked.data);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "This draft could not be saved.",
          );
        } finally {
          savePending.current = false;
          setSaving(false);
        }
      }}
    >
      <div className="studio-field-heading">
        <div>
          <div className="eyebrow">
            {original
              ? `NEW REVISION AFTER ${original.revision}`
              : "CREATE ORIGINAL CONTENT"}
          </div>
          <h2>
            {draft.kind === "question" ? "Question editor" : "Lesson editor"}
          </h2>
        </div>
        <button
          type="button"
          className="button secondary"
          onClick={onCancel}
          disabled={busy || saving}
        >
          <ArrowLeft size={15} />
          Back to library
        </button>
      </div>
      <p>
        Saving creates a draft revision. Sources, blueprint mapping, answer
        accuracy, and media need independent technical review before
        publication.
      </p>
      <Field label="Content title">
        <input
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          required
          maxLength={240}
        />
      </Field>
      <div className="studio-field-grid">
        <Field label="Certification ID">
          <input
            value={draft.certificationId}
            onChange={(event) =>
              setDraft({ ...draft, certificationId: event.target.value })
            }
            required
          />
        </Field>
        <Field label="Blueprint revision">
          <select
            value={draft.blueprintRevisionId}
            onChange={(event) =>
              setDraft({
                ...draft,
                blueprintRevisionId: event.target.value,
                objectiveCode: "",
              })
            }
          >
            {!blueprints.length && (
              <option value={draft.blueprintRevisionId}>
                {draft.blueprintRevisionId} — unverified
              </option>
            )}
            {blueprints.map((item) => (
              <option key={item.id} value={item.id}>
                {item.version} —{" "}
                {item.verified ? "review recorded" : "unverified"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Domain">
          <input
            value={draft.domain}
            onChange={(event) =>
              setDraft({ ...draft, domain: event.target.value })
            }
            list="studio-domain-options"
            required
          />
          <datalist id="studio-domain-options">
            {blueprint?.domains.map((domain) => (
              <option key={domain.code} value={domain.code}>
                {domain.title}
              </option>
            ))}
          </datalist>
        </Field>
        <Field
          label="Blueprint objective code"
          hint="An exact objective from a verified blueprint is required for approval."
        >
          <input
            value={draft.objectiveCode}
            onChange={(event) =>
              setDraft({ ...draft, objectiveCode: event.target.value })
            }
            list="studio-objective-options"
          />
          <datalist id="studio-objective-options">
            {blueprint?.objectives
              .filter((objective) => objective.domain === draft.domain)
              .map((objective) => (
                <option key={objective.code} value={objective.code}>
                  {objective.title}
                </option>
              ))}
          </datalist>
        </Field>
        <Field label="Topic">
          <input
            value={draft.topic}
            onChange={(event) =>
              setDraft({ ...draft, topic: event.target.value })
            }
            required
          />
        </Field>
        <Field label="Subtopic">
          <input
            value={draft.subtopic}
            onChange={(event) =>
              setDraft({ ...draft, subtopic: event.target.value })
            }
          />
        </Field>
        <Field label="Content classification">
          <select
            value={draft.contentKind}
            onChange={(event) =>
              setDraft({
                ...draft,
                contentKind: event.target.value as ContentDraft["contentKind"],
              })
            }
          >
            <option value="instructional">
              Instructional draft — unpublished
            </option>
            <option value="demonstration">
              Demonstration — cannot publish
            </option>
          </select>
        </Field>
        <Field label="Content origin">
          <select
            value={draft.origin}
            onChange={(event) =>
              setDraft({
                ...draft,
                origin: event.target.value as ContentDraft["origin"],
              })
            }
          >
            <option value="human_authored">Human authored</option>
            <option value="ai_generated">AI-generated draft</option>
            <option value="imported">Imported source material</option>
          </select>
        </Field>
      </div>
      <SourceEditor
        value={draft.sources}
        onChange={(sources) => setDraft({ ...draft, sources })}
      />
      {draft.kind === "question" ? (
        <QuestionEditor
          value={draft.body}
          onChange={(body) => setDraft({ ...draft, kind: "question", body })}
        />
      ) : (
        <LessonEditor
          value={draft.body}
          onChange={(body) => setDraft({ ...draft, kind: "lesson", body })}
        />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="studio-actions">
        <button
          className="button primary"
          disabled={busy || saving}
          type="submit"
        >
          <FilePlus2 size={17} />
          {busy || saving
            ? "Saving draft…"
            : original
              ? "Save new draft revision"
              : "Save draft"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={busy || saving}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
