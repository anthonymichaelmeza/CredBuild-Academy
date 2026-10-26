import type { DraftQuestionRecord } from "./draft-types";

/** Working authoring batch, not a source-verified bank. The network proxy
 * prevented access to the cited websites. Locators below are CANDIDATES for a
 * human to retrieve and check against the exact claim and current applicability;
 * neither a URL nor a precise-looking locator establishes technical support.
 * No publication date, review attestation or source verification is invented. */
export const domain1Batch001Disclosure = {
  batchId: "chst-domain1-batch-001",
  quantity: 50,
  status: "draft",
  sourceAccess: "blocked_by_network_proxy",
  sourceVerifiedCount: 0,
  technicallyApprovedCount: 0,
  publishedCount: 0,
  notice:
    "Original AI-generated provisional drafts. Candidate references were not retrieved or reviewed. Correct answers and citation applicability require independent human verification before instructional use. Not official BCSP examination questions.",
} as const;

export const domain1Batch001Topics = [
  "Hazard identification",
  "Job hazard analysis",
  "Risk assessment",
  "Hierarchy of controls",
  "Excavation and trenching",
  "Fall protection",
  "Electrical safety",
  "Cranes and rigging",
  "Mobile equipment",
  "Confined spaces",
  "Hazardous energy",
  "Industrial hygiene fundamentals",
] as const;

type Topic = (typeof domain1Batch001Topics)[number];
type Choice = readonly [text: string, rationale: string];
type Specification = {
  objective: string;
  topic: Topic;
  subtopic: string;
  title: string;
  difficulty: "introductory" | "intermediate" | "advanced";
  stem: string;
  /** The first authored choice is correct; the helper shuffles text+rationale
   * pairs together before assigning the immutable key. */
  choices: readonly [Choice, Choice, Choice, Choice];
  explanation: string;
  source: keyof typeof candidates;
};

const candidates = {
  inspections: [
    "OSHA 29 CFR 1926.20 — General safety and health provisions",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.20",
    "1926.20(b)(2)",
  ],
  jha: [
    "OSHA — Job Hazard Analysis",
    "https://www.osha.gov/sites/default/files/publications/osha3071.pdf",
    "Job hazard analysis process; exact supporting passage requires review",
  ],
  hierarchy: [
    "NIOSH — Hierarchy of Controls",
    "https://www.cdc.gov/niosh/hierarchy-of-controls/about/index.html",
    "Hierarchy of Controls; exact supporting passage requires review",
  ],
  excavation: [
    "OSHA 29 CFR 1926.651 — Specific excavation requirements",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.651",
    "1926.651",
  ],
  protectiveSystems: [
    "OSHA 29 CFR 1926.652 — Requirements for protective systems",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.652",
    "1926.652(a) and (c); applicable design-data provisions require review",
  ],
  fallSystems: [
    "OSHA 29 CFR 1926.502 — Fall protection systems criteria and practices",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.502",
    "1926.502",
  ],
  fallDuty: [
    "OSHA 29 CFR 1926.501 — Duty to have fall protection",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.501",
    "1926.501",
  ],
  electrical: [
    "OSHA 29 CFR 1926.416 — General electrical requirements",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.416",
    "1926.416(a)(1) and (a)(3)",
  ],
  cords: [
    "OSHA 29 CFR 1926.416 — General electrical requirements",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.416",
    "1926.416(e); exact supporting subsection requires review",
  ],
  craneSetup: [
    "OSHA 29 CFR 1926.1402 — Ground conditions",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1402",
    "1926.1402(b)",
  ],
  rigging: [
    "OSHA 29 CFR 1926.251 — Rigging equipment for material handling",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.251",
    "1926.251(a)",
  ],
  cranes: [
    "OSHA 29 CFR 1926.1417 — Operation",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1417",
    "1926.1417",
  ],
  suspendedLoads: [
    "OSHA 29 CFR 1926.1425 — Keeping clear of the load",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1425",
    "1926.1425",
  ],
  equipment: [
    "OSHA 29 CFR 1926.602 — Material handling equipment",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.602",
    "1926.602; equipment classification and subsection applicability require review",
  ],
  vehicles: [
    "OSHA 29 CFR 1926.601 — Motor vehicles",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.601",
    "1926.601(b)",
  ],
  spaces: [
    "OSHA 29 CFR 1926.1203 — General confined-space requirements",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1203",
    "1926.1203(a) through (d)",
  ],
  spaceProgram: [
    "OSHA 29 CFR 1926.1204 — Permit-required confined space program",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1204",
    "1926.1204",
  ],
  spaceRescue: [
    "OSHA 29 CFR 1926.1211 — Rescue and emergency services",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1211",
    "1926.1211(a)",
  ],
  energyEquipment: [
    "OSHA 29 CFR 1926.600 — Equipment",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.600",
    "1926.600(a)(3)(i)",
  ],
  energyElectrical: [
    "OSHA 29 CFR 1926.417 — Lockout and tagging of circuits",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.417",
    "1926.417(a) through (c)",
  ],
  silica: [
    "OSHA 29 CFR 1926.1153 — Respirable crystalline silica",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1153",
    "1926.1153(c), (d) and (f)",
  ],
  noise: [
    "OSHA 29 CFR 1926.52 — Occupational noise exposure",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.52",
    "1926.52(b) and (d)",
  ],
  air: [
    "OSHA 29 CFR 1926.55 — Gases, vapors, fumes, dusts, and mists",
    "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.55",
    "1926.55(a) and (b)",
  ],
} as const;

function draft(spec: Specification, index: number): DraftQuestionRecord {
  const number = index + 1;
  const order = [0, 1, 2, 3];
  // Reproducible authored ordering; examination attempts randomize separately.
  let seed = Math.imul(number + 500, 0x9e3779b1) >>> 0;
  for (let position = order.length - 1; position > 0; position--) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const other = (seed >>> 0) % (position + 1);
    [order[position], order[other]] = [order[other], order[position]];
  }
  const [title, url, section] = candidates[spec.source];
  return {
    id: `chst-d1-b001-${String(number).padStart(3, "0")}`,
    category: spec.difficulty === "introductory" ? "foundational" : "scenario",
    content: {
      kind: "question",
      certificationId: "chst",
      blueprintRevisionId: "chst5-2022.04.12",
      domain: "1",
      objectiveCode: `CHST5-2022.04.12-D1-${spec.objective}`,
      topic: spec.topic,
      subtopic: spec.subtopic,
      title: spec.title,
      contentKind: "instructional",
      origin: "ai_generated",
      sources: [
        {
          id: `b001-candidate-${number}`,
          title: `CANDIDATE — NOT REVIEWED: ${title}`,
          url,
          edition: "",
          section: `Candidate locator, not checked: ${section}`,
          classification: ["hierarchy", "jha"].includes(spec.source)
            ? "professional_guidance"
            : "regulatory_requirement",
        },
      ],
      body: {
        type: "scenario",
        stem: spec.stem,
        choices: order.map((original, position) => ({
          id: String.fromCharCode(97 + position),
          text: spec.choices[original][0],
          rationale: spec.choices[original][1],
        })),
        correctChoice: String.fromCharCode(97 + order.indexOf(0)),
        explanation: spec.explanation,
        difficulty: spec.difficulty,
        media: [],
        solutionSteps: [],
      },
    },
    sourceVerifiedAt: null,
    technicalReviewer: null,
    reviewStatus: "draft",
    revision: 1,
  };
}

const specifications: Specification[] = [
  {
    objective: "K26",
    topic: "Hazard identification",
    subtopic: "Interacting work activities",
    title: "A material delivery crosses an active work zone",
    difficulty: "introductory",
    stem: "A delivery route has been moved across the area where another crew is installing floor penetrations. Both crews' individual task plans were accepted before the route changed. What should the supervisor do before deliveries begin?",
    choices: [
      [
        "Review the combined activities with both crews and establish controls for the new vehicle and opening exposures.",
        "The changed interface creates hazards that the original separate plans did not evaluate.",
      ],
      [
        "Keep both plans and ask each crew to follow its original supervisor's instructions.",
        "Following separate plans does not resolve the new interaction between the activities.",
      ],
      [
        "Inspect only the delivery vehicle because the floor crew's task has not changed.",
        "The floor crew's exposure changes when traffic enters its work area.",
      ],
      [
        "Use the previously accepted route sketch until the next scheduled coordination meeting.",
        "An outdated sketch cannot control the changed conditions before deliveries start.",
      ],
    ],
    explanation:
      "Hazard identification must consider interfaces and changed conditions. The review should address vehicle movement, openings, access and responsibilities before the new arrangement is used.",
    source: "inspections",
  },
  {
    objective: "K13",
    topic: "Hazard identification",
    subtopic: "Access and housekeeping",
    title: "Packaging changes a stair landing",
    difficulty: "introductory",
    stem: "An inspection finds packaging accumulating on a temporary stair landing used by several subcontractors. The landing remains passable only if workers turn sideways. Which finding most directly identifies the exposure that needs correction?",
    choices: [
      [
        "Stored packaging restricts normal passage and introduces trip and evacuation impediments on a shared access route.",
        "This identifies the condition, exposed users and consequences rather than assigning blame.",
      ],
      [
        "The last subcontractor to use the stairs needs a housekeeping reminder.",
        "A reminder and assumed responsibility do not describe or remove the current access exposure.",
      ],
      [
        "The packaging is acceptable because a worker can still squeeze past it.",
        "Minimal passability does not establish a suitable access route.",
      ],
      [
        "The main concern is the appearance of the landing during client visits.",
        "Appearance understates the immediate exposure to people using the stairs.",
      ],
    ],
    explanation:
      "A useful finding links the observed condition to how people can be harmed and supports a concrete correction. Shared routes require coordinated ownership of the corrective action.",
    source: "inspections",
  },
  {
    objective: "K02",
    topic: "Hazard identification",
    subtopic: "Hidden electrical services",
    title: "A drawing conflicts with field evidence",
    difficulty: "intermediate",
    stem: "Before drilling an existing concrete wall, a crew finds an electrical junction box that is absent from the available service drawing. The proposed drill path is close to the box. What is the best next decision?",
    choices: [
      [
        "Pause drilling and have the service location and necessary protective measures established before the work is released.",
        "Conflicting evidence means the drawing alone is insufficient to control contact with hidden services.",
      ],
      [
        "Move the hole slightly and proceed because the drawing shows no circuit at the original location.",
        "A small relocation does not resolve uncertainty about concealed service routing.",
      ],
      [
        "Use a shorter drill bit and rely on the operator to stop if resistance changes.",
        "Contact may occur before the operator can recognize a change in resistance.",
      ],
      [
        "Proceed after photographing the junction box for the daily report.",
        "Documentation does not establish the location or electrical condition of the service.",
      ],
    ],
    explanation:
      "Field evidence can invalidate a planning assumption. Establish the actual service location and protective method before penetration work; an administrative record is not a physical control.",
    source: "electrical",
  },
  {
    objective: "K26",
    topic: "Hazard identification",
    subtopic: "Nonroutine simultaneous work",
    title: "A sheltered area becomes an exposure pathway",
    difficulty: "advanced",
    stem: "A subcontractor proposes using an enclosed ground-floor room for solvent-based coating while another crew draws make-up air from that room for work below grade. Neither task was assessed as an isolated high-exposure operation. Which additional assessment is most important before authorizing the combined arrangement?",
    choices: [
      [
        "Evaluate whether the coating vapors can be transported to the other crew and redesign the air supply or work arrangement accordingly.",
        "The shared airflow can create a secondary exposure beyond the coating operation.",
      ],
      [
        "Check only whether the coating crew has selected gloves listed on its task plan.",
        "Glove selection does not evaluate airborne transport to a different crew.",
      ],
      [
        "Compare the crews' scheduled finish times and accept the arrangement if both finish the same day.",
        "A shared completion date says nothing about concurrent vapor exposure.",
      ],
      [
        "Treat the lower work area as unaffected because no coating is applied there.",
        "An airborne contaminant can move into an area where it was not generated.",
      ],
    ],
    explanation:
      "The assessment boundary should follow credible exposure pathways, including ventilation interactions. Separate task reviews can miss hazards introduced by a shared environment.",
    source: "air",
  },
  {
    objective: "S02",
    topic: "Job hazard analysis",
    subtopic: "Task sequencing",
    title: "Opening bundles changes the task sequence",
    difficulty: "introductory",
    stem: "A crew's job hazard analysis begins with 'install panels' and lists only hand injuries. Workers must first cut tensioned bands from a leaning bundle. What is the most useful revision?",
    choices: [
      [
        "Break out unloading, stabilizing and opening the bundle as separate steps and assess the hazards and controls for each.",
        "The omitted steps contain stored-energy and falling-material exposures that require their own controls.",
      ],
      [
        "Add a general instruction to wear gloves beside the existing single step.",
        "Gloves alone do not address movement of the bundle or released banding.",
      ],
      [
        "Keep the analysis unchanged because opening the bundle takes only a few minutes.",
        "Task duration does not eliminate a potentially severe exposure.",
      ],
      [
        "Have the fastest worker open all bundles so fewer workers handle the bands.",
        "Reducing the number of exposed workers does not establish a safe method for the person doing the task.",
      ],
    ],
    explanation:
      "A job hazard analysis needs enough task detail to identify hazards before exposure occurs. It should examine preparation and handling as well as installation.",
    source: "jha",
  },
  {
    objective: "S02",
    topic: "Job hazard analysis",
    subtopic: "Worker participation",
    title: "The planned method differs from actual practice",
    difficulty: "intermediate",
    stem: "During a walk-through, workers explain that a machine-access restriction forces them to handle a component differently from the method described in the job hazard analysis. No injury has been reported. What should happen next?",
    choices: [
      [
        "Observe the actual sequence with the workers, reassess its hazards and revise the method and analysis before continuing under the changed arrangement.",
        "Worker input reveals an unassessed method that should be evaluated directly.",
      ],
      [
        "Ask the workers to sign the existing analysis again to confirm that they have read it.",
        "A signature does not resolve the mismatch between the analyzed and actual task.",
      ],
      [
        "Wait for an incident report to establish whether the variation is hazardous.",
        "The purpose of the analysis is to identify and control exposures before injury.",
      ],
      [
        "Rewrite the sequence from the office using the equipment supplier's sales brochure alone.",
        "A brochure alone does not describe the constrained field conditions or actual handling steps.",
      ],
    ],
    explanation:
      "The analysis should reflect work as it is to be performed. Observing the task and involving its workers helps identify practical controls and assumptions that no longer hold.",
    source: "jha",
  },
  {
    objective: "S02",
    topic: "Job hazard analysis",
    subtopic: "Control specificity",
    title: "Replacing a vague instruction",
    difficulty: "intermediate",
    stem: "A job hazard analysis for overhead installation lists the control 'use caution around people below.' Which replacement provides the clearest basis for verifying that the exposure is controlled?",
    choices: [
      [
        "Establish and maintain a defined exclusion area below the work, assign responsibility for access control and secure items against falling.",
        "The instruction describes observable controls and who must keep them effective.",
      ],
      [
        "Remind workers at each break that falling objects can cause injuries.",
        "Awareness is helpful but does not define how access and falling items will be controlled.",
      ],
      [
        "Require each trade to decide whether its own workers need to avoid the area.",
        "Independent decisions do not establish a consistent boundary for a shared hazard.",
      ],
      [
        "Post the total number of safe work hours at the entrance to the floor.",
        "A historical statistic does not control the present falling-object exposure.",
      ],
    ],
    explanation:
      "Controls should be specific enough to implement and inspect. Defined boundaries, responsibilities and prevention measures are more actionable than a cautionary slogan.",
    source: "jha",
  },
  {
    objective: "S02",
    topic: "Job hazard analysis",
    subtopic: "Contingencies and changed conditions",
    title: "A suspended component will not fit",
    difficulty: "advanced",
    stem: "A planned equipment installation includes lifting a component through an opening. At the hold point, the crew finds that an added brace obstructs the planned path. The approved job hazard analysis does not cover temporary brace removal. Which action best manages the change?",
    choices: [
      [
        "Keep the load in a safe condition, stop the affected step and obtain assessment and authorization for a revised installation sequence.",
        "The obstruction introduces a new sequence and potentially new structural and lifting exposures.",
      ],
      [
        "Remove the brace quickly while the crane holds the component near the opening.",
        "The structural and lifting consequences have not been evaluated.",
      ],
      [
        "Have the rigging crew agree verbally on a route and update the paperwork after placement.",
        "A verbal agreement does not establish the technical acceptability of the altered method.",
      ],
      [
        "Increase the number of spotters and continue using the original lift path.",
        "Additional observers do not remove the obstruction or establish a viable safe path.",
      ],
    ],
    explanation:
      "A job hazard analysis is tied to a defined method. A consequential deviation requires a hold and reassessment, including appropriate technical authorization, before the changed step proceeds.",
    source: "jha",
  },
  {
    objective: "S03",
    topic: "Risk assessment",
    subtopic: "Severity and exposure",
    title: "Prioritizing two inspection findings",
    difficulty: "introductory",
    stem: "An inspection identifies an unprotected opening on a frequently used elevated access path and faded paint on a cabinet identifier. Resources are available to correct only one item immediately. What should guide the priority?",
    choices: [
      [
        "The credible severity and likelihood of harm, including how often people encounter the opening.",
        "Priority should reflect the potential injury and exposure rather than cosmetic prominence.",
      ],
      [
        "The finding that can be closed with the shortest work order.",
        "Ease of closure is not a substitute for assessing the more serious exposure.",
      ],
      [
        "The finding that was entered first in the inspection application.",
        "Entry order does not establish the level of risk.",
      ],
      [
        "The item nearest the project office so the correction is easy to observe.",
        "Visibility to management does not determine the potential harm to exposed workers.",
      ],
    ],
    explanation:
      "Risk-based prioritization considers credible consequences and exposure. A high-consequence, frequently encountered opening warrants prompt control rather than allowing easy minor fixes to drive the sequence.",
    source: "jha",
  },
  {
    objective: "S03",
    topic: "Risk assessment",
    subtopic: "Residual risk",
    title: "A new barrier changes only one part of the risk",
    difficulty: "intermediate",
    stem: "A barrier reduces the chance that workers enter a machine's swing area, but a service task still requires planned entry while the machine could move. What should the residual-risk review conclude?",
    choices: [
      [
        "Assess the remaining service exposure and establish additional controls for that task before treating the hazard as adequately controlled.",
        "A routine-access barrier does not necessarily protect a worker whose task requires entry.",
      ],
      [
        "Close the hazard because the barrier reduces the overall frequency of entry.",
        "Reduced general exposure does not resolve the specific remaining task.",
      ],
      [
        "Assume the possible injury is less severe because a barrier has been installed.",
        "The potential consequence of machine contact may be unchanged.",
      ],
      [
        "Use the barrier's purchase cost as evidence that the remaining risk is acceptable.",
        "Cost is not evidence of effectiveness for the service exposure.",
      ],
    ],
    explanation:
      "Residual-risk assessment examines the exposures that remain after a control. It must include nonroutine work and should not assume that a lower likelihood also reduces the severity of an event.",
    source: "jha",
  },
  {
    objective: "S03",
    topic: "Risk assessment",
    subtopic: "Uncertainty in exposure estimates",
    title: "An estimate is mistaken for measurement",
    difficulty: "advanced",
    stem: "A risk register rates a cutting task as low exposure because the planner estimated that the visible dust is mostly coarse material. No task-specific exposure information or assessment is available. Which action most strengthens the decision?",
    choices: [
      [
        "Treat the exposure estimate as uncertain, obtain an appropriate task-specific assessment and use protective controls while that uncertainty is resolved.",
        "An unsupported assumption should not be treated as evidence that the hazardous fraction is low.",
      ],
      [
        "Retain the low rating unless a worker reports breathing difficulty.",
        "Symptoms are neither a reliable exposure measure nor a sound trigger for preventive action.",
      ],
      [
        "Average the planner's estimate with a second person's visual estimate.",
        "Averaging unsupported visual judgments does not measure respirable exposure.",
      ],
      [
        "Assign a precise numerical score so the register is internally consistent.",
        "Numerical precision does not correct missing or unreliable input information.",
      ],
    ],
    explanation:
      "A risk score inherits the quality of its inputs. Uncertainty that could conceal a significant exposure calls for a suitable assessment and interim controls, not additional arithmetic on unsubstantiated estimates.",
    source: "silica",
  },
  {
    objective: "S03",
    topic: "Risk assessment",
    subtopic: "Control verification",
    title: "A corrective action is complete only on paper",
    difficulty: "intermediate",
    stem: "A corrective-action record says that a vehicle-pedestrian segregation barrier was installed. A later walk-through finds an informal shortcut through the barrier used during every delivery. What is the most appropriate risk response?",
    choices: [
      [
        "Reopen the action, assess why the shortcut is used and correct and verify the arrangement under actual delivery conditions.",
        "The observed bypass shows the intended control is not effective in normal use.",
      ],
      [
        "Leave the action closed because the contractor supplied a photograph of the original installation.",
        "A past photograph does not establish present effectiveness.",
      ],
      [
        "Reduce the risk rating because only a small number of workers use the shortcut.",
        "The bypassed route still exposes people to vehicle movement and requires assessment.",
      ],
      [
        "Add the shortcut to the drawing without changing the vehicle controls.",
        "Recording an unsafe interaction does not make it controlled.",
      ],
    ],
    explanation:
      "Control verification checks actual performance. A recurring bypass is evidence that the work arrangement and its causes need reassessment, correction and follow-up.",
    source: "inspections",
  },
  {
    objective: "S01",
    topic: "Hierarchy of controls",
    subtopic: "Elimination",
    title: "Removing a repeated elevated task",
    difficulty: "introductory",
    stem: "A design review compares routine rooftop adjustment of a valve with locating the adjustment point at ground level so rooftop access is unnecessary. Within the hierarchy of controls, what is the main benefit of the ground-level arrangement?",
    choices: [
      [
        "It removes the need for the repeated work-at-height exposure for that adjustment task.",
        "Changing the task so exposure is unnecessary is an elimination approach to that particular hazard.",
      ],
      [
        "It makes a personal fall-arrest system more comfortable to wear.",
        "The proposed change removes the access task rather than changing personal protective equipment.",
      ],
      [
        "It increases the number of administrative checks before each roof visit.",
        "The design avoids the roof visit for this task instead of adding a check to it.",
      ],
      [
        "It proves that all risks associated with operating the valve have been eliminated.",
        "Removing one exposure does not establish that every hazard of the valve operation is gone.",
      ],
    ],
    explanation:
      "The hierarchy is applied to a particular hazard and task. Removing the need to work at height can be stronger than relying on repeated behavioral or personal-protection controls, while other hazards still require assessment.",
    source: "hierarchy",
  },
  {
    objective: "S01",
    topic: "Hierarchy of controls",
    subtopic: "Substitution assessment",
    title: "A less hazardous coating has a different application method",
    difficulty: "intermediate",
    stem: "A project considers replacing a solvent-based coating with a lower-volatility alternative. The alternative requires heated application. What is the best next step when evaluating the substitution?",
    choices: [
      [
        "Compare the complete hazard profiles and application conditions, including the new heat exposure, before selecting the alternative and controls.",
        "A substitution should reduce overall relevant risk without overlooking hazards introduced by the replacement.",
      ],
      [
        "Approve it solely because its product name includes the word 'water-based.'",
        "A marketing term does not establish the complete hazard profile or safe application method.",
      ],
      [
        "Reject every substitution that introduces any different hazard.",
        "Different hazards can be assessed and controlled; their presence alone does not determine the decision.",
      ],
      [
        "Use the existing coating procedure unchanged because both products perform the same function.",
        "Application and hazard differences can require different procedures and controls.",
      ],
    ],
    explanation:
      "Substitution requires evaluation of the replacement in its actual use. Lower vapor generation may be beneficial, but thermal, compatibility and other new exposures still need assessment.",
    source: "hierarchy",
  },
  {
    objective: "S01",
    topic: "Hierarchy of controls",
    subtopic: "Engineering controls",
    title: "Capturing dust at its source",
    difficulty: "introductory",
    stem: "A planner adds a tool-mounted dust-capture system to collect material where a masonry tool generates it. Which description best explains the intended place of this measure in the hierarchy of controls?",
    choices: [
      [
        "An engineering control intended to reduce contaminant release into the worker's breathing environment.",
        "Source capture changes the physical control of the exposure rather than relying only on worker behavior or PPE.",
      ],
      [
        "An administrative control because the worker must switch the tool on.",
        "Routine operation by a person does not make the physical capture mechanism merely administrative.",
      ],
      [
        "Elimination because collection equipment guarantees no airborne exposure remains.",
        "A capture system does not by itself prove complete removal of the hazard.",
      ],
      [
        "Personal protective equipment because the collection hose is attached to the tool.",
        "The system controls emissions at the tool rather than protecting only the wearer.",
      ],
    ],
    explanation:
      "Source capture is generally an engineering measure. Its selection, compatibility, maintenance and use must be assessed; classifying the control does not establish that it achieves a required exposure limit.",
    source: "hierarchy",
  },
  {
    objective: "S01",
    topic: "Hierarchy of controls",
    subtopic: "Reliability and layered controls",
    title: "A warning sign is the only edge control",
    difficulty: "intermediate",
    stem: "Workers regularly carry materials beside an exposed edge. The current proposal is to post a warning sign and rely on each worker to maintain a safe distance. A feasible protective barrier can be installed without preventing the task. Which option best applies the hierarchy of controls?",
    choices: [
      [
        "Evaluate and install the suitable protective barrier and retain any necessary supporting procedures and instruction.",
        "A physical protective measure can reduce reliance on repeated individual decisions.",
      ],
      [
        "Use a larger warning sign because it is more visible than a barrier.",
        "Visibility does not provide the same physical protection against approaching the edge.",
      ],
      [
        "Rotate workers more often so each worker spends less time beside the edge.",
        "Rotation changes individual exposure time but leaves the physical hazard available to each worker.",
      ],
      [
        "Require a supervisor to initial the sign at the start of each shift.",
        "Initialing a sign does not make it a physical fall-prevention measure.",
      ],
    ],
    explanation:
      "Where suitable higher-order controls are feasible, they should be evaluated before relying mainly on warnings. Supporting instruction remains necessary, but it does not replace a suitable physical protective system.",
    source: "hierarchy",
  },
  {
    objective: "K03",
    topic: "Excavation and trenching",
    subtopic: "Underground installations",
    title: "An unmarked crossing enters the trench alignment",
    difficulty: "intermediate",
    stem: "During excavation planning, a utility representative reports a service crossing near the proposed trench but cannot confirm its exact horizontal position. What should be resolved before excavation approaches that location?",
    choices: [
      [
        "Establish the service's exact location by safe and acceptable means and coordinate the required protection as work approaches it.",
        "Estimated service information requires confirmation and protection rather than reliance on the estimate alone.",
      ],
      [
        "Let the excavator operator search for the crossing using normal production digging.",
        "Uncontrolled mechanical searching can strike the installation before its position is established.",
      ],
      [
        "Assume the service follows the straight line between the nearest visible markers.",
        "Visible markers do not establish the exact buried alignment.",
      ],
      [
        "Increase the digging speed so the uncertain area is open for less time.",
        "Speed does not control contact with an unknown installation.",
      ],
    ],
    explanation:
      "Underground-service planning must address uncertain locations before equipment reaches them. The applicable location and protection requirements need review for the specific installation and work method.",
    source: "excavation",
  },
  {
    objective: "K03",
    topic: "Excavation and trenching",
    subtopic: "Spoil and surcharge",
    title: "Spoil is moved toward an occupied trench",
    difficulty: "introductory",
    stem: "A loader begins placing excavated material at the edge of a trench where employees are working. Which immediate concern should the competent person address?",
    choices: [
      [
        "Material falling or rolling into the excavation and the effect of the added load on the excavation's stability.",
        "Edge storage can create both falling-material and surcharge exposures.",
      ],
      [
        "Only whether the spoil will be convenient for later backfilling.",
        "Backfill convenience does not address the present risk to employees in the trench.",
      ],
      [
        "Only whether the spoil pile is high enough to be visible to delivery drivers.",
        "Visibility does not establish suitable placement or stability.",
      ],
      [
        "Whether the loader can complete the pile before the next break.",
        "Production timing does not control falling material or added ground loading.",
      ],
    ],
    explanation:
      "Excavated material and equipment near an excavation require assessment and suitable placement or retention. An actual technical review should confirm the applicable clearance and protective arrangements rather than assuming one measure controls every exposure.",
    source: "excavation",
  },
  {
    objective: "K03",
    topic: "Excavation and trenching",
    subtopic: "Protective-system selection",
    title: "A trench box is proposed without checking its limits",
    difficulty: "advanced",
    stem: "A contractor proposes using an available trench shield because its width fits the planned trench. The crew has not checked the shield's tabulated data or the planned ground and loading conditions. What is the best decision before employees enter?",
    choices: [
      [
        "Confirm that the selected protective system and its installation are suitable for the actual conditions and within the applicable design information.",
        "Fit alone does not establish the system's protective capacity or permissible use.",
      ],
      [
        "Use it because any manufactured shield is suitable for any trench narrower than the shield.",
        "Protective capacity depends on design limits and conditions, not width alone.",
      ],
      [
        "Have workers remain near the center and proceed without checking the design information.",
        "Worker position does not establish that the selected system is suitable.",
      ],
      [
        "Add loose timber outside the shield as a substitute for reviewing its allowable loading.",
        "Unengineered additions do not establish capacity or compatibility.",
      ],
    ],
    explanation:
      "Protective-system selection requires the relevant soil, depth, surcharge and installation conditions to be evaluated against appropriate design data. This draft deliberately avoids asserting a universal depth rule or system capacity.",
    source: "protectiveSystems",
  },
  {
    objective: "K03",
    topic: "Excavation and trenching",
    subtopic: "Reinspection after a hazard-increasing event",
    title: "Vibration changes an excavation's surroundings",
    difficulty: "intermediate",
    stem: "After the morning excavation inspection, an adjacent crew starts sustained vibration-producing work close to the trench. Employees are about to reenter it. What should determine whether reentry is permitted?",
    choices: [
      [
        "A competent-person assessment of whether the changed conditions introduce hazards and whether the protective arrangements remain suitable.",
        "A new hazard-increasing condition can require reassessment before exposure resumes.",
      ],
      [
        "The inspection sticker from the morning, because the same shift is still in progress.",
        "A prior inspection does not establish suitability after conditions change.",
      ],
      [
        "The excavator operator's statement that the trench dimensions have not changed.",
        "Dimensions alone do not describe the effects of vibration or stability.",
      ],
      [
        "The absence of a recorded cave-in on previous projects using similar equipment.",
        "Past experience does not establish the safety of the current excavation.",
      ],
    ],
    explanation:
      "Excavation inspections must respond to changing conditions, not simply a calendar interval. The actual applicability and required protective response should be determined by the responsible competent person.",
    source: "excavation",
  },
  {
    objective: "K04",
    topic: "Fall protection",
    subtopic: "Protecting floor openings",
    title: "A cover is disturbed by the next trade",
    difficulty: "introductory",
    stem: "A floor opening is protected by a cover, but the cover must be lifted repeatedly to pass services through it. Other workers continue to use the surrounding floor. What should the work plan address during each period when the cover is removed?",
    choices: [
      [
        "An effective alternative means of controlling access and fall exposure, with responsibility for restoring and checking the cover.",
        "Protection must remain effective during the work step that temporarily removes the original control.",
      ],
      [
        "Only a reminder to the service installers to put the cover back at the end of the shift.",
        "Other workers are exposed while the opening is uncovered during the shift.",
      ],
      [
        "The original cover inspection record, which remains valid throughout the task.",
        "A record of the installed cover does not protect the opening while the cover is absent.",
      ],
      [
        "A chalk outline of the cover's normal position as the sole replacement measure.",
        "An outline does not provide a physical barrier or otherwise establish adequate protection.",
      ],
    ],
    explanation:
      "Temporary removal of a protective measure is itself a task condition requiring control. The plan must consider everyone who can approach the opening and how the original protection is restored.",
    source: "fallDuty",
  },
  {
    objective: "K05",
    topic: "Fall protection",
    subtopic: "Fall clearance",
    title: "A rated system does not fit the available space",
    difficulty: "advanced",
    stem: "A worker has a personal fall-arrest system with individually rated components. The proposed anchor is near foot level and a lower platform is close below the work area. Which check is most important before authorizing that arrangement?",
    choices: [
      [
        "Evaluate the complete system's permitted use, free fall and total required clearance, including relevant manufacturer instructions and the lower obstruction.",
        "Component ratings alone do not establish that the assembled arrangement can stop a fall before contact.",
      ],
      [
        "Confirm only that the harness and connector have matching brand names.",
        "A common brand does not establish permitted configuration or sufficient clearance.",
      ],
      [
        "Subtract the lanyard's labeled length from the platform height and ignore other distances.",
        "Arrest distance, system movement and worker dimensions can contribute to required clearance.",
      ],
      [
        "Assume the arrangement is suitable because the worker remains attached while moving.",
        "Continuous attachment does not establish safe arrest geometry or clearance.",
      ],
    ],
    explanation:
      "Fall protection is a system evaluation. Anchor position, equipment limitations and total fall path matter; a technical review must use the actual equipment instructions and site geometry.",
    source: "fallSystems",
  },
  {
    objective: "K05",
    topic: "Fall protection",
    subtopic: "Equipment condition",
    title: "Damage is found during harness inspection",
    difficulty: "introductory",
    stem: "A pre-use inspection finds cut webbing on a fall-arrest harness. A replacement is available from the site store. Which response is most appropriate?",
    choices: [
      [
        "Remove the damaged harness from service and obtain suitable replacement equipment before the exposed task begins.",
        "Known damage should be addressed before relying on the equipment for fall arrest.",
      ],
      [
        "Cover the cut with tape so it cannot spread while the worker completes the task.",
        "An improvised cover does not restore the harness's protective capacity.",
      ],
      [
        "Allow use if the worker promises not to fall or lean into the harness.",
        "A promise does not control an accidental fall or repair damage.",
      ],
      [
        "Transfer the harness to a shorter worker to reduce the visible gap in the webbing.",
        "Changing the wearer does not correct the equipment defect.",
      ],
    ],
    explanation:
      "Personal fall-arrest equipment must be suitable for use and inspected. Damage should trigger removal from service and evaluation under the applicable criteria rather than an improvised repair.",
    source: "fallSystems",
  },
  {
    objective: "K04",
    topic: "Fall protection",
    subtopic: "Changing access arrangements",
    title: "A route bypasses the installed edge barrier",
    difficulty: "intermediate",
    stem: "A newly installed duct blocks the normal protected access route. Workers begin walking outside the edge barrier to reach their station. What is the best correction?",
    choices: [
      [
        "Stop use of the bypass and establish a suitable protected route or revised work arrangement before access resumes.",
        "The changed route has defeated the original collective protection.",
      ],
      [
        "Keep the route open and add a sign telling workers to face the edge.",
        "A directional reminder does not replace a suitable protective arrangement.",
      ],
      [
        "Ask workers to carry fewer tools while continuing outside the barrier.",
        "A smaller carried load does not remove the fall exposure.",
      ],
      [
        "Leave the arrangement until the weekly guardrail inspection confirms the rail is intact.",
        "An intact barrier is ineffective for people walking on its unprotected side.",
      ],
    ],
    explanation:
      "Protection should be evaluated along the route people actually use. Changed access requires an immediate suitable solution, not merely confirmation that the original barrier remains installed.",
    source: "fallDuty",
  },
  {
    objective: "K02",
    topic: "Electrical safety",
    subtopic: "Damaged flexible cords",
    title: "Insulation damage is discovered at a doorway",
    difficulty: "introductory",
    stem: "A flexible cord supplying a construction tool has been crushed by a door, exposing damaged outer insulation and conductors. What should the supervisor do with the cord?",
    choices: [
      [
        "Remove it from use and arrange qualified evaluation or suitable replacement before the tool is used with that supply.",
        "Known electrical damage requires correction rather than continued production use.",
      ],
      [
        "Move the cord to the hinge side and continue because the door will no longer contact it.",
        "Moving the cord prevents some further damage but does not repair the existing defect.",
      ],
      [
        "Keep using it if the tool operates at normal speed.",
        "Normal tool operation does not establish insulation integrity.",
      ],
      [
        "Assign the cord only to short tasks until the replacement order arrives.",
        "Shorter use does not remove the electrical defect.",
      ],
    ],
    explanation:
      "A damaged flexible cord should not remain in service simply because the connected tool still runs. The supply route should also be corrected to prevent replacement equipment from being damaged.",
    source: "cords",
  },
  {
    objective: "K02",
    topic: "Electrical safety",
    subtopic: "Overhead-line planning",
    title: "Long materials approach an overhead line",
    difficulty: "intermediate",
    stem: "A crew plans to raise long metal framing members near an overhead electrical line. The line's voltage and required approach arrangement have not been established. Which decision is most defensible before the lift?",
    choices: [
      [
        "Hold the activity until the electrical hazard and applicable protective arrangement are established with the responsible parties.",
        "Unknown line conditions prevent the crew from establishing an appropriate safe work arrangement.",
      ],
      [
        "Rely on the framing members' painted finish as insulation.",
        "A coating on the material is not an established electrical protective system.",
      ],
      [
        "Have a worker judge clearance visually while the lift proceeds.",
        "Observation alone does not establish the required controls for unknown line conditions.",
      ],
      [
        "Proceed if the crew expects to finish before the utility's next inspection.",
        "Inspection timing does not affect the line's immediate electrical hazard.",
      ],
    ],
    explanation:
      "Planning must identify electrical exposure and suitable controls before moving conductive materials nearby. This draft does not invent a universal clearance distance for an unspecified voltage and operation.",
    source: "electrical",
  },
  {
    objective: "K02",
    topic: "Electrical safety",
    subtopic: "Protective-device limitations",
    title: "A protective device is treated as permission for unsafe routing",
    difficulty: "intermediate",
    stem: "A foreman says that a cord can remain in a standing-water area because the supply has a ground-fault protective device. Which response best evaluates that reasoning?",
    choices: [
      [
        "The protective device does not remove the need to assess the equipment's suitability, condition and routing for the wet environment.",
        "One protective measure does not establish that every other part of the installation is acceptable.",
      ],
      [
        "Any tool supplied through such a device is suitable for any wet environment.",
        "Protective-device presence does not change a tool's environmental rating or physical condition.",
      ],
      [
        "The only relevant check is whether the cord reaches the work without an extension.",
        "Length alone does not address wet-location suitability or exposure.",
      ],
      [
        "Workers can evaluate suitability by touching the casing before each use.",
        "Using a person as a fault detector is not an appropriate electrical assessment method.",
      ],
    ],
    explanation:
      "Electrical protection relies on appropriate equipment and installation as well as applicable protective devices. A device is not a blanket exemption from controlling wet-environment and damage exposures.",
    source: "electrical",
  },
  {
    objective: "K02",
    topic: "Electrical safety",
    subtopic: "Supply identification",
    title: "An uncertain panel label affects isolation",
    difficulty: "advanced",
    stem: "A renovation team must work near exposed conductors. The panel schedule and field labels disagree about which circuit supplies them. What should control release of the work?",
    choices: [
      [
        "A qualified determination of the actual supply and implementation and verification of the required electrical protective condition before exposure.",
        "Conflicting labels require positive technical identification rather than an assumption about the circuit.",
      ],
      [
        "Use whichever label was printed most recently as the isolation authority.",
        "A recent label can still be inaccurate and does not verify the conductors' condition.",
      ],
      [
        "Open both labeled breakers and assume every possible source has been addressed.",
        "Unverified sources, including possible alternate feeds, may remain.",
      ],
      [
        "Let the production crew begin while an electrician checks the labels in parallel.",
        "The verification must precede the electrical exposure, not occur during it.",
      ],
    ],
    explanation:
      "A label is planning information, not proof of a safe electrical condition. The actual supply and required protective measures must be established by appropriate qualified personnel before work is exposed to the hazard.",
    source: "electrical",
  },
  {
    objective: "K10",
    topic: "Cranes and rigging",
    subtopic: "Support conditions",
    title: "An outrigger location has changed",
    difficulty: "intermediate",
    stem: "A mobile crane's planned setup must shift so that one outrigger location is above a recently backfilled utility trench. What should happen before setup is accepted?",
    choices: [
      [
        "Assess the revised ground-support conditions and establish suitable support and setup requirements for the actual location.",
        "Backfill and buried features can affect support even where the surface looks level.",
      ],
      [
        "Use the original setup approval because the crane model has not changed.",
        "The approval's ground assumptions may not apply to the revised location.",
      ],
      [
        "Compensate by lifting the load more slowly without changing the support assessment.",
        "A slower lift does not establish ground-bearing capacity.",
      ],
      [
        "Check only whether the outrigger floats are visibly clean.",
        "Surface cleanliness does not establish subsurface support.",
      ],
    ],
    explanation:
      "Crane setup depends on actual ground and support conditions. Relocation can invalidate the original assessment, requiring appropriate information and protective arrangements before operation.",
    source: "craneSetup",
  },
  {
    objective: "K09",
    topic: "Cranes and rigging",
    subtopic: "Sling identification",
    title: "A sling's capacity cannot be established",
    difficulty: "introductory",
    stem: "A rigging crew selects a sling with an unreadable identification marking. No reliable documentation links that sling to its rated capacity. What is the best next action?",
    choices: [
      [
        "Keep the sling out of the lift and obtain rigging with an established suitable rating and condition.",
        "The crew cannot verify that the unidentified sling is suitable for the planned load and configuration.",
      ],
      [
        "Estimate its capacity by comparing its diameter with a nearby sling.",
        "Appearance alone does not establish material, construction, rating or condition.",
      ],
      [
        "Use it only if the first part of the lift appears smooth.",
        "A trial production lift is not a substitute for establishing the equipment's rating.",
      ],
      [
        "Double the number of turns around the load and assume the capacity doubles.",
        "An improvised configuration does not establish capacity and can introduce additional damage or loading issues.",
      ],
    ],
    explanation:
      "Rigging suitability requires identifiable capacity and appropriate condition for the specific use. Unknown rating cannot be resolved through visual estimation or an improvised proof of performance.",
    source: "rigging",
  },
  {
    objective: "K10",
    topic: "Cranes and rigging",
    subtopic: "Changing load radius",
    title: "A landing location is farther away",
    difficulty: "advanced",
    stem: "A lift is planned for one landing location, but a site obstruction requires the load to be placed farther from the crane's center of rotation. The load weight is unchanged. What should be checked before proceeding?",
    choices: [
      [
        "The crane's allowable capacity and configuration for the revised radius and the complete revised lifting arrangement.",
        "Capacity depends on the actual configuration and radius, not load weight alone.",
      ],
      [
        "Only whether the original rigging has a higher rated capacity than the load.",
        "Rigging capacity does not establish crane capacity at the new radius.",
      ],
      [
        "Whether a more experienced signal person is available to reduce the load's effective weight.",
        "Experience does not change the crane's load chart or physical loading.",
      ],
      [
        "Whether the load can be swung quickly enough to minimize time at the new radius.",
        "Short duration at an excessive demand does not establish an acceptable lift.",
      ],
    ],
    explanation:
      "A changed radius can alter lifting capacity and load effects. The revised plan must be checked against the actual crane configuration and applicable operating information before execution.",
    source: "cranes",
  },
  {
    objective: "K09",
    topic: "Cranes and rigging",
    subtopic: "Suspended-load exposure",
    title: "Workers wait beneath a staged lift",
    difficulty: "intermediate",
    stem: "A suspended prefabricated assembly must wait while its landing area is cleared. Unrelated workers begin crossing beneath it to reach a break area. What is the best immediate response?",
    choices: [
      [
        "Control the area and reroute the unrelated workers away from the suspended-load exposure while establishing a safe condition for the waiting load.",
        "The route exposes people who have no role in the lifting operation to the suspended load.",
      ],
      [
        "Permit crossing one person at a time because the load is not moving horizontally.",
        "A stationary suspended load still presents a potential falling-load exposure.",
      ],
      [
        "Have the operator sound the horn while workers pass below.",
        "A warning does not remove the need to control unnecessary exposure beneath the load.",
      ],
      [
        "Ask the workers to walk faster so they spend less time beneath it.",
        "Reduced crossing time does not establish a safe route.",
      ],
    ],
    explanation:
      "Lifting arrangements should control access to the fall zone and avoid unnecessary exposure. Holding a load does not make it equivalent to a supported object on the ground.",
    source: "suspendedLoads",
  },
  {
    objective: "K08",
    topic: "Mobile equipment",
    subtopic: "Pedestrian segregation",
    title: "A stockpile narrows the haul-road walkway",
    difficulty: "introductory",
    stem: "A stockpile encroaches on a pedestrian walkway so that workers step into an active haul road to pass. What is the most effective immediate planning response?",
    choices: [
      [
        "Restore suitable pedestrian separation or establish a controlled alternative route before allowing the conflicting movements to continue.",
        "This addresses the physical interface that is putting pedestrians into vehicle travel.",
      ],
      [
        "Issue brighter vests and retain the route unchanged.",
        "Visibility can assist but does not restore separation where the path directs people into traffic.",
      ],
      [
        "Tell pedestrians to make eye contact without changing the access route.",
        "Eye contact does not reliably control every movement or remove the route conflict.",
      ],
      [
        "Move the walkway sign closer to the stockpile.",
        "A sign relocation does not create a usable protected passage.",
      ],
    ],
    explanation:
      "Traffic control should make the intended pedestrian route usable and separated where feasible. Personal visibility and instruction support a safe arrangement rather than replacing it.",
    source: "equipment",
  },
  {
    objective: "K08",
    topic: "Mobile equipment",
    subtopic: "Blind-area communication",
    title: "Contact with a backing spotter is lost",
    difficulty: "intermediate",
    stem: "During a controlled backing maneuver, an equipment operator loses the agreed visual contact with the assigned spotter. What should happen before the maneuver continues?",
    choices: [
      [
        "Stop the movement, reestablish the agreed communication and confirm that the travel area is controlled.",
        "The maneuver should not continue when the relied-upon communication arrangement is lost.",
      ],
      [
        "Continue at the same speed because the spotter knows the planned route.",
        "Knowledge of the route does not establish the spotter's current location or the path's condition.",
      ],
      [
        "Reverse faster to clear the blind area sooner.",
        "Increasing speed increases demand on an already failed communication arrangement.",
      ],
      [
        "Use the backup alarm as proof that no pedestrian remains behind the equipment.",
        "An alarm warns but does not prove that the path is clear.",
      ],
    ],
    explanation:
      "A maneuver that relies on a spotter needs an agreed stop condition when communication fails. Reestablishing control precedes resuming movement.",
    source: "equipment",
  },
  {
    objective: "K08",
    topic: "Mobile equipment",
    subtopic: "Pre-shift defects",
    title: "A brake defect appears during the check",
    difficulty: "introductory",
    stem: "A site truck's pre-shift check identifies a braking defect affecting safe operation. Deliveries are waiting. Which action should the supervisor take?",
    choices: [
      [
        "Keep the defective truck out of service until the safety defect is corrected and arrange suitable alternative delivery equipment.",
        "Production demand does not establish that defective braking equipment is safe to operate.",
      ],
      [
        "Use it only on the site's flat sections until the mechanic arrives.",
        "A limited route does not correct the braking defect or account for unexpected stopping needs.",
      ],
      [
        "Reduce the load and let the driver compensate with slower speed.",
        "A lighter load and lower speed do not establish a safe braking system.",
      ],
      [
        "Ask the driver to sign a statement accepting responsibility for using it.",
        "A signature does not correct a safety defect or provide a suitable control.",
      ],
    ],
    explanation:
      "A known defect affecting safe vehicle operation calls for correction before use. An alternative arrangement should meet the delivery need without transferring the unresolved defect to the operator.",
    source: "vehicles",
  },
  {
    objective: "K08",
    topic: "Mobile equipment",
    subtopic: "Attachments and operating limits",
    title: "A fork attachment changes the lift arrangement",
    difficulty: "advanced",
    stem: "A crew adds a different attachment to material-handling equipment for a difficult placement. The attachment changes the load's position, and the available capacity information does not cover that configuration. What is the best decision?",
    choices: [
      [
        "Obtain applicable authorization and capacity information for the actual equipment, attachment and load arrangement before lifting.",
        "A changed attachment can change load effects and permissible operation.",
      ],
      [
        "Use the base machine's largest displayed capacity for every attachment.",
        "A maximum base capacity does not establish capacity for a different load center or configuration.",
      ],
      [
        "Make a low test lift and use whether the rear wheels stay down as the acceptance criterion.",
        "A production test of apparent stability does not establish an authorized operating capacity.",
      ],
      [
        "Keep the old capacity label and attach a note that the operator should be careful.",
        "A caution note does not provide the missing configuration-specific operating information.",
      ],
    ],
    explanation:
      "The actual configuration determines operating limits. The appropriate manufacturer or authorized technical information must resolve an unlisted attachment arrangement rather than relying on an improvised field judgment.",
    source: "equipment",
  },
  {
    objective: "K06",
    topic: "Confined spaces",
    subtopic: "Identification before entry",
    title: "A newly exposed vault is not on the plan",
    difficulty: "intermediate",
    stem: "A demolition crew uncovers a below-grade vault that is not listed in the project entry inventory. Workers propose entering to inspect old piping. What should occur before anyone enters?",
    choices: [
      [
        "Have the space evaluated by the responsible competent person and determine the applicable entry controls and program requirements.",
        "An unlisted space needs assessment; absence from an inventory is not evidence of safe entry.",
      ],
      [
        "Treat it as ordinary access because the plan did not identify a permit space there.",
        "The plan's omission does not determine the actual space characteristics and hazards.",
      ],
      [
        "Allow a brief entry as long as the worker leaves tools outside.",
        "Entry duration and tool placement do not establish whether entry hazards are controlled.",
      ],
      [
        "Rely on the worker's ability to see the bottom from the opening.",
        "Visibility does not reveal every atmospheric, engulfment or configuration hazard.",
      ],
    ],
    explanation:
      "A space's actual characteristics and hazards determine the required entry arrangements. Newly discovered spaces require evaluation before entry, including applicable permit-space requirements.",
    source: "spaces",
  },
  {
    objective: "K06",
    topic: "Confined spaces",
    subtopic: "Atmospheric controls",
    title: "A clean initial test is treated as permanent clearance",
    difficulty: "advanced",
    stem: "Before a planned permit-space entry, initial atmospheric readings meet the entry criteria. The task will introduce a contaminant-generating process, and the conditions may change during work. What should the entry plan address?",
    choices: [
      [
        "The process-generated hazards, appropriate controls and monitoring needed to confirm that acceptable entry conditions are maintained.",
        "Initial readings do not establish conditions for the entire changing task.",
      ],
      [
        "Only retaining the first readings on the permit because passing once clears the whole shift.",
        "A single pre-entry result does not demonstrate continued acceptable conditions.",
      ],
      [
        "Using odor as the only indicator after the initial instrument test.",
        "Odor is not a reliable method for detecting or measuring every hazardous atmosphere.",
      ],
      [
        "Ending monitoring once the first entrant reports feeling comfortable.",
        "Comfort is not evidence that atmospheric criteria remain satisfied.",
      ],
    ],
    explanation:
      "Entry control must reflect both existing hazards and those introduced by the work. Monitoring and protective arrangements should maintain acceptable conditions rather than treating a single test as a permanent clearance.",
    source: "spaceProgram",
  },
  {
    objective: "K06",
    topic: "Confined spaces",
    subtopic: "Rescue capability",
    title: "An emergency number is the entire rescue plan",
    difficulty: "intermediate",
    stem: "A permit-space plan lists only 'call emergency services' for rescue. No one has evaluated whether the service can reach and rescue entrants in the space in a suitable time. What is the principal gap?",
    choices: [
      [
        "The rescue service's capability, availability and timeliness for the actual space and hazards have not been established.",
        "A contact number alone does not demonstrate a workable rescue arrangement.",
      ],
      [
        "The telephone number has not been printed in the same color as the entry permit.",
        "Document appearance is not the central issue in rescue suitability.",
      ],
      [
        "The entrant has not agreed to wait until the end of the shift for assistance.",
        "Consent does not make delayed rescue adequate for the actual hazards.",
      ],
      [
        "The attendant needs a longer list of people to call after the first service is unavailable.",
        "More contacts do not by themselves establish a capable, timely rescue method.",
      ],
    ],
    explanation:
      "Rescue planning must evaluate actual capability and response relative to the space's hazards. A general emergency contact is not evidence that the required rescue functions can be performed.",
    source: "spaceRescue",
  },
  {
    objective: "K06",
    topic: "Confined spaces",
    subtopic: "Interdependent operations",
    title: "Another contractor reconnects a process line",
    difficulty: "advanced",
    stem: "A contractor is preparing to enter a permit space after isolating a connected process line. A separate contractor plans to reconnect that line during the same work period. What should be resolved before entry is authorized?",
    choices: [
      [
        "Coordinate the operations so the required isolation remains effective and responsibilities and entry conditions are controlled throughout the entry.",
        "The other contractor's work can defeat a control on which safe entry depends.",
      ],
      [
        "Accept each contractor's separate plan because neither crew works inside the other's boundary.",
        "A connected line creates an interaction across the crews' physical work boundaries.",
      ],
      [
        "Schedule the reconnection for a quiet part of the shift without notifying the entry team.",
        "A quieter time does not prevent an unsafe loss of isolation.",
      ],
      [
        "Have the entrant watch the line while the reconnection proceeds.",
        "Observation from inside does not replace effective isolation and coordinated authorization.",
      ],
    ],
    explanation:
      "Entry controls can depend on work performed by others. Coordination must prevent simultaneous operations from invalidating isolation or other acceptable entry conditions.",
    source: "spaceProgram",
  },
  {
    objective: "K08",
    topic: "Hazardous energy",
    subtopic: "Stored mechanical energy",
    title: "A raised assembly remains above the repair",
    difficulty: "introductory",
    stem: "A mechanic will work beneath a raised part of construction equipment. The engine is stopped, but the part is supported only by the hydraulic system. Which additional concern must be controlled before repair begins?",
    choices: [
      [
        "Unintended lowering or movement of the raised part, using suitable positive support and the other required energy controls.",
        "Stopping the engine does not remove stored energy or guarantee that hydraulic support will hold.",
      ],
      [
        "Only the noise from the stopped engine.",
        "The immediate concern includes movement of the raised assembly, not just running-engine exposure.",
      ],
      [
        "Whether the ignition key is stored in the office, regardless of the raised part's support.",
        "Key control alone does not prevent release or loss of stored hydraulic support.",
      ],
      [
        "Whether the repair can be completed before hydraulic pressure decreases noticeably.",
        "Relying on available pressure or speed of repair does not establish positive protection.",
      ],
    ],
    explanation:
      "Hazardous energy can remain after shutdown. Raised equipment parts require a suitable means to prevent unintended movement in addition to the applicable shutdown and isolation arrangements.",
    source: "energyEquipment",
  },
  {
    objective: "K02",
    topic: "Hazardous energy",
    subtopic: "Electrical isolation versus control stop",
    title: "The stop button is mistaken for isolation",
    difficulty: "intermediate",
    stem: "A construction crew will expose wiring on installed equipment. A supervisor proposes pressing its stop button and attaching a note to the control panel. What is the critical limitation of that proposal?",
    choices: [
      [
        "A control stop does not by itself establish isolation of the electrical supply or verification of the required electrical condition.",
        "The equipment can retain electrical energy even when normal operation has stopped.",
      ],
      [
        "The note should be larger so the stopped equipment is more visible.",
        "A larger note does not turn a control function into supply isolation.",
      ],
      [
        "The stop button is sufficient if the person pressing it is the supervisor.",
        "Authority does not change the electrical function of the button.",
      ],
      [
        "The stop button is sufficient if the equipment was not running at the time.",
        "A nonrunning machine can still have energized circuits.",
      ],
    ],
    explanation:
      "Stopping normal operation and establishing an appropriate isolated electrical condition are different functions. Qualified personnel must apply and verify the applicable protective arrangements before exposed electrical work.",
    source: "energyElectrical",
  },
  {
    objective: "K08",
    topic: "Hazardous energy",
    subtopic: "Multiple energy sources",
    title: "A pneumatic supply remains connected",
    difficulty: "intermediate",
    stem: "An installation crew disconnects a machine's electrical supply before clearing a jam. The actuator also has a compressed-air supply and a load that can move under gravity. What should the energy-control assessment include?",
    choices: [
      [
        "Every hazardous energy source and stored-energy movement relevant to the task, including air pressure and gravity.",
        "Controlling one source does not prevent motion caused by the others.",
      ],
      [
        "Only the largest motor because it supplies most of the machine's power.",
        "Source size does not determine whether another source can injure a worker.",
      ],
      [
        "Only sources listed on the electrical panel schedule.",
        "The panel schedule may not describe pneumatic or gravitational energy.",
      ],
      [
        "Only energy sources that have caused a previous injury on this project.",
        "Lack of a previous injury does not establish that an existing source is harmless.",
      ],
    ],
    explanation:
      "The assessment should follow all credible energy pathways into the work area. Isolation, restraint, dissipation and verification should be selected for the actual sources and task; no blanket applicability of a general-industry rule is asserted here.",
    source: "energyEquipment",
  },
  {
    objective: "K02",
    topic: "Hazardous energy",
    subtopic: "Changes to an isolated circuit",
    title: "The work scope extends beyond the checked circuit",
    difficulty: "advanced",
    stem: "A qualified electrical team has established the protective condition for a specific circuit. The task expands to a nearby enclosure containing another circuit that was not included in the isolation or verification. What should occur before the expanded work begins?",
    choices: [
      [
        "Reassess the expanded scope and establish and verify the required protective condition for every newly exposed electrical source.",
        "Protection established for one scope does not automatically cover additional circuits.",
      ],
      [
        "Assume the nearby enclosure is included because it serves the same room.",
        "Physical proximity does not prove a common or isolated supply.",
      ],
      [
        "Copy the original tag information onto the second enclosure without checking its source.",
        "Copying documentation does not establish isolation of a different circuit.",
      ],
      [
        "Proceed if the same workers perform both parts of the task.",
        "Personnel continuity does not extend an electrical isolation boundary.",
      ],
    ],
    explanation:
      "Energy controls are linked to an identified scope and boundary. Expanding exposure requires an appropriate new assessment and verification rather than assuming the original condition extends to nearby equipment.",
    source: "energyElectrical",
  },
  {
    objective: "K20",
    topic: "Industrial hygiene fundamentals",
    subtopic: "Silica task controls",
    title: "A wet-control system loses water",
    difficulty: "intermediate",
    stem: "A masonry-cutting task is being performed under a specified wet-control method. The water supply fails and visible dust increases. The crew proposes finishing the remaining cuts without the water. What is the best response?",
    choices: [
      [
        "Stop the affected cutting until the required control is restored or a suitable assessed alternative method is in place.",
        "Continuing after a required control fails changes the basis on which the task was authorized.",
      ],
      [
        "Continue because the first cuts were completed with water.",
        "Earlier controlled work does not protect workers from later uncontrolled dust generation.",
      ],
      [
        "Have a worker stand closer to watch whether the dust cloud becomes dense.",
        "Closer visual observation increases potential exposure and does not measure respirable silica.",
      ],
      [
        "Use the original task plan as proof that exposure remains controlled despite the failed system.",
        "A plan describing an operating control does not establish actual control after failure.",
      ],
    ],
    explanation:
      "A specified control method depends on its required operating conditions. If a critical part fails, work should not continue under the assumption that the original exposure basis still applies.",
    source: "silica",
  },
  {
    objective: "K18",
    topic: "Industrial hygiene fundamentals",
    subtopic: "Noise exposure assessment",
    title: "A spot reading misses the full work pattern",
    difficulty: "advanced",
    stem: "A worker alternates between a short noisy chipping task and quieter duties. A sound-level reading is taken only during a quiet period. What is the main limitation when using that reading to characterize the worker's shift exposure?",
    choices: [
      [
        "It does not represent the noise levels and durations across the worker's actual pattern of tasks.",
        "Shift exposure depends on the relevant varying levels and time, not one unrepresentative quiet observation.",
      ],
      [
        "A quiet reading proves that short noisy tasks cannot affect shift exposure.",
        "Intermittent high levels can contribute to exposure and must be evaluated appropriately.",
      ],
      [
        "The worker's job title is a more precise measure than the observed task pattern.",
        "A title does not quantify actual noise levels or durations.",
      ],
      [
        "Any digital meter automatically converts a single quiet reading into the correct full-shift exposure.",
        "Instrument display format cannot supply missing representative sampling information.",
      ],
    ],
    explanation:
      "An exposure assessment must represent the relevant work pattern and use suitable instruments and methods. A technical reviewer should verify the applicable noise criteria and assessment method for this construction scenario.",
    source: "noise",
  },
  {
    objective: "S04",
    topic: "Industrial hygiene fundamentals",
    subtopic: "Instrument selection",
    title: "An unsuitable meter is offered for solvent assessment",
    difficulty: "intermediate",
    stem: "A crew needs to assess an airborne solvent exposure. Someone offers a meter designed only to measure oxygen concentration. What is the best assessment decision?",
    choices: [
      [
        "Select a method appropriate to the solvent and assessment purpose, with the required range, limitations and calibration considered.",
        "The instrument must be capable of measuring the hazard being assessed.",
      ],
      [
        "Use the oxygen reading as a direct concentration measurement for any solvent.",
        "An oxygen-only instrument does not directly identify or quantify every solvent vapor.",
      ],
      [
        "Use the oxygen meter if the display has more decimal places than another instrument.",
        "Display precision does not establish suitability for the target contaminant.",
      ],
      [
        "Treat normal oxygen as proof that no harmful airborne contaminant is present.",
        "A hazardous contaminant can be present without causing a decisive oxygen change.",
      ],
    ],
    explanation:
      "Monitoring tools have specific measurement capabilities and limitations. Selecting the instrument follows identification of the hazard, expected conditions and the question the assessment must answer.",
    source: "air",
  },
  {
    objective: "K20",
    topic: "Industrial hygiene fundamentals",
    subtopic: "Dust-generating cleanup",
    title: "Cleanup reintroduces settled dust",
    difficulty: "intermediate",
    stem: "After silica-containing masonry work, a crew proposes using compressed air to clean settled dust from the floor and workers' clothing. No effective capture arrangement or assessment supports that method. What should the supervisor prioritize?",
    choices: [
      [
        "Select a suitable controlled cleanup method and check the applicable silica housekeeping restrictions before authorizing cleanup.",
        "Cleanup can re-aerosolize hazardous material and requires its own control decision.",
      ],
      [
        "Approve the method because cutting has ended and the dust is no longer being generated by a tool.",
        "Disturbing settled material can create a new airborne exposure.",
      ],
      [
        "Clean near the end of the shift so the exposure does not appear in the main task observation.",
        "Moving exposure outside the observed task does not make it acceptable.",
      ],
      [
        "Use a higher air pressure to shorten the time needed to move the dust.",
        "Faster dispersal is not equivalent to controlled removal and can increase airborne contamination.",
      ],
    ],
    explanation:
      "Dust control includes cleanup, not just the producing task. The chosen method must account for re-aerosolization and the actual regulatory conditions and exceptions, which require human source review.",
    source: "silica",
  },
  {
    objective: "S02",
    topic: "Job hazard analysis",
    subtopic: "Verification at a hold point",
    title: "The analysis identifies a missing prerequisite",
    difficulty: "intermediate",
    stem: "A job hazard analysis requires a secured work platform before a component is installed. At the pre-task check, the platform is incomplete. Which action best uses the analysis as an operational control?",
    choices: [
      [
        "Hold the installation until the prerequisite is satisfied or a suitable reassessed and authorized method is established.",
        "A defined prerequisite must influence whether the task is released.",
      ],
      [
        "Proceed because the workers have already signed the analysis.",
        "Acknowledgment does not create the missing protective arrangement.",
      ],
      [
        "Delete the platform requirement after the task to keep the record consistent with what occurred.",
        "Retrospective editing does not control exposure or preserve an accurate decision record.",
      ],
      [
        "Allow the first installation to demonstrate whether the missing platform matters.",
        "Trial exposure is not a substitute for establishing the specified protective condition.",
      ],
    ],
    explanation:
      "An analysis becomes useful when its controls and prerequisites are checked before work proceeds. Failure of a prerequisite calls for a hold and a suitable correction or reassessment.",
    source: "jha",
  },
  {
    objective: "S01",
    topic: "Hierarchy of controls",
    subtopic: "Maintainability of controls",
    title: "A protective guard is routinely bypassed",
    difficulty: "advanced",
    stem: "An engineering guard is repeatedly removed to make routine adjustments, leaving workers exposed to the moving hazard. Management proposes more warning labels. What is the best higher-order improvement to investigate?",
    choices: [
      [
        "Redesign the adjustment or guarding arrangement so routine adjustments can be made without defeating the protective function.",
        "A usable design can reduce the recurring need to bypass the physical control.",
      ],
      [
        "Count the guard as fully effective because it remains available beside the machine.",
        "An available but removed guard does not provide its protective function.",
      ],
      [
        "Use smaller warning labels so they fit every adjustment point.",
        "Label size does not address the design condition driving guard removal.",
      ],
      [
        "Rotate the people making adjustments so no one removes the guard very often.",
        "Rotation does not control the exposed moving hazard during each adjustment.",
      ],
    ],
    explanation:
      "A control that conflicts with routine work may be defeated. Evaluating safer design and maintainability can address the reason for bypassing it, with suitable supporting procedures and verification.",
    source: "hierarchy",
  },
];

export const domain1Batch001: DraftQuestionRecord[] = specifications.map(draft);
