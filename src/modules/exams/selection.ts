import {
  allocateDomains,
  blueprint,
  domains,
} from "@/modules/catalog/blueprint";
import {
  eligibleQuestions,
  selectQuestions,
  type Config,
  type PriorAttempt,
} from "@/modules/practice/engine";
import type { Question } from "@/modules/practice/types";
import { fullExamPolicy, chstPracticeExamPolicy } from "./policy";
import { getChstObjective } from "@/modules/curriculum/catalog";
import { currentQuestionVersions } from "@/modules/practice/engine";

/** Trusted server policy, never accepted from a learner's session request. */
export type ExamSelectionPolicy = {
  certification: string;
  blueprintVersion: string;
  blueprintVerified: boolean;
  durationSeconds: number | null;
  durationVerified: boolean;
  /** Explicit standard configuration does not manufacture source-review evidence. */
  durationConfigured?: boolean;
  domains: readonly { code: string; weight: number }[];
};
export const currentExamSelectionPolicy: ExamSelectionPolicy = {
  certification: fullExamPolicy.certification,
  blueprintVersion: blueprint.documentVersion,
  blueprintVerified: blueprint.verified,
  durationSeconds: fullExamPolicy.durationSeconds,
  durationVerified: fullExamPolicy.sourceVerified,
  durationConfigured: true,
  domains,
};
export function examPolicyBlockers(policy = currentExamSelectionPolicy) {
  const blockers: string[] = [];
  if (!policy.blueprintVerified)
    blockers.push(
      "The applicable official blueprint has not been independently verified.",
    );
  if (
    (!policy.durationVerified && !policy.durationConfigured) ||
    !policy.durationSeconds ||
    !Number.isInteger(policy.durationSeconds) ||
    policy.durationSeconds < 60
  )
    blockers.push(
      "Configure a valid examination duration policy before starting.",
    );
  return blockers;
}

/** Test policies are fictional fixtures. Application starts use the trusted policy. */
export function selectFullLengthExam(
  pool: Question[],
  config: Config,
  history: PriorAttempt[],
  bookmarks: readonly string[] = [],
  policy = currentExamSelectionPolicy,
  random: () => number = Math.random,
) {
  if (
    config.count !== 200 ||
    config.mode !== "exam" ||
    config.bank !== "published"
  )
    throw new Error(
      "A full-length exam requires 200 approved, published instructional questions.",
    );
  const blockers = examPolicyBlockers(policy);
  if (blockers.length) throw new Error(blockers.join(" "));
  if ((config.certification || "chst") !== policy.certification)
    throw new Error(
      "No verified full-exam policy is configured for this certification.",
    );
  if (config.durationSeconds !== policy.durationSeconds)
    throw new Error(
      "A full-length examination must use the configured policy duration.",
    );
  const eligible = eligibleQuestions(
    pool.filter(
      (question) =>
        question.contentKind === "instructional" &&
        ["approved", "published"].includes(question.reviewStatus) &&
        question.blueprint?.version === policy.blueprintVersion,
    ),
    config,
    history,
    bookmarks,
  );
  const allocation = allocateDomains(
    200,
    policy.domains.map((domain) => domain.weight),
  );
  const selected = policy.domains.flatMap((domain, index) => {
    const candidates = eligible.filter(
      (question) => question.domain === domain.code,
    );
    const required = allocation[index];
    if (candidates.length < required)
      throw new Error(
        `Domain ${domain.code} requires ${required} distinct published questions; ${candidates.length} eligible.`,
      );
    return selectQuestions(
      candidates,
      { ...config, count: required, domain: domain.code },
      history,
      random,
      bookmarks,
    );
  });
  if (
    selected.length !== 200 ||
    new Set(selected.map((question) => question.id)).size !== 200
  )
    throw new Error(
      "The exam pool does not contain 200 distinct eligible questions.",
    );
  for (let index = selected.length - 1; index > 0; index--) {
    const other = Math.min(
      index,
      Math.max(0, Math.floor(random() * (index + 1))),
    );
    [selected[index], selected[other]] = [selected[other], selected[index]];
  }
  return selected;
}

type PracticeExamOptions = {
  /** Trusted server callers only, after the isolated local-fixture guard. */
  developmentFixture?: boolean;
  now?: number;
};

function validExamShape(question: Question) {
  const objective = getChstObjective(question.blueprint?.objective || "");
  const text = (value: unknown): value is string =>
    typeof value === "string" && Boolean(value.trim());
  return Boolean(
    text(question.id) &&
    Number.isInteger(question.version) &&
    question.version > 0 &&
    question.certification === chstPracticeExamPolicy.certification &&
    question.blueprint?.version === chstPracticeExamPolicy.blueprintVersion &&
    objective?.domain === question.domain &&
    text(question.stem) &&
    text(question.topic) &&
    ["introductory", "intermediate", "advanced"].includes(
      question.difficulty,
    ) &&
    text(question.explanation) &&
    Array.isArray(question.choices) &&
    question.choices.length === 4 &&
    question.choices.every(
      (choice) =>
        choice &&
        text(choice.id) &&
        text(choice.text) &&
        text(choice.rationale),
    ) &&
    new Set(question.choices.map((choice) => choice.id)).size === 4 &&
    new Set(question.choices.map((choice) => choice.text.trim().toLowerCase()))
      .size === 4 &&
    question.choices.filter((choice) => choice.id === question.correctChoice)
      .length === 1,
  );
}

/** Publication provenance is checked by the server's current-pointer SQL query;
 * this second check rejects malformed snapshots and incomplete source evidence. */
export function eligibleFullLengthQuestions(
  pool: readonly Question[],
  options: PracticeExamOptions = {},
): Question[] {
  const now = options.now ?? Date.now();
  const stems = new Set<string>();
  return currentQuestionVersions([...pool]).filter((question) => {
    if (!validExamShape(question)) return false;
    if (!options.developmentFixture) {
      if (
        question.contentKind !== "instructional" ||
        !["approved", "published"].includes(question.reviewStatus)
      )
        return false;
      const sources = [question.reference, ...(question.references || [])];
      if (
        !sources.every(
          (source) =>
            source &&
            typeof source.title === "string" &&
            source.title.trim() &&
            typeof source.locator === "string" &&
            source.locator.trim() &&
            typeof source.edition === "string" &&
            source.edition.trim() &&
            [
              "regulatory_requirement",
              "consensus_standard",
              "professional_guidance",
              "supplemental_resource",
            ].includes(source.classification || "") &&
            source.verificationStatus !== "pending" &&
            source.verifiedAt &&
            Number.isFinite(Date.parse(source.verifiedAt)) &&
            Date.parse(source.verifiedAt) <= now &&
            (!source.url || source.url.startsWith("https://")),
        )
      )
        return false;
    } else if (
      question.contentKind !== "demonstration" ||
      question.reviewStatus !== "draft"
    ) {
      return false;
    }
    const stem = question.stem.trim().replace(/\s+/g, " ").toLowerCase();
    if (stems.has(stem)) return false;
    stems.add(stem);
    return true;
  });
}

export function fullLengthAvailability(
  pool: readonly Question[],
  options: PracticeExamOptions = {},
) {
  const eligible = eligibleFullLengthQuestions(pool, options);
  return {
    domains: chstPracticeExamPolicy.domains.map((domain) => {
      const count = eligible.filter(
        (question) => question.domain === domain.code,
      ).length;
      return {
        ...domain,
        eligible: count,
        shortfall: Math.max(0, domain.required - count),
      };
    }),
    eligibleTotal: eligible.length,
    invalidCount: currentQuestionVersions([...pool]).length - eligible.length,
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1)
      throw new Error("Invalid exam randomization source.");
    const other = Math.floor(sample * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Builds the explicitly configured four-hour CredBuilt practice examination.
 * This is separate from the legacy verified-official-policy gate above. */
export function buildFullLengthPracticeExam(
  pool: readonly Question[],
  history: readonly PriorAttempt[] = [],
  options: PracticeExamOptions & { random?: () => number } = {},
): Question[] {
  const eligible = eligibleFullLengthQuestions(pool, options);
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now();
  const cutoff = now - chstPracticeExamPolicy.recentWindowDays * 86_400_000;
  const recent = new Map<string, number>();
  for (const attempt of history) {
    const time = Date.parse(attempt.answeredAt);
    if (Number.isFinite(time) && time >= cutoff)
      recent.set(
        attempt.questionId,
        Math.max(recent.get(attempt.questionId) ?? 0, time),
      );
  }
  const selected = chstPracticeExamPolicy.domains.flatMap((domain) => {
    const candidates = eligible.filter(
      (question) => question.domain === domain.code,
    );
    if (candidates.length < domain.required)
      throw new Error(
        `Domain ${domain.code} (${domain.title}) needs ${domain.required} distinct eligible questions; ${candidates.length} available (${domain.required - candidates.length} short).`,
      );
    const fresh = shuffled(
      candidates.filter((question) => !recent.has(question.id)),
      random,
    );
    const fallback = shuffled(
      candidates.filter((question) => recent.has(question.id)),
      random,
    ).sort((a, b) => recent.get(a.id)! - recent.get(b.id)!);
    return [...fresh, ...fallback].slice(0, domain.required);
  });
  if (
    selected.length !== 200 ||
    new Set(selected.map((question) => question.id)).size !== 200
  )
    throw new Error(
      "A full-length examination requires exactly 200 distinct questions.",
    );
  return shuffled(selected, random);
}
