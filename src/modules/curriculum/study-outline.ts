import type { CurriculumObjective } from "./types";

// CredBuilt navigation aids, not additions to the official blueprint or verified
// technical teaching. A reviewer still has to examine the relevant source text.
const hazardTerms = [
  ["ignition sources", "combustibles", "hot-work planning"],
  ["energized parts", "electrical exposure", "equipment condition"],
  ["soil conditions", "excavation protection", "adjacent loads"],
  ["edges and openings", "access", "work positioning"],
  ["restraint", "arrest", "equipment compatibility"],
  ["entry evaluation", "atmosphere", "rescue planning"],
  ["line of fire", "moving loads", "separation"],
  ["equipment movement", "visibility", "pedestrian interfaces"],
  ["load control", "rigging selection", "inspection"],
  ["lift planning", "ground conditions", "operating limits"],
  ["load characteristics", "handling method", "travel route"],
  ["stack stability", "access routes", "material compatibility"],
  ["access", "debris", "work-area condition"],
  ["tool selection", "substrate", "restricted access"],
  ["guards", "tool condition", "energy sources"],
  ["material identification", "exposure assessment", "specialist evaluation"],
  ["exposure pathways", "work methods", "exposure assessment"],
  ["sound level", "exposure duration", "noise control"],
  ["radiation type", "exposure pathways", "specialist assessment"],
  ["respirable dust", "task assessment", "exposure control"],
  ["chemical identity", "exposure routes", "compatibility"],
  ["environmental conditions", "work demands", "worker monitoring"],
  ["exposure duration", "tool characteristics", "work organization"],
  ["hazard classification", "labels", "safety data sheets"],
  ["design decisions", "life-cycle hazards", "risk reduction"],
  ["trade interfaces", "sequence", "coordination"],
  ["force", "posture", "repetition"],
  ["selection", "limitations", "compatibility"],
  ["measurement purpose", "instrument limits", "calibration"],
  ["exposure routes", "site conditions", "hygiene"],
  ["concrete operations", "equipment interfaces", "work sequencing"],
];
const domainTerms: Record<string, string[]> = {
  "1": ["hazard identification", "control selection", "effectiveness review"],
  "2": [
    "site-specific arrangements",
    "assigned roles",
    "communication",
    "response evaluation",
  ],
  "3": [
    "applicability",
    "responsibility",
    "implementation",
    "evidence and follow-up",
  ],
  "4": ["audience", "communication", "leadership", "feedback and learning"],
};
const candidateReferenceNumbers: Record<string, number[]> = {
  "1": [7, 10, 12, 14],
  "2": [1, 9, 21],
  "3": [2, 7, 16, 19],
  "4": [13, 19, 21],
};
// These are explicitly tentative study connections, not verified objective
// coverage or a claim that an existing demonstration lesson teaches the whole item.
const relatedLessons: Record<string, string[]> = {
  "1-S01": ["choose-controls"],
  "1-S02": ["recognize-hazards"],
  "1-S03": ["close-corrective-actions"],
  "1-K26": ["recognize-hazards"],
  "2-K02": ["prepare-emergencies"],
  "2-S02": ["prepare-emergencies"],
  "2-S07": ["prepare-emergencies"],
  "3-K03": ["review-programs"],
  "3-K08": ["learn-from-incidents"],
  "3-K09": ["learn-from-incidents"],
  "3-S03": ["learn-from-incidents"],
  "4-K01": ["check-understanding"],
  "4-K03": ["listen-and-follow-up"],
  "4-S01": ["check-understanding"],
};

export function objectiveStudyOutline(objective: CurriculumObjective) {
  const key = `${objective.domain}-${objective.kind === "knowledge" ? "K" : "S"}${String(objective.number).padStart(2, "0")}`;
  const terms =
    objective.domain === "1" && objective.kind === "knowledge"
      ? hazardTerms[objective.number - 1]
      : domainTerms[objective.domain];
  return {
    terms: terms || [],
    explanation:
      objective.kind === "knowledge"
        ? "Use this statement to organize what you need to recognize and explain. Identify the construction tasks, conditions, people, and decisions involved, then test your explanation against an applicable technical source. This outline helps you plan study; it does not establish a safe procedure or regulatory requirement."
        : "Turn this skill statement into a worked construction example. Explain your decisions, assumptions, assigned responsibilities, and follow-up. Compare your reasoning with an applicable technical source before applying it to field work.",
    prompts: [
      "Describe a realistic construction situation that makes this objective relevant.",
      "Define the terms you would need to explain the situation to a coworker.",
      "Find the applicable source, edition, section, and limits of applicability. Separate requirements from recommendations.",
      "Explain your reasoning, consider a plausible alternative, and identify what evidence would change your decision.",
    ],
    candidateReferenceNumbers:
      candidateReferenceNumbers[objective.domain] || [],
    relatedLessonIds: relatedLessons[key] || [],
  };
}
