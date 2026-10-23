import type { DraftQuestionRecord } from "./draft-types";

/** Original AI-authored drafts; bibliography inclusion does not verify these answers. */
type Choice = readonly [text: string, rationale: string];
type Category = DraftQuestionRecord["category"];
const references = {
  standards: {
    id: "candidate-osha-construction-standards",
    title: "OSHA construction standards — candidate regulatory collection",
    url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926",
    edition: "",
    section: "",
    classification: "regulatory_requirement" as const,
  },
  management: {
    id: "candidate-hill-construction-management",
    title:
      "Construction Safety Management and Engineering — Hill, 2nd Edition (2014), bibliography-listed candidate",
    url: "",
    edition: "2nd Edition (2014)",
    section: "",
    classification: "professional_guidance" as const,
  },
  investigation: {
    id: "candidate-oakley-investigation",
    title:
      "Accident Investigation Techniques — Oakley, 2nd Edition (2012), bibliography-listed candidate",
    url: "",
    edition: "2nd Edition (2012)",
    section: "",
    classification: "professional_guidance" as const,
  },
  records: {
    id: "candidate-osha-recordkeeping",
    title:
      "OSHA injury and illness recordkeeping resources — candidate entry point",
    url: "https://www.osha.gov/recordkeeping",
    edition: "",
    section: "",
    classification: "regulatory_requirement" as const,
  },
};
function draft(
  id: number,
  objective: string,
  topic: string,
  subtopic: string,
  category: Category,
  difficulty: "introductory" | "intermediate" | "advanced",
  stem: string,
  choices: readonly [Choice, Choice, Choice, Choice],
  correctChoice: "a" | "b" | "c" | "d",
  explanation: string,
  reference: keyof typeof references,
  solutionSteps: string[] = [],
): DraftQuestionRecord {
  // Stable per-record ordering breaks answer-position cycles while keeping
  // each rationale paired with its choice and preserving a reproducible key.
  const order = [0, 1, 2, 3];
  let seed = Math.imul(id, 0x9e3779b1) >>> 0;
  for (let position = order.length - 1; position > 0; position--) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const other = (seed >>> 0) % (position + 1);
    [order[position], order[other]] = [order[other], order[position]];
  }
  const originalCorrect = correctChoice.charCodeAt(0) - 97;
  return {
    id: `chst5-draft-${String(id).padStart(3, "0")}`,
    category,
    sourceVerifiedAt: null,
    technicalReviewer: null,
    reviewStatus: "draft",
    revision: 1,
    content: {
      kind: "question",
      certificationId: "chst",
      blueprintRevisionId: "chst5-2022.04.12",
      domain: "3",
      objectiveCode: `CHST5-2022.04.12-D3-${objective}`,
      topic,
      subtopic,
      title: topic + ": " + subtopic,
      contentKind: "instructional",
      origin: "ai_generated",
      sources: [{ ...references[reference] }],
      body: {
        type: solutionSteps.length
          ? "calculation"
          : category === "scenario"
            ? "scenario"
            : "multiple_choice",
        stem,
        choices: order.map((original, index) => ({
          id: String.fromCharCode(97 + index),
          text: choices[original][0],
          rationale: choices[original][1],
        })),
        correctChoice: String.fromCharCode(97 + order.indexOf(originalCorrect)),
        explanation,
        difficulty,
        media: [],
        solutionSteps,
      },
    },
  };
}
export const domain3Drafts: DraftQuestionRecord[] = [
  draft(
    58,
    "K01",
    "Standards applicability",
    "Requirement versus guidance",
    "foundational",
    "introductory",
    "A draft site procedure cites both an OSHA regulation and a trade association's recommended practice. Which editorial approach best distinguishes their roles?",
    [
      [
        "Describe both as mandatory OSHA requirements because they address the same hazard.",
        "A recommendation does not become an OSHA requirement merely because it addresses a regulated hazard.",
      ],
      [
        "Identify the applicable regulation separately and label the association material as guidance unless another basis makes it binding.",
        "This separates the source's legal status from its possible technical usefulness and allows applicability to be assessed.",
      ],
      [
        "Omit the regulation's applicability conditions whenever the guidance recommends a more protective practice.",
        "A protective recommendation does not remove the need to identify which legal requirements apply.",
      ],
      [
        "Treat the newer publication as the legal requirement regardless of its publisher.",
        "Publication recency alone does not establish legal authority or applicability.",
      ],
    ],
    "b",
    "Technical usefulness, contractual adoption, and legal authority are distinct questions. The procedure should identify the applicable regulation and its scope, and accurately label guidance. This draft does not determine the legal status of an unidentified document for a particular jurisdiction.",
    "standards",
  ),
  draft(
    59,
    "K02",
    "Site-specific safety plans",
    "Operational responsibilities",
    "applied_technical",
    "intermediate",
    "A contractor's site safety plan describes its corporate values and lists hazards common to construction. It does not assign responsibilities for the project's planned temporary works or explain how changed conditions are handled. Which revision most improves the plan's operational value?",
    [
      [
        "Add more examples of hazards from unrelated completed projects.",
        "Additional examples do not assign responsibilities or establish a process for this project's changing work.",
      ],
      [
        "Replace the project name on each page with the client's full legal name.",
        "Administrative consistency does not resolve missing operational responsibilities.",
      ],
      [
        "Attach the company's annual injury-rate chart as the plan's primary control measure.",
        "Historical injury data cannot substitute for planning and controlling the project's actual work.",
      ],
      [
        "Connect the planned work and hazards to named roles, required coordination, controls, and triggers for review.",
        "These details make the plan usable for the project's tasks and foreseeable changes.",
      ],
    ],
    "d",
    "A site-specific plan should connect actual work to responsibilities, coordination, controls, and review triggers. Corporate policy can provide context, but operational arrangements are needed for the people implementing the plan.",
    "management",
  ),
  draft(
    60,
    "K03",
    "Inspections and audits",
    "Corrective-action effectiveness",
    "scenario",
    "intermediate",
    "An inspection finding is marked closed because replacement guards were purchased. The equipment is still in use and nobody has confirmed installation. What additional evidence is most important before treating the hazard as controlled?",
    [
      [
        "Confirmation that suitable guards were installed, function as intended, and did not create an unresolved new hazard.",
        "A purchase record does not establish that the control is present or effective in the work environment.",
      ],
      [
        "A second copy of the purchase order signed by procurement.",
        "Another procurement record still does not show that the equipment hazard was controlled.",
      ],
      [
        "A statement that the action owner has no remaining budget requests.",
        "Budget status is not evidence of installation or control effectiveness.",
      ],
      [
        "A count of how many days have passed since the finding was entered.",
        "Elapsed time does not demonstrate that the corrective action was implemented or worked.",
      ],
    ],
    "a",
    "Closure should be supported by evidence that the action addresses the hazard in practice. Installation, suitability, functioning, and unintended consequences need confirmation; purchasing equipment is an intermediate action rather than proof of risk reduction.",
    "management",
  ),
  draft(
    61,
    "K04",
    "Roles and regulatory authority",
    "Contract allocation and duties",
    "applied_technical",
    "advanced",
    "A project contract assigns a subcontractor responsibility for its own safety program. A general contractor's manager argues that the clause alone proves the general contractor has no further safety responsibilities for interacting work. Which assessment is most defensible?",
    [
      [
        "The clause determines every party's regulatory duties because it was signed by both companies.",
        "A private contractual clause does not by itself establish all duties imposed by applicable law.",
      ],
      [
        "Only the company with the most employees can have relevant duties.",
        "Headcount alone does not establish responsibility for particular work, authority, or hazards.",
      ],
      [
        "Assess applicable legal duties, actual work and authority, and coordination responsibilities rather than relying on the clause alone.",
        "Contract terms are relevant context but cannot replace an assessment of the applicable duties and actual relationships.",
      ],
      [
        "Regulatory responsibilities can be determined only after an injury occurs.",
        "Responsibilities should be evaluated during planning and ongoing work, rather than waiting for harm.",
      ],
    ],
    "c",
    "Responsibility analysis needs the relevant jurisdiction, applicable requirements, actual work and authority, and coordination arrangements. A contract may allocate tasks between parties, but does not by itself establish that all other legal or operational responsibilities disappear. Qualified legal review is needed for a real dispute.",
    "standards",
  ),
  draft(
    62,
    "K05",
    "Equipment instructions",
    "Model-specific limitations",
    "scenario",
    "intermediate",
    "A crew has a generic training handout for a lifting attachment, but the attachment delivered to the site is a different model with different markings. What should guide the equipment-use review before work proceeds?",
    [
      [
        "The handout, provided the attachment looks similar to the model pictured.",
        "Visual similarity does not establish that ratings, compatibility, or instructions are the same.",
      ],
      [
        "The instructions and ratings applicable to the actual model and configuration, with unresolved differences referred to the responsible specialist or manufacturer.",
        "Model-specific information is needed to assess suitability and resolve conflicts before use.",
      ],
      [
        "The largest capacity mentioned in any of the available handouts.",
        "Selecting the largest number disregards the actual equipment's limitations and configuration.",
      ],
      [
        "The method used successfully by the crew on its previous project.",
        "Past use does not establish suitability for a different attachment or current configuration.",
      ],
    ],
    "b",
    "Equipment-use decisions need instructions and limitations for the actual item and configuration. A generic handout is not a substitute for model-specific information. Unresolved differences should be addressed through the appropriate qualified channel before use.",
    "management",
  ),
  draft(
    63,
    "K06",
    "Risk management",
    "Exposure opportunities and limits",
    "reasoning_calculation",
    "intermediate",
    "In a simplified planning exercise, Method A requires 6 people to enter a controlled work area 4 times each per shift. Method B requires 3 people to enter 6 times each. Define one person-entry as one exposure opportunity. Which comparison is supported by these assumptions alone?",
    [
      [
        "Method B halves the exposure opportunities because it uses half as many people.",
        "The number of entries per person also changes, so headcount alone does not establish the total.",
      ],
      [
        "Both methods create 10 exposure opportunities because their people and entry counts add to 10.",
        "Adding people and entries per person does not apply the defined person-entry measure.",
      ],
      [
        "Method B has more exposure opportunities because each person enters more frequently.",
        "Per-person frequency is only one factor; the total must also account for the number of people.",
      ],
      [
        "Method A has 24 person-entries and Method B has 18; B has fewer opportunities, but this alone does not establish lower total risk.",
        "Multiplying people by entries gives the stated totals; duration, severity, conditions, and controls remain outside this limited measure.",
      ],
    ],
    "d",
    "The exercise compares one aspect of exposure frequency: 6 × 4 = 24 person-entries versus 3 × 6 = 18. The reduction is 6/24 = 25% in this defined count. An entry count is not an injury probability or a complete risk assessment; exposure duration, hazard severity, interfaces, and control quality still require assessment.",
    "management",
    [
      "Method A: 6 people × 4 entries/person = 24 person-entries per shift.",
      "Method B: 3 people × 6 entries/person = 18 person-entries per shift.",
      "The count falls by 6 of 24, or 25%; do not infer a 25% reduction in injury probability or total risk.",
    ],
  ),
  draft(
    64,
    "K07",
    "Documentation and recordkeeping",
    "Purpose-limited data collection",
    "foundational",
    "introductory",
    "A team is designing an internal near-miss reporting form. Which approach best balances useful safety information with appropriate handling of personal information?",
    [
      [
        "Collect the facts needed to understand the event and follow up, define access and retention arrangements, and avoid unrelated personal details.",
        "Purpose-limited collection and defined handling can support investigation without unnecessary disclosure.",
      ],
      [
        "Collect complete medical histories for every person mentioned so the report cannot omit anything.",
        "Unrelated sensitive information is not justified merely by a desire to make a form comprehensive.",
      ],
      [
        "Make every report publicly editable so all site personnel can add names and opinions.",
        "Uncontrolled editing and access can compromise record integrity and expose personal information.",
      ],
      [
        "Avoid recording dates and work locations so no one can connect the event to a particular task.",
        "Removing essential context can prevent useful investigation and follow-up.",
      ],
    ],
    "a",
    "Documentation should serve a defined safety purpose and retain essential event context. Access, integrity, retention, confidentiality, and applicable legal requirements need consideration; unnecessary personal information should not be collected by default.",
    "records",
  ),
  draft(
    65,
    "K08",
    "Incident causation",
    "System contributors",
    "scenario",
    "intermediate",
    "An investigation finds that a worker entered a hazardous area after a barrier was removed for material delivery. The initial report states only 'worker failed to pay attention.' Which next inquiry best improves the causal analysis?",
    [
      [
        "Whether the worker has ever received a warning for an unrelated task.",
        "Unrelated disciplinary history does not explain how this barrier was removed or access was managed.",
      ],
      [
        "Whether the injury outcome was serious enough to justify examining the barrier arrangement.",
        "Learning from failed controls should not depend solely on the eventual injury severity.",
      ],
      [
        "How delivery planning, barrier removal, access control, supervision, and restoration arrangements allowed the exposure.",
        "These inquiries examine interacting conditions and failed controls rather than stopping at a personal label.",
      ],
      [
        "Which single person can be identified as the cause before other evidence is collected.",
        "Prematurely selecting one person as the cause can bias evidence collection and miss system contributors.",
      ],
    ],
    "c",
    "A useful causal analysis examines the sequence, work conditions, decisions, and barriers that allowed exposure. Worker actions may be relevant, but a vague attention label is not an adequate explanation of planning, coordination, and control failures.",
    "investigation",
  ),
  draft(
    66,
    "K09",
    "Post-incident follow-up",
    "Assigned corrective action",
    "applied_technical",
    "intermediate",
    "An incident investigation recommends revising the delivery-zone procedure. Which follow-up arrangement is most likely to produce a verifiable improvement?",
    [
      [
        "Email the report to all managers and assume the recommendation has been implemented.",
        "Distribution does not assign implementation, confirm worker understanding, or verify effectiveness.",
      ],
      [
        "Assign an action owner and due date, communicate the revised method to affected people, and verify its use and effectiveness.",
        "This connects the recommendation to accountable implementation and evidence that it addresses the problem.",
      ],
      [
        "Close the recommendation once the report is stored in the project archive.",
        "Archiving preserves the report but does not demonstrate that the recommended change occurred.",
      ],
      [
        "Delay any action until a similar event confirms the recommendation is necessary.",
        "A second event should not be required before addressing an identified weakness.",
      ],
    ],
    "b",
    "Follow-up needs a defined action, responsible owner, appropriate timing, communication to affected people, and confirmation of implementation and effectiveness. A completed report is a starting point for improvement rather than proof that risk has been reduced.",
    "investigation",
  ),
  draft(
    67,
    "S01",
    "Site-specific program selection",
    "Task-linked program needs",
    "scenario",
    "intermediate",
    "A contractor adds indoor concrete cutting to a project that previously involved only material deliveries. Which approach best identifies the safety-program changes needed?",
    [
      [
        "Reuse the delivery plan unchanged because the contractor and site address are the same.",
        "A change in tasks and exposures can require different programs, controls, and competencies.",
      ],
      [
        "Add every program in the corporate library without assessing which applies to the work.",
        "An indiscriminate collection does not establish a usable, task-specific set of requirements and controls.",
      ],
      [
        "Select programs solely by comparing the new crew's headcount with the delivery crew's headcount.",
        "Headcount does not identify the cutting task's hazards, methods, or applicable requirements.",
      ],
      [
        "Assess the cutting method, exposures, equipment, environment, and applicable requirements, then integrate the relevant programs and responsibilities.",
        "Task and exposure assessment provides a defensible basis for selecting and coordinating site-specific program elements.",
      ],
    ],
    "d",
    "Program selection should follow the actual work and exposure profile. Concrete cutting can introduce issues different from deliveries, so relevant controls, competencies, coordination, and applicable requirements need assessment before integrating the appropriate program elements.",
    "management",
  ),
  draft(
    68,
    "S02",
    "Applying standards",
    "Scope before numerical limits",
    "applied_technical",
    "intermediate",
    "A reviewer finds two different numerical limits in safety documents concerning access equipment. What should be established before deciding which limit governs a planned task?",
    [
      [
        "The equipment and activity involved, the jurisdiction, and each source's scope, edition, and applicability.",
        "A numerical limit is meaningful only within the requirements and conditions to which it applies.",
      ],
      [
        "Which document has the shorter explanation, because it will be easier for workers to remember.",
        "Ease of presentation does not establish legal or technical applicability.",
      ],
      [
        "Which limit would allow the existing work plan to continue without modification.",
        "Operational convenience is not a valid way to choose an applicable requirement.",
      ],
      [
        "Which number appears most often in search-engine summaries.",
        "Frequency in summaries does not verify source authority, wording, or applicability.",
      ],
    ],
    "a",
    "Applying a standard begins with identifying the actual activity and source scope. Jurisdiction, edition, definitions, equipment configuration, and any conditions or exceptions matter. Numbers should not be detached from that context or selected for convenience.",
    "standards",
  ),
  draft(
    69,
    "S03",
    "Incident and finding trends",
    "Comparable denominators",
    "reasoning_calculation",
    "intermediate",
    "Zone A recorded 12 access-control findings during 60 comparable inspections. Zone B recorded 9 during 30 comparable inspections. Using findings per inspection, which comparison is correct? Assume the inspections used the same definitions and coverage.",
    [
      [
        "Zone A has the higher rate because 12 is greater than 9.",
        "Raw counts ignore that Zone A had twice as many inspections.",
      ],
      [
        "Both zones have the same rate because both have fewer findings than inspections.",
        "Being below one finding per inspection does not make the two ratios equal.",
      ],
      [
        "Zone A has 0.20 findings per inspection and Zone B has 0.30; Zone B's rate is higher.",
        "12/60 = 0.20 and 9/30 = 0.30 under the stated comparability assumptions.",
      ],
      [
        "Zone A has 5 findings per inspection and Zone B has about 3.33; Zone A's rate is higher.",
        "These calculations invert inspections and findings, producing inspections per finding rather than the requested measure.",
      ],
    ],
    "c",
    "Comparable denominators can change the interpretation of raw counts. Under the exercise assumptions, Zone B has the higher finding rate. The team should still examine inspection quality, work mix, exposure, and reporting consistency before drawing a causal conclusion.",
    "management",
    [
      "Zone A: 12 findings ÷ 60 inspections = 0.20 findings/inspection.",
      "Zone B: 9 findings ÷ 30 inspections = 0.30 findings/inspection.",
      "Compare like units: 0.30 exceeds 0.20; the difference alone does not identify the cause.",
    ],
  ),
  draft(
    70,
    "S04",
    "Construction means and methods",
    "Exposure trade-offs",
    "scenario",
    "advanced",
    "A team proposes assembling a service rack at ground level and lifting it into place instead of building it overhead. What is the strongest evaluation of the proposal?",
    [
      [
        "Approve it solely because reducing overhead work always eliminates the project's major risks.",
        "The proposal may reduce one exposure while introducing lifting, stability, interface, and installation hazards.",
      ],
      [
        "Compare both methods' full work sequence, including fabrication, lifting, temporary stability, access, and installation interfaces.",
        "A whole-sequence comparison can identify whether the change reduces overall exposure or transfers risk to another stage.",
      ],
      [
        "Reject it because any change from the original method invalidates all previous safety planning.",
        "A change calls for reassessment; it does not automatically mean the alternative is unacceptable.",
      ],
      [
        "Assess only the final installed condition because temporary activities are managed separately.",
        "Temporary assembly, lifting, and support conditions are part of the method's safety implications.",
      ],
    ],
    "b",
    "Evaluating means and methods requires comparing the hazards and controls across the full sequence. Ground-level assembly may reduce work at height, but lifting and temporary stability need their own assessment. A reduced exposure in one phase should not hide a transferred or newly introduced risk.",
    "management",
  ),
  draft(
    71,
    "K03",
    "Inspection planning",
    "Risk-informed sampling",
    "foundational",
    "intermediate",
    "A supervisor has limited time for planned inspections. Which allocation is most defensible when work activities and exposures differ substantially between areas?",
    [
      [
        "Inspect only the areas with the largest number of completed checklists last month.",
        "Checklist volume alone does not identify current exposure or the importance of controls.",
      ],
      [
        "Spend exactly the same time in every area regardless of the work underway.",
        "Equal time can overlook differences in serious hazards, changes, and control uncertainty.",
      ],
      [
        "Visit only locations where an injury has already occurred.",
        "The absence of a past injury does not demonstrate that serious current hazards are controlled.",
      ],
      [
        "Prioritize serious exposures, changing work, critical controls, and unresolved findings while maintaining appropriate coverage.",
        "Risk-informed planning uses current conditions and control needs rather than a single historical count.",
      ],
    ],
    "d",
    "Inspection planning should consider severity, exposure, change, critical controls, and unresolved weaknesses. The approach should remain systematic and cover relevant work, but equal time or past injury history alone is not a reliable prioritization rule.",
    "management",
  ),
  draft(
    72,
    "K06",
    "Risk management",
    "Avoiding false precision",
    "reasoning_calculation",
    "advanced",
    "Two hazards receive the same score of 12 in a project's ordinal risk matrix. Hazard A could cause multiple fatalities but is judged less likely; Hazard B has less severe consequences but more frequent exposure. What is the most defensible interpretation?",
    [
      [
        "The equal scores are a screening result; examine the consequence differences, uncertainty, critical controls, and applicable requirements before prioritizing actions.",
        "A shared ordinal product does not make the hazards interchangeable or remove the need for consequence-sensitive judgment.",
      ],
      [
        "The hazards have exactly the same probability of injury and should receive identical controls.",
        "An ordinal screening score does not establish equal probabilities or appropriate control methods.",
      ],
      [
        "Either hazard can be deferred because their equal scores cancel each other in the prioritization process.",
        "Equal scores do not remove either exposure or establish that controls can be deferred.",
      ],
      [
        "The more frequently reported hazard must always be addressed first regardless of potential consequences.",
        "Reporting frequency alone can miss low-frequency, high-consequence events and mandatory controls.",
      ],
    ],
    "a",
    "Risk matrices simplify complex judgments. Equal products from ordinal categories do not establish equal probabilities or consequences. A reasoned review should consider severe credible outcomes, uncertainty, critical controls, exposure, and applicable requirements rather than treating the score as a precise answer.",
    "management",
  ),
  draft(
    73,
    "K07",
    "Safety metrics",
    "Explicitly defined rate formula",
    "reasoning_calculation",
    "intermediate",
    "For a data-handling exercise, use the supplied formula R = cases × 200,000 ÷ hours worked. A data set contains 3 qualifying cases and 120,000 hours. What is R? The exercise does not determine which real cases are recordable or establish a legal reporting duty.",
    [
      [
        "0.5",
        "This is a factor-of-ten error when dividing 600,000 by 120,000.",
      ],
      [
        "2.5",
        "This does not follow from the supplied case count, hours, and constant.",
      ],
      ["5.0", "3 × 200,000 ÷ 120,000 = 5.0 under the supplied definition."],
      [
        "20.0",
        "This result does not apply the supplied numerator and denominator correctly.",
      ],
    ],
    "c",
    "The calculation is 600,000 divided by 120,000, yielding 5.0. Defining which cases belong in a real metric requires separate source and data-quality review. A rate also needs context and should not be treated as a stand-alone assessment of program quality.",
    "records",
    [
      "Substitute the supplied values: R = 3 × 200,000 ÷ 120,000.",
      "Calculate the numerator: 3 × 200,000 = 600,000.",
      "Divide 600,000 by 120,000 to obtain R = 5.0 under the exercise definition.",
    ],
  ),
  draft(
    74,
    "K08",
    "Investigation evidence",
    "Independent witness accounts",
    "scenario",
    "intermediate",
    "Several workers witnessed an equipment contact event. A supervisor proposes having them agree on one account before the investigator interviews them. What is the stronger evidence-collection approach?",
    [
      [
        "Use a group vote to select the most likely sequence before recording any statements.",
        "A vote can suppress differences and introduce shared assumptions before individual observations are captured.",
      ],
      [
        "Record individual observations promptly, distinguish observation from inference, and compare accounts with physical and documentary evidence.",
        "Independent accounts and corroboration help preserve differing perspectives without assuming any one is complete.",
      ],
      [
        "Choose the most senior worker's account and discard inconsistent details from others.",
        "Seniority does not guarantee a complete or accurate view of every part of an event.",
      ],
      [
        "Ask witnesses to read one another's draft statements before giving their own account.",
        "Early sharing can influence recall and reduce the independence of the evidence.",
      ],
    ],
    "b",
    "Collecting individual observations promptly helps preserve evidence before accounts influence one another. Investigators should distinguish what a person observed from what they inferred, examine discrepancies, and compare accounts with other evidence rather than force an early consensus.",
    "investigation",
  ),
  draft(
    75,
    "K09",
    "Corrective-action follow-up",
    "Unintended consequences",
    "scenario",
    "advanced",
    "After a vehicle near miss, a project installs a barrier that separates a pedestrian route from vehicle movements. A later walk-through finds that the barrier blocks an emergency access point. What is the most appropriate follow-up?",
    [
      [
        "Keep the barrier unchanged because it addressed the original near-miss mechanism.",
        "Addressing one mechanism does not justify retaining a new unresolved emergency-access hazard.",
      ],
      [
        "Remove the barrier without reassessing pedestrian exposure.",
        "Removing the control may restore the original risk and still fails to evaluate the whole arrangement.",
      ],
      [
        "Close the investigation because the new issue belongs to the emergency team rather than the investigation team.",
        "Organizational boundaries should not prevent coordinated resolution of an unintended consequence.",
      ],
      [
        "Reassess both vehicle–pedestrian separation and emergency access, coordinate a suitable arrangement, and verify both functions.",
        "The follow-up should preserve the intended protection while addressing the newly identified conflict.",
      ],
    ],
    "d",
    "Corrective actions need effectiveness checks that consider new or transferred hazards. The team should evaluate the interacting functions together and verify an arrangement that maintains both pedestrian protection and emergency access.",
    "investigation",
  ),
  draft(
    76,
    "S01",
    "Program coordination",
    "Subcontractor work interfaces",
    "applied_technical",
    "intermediate",
    "A site-specific plan contains separate procedures for a demolition subcontractor and an electrical subcontractor. Both will work in the same area during the same shift. Which additional program element is most directly needed?",
    [
      [
        "A coordinated process for work boundaries, sequencing, energy status, communication, and responsibility at the interface.",
        "Separate procedures need a practical interface process when one activity can affect the other's people or controls.",
      ],
      [
        "A statement that each subcontractor's procedure overrides the other whenever a conflict occurs.",
        "Competing override claims do not establish safe coordination or resolve conflicting assumptions.",
      ],
      [
        "A combined cover page listing both company logos.",
        "Administrative packaging does not control interacting tasks or assign interface responsibilities.",
      ],
      [
        "A requirement to compare each company's annual injury rate before discussing the work sequence.",
        "Historical rates do not resolve the immediate coordination needs between the planned activities.",
      ],
    ],
    "a",
    "Site programs need to address interfaces as well as individual tasks. Boundaries, sequencing, energy status, shared hazards, communication, and clear responsibilities help prevent incompatible assumptions between crews.",
    "management",
  ),
  draft(
    77,
    "S02",
    "Applying equipment requirements",
    "Conflicting instructions",
    "scenario",
    "intermediate",
    "A corporate work instruction permits a configuration that the current manual for the equipment model does not address. The crew cannot establish that the configuration is approved or suitable. Which response is most defensible?",
    [
      [
        "Proceed because corporate instructions always take priority over manufacturer information.",
        "A corporate document does not establish suitability for a configuration whose limitations remain unresolved.",
      ],
      [
        "Use the configuration at reduced speed without obtaining further information.",
        "An arbitrary speed reduction does not demonstrate compatibility or address unknown failure modes.",
      ],
      [
        "Pause the configuration-dependent work and resolve the discrepancy through the responsible qualified personnel and manufacturer information.",
        "Unresolved limitations should be addressed before relying on the equipment in that configuration.",
      ],
      [
        "Copy a configuration from an online photograph of similar equipment.",
        "A photograph does not establish model identity, approval, limitations, or safe operating conditions.",
      ],
    ],
    "c",
    "The problem is an unresolved suitability question, not simply which document was written internally. Responsible qualified personnel should resolve the discrepancy using information applicable to the actual model and configuration before the work relies on it.",
    "standards",
  ),
  draft(
    78,
    "S03",
    "Trend interpretation",
    "Changes in reporting effort",
    "reasoning_calculation",
    "advanced",
    "A project reports twice as many near misses after introducing confidential reporting, daily prompts, and supervisor feedback. Hours worked stayed similar. Which conclusion is best supported by these facts alone?",
    [
      [
        "The underlying hazard exposure necessarily doubled.",
        "A change in reporting opportunity and willingness can change counts without an equivalent change in underlying exposure.",
      ],
      [
        "Reported events increased, but further evidence is needed to distinguish reporting-system effects from changes in underlying risk.",
        "The facts show a reporting increase, not its single cause; the changed reporting process is an important alternative explanation.",
      ],
      [
        "The safety program necessarily became ineffective because near-miss counts increased.",
        "An increase may reflect improved reporting and learning opportunities rather than a proven deterioration in controls.",
      ],
      [
        "The new reporting process should be removed to restore the previous number.",
        "Reducing reporting to improve a number can hide information without reducing exposure.",
      ],
    ],
    "b",
    "Counts reflect both events and the process used to report them. A changed reporting system makes a simple before-and-after causal claim unreliable. Review event severity potential, work changes, reporting participation, critical-control evidence, and comparable measures before concluding that risk rose or fell.",
    "management",
  ),
  draft(
    79,
    "S04",
    "Construction method changes",
    "Temporary support assumptions",
    "scenario",
    "advanced",
    "A planned installation sequence is changed to save a crane relocation. The change would leave a partially completed assembly supported differently from the reviewed method. Which response best addresses the safety implications?",
    [
      [
        "Accept the change if the final assembly will match the original drawing.",
        "The final condition does not establish the stability or adequacy of intermediate construction stages.",
      ],
      [
        "Let the lifting crew choose supports based only on what materials are available nearby.",
        "Availability does not establish that temporary support arrangements meet the changed loading and stability needs.",
      ],
      [
        "Treat the change as a scheduling matter because no permanent materials were substituted.",
        "A sequence change can alter intermediate loads, stability, and interfaces even when the final materials are unchanged.",
      ],
      [
        "Have the responsible qualified planning/design personnel review the intermediate conditions, temporary support, and revised sequence before implementation.",
        "The changed method must be evaluated for the conditions that occur during construction, not only at completion.",
      ],
    ],
    "d",
    "Means-and-methods changes can affect temporary stability, load paths, access, and work interfaces. The responsible qualified people should review and authorize the revised arrangement before use. This draft does not specify an engineering support design.",
    "management",
  ),
];
