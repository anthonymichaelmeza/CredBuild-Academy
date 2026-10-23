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
import { fullExamPolicy } from "./policy";

/** Trusted server policy, never accepted from a learner's session request. */
export type ExamSelectionPolicy = {
  certification: string;
  blueprintVersion: string;
  blueprintVerified: boolean;
  durationSeconds: number | null;
  durationVerified: boolean;
  domains: readonly { code: string; weight: number }[];
};
export const currentExamSelectionPolicy: ExamSelectionPolicy = {
  certification: fullExamPolicy.certification,
  blueprintVersion: blueprint.documentVersion,
  blueprintVerified: blueprint.verified,
  durationSeconds: fullExamPolicy.durationSeconds,
  durationVerified: fullExamPolicy.sourceVerified,
  domains,
};
export function examPolicyBlockers(policy = currentExamSelectionPolicy) {
  const blockers: string[] = [];
  if (!policy.blueprintVerified)
    blockers.push(
      "The applicable official blueprint has not been independently verified.",
    );
  if (
    !policy.durationVerified ||
    !policy.durationSeconds ||
    !Number.isInteger(policy.durationSeconds) ||
    policy.durationSeconds < 60
  )
    blockers.push("The official examination duration has not been verified.");
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
      "A full-length examination must use the verified policy duration.",
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
