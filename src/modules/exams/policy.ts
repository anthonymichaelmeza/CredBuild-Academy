import {
  allocateDomains,
  blueprint,
  domains,
} from "@/modules/catalog/blueprint";
export const fullExamPolicy = {
  certification: "chst",
  version: "chst-demo-policy-0.4",
  count: 200,
  durationSeconds: null,
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
    blockers.push("The official examination duration is not verified.");
  fullExamPolicy.allocation.forEach((count, index) => {
    if ((approvedPerDomain[index] || 0) < count)
      blockers.push(
        `Domain ${index + 1} needs ${count} distinct approved questions; ${approvedPerDomain[index] || 0} available.`,
      );
  });
  return blockers;
}
