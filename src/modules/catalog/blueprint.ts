// User-supplied CHST5 data: not independently verified against BCSP in this task.
export const domains = [
  {
    code: "1",
    title: "Hazard and Risk Identification and Control",
    short: "Hazard & risk control",
    weight: 3660,
  },
  {
    code: "2",
    title: "Emergency Preparedness, Incident Investigation, and Response",
    short: "Emergency preparedness",
    weight: 1990,
  },
  {
    code: "3",
    title: "Safety Program Development, Implementation, and Sustainment",
    short: "Safety programs",
    weight: 2250,
  },
  {
    code: "4",
    title: "Leadership, Communication, and Training",
    short: "Leadership & training",
    weight: 2100,
  },
] as const;
export const blueprint = {
  version: "CHST5",
  verified: false,
  provenance: "User-supplied; official source review pending",
  source:
    "https://www.bcsp.org/construction-health-and-safety-technician-chst/",
};

/** Hamilton allocation: stable ties follow input order, total always equals count. */
export function allocateDomains(
  count: number,
  weights: readonly number[],
): number[] {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    weights.length === 0 ||
    weights.some((w) => !Number.isFinite(w) || w <= 0)
  )
    throw new Error("Invalid allocation");
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (count * w) / sum);
  const result = exact.map(Math.floor);
  const remaining = count - result.reduce((a, b) => a + b, 0);
  const order = exact
    .map((n, i) => ({ i, remainder: n - result[i] }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (let i = 0; i < remaining; i++) result[order[i].i]++;
  return result;
}
