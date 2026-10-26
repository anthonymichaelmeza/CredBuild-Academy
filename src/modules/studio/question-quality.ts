import { contentDraftSchema } from "./model";
import {
  getChstObjective,
  CHST_BLUEPRINT_ID,
} from "@/modules/curriculum/catalog";

export type QualityRecord = {
  id: string;
  revisionId?: string;
  data: unknown;
  sourceVerified?: boolean;
};
export type QualityIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};
const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const words = (value: string) =>
  new Set(
    normalize(value)
      .split(" ")
      .filter((word) => word.length > 2),
  );

/** Mechanical checks and conservative writing flags, never technical accuracy
 * verification, plagiarism detection, or a substitute for human source review. */
export function questionQualityReport(
  records: readonly QualityRecord[],
  comparisonBudget = 200_000,
) {
  const results: {
    id: string;
    revisionId: string | null;
    issues: QualityIssue[];
  }[] = [];
  const stems: { id: string; stem: string; tokens: Set<string> }[] = [];
  const ids = new Set<string>();
  const answerPositions = { a: 0, b: 0, c: 0, d: 0 };
  let longestCorrect = 0,
    validQuestions = 0;
  for (const record of records) {
    const issues: QualityIssue[] = [];
    const issue = (
      code: string,
      severity: QualityIssue["severity"],
      message: string,
    ) => issues.push({ code, severity, message });
    if (!record.id || record.id.length > 100)
      issue(
        "invalid_id",
        "error",
        "A stable question identifier of 1–100 characters is required.",
      );
    if (ids.has(record.id))
      issue(
        "duplicate_id",
        "error",
        "The question ID occurs more than once in this input.",
      );
    ids.add(record.id);
    const parsed = contentDraftSchema.safeParse(record.data);
    if (!parsed.success || parsed.data.kind !== "question") {
      issue(
        "invalid_metadata",
        "error",
        "Question metadata, choices, key, or explanations do not match the question schema.",
      );
      results.push({
        id: record.id,
        revisionId: record.revisionId || null,
        issues,
      });
      continue;
    }
    const question = parsed.data,
      body = question.body;
    validQuestions++;
    if (body.choices.length !== 4)
      issue(
        "four_choices",
        "error",
        "CHST questions require exactly four options.",
      );
    if (
      new Set(body.choices.map((choice) => normalize(choice.text))).size !==
      body.choices.length
    )
      issue(
        "duplicate_options",
        "error",
        "Answer options must have distinct wording.",
      );
    const keyIndex = body.choices.findIndex(
      (choice) => choice.id === body.correctChoice,
    );
    if (keyIndex >= 0 && keyIndex < 4)
      answerPositions[(["a", "b", "c", "d"] as const)[keyIndex]]++;
    const objective = getChstObjective(question.objectiveCode);
    if (
      question.certificationId === "chst" &&
      (question.blueprintRevisionId !== CHST_BLUEPRINT_ID ||
        !objective ||
        objective.domain !== question.domain)
    )
      issue(
        "canonical_mapping",
        "error",
        "Select the exact objective in the matching supplied CHST5 domain/version.",
      );
    if (!question.subtopic)
      issue(
        "missing_subtopic",
        "warning",
        "Specify the concept within the topic before editorial approval.",
      );
    if (!question.sources.length)
      issue(
        "missing_citation",
        "error",
        "A primary supporting citation is required.",
      );
    else if (
      question.sources.some(
        (source) =>
          !source.edition ||
          !source.section ||
          (!source.url && !source.bibliographyId),
      )
    )
      issue(
        "citation_incomplete",
        "warning",
        "At least one citation lacks an established edition, locator or source identifier.",
      );
    if (!record.sourceVerified)
      issue(
        "source_unverified",
        "warning",
        "No currently authorized source-verification evidence was supplied for this exact revision.",
      );
    issue(
      "citation_currency_unknown",
      "warning",
      "Regulatory currency and applicability require examination of the actual current source; this checker does not infer obsolescence from a URL.",
    );
    const lengths = body.choices.map(
      (choice) => choice.text.trim().split(/\s+/).length,
    );
    const correctLength = lengths[keyIndex] || 0;
    if (
      correctLength >
      Math.max(...lengths.filter((_, index) => index !== keyIndex))
    )
      longestCorrect++;
    const otherAverage =
      lengths
        .filter((_, index) => index !== keyIndex)
        .reduce((sum, length) => sum + length, 0) /
      Math.max(1, lengths.length - 1);
    if (correctLength >= 15 && correctLength > otherAverage * 1.8)
      issue(
        "answer_length_clue",
        "warning",
        "The keyed option is substantially longer than its distractors; examine possible answer-length clues.",
      );
    if (
      /\b(?:all of the above|none of the above|always|never)\b/i.test(
        body.choices.map((choice) => choice.text).join(" "),
      )
    )
      issue(
        "absolute_wording",
        "warning",
        "Absolute wording or an all/none option may create a clue; review in context.",
      );
    if (/\b(?:except|not)\b/i.test(body.stem))
      issue(
        "negative_stem",
        "warning",
        "Review negative wording for avoidable ambiguity; a match is not proof of a defect.",
      );
    if (body.stem.length < 45)
      issue(
        "short_context",
        "warning",
        "Check whether the question provides sufficient construction context.",
      );
    if (
      body.explanation.length < 65 ||
      body.choices.some((choice) => choice.rationale.length < 25)
    )
      issue(
        "explanation_depth",
        "warning",
        "Review whether the explanation and each rationale address the particular choice.",
      );
    const keyed = body.choices[keyIndex];
    if (
      keyed &&
      /^\s*(?:this (?:choice|answer|option) is (?:incorrect|wrong)|incorrect\b)/i.test(
        keyed.rationale,
      )
    )
      issue(
        "possible_contradiction",
        "warning",
        "The keyed option's rationale appears to call it incorrect; a human must resolve the possible contradiction.",
      );
    if (
      body.choices.some(
        (choice, index) =>
          index !== keyIndex &&
          /^\s*(?:this (?:choice|answer|option) is correct|correct\b)/i.test(
            choice.rationale,
          ),
      )
    )
      issue(
        "possible_contradiction",
        "warning",
        "A distractor rationale appears to call it correct; review the intended key and explanation.",
      );
    stems.push({
      id: record.id,
      stem: normalize(body.stem),
      tokens: words(body.stem),
    });
    results.push({
      id: record.id,
      revisionId: record.revisionId || null,
      issues,
    });
  }
  const duplicates: {
    kind: "exact" | "near";
    questionIds: string[];
    similarity: number;
  }[] = [];
  const exact = new Map<string, string[]>();
  for (const item of stems)
    exact.set(item.stem, [...(exact.get(item.stem) || []), item.id]);
  for (const group of exact.values())
    if (group.length > 1)
      duplicates.push({ kind: "exact", questionIds: group, similarity: 1 });
  let comparisons = 0,
    comparisonLimitReached = false;
  outer: for (let left = 0; left < stems.length; left++)
    for (let right = left + 1; right < stems.length; right++) {
      if (stems[left].stem === stems[right].stem) continue;
      if (++comparisons > comparisonBudget) {
        comparisonLimitReached = true;
        break outer;
      }
      const a = stems[left].tokens,
        b = stems[right].tokens;
      if (
        Math.min(a.size, b.size) < 8 ||
        Math.min(a.size, b.size) / Math.max(a.size, b.size) < 0.82
      )
        continue;
      let intersection = 0;
      for (const word of a) if (b.has(word)) intersection++;
      const similarity = intersection / (a.size + b.size - intersection);
      if (similarity >= 0.82)
        duplicates.push({
          kind: "near",
          questionIds: [stems[left].id, stems[right].id],
          similarity: Math.round(similarity * 1000) / 1000,
        });
    }
  for (const duplicate of duplicates)
    for (const id of duplicate.questionIds)
      results
        .find((result) => result.id === id)
        ?.issues.push({
          code: `${duplicate.kind}_duplicate`,
          severity: "warning",
          message: `${duplicate.kind === "near" ? "Similar wording" : "Matching normalized wording"} requires editorial comparison with ${duplicate.questionIds.filter((other) => other !== id).join(", ")}. This is not a semantic or plagiarism verdict.`,
        });
  return {
    inspected: records.length,
    validQuestions,
    results,
    duplicates,
    comparisons: Math.min(comparisons, comparisonBudget),
    comparisonLimitReached,
    answerPositions,
    longestCorrect,
    errorCount: results.reduce(
      (sum, row) =>
        sum + row.issues.filter((issue) => issue.severity === "error").length,
      0,
    ),
    warningCount: results.reduce(
      (sum, row) =>
        sum + row.issues.filter((issue) => issue.severity === "warning").length,
      0,
    ),
    notice:
      "Mechanical writing checks only. No source was fetched, no answer was technically verified, and no approval or publication was created.",
  };
}
