import { z } from "zod";
import {
  contentDraftSchema,
  questionTemplate,
  type ContentDraft,
  type ImportPreview,
} from "./model";
import {
  CHST_BLUEPRINT_ID,
  chstObjectives,
  getChstObjective,
} from "@/modules/curriculum/catalog";

export const QUESTION_IMPORT_MAX_BYTES = 250_000;
export const QUESTION_IMPORT_MAX_RECORDS = 50;
export type QuestionImportRecord = {
  row: number;
  externalId: string | null;
  content: ContentDraft;
};
export type QuestionImportPreview = ImportPreview & {
  format: "csv" | "json";
  sourceRows: number[];
  externalIds: (string | null)[];
};
export const externalQuestionId = z
  .string()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/,
    "Use a stable external ID of 1–100 letters, digits, dots, underscores, colons or hyphens.",
  );
export const questionBatchRequest = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("preview"),
      format: z.enum(["csv", "json"]),
      text: z.string().min(1).max(QUESTION_IMPORT_MAX_BYTES),
    })
    .strict(),
  z.object({ action: z.literal("confirm"), previewId: z.uuid() }).strict(),
]);

const required = [
  "id",
  "blueprint",
  "objective",
  "domain",
  "topic",
  "difficulty",
  "stem",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "correct_choice",
  "explanation",
  "rationale_a",
  "rationale_b",
  "rationale_c",
  "rationale_d",
  "source_title",
];
export const questionCsvColumns = [
  "id",
  "certification",
  "blueprint",
  "objective",
  "domain",
  "topic",
  "subtopic",
  "difficulty",
  "title",
  "stem",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "correct_choice",
  "explanation",
  "rationale_a",
  "rationale_b",
  "rationale_c",
  "rationale_d",
  "source_title",
  "source_url",
  "source_edition",
  "source_section",
  "source_classification",
  "origin",
  "content_kind",
];

/** RFC4180-style quoted fields, including commas, escaped quotes and newlines. */
function csvRows(input: string) {
  const rows: { row: number; values: string[] }[] = [];
  let values: string[] = [],
    field = "",
    quoted = false,
    closed = false,
    line = 1,
    start = 2;
  const source = input.replace(/^\uFEFF/, "");
  for (let index = 0; index <= source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === undefined)
        throw new Error(`CSV line ${line}: unterminated quoted field.`);
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
          closed = true;
        }
      } else {
        field += char;
        if (char === "\n") line++;
      }
      continue;
    }
    if (char === '"') {
      if (field || closed)
        throw new Error(`CSV line ${line}: quote must begin a field.`);
      quoted = true;
      continue;
    }
    if (
      closed &&
      char !== undefined &&
      char !== "," &&
      char !== "\n" &&
      char !== "\r"
    )
      throw new Error(`CSV line ${line}: unexpected text after closing quote.`);
    if (char === "," || char === "\n" || char === "\r" || char === undefined) {
      values.push(field);
      field = "";
      closed = false;
      if (char !== ",") {
        if (values.some((value) => value.trim()))
          rows.push({ row: rows.length ? start : 1, values });
        values = [];
        if (char === "\r" && source[index + 1] === "\n") index++;
        line++;
        start = line;
      }
    } else field += char;
  }
  return rows;
}

function csvContent(values: Record<string, string>) {
  const choices = ["a", "b", "c", "d"].map((id) => ({
    id,
    text: values[`choice_${id}`],
    rationale: values[`rationale_${id}`],
  }));
  return {
    kind: "question",
    certificationId: values.certification || "chst",
    blueprintRevisionId: values.blueprint,
    domain: values.domain,
    objectiveCode: values.objective,
    topic: values.topic,
    subtopic: values.subtopic || "",
    title: values.title || values.stem?.slice(0, 500),
    contentKind: values.content_kind || "instructional",
    origin: values.origin || "imported",
    sources: [
      {
        id: "source-1",
        title: values.source_title,
        url: values.source_url || "",
        edition: values.source_edition || "",
        section: values.source_section || "",
        ...(values.source_classification
          ? { classification: values.source_classification }
          : {}),
      },
    ],
    body: {
      type: "multiple_choice",
      stem: values.stem,
      choices,
      correctChoice: values.correct_choice?.toLowerCase(),
      explanation: values.explanation,
      difficulty: values.difficulty,
      media: [],
      solutionSteps: [],
    },
  };
}

export function parseQuestionBatch(format: "csv" | "json", text: string) {
  const records: QuestionImportRecord[] = [],
    errors: ImportPreview["errors"] = [],
    duplicates: string[] = [];
  if (new TextEncoder().encode(text).byteLength > QUESTION_IMPORT_MAX_BYTES)
    return {
      records,
      errors: [{ index: 0, message: "Choose a batch smaller than 250 KB." }],
      duplicates,
    };
  let input: { row: number; value: unknown }[];
  try {
    if (format === "json") {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed))
        throw new Error("JSON must contain an array of question records.");
      input = parsed.map((value, index) => ({ row: index + 1, value }));
    } else {
      const [header, ...data] = csvRows(text);
      if (!header)
        throw new Error("CSV requires a header and at least one question.");
      const names = header.values.map((value) => value.trim().toLowerCase());
      if (new Set(names).size !== names.length)
        throw new Error("CSV headers must be unique.");
      const missing = required.filter((name) => !names.includes(name));
      if (missing.length)
        throw new Error(`Missing CSV columns: ${missing.join(", ")}.`);
      const unknown = names.filter(
        (name) => !questionCsvColumns.includes(name),
      );
      if (unknown.length)
        throw new Error(`Unknown CSV columns: ${unknown.join(", ")}.`);
      input = data.map(({ row, values }) => {
        if (values.length !== names.length)
          return {
            row,
            value: {
              csvError: `Expected ${names.length} fields; received ${values.length}.`,
            },
          };
        const fields = Object.fromEntries(
          names.map((name, index) => [name, values[index].trim()]),
        );
        return { row, value: { id: fields.id, content: csvContent(fields) } };
      });
    }
    if (!input.length || input.length > QUESTION_IMPORT_MAX_RECORDS)
      throw new Error("Supply between 1 and 50 question records per batch.");
  } catch (error) {
    return {
      records,
      errors: [
        {
          index: 0,
          message:
            error instanceof Error
              ? error.message
              : "The batch could not be read.",
        },
      ],
      duplicates,
    };
  }
  const seen = new Set<string>();
  for (const { row, value } of input) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Expected a question object.");
      const object = value as Record<string, unknown>;
      if (object.csvError) throw new Error(String(object.csvError));
      const externalId =
        object.id === undefined ? null : externalQuestionId.parse(object.id);
      const content =
        "content" in object
          ? z
              .object({
                id: externalQuestionId.optional(),
                content: z.unknown(),
              })
              .strict()
              .parse(object).content
          : Object.fromEntries(
              Object.entries(object).filter(([key]) => key !== "id"),
            );
      const question = contentDraftSchema.parse(content);
      if (question.kind !== "question")
        throw new Error("Question Bank import accepts questions only.");
      const objective = getChstObjective(question.objectiveCode);
      if (
        question.certificationId !== "chst" ||
        question.blueprintRevisionId !== CHST_BLUEPRINT_ID ||
        !objective ||
        objective.domain !== question.domain
      )
        throw new Error(
          "Map this question to an exact supplied CHST5 objective and matching domain.",
        );
      if (
        question.body.choices.length !== 4 ||
        new Set(
          question.body.choices.map((choice) =>
            choice.text.trim().toLowerCase(),
          ),
        ).size !== 4
      )
        throw new Error(
          "CHST questions require exactly four distinct answer choices.",
        );
      if (!question.sources.length)
        throw new Error(
          "Add at least one candidate reference; unknown edition or section may remain blank pending review.",
        );
      if (externalId) {
        if (seen.has(externalId))
          duplicates.push(
            `Row ${row}: external ID ${externalId} occurs more than once in this batch.`,
          );
        seen.add(externalId);
      }
      records.push({ row, externalId, content: question });
    } catch (error) {
      errors.push({
        index: row - 1,
        message:
          error instanceof z.ZodError
            ? error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")
                .slice(0, 2000)
            : error instanceof Error
              ? error.message
              : "Invalid question record.",
      });
    }
  }
  return { records, errors, duplicates };
}

export function questionImportTemplates() {
  const objective = chstObjectives[0];
  const content = {
    ...questionTemplate,
    blueprintRevisionId: CHST_BLUEPRINT_ID,
    objectiveCode: objective.id,
    domain: objective.domain,
    origin: "imported" as const,
    sources: [
      {
        id: "source-1",
        title: "Replace with the actual candidate source",
        url: "",
        edition: "",
        section: "",
        classification: "professional_guidance" as const,
      },
    ],
    body: {
      ...questionTemplate.body,
      choices: ["a", "b", "c", "d"].map((id) => ({
        id,
        text: `Replace choice ${id.toUpperCase()}`,
        rationale: `Explain choice ${id.toUpperCase()} using sources that must be reviewed.`,
      })),
    },
  };
  const fields: Record<string, string> = {
    id: "your-stable-question-id",
    certification: "chst",
    blueprint: CHST_BLUEPRINT_ID,
    objective: objective.id,
    domain: objective.domain,
    topic: content.topic,
    difficulty: "introductory",
    stem: content.body.stem,
    correct_choice: "a",
    explanation: content.body.explanation,
    source_title: content.sources[0].title,
    source_classification: "professional_guidance",
    origin: "imported",
    content_kind: "instructional",
  };
  for (const choice of content.body.choices) {
    fields[`choice_${choice.id}`] = choice.text;
    fields[`rationale_${choice.id}`] = choice.rationale;
  }
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return {
    json: JSON.stringify([{ id: fields.id, ...content }], null, 2),
    csv: `${questionCsvColumns.join(",")}\r\n${questionCsvColumns.map((name) => quote(fields[name] || "")).join(",")}\r\n`,
  };
}
