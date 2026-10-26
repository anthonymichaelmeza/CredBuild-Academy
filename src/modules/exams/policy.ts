import {
  allocateDomains,
  blueprint,
  domains,
} from "@/modules/catalog/blueprint";
import { CHST_BLUEPRINT_VERSION } from "@/modules/curriculum/catalog";

/** A CredBuilt practice configuration requested by the product owner. This
 * does not attest that the latest BCSP blueprint or official duration was read. */
export const chstPracticeExamPolicy = {
  version: "chst5-practice-2022.04.12-240m-v1",
  certification: "chst",
  count: 200,
  durationSeconds: 14_400,
  durationBasis: "credbuilt_practice_configuration",
  blueprintVersion: CHST_BLUEPRINT_VERSION,
  latestOfficialVersionConfirmed: false,
  recentWindowDays: 30,
  domains: domains.map((domain, index) => ({
    code: domain.code,
    title: domain.title,
    required: allocateDomains(
      200,
      domains.map((item) => item.weight),
    )[index],
  })),
} as const;
export const fullExamPolicy = {
  certification: "chst",
  version: "chst-standard-240m-v1",
  count: 200,
  durationSeconds: 14_400,
  sourceVerified: false,
  allocation: allocateDomains(
    200,
    domains.map((d) => d.weight),
  ),
};
export function fullExamBlockers(
  approvedPerDomain: number[],
  verifiedDuration: number | null,
  verifiedBlueprint = blueprint.verified,
): string[] {
  const blockers: string[] = [];
  if (!verifiedBlueprint)
    blockers.push(
      "The current official blueprint has not been independently verified.",
    );
  if (
    !verifiedDuration ||
    !Number.isInteger(verifiedDuration) ||
    verifiedDuration < 60
  )
    blockers.push(
      "Configure the full examination timing policy before starting.",
    );
  fullExamPolicy.allocation.forEach((count, index) => {
    if ((approvedPerDomain[index] || 0) < count)
      blockers.push(
        `Domain ${index + 1} needs ${count} distinct approved questions; ${approvedPerDomain[index] || 0} available.`,
      );
  });
  return blockers;
}
