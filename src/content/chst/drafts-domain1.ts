import type { DraftQuestionRecord } from "./draft-types";

type Specification = {
  number: number;
  objective: string;
  topic: string;
  subtopic: string;
  title: string;
  category: DraftQuestionRecord["category"];
  difficulty: "introductory" | "intermediate" | "advanced";
  stem: string;
  choices: readonly [string, string, string, string];
  rationales: readonly [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
  reference: {
    title: string;
    url: string;
    classification?: "regulatory_requirement" | "professional_guidance";
  };
  steps?: string[];
};

function draft(spec: Specification): DraftQuestionRecord {
  // Stable per-record ordering avoids an authored answer-position cycle while
  // preserving the text/rationale pairing and a reproducible grading key.
  const order = [0, 1, 2, 3];
  let seed = Math.imul(spec.number, 0x9e3779b1) >>> 0;
  for (let position = order.length - 1; position > 0; position--) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const other = (seed >>> 0) % (position + 1);
    [order[position], order[other]] = [order[other], order[position]];
  }
  return {
    id: `chst5-draft-${String(spec.number).padStart(3, "0")}`,
    category: spec.category,
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
          id: `candidate-${spec.number}`,
          title: spec.reference.title,
          url: spec.reference.url,
          edition: "",
          section: "",
          classification:
            spec.reference.classification || "regulatory_requirement",
        },
      ],
      body: {
        type: spec.steps
          ? "calculation"
          : spec.category === "scenario"
            ? "scenario"
            : "multiple_choice",
        stem: spec.stem,
        choices: order.map((original, index) => ({
          id: String.fromCharCode(97 + index),
          text: spec.choices[original],
          rationale: spec.rationales[original],
        })),
        correctChoice: String.fromCharCode(97 + order.indexOf(spec.correct)),
        explanation: spec.explanation,
        difficulty: spec.difficulty,
        media: [],
        solutionSteps: spec.steps || [],
      },
    },
    sourceVerifiedAt: null,
    technicalReviewer: null,
    reviewStatus: "draft",
    revision: 1,
  };
}

// Original AI-authored drafts. Candidate links were not examined as technical
// evidence; edition, exact supporting section, verification and reviewer remain
// absent. The attached blueprint establishes mappings, not answer correctness.
export const domain1Drafts: DraftQuestionRecord[] = [
  draft({
    number: 1,
    objective: "K01",
    topic: "Hot work",
    subtopic: "Spark migration",
    title: "Hot work above an occupied level",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A welder is preparing to cut a pipe on an open-grating platform. The immediate work area is clear, but packaging and another crew are on the level below. Which planning change best addresses the additional exposure?",
    choices: [
      "Increase the welder's protective clothing and retain the existing permit boundary.",
      "Extend the hot-work assessment to lower levels, control sparks and combustibles, and coordinate protection of exposed workers.",
      "Assign a fire watch only at the pipe because that is where ignition is most likely to begin.",
      "Reschedule the lower crew's break to overlap with cutting, leaving its stored materials in place.",
    ],
    rationales: [
      "Clothing protects the welder from some exposures but does not control ignition or exposure below the grating.",
      "This expands the assessment to the path sparks can travel and addresses both personnel and combustible materials.",
      "A watch limited to the source can miss ignition on a lower level or in a concealed location.",
      "Moving workers temporarily does not address combustibles or confirm that sparks remain controlled.",
    ],
    correct: 1,
    explanation:
      "A hot-work boundary should reflect where heat, slag and sparks can create an exposure, including adjacent or lower work areas. Coordination, ignition prevention and appropriate observation must address those areas; a clear welding station alone is incomplete.",
    reference: {
      title:
        "Candidate OSHA construction fire-prevention requirements for welding and cutting",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.352",
    },
  }),
  draft({
    number: 2,
    objective: "K02",
    topic: "Electrical safety",
    subtopic: "Repeated protective-device operation",
    title: "A recurring portable-tool trip",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A portable saw repeatedly trips its ground-fault protective device. Another saw runs from the same supply without tripping. What is the most defensible next step before returning the suspect saw to service?",
    choices: [
      "Move the saw to another protected outlet and rely on whether it trips there.",
      "Replace the extension lead with a longer one to separate the saw from the supply.",
      "Remove the suspect equipment from use and have the saw, lead and supply arrangement evaluated for the cause.",
      "Run the saw without a load; if it operates normally, resume cutting with shorter work periods.",
    ],
    rationales: [
      "A different outlet may help a qualified investigation but operation alone does not establish that the fault has been corrected.",
      "Additional lead length does not diagnose or remove an electrical fault and may create other electrical concerns.",
      "Isolation and competent evaluation address a possible fault rather than treating protective-device operation as an inconvenience.",
      "A fault may appear only under load or particular conditions; an unloaded run is not evidence of safe operation.",
    ],
    correct: 2,
    explanation:
      "Repeated operation of protective equipment warrants investigation. The suspect item should remain unavailable until the cause is evaluated and appropriate repairs or other controls are confirmed; testing by continued production use does not establish safety.",
    reference: {
      title: "Candidate OSHA construction electrical safety requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.416",
    },
  }),
  draft({
    number: 3,
    objective: "K03",
    topic: "Excavation safety",
    subtopic: "Changing site conditions",
    title: "Rain after the excavation assessment",
    category: "scenario",
    difficulty: "intermediate",
    stem: "An excavation was evaluated before yesterday's shift. Overnight rainfall has left water near the edge and small soil fragments have fallen from a sidewall. The planned depth has not changed. What should control the decision to enter?",
    choices: [
      "A new evaluation of the changed conditions by the responsible competent person, with necessary controls established before entry.",
      "The original assessment, because the planned depth and utility markings are unchanged.",
      "A shorter entry period combined with a worker positioned at the access ladder.",
      "The crew's comparison with a nearby excavation in the same general soil.",
    ],
    rationales: [
      "Water and visible deterioration are changes requiring reassessment; necessary protection must reflect actual conditions.",
      "An unchanged design depth does not establish that soil stability or other hazards remain unchanged.",
      "Limiting time or observing the entry does not stabilize an excavation or establish adequate protection.",
      "A nearby excavation may have different water, loading, soil or protective-system conditions.",
    ],
    correct: 0,
    explanation:
      "An excavation assessment is conditional on the actual site. Rainfall, water accumulation and sidewall deterioration can change the hazard even when the work scope is unchanged. Entry decisions must follow a current competent evaluation and effective protective measures.",
    reference: {
      title: "Candidate OSHA construction excavation requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.651",
    },
  }),
  draft({
    number: 4,
    objective: "K04",
    topic: "Work at height",
    subtopic: "Temporary edge openings",
    title: "A material landing interrupts edge protection",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A crew proposes removing part of a roof-edge barrier to receive materials. Workers must approach the landing during each delivery. Which proposal best addresses the resulting fall exposure?",
    choices: [
      "Keep the opening identified with paint and allow only the receiving crew into that area.",
      "Keep the barrier removed for the delivery period and assign a supervisor to monitor access.",
      "Require every receiving worker to carry a harness, with connection decisions made during unloading.",
      "Plan a protected receiving arrangement that maintains effective fall protection through opening, transfer and restoration.",
    ],
    rationales: [
      "Markings identify an area but do not provide physical protection or a complete alternative fall-protection arrangement.",
      "Observation can support a plan but does not replace effective protection while an exposed edge is open.",
      "A harness carried or worn without a suitable complete system does not control the fall exposure.",
      "The transition between protected and open conditions must be planned, including a suitable receiving arrangement and restoration.",
    ],
    correct: 3,
    explanation:
      "Temporary material handling can create an exposure that differs from normal roof work. A complete plan must protect workers during the transition and the transfer itself, rather than relying on a barrier that is temporarily absent or equipment that is not configured.",
    reference: {
      title: "Candidate OSHA construction fall-protection duty requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.501",
    },
  }),
  draft({
    number: 5,
    objective: "K05",
    topic: "Fall-arrest systems",
    subtopic: "Illustrative clearance calculation",
    title: "Compare required and available clearance",
    category: "reasoning_calculation",
    difficulty: "advanced",
    stem: "For a classroom exercise only, a manufacturer's supplied clearance worksheet specifies adding 1.8 m for free fall, 1.1 m for deceleration, 1.5 m for the remaining body/connector allowance and 1.0 m for its safety margin. Available clearance, measured from the same worksheet datum to the obstruction, is 4.8 m. Which conclusion follows from these supplied values? This is not a design rule for an actual system.",
    choices: [
      "Required clearance is 4.4 m, so the arrangement has 0.4 m to spare.",
      "Required clearance is 5.4 m, exceeding available clearance by 0.6 m.",
      "Required clearance is 2.9 m because only free fall and deceleration affect the calculation.",
      "Required clearance is 6.6 m because the available clearance must be added to free fall.",
    ],
    rationales: [
      "This omits the supplied safety margin from the worksheet total.",
      "All four specified terms total 5.4 m; comparing the same datum gives a 0.6 m shortfall.",
      "The exercise explicitly requires body/connector allowance and margin in addition to stopping distance.",
      "Available clearance is a comparison limit, not another component of required clearance.",
    ],
    correct: 1,
    explanation:
      "Using only the values and method supplied in the problem, required clearance is 1.8 + 1.1 + 1.5 + 1.0 = 5.4 m. The proposed arrangement therefore does not fit within 4.8 m. Actual selection requires the applicable manufacturer's instructions, connection geometry and a qualified assessment; these illustrative values cannot be reused as universal constants.",
    reference: {
      title: "Candidate OSHA construction fall-protection system criteria",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.502",
    },
    steps: [
      "Use the single datum and the worksheet method specified in the exercise.",
      "Add the four allowances: 1.8 + 1.1 + 1.5 + 1.0 = 5.4 m.",
      "Calculate the shortfall: 5.4 − 4.8 = 0.6 m.",
      "Reject this illustrative arrangement; actual system design needs manufacturer-specific evaluation.",
    ],
  }),
  draft({
    number: 6,
    objective: "K06",
    topic: "Confined spaces",
    subtopic: "Changed atmospheric conditions",
    title: "Adjacent work changes a space assessment",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A permit-space assessment was completed before a maintenance task. A different contractor then positions engine-driven equipment near an opening, creating a potential path for exhaust into the space. Which response best addresses the changed condition?",
    choices: [
      "Retain the earlier entry assessment if the entrant reports no unusual odor.",
      "Increase entrant rotation and complete the task under the earlier air-test result.",
      "Pause affected entry and have the responsible entry team reassess the new hazard and necessary isolation, testing and controls.",
      "Treat the exhaust as an outside-work issue if it is generated by a separate employer.",
    ],
    rationales: [
      "Odor is not a reliable indicator of many atmospheric hazards or a substitute for evaluating new sources.",
      "Rotation does not establish a safe atmosphere or address the changed source of contamination.",
      "Entry conditions and coordination must be revisited when adjacent work can introduce a new hazard.",
      "A hazard can cross employer and physical boundaries; its source being outside the space does not remove entrant exposure.",
    ],
    correct: 2,
    explanation:
      "A prior assessment is not a permanent guarantee. Changes in nearby work can affect space conditions and require coordination and renewed evaluation under the entry program. An entrant's senses or shorter entries cannot establish that an atmospheric hazard is controlled.",
    reference: {
      title: "Candidate OSHA construction confined-space general requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1203",
    },
  }),
  draft({
    number: 7,
    objective: "K07",
    topic: "Struck-by prevention",
    subtopic: "Reversing vehicle communication",
    title: "The driver loses the spotter",
    category: "scenario",
    difficulty: "introductory",
    stem: "During a planned reversing maneuver, a truck driver loses the agreed visual contact with the designated spotter. The reversing alarm is operating and the remaining distance is short. What is the best immediate decision?",
    choices: [
      "Stop the maneuver and re-establish the agreed safe communication and clear route before continuing.",
      "Continue at walking speed while sounding the horn to supplement the alarm.",
      "Complete the short remaining distance because the spotter initially confirmed the route.",
      "Ask a nearby worker to relay hand signals while the truck continues moving.",
    ],
    rationales: [
      "Stopping preserves the communication control before movement continues into an uncertain area.",
      "An alarm or horn warns others but does not confirm the current route or restore the lost communication.",
      "The initial condition can change; a short distance does not remove a blind-area exposure.",
      "An unplanned relay during movement can introduce conflicting signals and does not restore the agreed maneuver controls.",
    ],
    correct: 0,
    explanation:
      "A planned maneuver depends on its agreed controls remaining effective. Once the driver loses required communication or confirmation, continued movement should not be used to resolve the uncertainty. The route and communication arrangement must be re-established before resuming.",
    reference: {
      title: "Candidate OSHA construction motor-vehicle requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.601",
    },
  }),
  draft({
    number: 8,
    objective: "K08",
    topic: "Mechanized equipment",
    subtopic: "Swing-radius interfaces",
    title: "A walking route through excavator operations",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A pedestrian route passes through the counterweight swing area of an operating excavator. High-visibility clothing and an operator briefing are already provided. Which additional measure most directly separates people from the movement hazard?",
    choices: [
      "Move the briefing to the start of each delivery rather than the start of the shift.",
      "Add a sign asking pedestrians to make eye contact with the operator.",
      "Require pedestrians to walk in pairs whenever the excavator is operating.",
      "Relocate and physically define the pedestrian route outside the operating envelope, with controlled access where interaction remains necessary.",
    ],
    rationales: [
      "More frequent communication may help but leaves the route within the equipment's operating envelope.",
      "Eye contact is not assured from every location and does not physically separate a person from movement.",
      "Pairing workers does not change the hazardous route and may expose additional people.",
      "Route separation directly addresses the interaction; remaining crossings need coordinated controls.",
    ],
    correct: 3,
    explanation:
      "Visibility and communication support equipment safety but do not create separation. A route outside the operating envelope removes routine pedestrian travel from that interface; unavoidable interactions still require planning and access control.",
    reference: {
      title:
        "Candidate OSHA construction material-handling equipment requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.602",
    },
  }),
  draft({
    number: 9,
    objective: "K09",
    topic: "Hoisting and rigging",
    subtopic: "Changing sling geometry",
    title: "A rigging substitution changes the arrangement",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A delivery includes slings of the specified nominal capacity, but they are shorter than those in the lift arrangement. Using them would change the sling-leg angles. Which fact is most important before accepting the substitution?",
    choices: [
      "Whether the substituted sling identification tags use the same color as the planned slings.",
      "Whether the actual configuration, angles, attachments and resulting forces are acceptable under the applicable rated information and lift plan.",
      "Whether the load was previously moved successfully with slings of the same nominal size.",
      "Whether the shorter slings make the load easier for the crew to attach.",
    ],
    rationales: [
      "Identification must be legible and applicable, but tag color is not evidence of capacity in the changed arrangement.",
      "Nominal capacity alone does not describe every configuration; geometry and attachment conditions affect the assessment.",
      "A prior lift may have involved different geometry, attachments or load conditions.",
      "Ease of attachment does not establish the adequacy of the substituted rigging configuration.",
    ],
    correct: 1,
    explanation:
      "Rigging selection depends on the actual arrangement rather than a nominal capacity in isolation. A substitution that changes geometry requires review of the resulting forces and applicable rating information before it is accepted. This question does not supply a lift approval or field calculation.",
    reference: {
      title: "Candidate OSHA construction rigging-equipment requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.251",
    },
  }),
  draft({
    number: 10,
    objective: "K10",
    topic: "Crane operations",
    subtopic: "Uncertain load information",
    title: "A changed load before a crane lift",
    category: "scenario",
    difficulty: "intermediate",
    stem: "The crane lift plan used a supplier's empty equipment weight. On delivery, the unit contains an installed accessory and residual process material that were not included. Which information gap must be resolved before relying on the planned capacity comparison?",
    choices: [
      "Whether the operator has moved the same model on another project.",
      "Whether the scheduled radius can be estimated from the delivery truck position.",
      "The actual lifted weight and configuration, including added material and relevant lifting accessories, for the planned operating conditions.",
      "Whether the delivery truck's rated payload exceeds the supplier's empty equipment weight.",
    ],
    rationales: [
      "Experience with a model does not establish the weight or configuration of this delivered unit.",
      "Capacity evaluation requires the actual planned conditions rather than an estimate based on a temporary truck position.",
      "The comparison must account for the actual load and the applicable operating configuration before lifting.",
      "The truck's rated payload is not a measurement of the delivered unit and does not resolve the omitted weights.",
    ],
    correct: 2,
    explanation:
      "A capacity comparison based on incomplete load data can be invalid even when the model description matches the plan. Resolve the actual lifted weight, configuration and operating conditions through the responsible lift-planning process rather than treating the original estimate as a verified fact.",
    reference: {
      title: "Candidate OSHA construction crane operation requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1417",
    },
  }),
  draft({
    number: 11,
    objective: "K11",
    topic: "Material handling",
    subtopic: "Load stability and travel routes",
    title: "Moving an irregular load",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A cart can carry the stated mass of several long pipe sections, but the sections overhang and can roll while the cart turns through a narrow route. Which assessment best addresses the handling task?",
    choices: [
      "Evaluate load restraint and stability, cart suitability, overhang and the complete travel route before choosing the handling method.",
      "Compare total mass with cart capacity; a favorable comparison resolves the main handling risks.",
      "Assign additional workers to hold the overhanging ends while the loaded cart turns.",
      "Reduce the travel speed while retaining the same unsecured arrangement.",
    ],
    rationales: [
      "Handling suitability includes stability, restraint, geometry and interactions along the route, not mass alone.",
      "Capacity is one condition; it does not address rolling, overhang or route clearance.",
      "Workers holding an unstable load may be exposed to pinch, crush and struck-by hazards.",
      "Lower speed does not secure a rolling load or establish adequate route clearance.",
    ],
    correct: 0,
    explanation:
      "Material-handling assessment must cover how the load behaves during the complete move. Rated capacity is necessary information but does not by itself establish a stable, restrained and compatible arrangement for an irregular load.",
    reference: {
      title:
        "Candidate OSHA construction material-handling and storage requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.250",
    },
  }),
  draft({
    number: 12,
    objective: "K12",
    topic: "Material storage",
    subtopic: "Temporary storage changes",
    title: "An unstable delivery stack",
    category: "applied_technical",
    difficulty: "introductory",
    stem: "Packaged materials arrive with damaged supporting dunnage and are temporarily placed beside a frequently used walkway. Which response best addresses the storage exposure?",
    choices: [
      "Mark the original delivery footprint and check it again at the next scheduled inspection.",
      "Post the material weight so pedestrians can judge how close to pass.",
      "Move the walkway sign farther from the materials while leaving the stack accessible.",
      "Restrict exposure and arrange suitable stable support, stacking and access separation before normal use of the area resumes.",
    ],
    rationales: [
      "A marked footprint does not stabilize damaged supports or control present pedestrian exposure.",
      "Weight information does not prevent stack movement or establish safe access.",
      "Changing sign position does not resolve unstable support or prevent entry into its exposure area.",
      "This addresses both the unstable storage condition and the people exposed to it.",
    ],
    correct: 3,
    explanation:
      "Temporary storage still needs suitable support and stability. Damaged dunnage and an adjacent walking route require action on the physical condition and access, rather than relying on warning information while the same exposure remains.",
    reference: {
      title: "Candidate OSHA construction material-storage requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.250",
    },
  }),
  draft({
    number: 13,
    objective: "K13",
    topic: "Housekeeping",
    subtopic: "Recurrent waste at a transition",
    title: "A trip hazard returns after each delivery",
    category: "scenario",
    difficulty: "introductory",
    stem: "Delivery straps repeatedly collect at the same stair landing despite end-of-shift cleanup. Which improvement best addresses why the exposure keeps returning?",
    choices: [
      "Add the landing to the weekly inspection checklist without changing delivery arrangements.",
      "Provide collection at the unpacking point and assign removal as part of each delivery, checking that the landing remains clear.",
      "Move the cleanup to the end of the busiest delivery day.",
      "Add a caution sign at the landing so people can avoid the straps.",
    ],
    rationales: [
      "Periodic inspection identifies conditions but does not control the recurring waste stream during deliveries.",
      "Controlling waste at its source and assigning timely removal interrupts the repeated creation of the trip hazard.",
      "Deferring cleanup can leave the exposure present during the busiest activity.",
      "A warning does not remove the straps from the walking surface.",
    ],
    correct: 1,
    explanation:
      "A recurring housekeeping hazard often indicates a work-process gap. Integrating collection and removal into the activity that generates waste reduces recurrence; cleanup after the exposure period and warning signs are less direct controls.",
    reference: {
      title: "Candidate OSHA construction housekeeping requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.25",
    },
  }),
  draft({
    number: 14,
    objective: "K14",
    topic: "Powder-actuated tools",
    subtopic: "Substrate and fastening assessment",
    title: "An unfamiliar fastening substrate",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A trained powder-actuated-tool user is asked to fasten into a surface whose material and condition are uncertain. The tool was inspected at the start of the shift. Which information is still essential before fastening?",
    choices: [
      "Whether the previous fastening pattern can be repeated using a lower charge without further assessment.",
      "Whether a higher power setting would complete the work in fewer attempts.",
      "Whether the substrate, fastening location, system and selected load/fastener are suitable under the applicable instructions and assessment.",
      "Whether a fastener seats consistently in a nearby piece of a different material.",
    ],
    rationales: [
      "Repeating an old pattern or reducing charge does not establish that the unknown substrate is suitable.",
      "Increasing power does not determine substrate suitability and can increase exposure.",
      "Tool condition and training do not replace evaluating the actual substrate and fastening configuration.",
      "Performance in a different material cannot establish the suitability of the actual substrate and fastening location.",
    ],
    correct: 2,
    explanation:
      "A satisfactory tool inspection addresses condition, not every application. The user must establish that the intended substrate, fastening location and compatible components are suitable; an unknown material cannot be made acceptable merely by changing the power setting.",
    reference: {
      title:
        "Candidate OSHA construction power-operated hand-tool requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.302",
    },
  }),
  draft({
    number: 15,
    objective: "K15",
    topic: "Hand and power tools",
    subtopic: "Guard interference",
    title: "A tool guard conflicts with access",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A grinder's guard prevents access to a planned cut. A supervisor suggests temporarily repositioning it outside the manufacturer's permitted range. What is the most appropriate planning response?",
    choices: [
      "Select a suitable tool or method that can perform the cut with the required safeguards and compatible accessories.",
      "Make a short trial cut and retain the arrangement if no unusual vibration occurs.",
      "Use a face shield in place of the guard for this one cut.",
      "Assign a second worker to watch the exposed wheel while the cut is made.",
    ],
    rationales: [
      "The task and tool must be compatible without defeating safeguards; a different suitable method addresses the conflict.",
      "A successful trial does not establish that an improperly configured guard or accessory is safe.",
      "PPE does not perform the guard's containment and contact-prevention functions.",
      "Observation does not restore the missing physical protection and can expose another worker.",
    ],
    correct: 0,
    explanation:
      "When safe tool configuration and task access conflict, reconsider the method or tool rather than defeating protection. Required guards, accessory compatibility and manufacturer limitations remain relevant for brief tasks as well as routine work.",
    reference: {
      title:
        "Candidate OSHA construction hand- and power-tool general requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.300",
    },
  }),
  draft({
    number: 16,
    objective: "K16",
    topic: "Asbestos exposure",
    subtopic: "Suspect existing building materials",
    title: "An unexpected renovation material",
    category: "scenario",
    difficulty: "intermediate",
    stem: "During renovation planning, a crew encounters older insulation not covered by the available material survey. Its appearance is similar to a material used elsewhere in the building. Which response best addresses the uncertainty before disturbance?",
    choices: [
      "Use the neighboring room's result as the classification for all similar-looking insulation.",
      "Wet the insulation and proceed while arranging a later laboratory result.",
      "Base the decision on whether dust is visible during a small trial disturbance.",
      "Keep the affected material undisturbed while the responsible qualified process determines its identity and applicable controls.",
    ],
    rationales: [
      "Appearance or location alone does not establish that materials are the same or that an existing survey covers the affected material.",
      "Wetting does not resolve identification, training, work-practice or other applicable requirements.",
      "Visible dust is not a reliable way to determine asbestos content or exposure.",
      "Resolving material identity and applicable controls before disturbance avoids treating uncertainty as evidence of absence.",
    ],
    correct: 3,
    explanation:
      "An incomplete survey or a visual resemblance does not establish whether suspect material contains asbestos. The affected work needs an appropriate identification and control process before disturbance; a trial disturbance is not a substitute for that process.",
    reference: {
      title: "Candidate OSHA construction asbestos requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1101",
    },
  }),
  draft({
    number: 17,
    objective: "K17",
    topic: "Lead and heavy metals",
    subtopic: "Exposure pathways during surface work",
    title: "A coating task with incomplete exposure information",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A contractor plans to mechanically remove an old coating that may contain lead. Which planning approach best addresses both inhalation and contamination-transfer concerns?",
    choices: [
      "Focus on visible airborne dust because settled material cannot create an inhalation exposure.",
      "Evaluate the coating and task, apply appropriate exposure controls, and plan hygiene and containment to prevent contamination transfer.",
      "Choose gloves before evaluating the removal method because skin protection resolves the main exposure route.",
      "Use outdoor work location as the primary basis for concluding that exposure controls are unnecessary.",
    ],
    rationales: [
      "Settled contamination can be disturbed or transferred; visible dust is not a complete exposure assessment.",
      "This considers the material, task and multiple routes by which hazardous contamination can reach people.",
      "Gloves alone do not address airborne exposure or contaminated clothing, surfaces and eating areas.",
      "Outdoor dispersion does not by itself establish acceptable exposure or prevent contamination transfer.",
    ],
    correct: 1,
    explanation:
      "Assessment and controls should reflect the coating and removal process. Airborne exposure and transfer of contamination to hands, clothing and other areas require attention; outdoor location or one PPE item is not a complete control strategy.",
    reference: {
      title: "Candidate OSHA construction lead requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.62",
    },
  }),
  draft({
    number: 18,
    objective: "K18",
    topic: "Noise exposure",
    subtopic: "Task profile and measurement",
    title: "An intermittent tool and a quiet area reading",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A quiet-area sound reading is used to argue that a worker's noise exposure is low, although the worker repeatedly operates a loud impact tool away from the measurement point. What is the principal weakness in that conclusion?",
    choices: [
      "A quiet-area reading is valid only if recorded immediately after the worker's shift ends.",
      "Any single sound reading must be higher than a personal exposure measurement.",
      "The reading may not represent the worker's task locations, operating periods and exposure over time.",
      "The conclusion would become representative after averaging several readings at the same quiet location.",
    ],
    rationales: [
      "Changing the recording time does not make an unrelated location represent the worker's actual tasks.",
      "There is no universal ordering between a spot reading and a worker's time-varying personal exposure.",
      "Representativeness requires the actual tasks, positions and time pattern to be considered.",
      "Repeating measurements at the quiet location does not correct omission of the relevant task exposures.",
    ],
    correct: 2,
    explanation:
      "A measurement can be accurate at its location yet unrepresentative of a worker's exposure. Noise evaluation should reflect the worker's actual tasks and time pattern with appropriate measurement methods; a quiet location cannot stand in for noisy tool use elsewhere.",
    reference: {
      title: "Candidate OSHA construction occupational-noise requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.52",
    },
  }),
  draft({
    number: 19,
    objective: "K19",
    topic: "Radiation safety",
    subtopic: "Radiography interfaces",
    title: "A neighboring radiography operation",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A contractor schedules industrial radiography near an access route used by other trades. Which preparation most directly addresses the interface before the radiography work begins?",
    choices: [
      "Coordinate with the authorized radiography team to establish and communicate suitable controlled areas, access restrictions and responsible contacts.",
      "Ask the other trades to wear their usual eye protection when passing the operation.",
      "Rely on the radiography contractor's work schedule without checking whether it affects the access route.",
      "Move the access-route sign without confirming the controlled-area arrangement.",
    ],
    rationales: [
      "The specialized operation and surrounding work must be coordinated so controlled access and communication are effective.",
      "Ordinary eye protection does not provide a radiation-control plan for industrial radiography.",
      "An isolated schedule does not establish that other employers understand or can comply with necessary restrictions.",
      "A sign relocation alone does not define or enforce the necessary controlled area.",
    ],
    correct: 0,
    explanation:
      "Specialized radiation work requires the responsible authorized personnel and site coordination. Adjacent trades need effective access arrangements and clear communication; this question does not prescribe shielding, distances or radiation limits.",
    reference: {
      title: "Candidate OSHA construction ionizing-radiation requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.53",
    },
  }),
  draft({
    number: 20,
    objective: "K20",
    topic: "Respirable crystalline silica",
    subtopic: "Task and control compatibility",
    title: "A concrete-cutting substitution",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A concrete-cutting method is changed from the assessed tool/control combination to a different saw with an attachment described only as a dust collector. What must be checked before relying on the earlier silica-control determination?",
    choices: [
      "Whether the new saw completes the cut faster than the assessed tool.",
      "Whether the collector's container is large enough to hold a full shift's debris.",
      "Whether the work is outdoors and therefore cannot produce a significant breathing-zone exposure.",
      "Whether the new task, tool and control arrangement satisfy the applicable exposure-control approach and its operating conditions.",
    ],
    rationales: [
      "Faster completion may affect duration but does not demonstrate the adequacy of the changed control system.",
      "Container capacity alone does not establish effective capture, filtration or compatibility with the task.",
      "Outdoor work does not eliminate the need to evaluate dust generated near the worker.",
      "A changed combination must be assessed under the applicable control approach rather than inheriting an unrelated determination.",
    ],
    correct: 3,
    explanation:
      "An exposure-control determination belongs to an actual task and control arrangement. A generic equipment description or outdoor location does not show that a replacement meets the same conditions. The responsible process must check compatibility and performance before relying on the prior assessment.",
    reference: {
      title:
        "Candidate OSHA construction respirable-crystalline-silica requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1153",
    },
  }),
  draft({
    number: 21,
    objective: "K21",
    topic: "Chemical exposure",
    subtopic: "Ventilation and exposure reassessment",
    title: "A solvent task behind a new enclosure",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A solvent-based adhesive was assessed for use in an open work area. Temporary sheeting now encloses the task, reducing air movement. Which factor most directly requires the exposure assessment to be revisited?",
    choices: [
      "The adhesive's purchase quantity has not changed.",
      "The enclosure changes the conditions under which airborne contaminants can accumulate and workers are exposed.",
      "The packaging label is still legible.",
      "The same employee is performing the work.",
    ],
    rationales: [
      "Purchase quantity does not establish the concentration in the changed workspace.",
      "The new enclosure can change contaminant generation, dilution and exposure conditions even with the same product.",
      "A legible label provides hazard information but does not demonstrate adequate control in the new conditions.",
      "Worker identity does not preserve the validity of an assessment when environmental conditions change.",
    ],
    correct: 1,
    explanation:
      "Chemical exposure depends on the process and surroundings as well as the product. An enclosure can make an earlier open-area determination unrepresentative. Re-evaluation should address actual ventilation, exposure potential and suitable controls without relying on odor or prior experience alone.",
    reference: {
      title:
        "Candidate OSHA construction gases, vapors, fumes, dusts and mists requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.55",
    },
  }),
  draft({
    number: 22,
    objective: "K22",
    topic: "Extreme climates",
    subtopic: "Changed heat-stress factors",
    title: "An early-season change in workload",
    category: "scenario",
    difficulty: "intermediate",
    stem: "During a warm spell, a crew changes from light inspection work to sustained material handling in protective clothing. Several workers are returning after a long absence. Which assessment best addresses the heat-related change?",
    choices: [
      "Use air temperature alone because the work remains on the same project.",
      "Apply the prior inspection-task arrangement until workers report that it is inadequate.",
      "Reassess workload, environmental heat, clothing, acclimatization and individual circumstances, then adjust the prevention and response plan.",
      "Base the plan on the most experienced worker's tolerance.",
    ],
    rationales: [
      "Air temperature alone does not capture workload, clothing, radiant heat or individual adaptation.",
      "Waiting for symptoms does not proactively address the changed conditions.",
      "Heat risk involves interacting task, environmental, clothing and worker factors that have changed here.",
      "One person's experience or tolerance is not a reliable basis for protecting the entire crew.",
    ],
    correct: 2,
    explanation:
      "Changing workload, protective clothing and acclimatization can change heat risk even at the same location. Planning should reassess those factors and appropriate prevention, monitoring and response arrangements. This draft provides no universal work/rest schedule or medical clearance advice.",
    reference: {
      title: "Candidate NIOSH occupational heat-stress guidance",
      url: "https://www.cdc.gov/niosh/heat-stress/about/",
      classification: "professional_guidance",
    },
  }),
  draft({
    number: 23,
    objective: "K23",
    topic: "Vibration and impact",
    subtopic: "Cumulative tool-use exposure",
    title: "Comparing two tool assignments",
    category: "foundational",
    difficulty: "intermediate",
    stem: "Two workers use the same vibrating tool. One uses it briefly for occasional adjustments; the other operates it repeatedly for most of the shift. Which information is most useful in comparing their potential vibration exposure?",
    choices: [
      "The tool's vibration characteristics together with actual contact duration, operating conditions and how it is used.",
      "Scheduled shift length alone, on the assumption that both workers hold the tool for the full shift.",
      "The manufacturer's maximum continuous runtime without considering the workers' actual contact pattern.",
      "Completed component counts without information about the time or conditions of tool contact.",
    ],
    rationales: [
      "Both the vibration magnitude and the pattern and conditions of contact are relevant to exposure assessment.",
      "Scheduled hours cannot substitute for the actual contact durations, which differ in this task.",
      "A tool duty-cycle limit does not describe a worker's actual vibration exposure.",
      "Production counts alone do not establish contact duration, vibration magnitude or operating conditions.",
    ],
    correct: 0,
    explanation:
      "Potential vibration exposure cannot be inferred from tool identity alone. Tool characteristics, duration and actual use conditions matter. An assessment may require appropriate technical information and specialist support; the comparison is not a diagnosis of an individual worker.",
    reference: {
      title: "Candidate NIOSH ergonomics and exposure-prevention resources",
      url: "https://www.cdc.gov/niosh/ergonomics/",
      classification: "professional_guidance",
    },
  }),
  draft({
    number: 24,
    objective: "K24",
    topic: "Hazard communication",
    subtopic: "Product identification",
    title: "A secondary container loses its identity",
    category: "applied_technical",
    difficulty: "introductory",
    stem: "A reusable container on a construction project contains a chemical product, but the label is unreadable and workers disagree about its identity. What is the best basis for restoring usable hazard information?",
    choices: [
      "Choose the safety data sheet for the product most frequently used in that area.",
      "Identify the product by its color and add the corresponding hazard pictograms.",
      "Ask the last user for a verbal warning and continue until the next delivery provides a label.",
      "Prevent use until the product is reliably identified and the applicable container information and matching safety data can be established.",
    ],
    rationales: [
      "A frequently used product may not be the actual contents; mismatched information can create new hazards.",
      "Appearance does not reliably identify a chemical or its correct classification.",
      "An uncertain verbal account does not provide reliable product identification or durable container information.",
      "Reliable identification is necessary before selecting the correct hazard communication information.",
    ],
    correct: 3,
    explanation:
      "A hazard label or safety data sheet is useful only when it corresponds to the actual product. Uncertainty should be resolved before use, rather than assigning plausible information to unknown contents. GHS-based information communicates hazards; it does not establish that a task's exposures are controlled.",
    reference: {
      title:
        "Candidate OSHA hazard-communication standard referenced by construction requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200",
    },
  }),
  draft({
    number: 25,
    objective: "K25",
    topic: "Safety through design",
    subtopic: "Design-stage access",
    title: "A maintainability decision before construction",
    category: "foundational",
    difficulty: "intermediate",
    stem: "A design review finds that routine servicing would require workers to reach a valve above an unprotected opening. Which proposal best demonstrates safety through design?",
    choices: [
      "Specify more detailed annual refresher training for future maintenance workers.",
      "Relocate the valve or redesign the access arrangement to remove the routine exposure where feasible.",
      "Plan to issue a special permit each time the valve is serviced.",
      "Add a warning note to the maintenance manual without changing the design.",
    ],
    rationales: [
      "Training is useful but leaves the exposure designed into every servicing task.",
      "A design change can remove or reduce the recurring exposure before work begins.",
      "A permit may manage remaining work but does not eliminate the design-created exposure.",
      "A warning communicates risk but does not change the physical access problem.",
    ],
    correct: 1,
    explanation:
      "Safety through design considers foreseeable construction, operation and maintenance tasks while design choices remain available. Removing or reducing an exposure through layout or access design is generally more direct than assigning repeated procedural controls to an avoidable design condition.",
    reference: {
      title: "Candidate NIOSH Prevention through Design guidance",
      url: "https://www.cdc.gov/niosh/ptd/",
      classification: "professional_guidance",
    },
  }),
  draft({
    number: 26,
    objective: "K26",
    topic: "Multi-trade coordination",
    subtopic: "Overlapping work envelopes",
    title: "Two individually planned tasks conflict",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A ceiling crew plans overhead installation while another trade plans to route workers and carts through the same area. Each employer has completed its own task assessment. What is still needed before the overlapping work proceeds?",
    choices: [
      "Combine the two assessments into one file while retaining the conflicting work sequence.",
      "Rely on whichever employer has the larger crew to establish the area rules.",
      "Resolve the interface jointly, including sequencing or separation, access controls and clear responsibility for changing conditions.",
      "Require both crews to sign the other's assessment without revising either task.",
    ],
    rationales: [
      "Combining paperwork does not remove the physical overlap or assign effective controls.",
      "Crew size is not a sound basis for deciding how an interface hazard is controlled.",
      "Independent task plans need coordination where one employer's activity creates exposure for another.",
      "Signatures do not resolve incompatible simultaneous activities.",
    ],
    correct: 2,
    explanation:
      "Two acceptable individual plans can become incompatible when tasks overlap. The interface itself requires coordination of sequence, access and responsibilities, followed by communication to affected employers and workers.",
    reference: {
      title:
        "Candidate OSHA recommended practices for multiemployer construction coordination",
      url: "https://www.osha.gov/safety-management/communication",
      classification: "professional_guidance",
    },
  }),
  draft({
    number: 27,
    objective: "K27",
    topic: "Construction ergonomics",
    subtopic: "Measuring a handling redesign",
    title: "A lift-assist trial reduces manual lifts",
    category: "reasoning_calculation",
    difficulty: "intermediate",
    stem: "For a process-improvement exercise, a crew originally performs 80 manual transfers of identical units per shift. A lift-assist trial reduces manual transfers to 20 while production remains unchanged. What is the percentage reduction in the number of manual transfers? This arithmetic does not measure injury-risk reduction or establish a safe lifting limit.",
    choices: ["75%", "25%", "60%", "400%"],
    rationales: [
      "The reduction is 60 out of the original 80 transfers: 60 ÷ 80 × 100 = 75%.",
      "25% is the remaining proportion, not the reduction.",
      "60 is the number of transfers removed; it is not the percentage of the original total.",
      "The ratio 80 ÷ 20 does not describe the percentage reduction from the original baseline.",
    ],
    correct: 0,
    explanation:
      "Percentage reduction uses the original number as the denominator: (80 − 20) ÷ 80 × 100 = 75%. Transfer count is only one measure. Force, posture, reach, repetition, pace and any new hazards also need evaluation before concluding that a redesign is effective.",
    reference: {
      title: "Candidate NIOSH construction ergonomics guidance",
      url: "https://www.cdc.gov/niosh/ergonomics/",
      classification: "professional_guidance",
    },
    steps: [
      "Find the decrease: 80 − 20 = 60 manual transfers.",
      "Divide by the original baseline: 60 ÷ 80 = 0.75.",
      "Convert to a percentage: 0.75 × 100 = 75%.",
      "Keep this count-based result separate from an assessment of exposure or injury risk.",
    ],
  }),
  draft({
    number: 28,
    objective: "K28",
    topic: "Personal protective equipment",
    subtopic: "Selection and compatibility",
    title: "Two protective items interfere",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A worker's selected eye protection prevents the assigned respirator from fitting as intended. Both products are individually labeled for their intended uses. Which response best addresses the conflict?",
    choices: [
      "Loosen the respirator until the eye protection fits comfortably.",
      "Select whichever item addresses the hazard that is easiest to observe.",
      "Wear each item for alternating portions of the task.",
      "Reassess the combined protective system and obtain compatible protection with the necessary fit and task-specific evaluation before use.",
    ],
    rationales: [
      "Changing the fit can defeat respiratory protection and is not an acceptable compatibility solution.",
      "Visibility of a hazard does not establish that the other protection can be omitted.",
      "Alternating protection leaves a relevant exposure uncontrolled for part of the task.",
      "PPE selection must consider simultaneous use, fit and compatibility, not individual labels alone.",
    ],
    correct: 3,
    explanation:
      "Protective equipment can interfere with other protective equipment. The complete combination must provide the intended protection in the actual task. Fit, compatibility, limitations and relevant program requirements need to be addressed rather than informally modifying one component.",
    reference: {
      title:
        "Candidate OSHA construction personal-protective-equipment requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.95",
    },
  }),
  draft({
    number: 29,
    objective: "K29",
    topic: "Testing and monitoring",
    subtopic: "Instrument capability",
    title: "A negative reading for the wrong hazard",
    category: "foundational",
    difficulty: "intermediate",
    stem: "A direct-reading instrument shows no response during a task. Before concluding that a suspected contaminant is absent, which instrument information is most important?",
    choices: [
      "Whether another sensor channel on the same instrument passed a response check that morning.",
      "Whether its sensor, range, interferences, condition and sampling method are suitable for the suspected contaminant and conditions.",
      "Whether its smallest displayed number is below a proposed exposure limit, without checking which substance it measures.",
      "Whether the device's factory certificate was valid when the instrument was first supplied.",
    ],
    rationales: [
      "A response from a different channel does not establish that the channel relevant to the suspected contaminant is suitable or functioning.",
      "A nonresponse is meaningful only in relation to the instrument's actual detection capabilities and valid use.",
      "Display resolution does not establish that the device detects the relevant substance or that its units and performance are applicable.",
      "A historical certificate does not by itself establish current function, sensor capability or sampling suitability.",
    ],
    correct: 1,
    explanation:
      "No response from an unsuitable or improperly used instrument does not demonstrate absence of a hazard. The measurement method must match the target, expected range and conditions, with appropriate checks and attention to limitations and interferences.",
    reference: {
      title: "Candidate NIOSH exposure-assessment and measurement resources",
      url: "https://www.cdc.gov/niosh/",
      classification: "professional_guidance",
    },
  }),
  draft({
    number: 30,
    objective: "K30",
    topic: "Biological hazards",
    subtopic: "Unplanned wastewater exposure",
    title: "A task encounters contaminated water",
    category: "scenario",
    difficulty: "intermediate",
    stem: "A drainage repair encounters water potentially contaminated by sewage, which was not addressed in the task plan. What is the best next step for the affected activity?",
    choices: [
      "Treat the water as an ordinary slip hazard if it has little odor.",
      "Continue using the same gloves and rely on handwashing at the end of the shift.",
      "Reassess the biological and other hazards, control contact and splashing, and establish suitable hygiene, equipment and response arrangements.",
      "Classify the water by appearance before deciding whether a biological assessment is necessary.",
    ],
    rationales: [
      "Low odor does not establish the absence of biological hazards or other contaminants.",
      "Existing gloves and delayed hygiene may not be suitable for the changed exposure.",
      "The unexpected contamination requires a task-specific reassessment and coordinated exposure controls.",
      "Appearance alone does not identify pathogens or establish suitable controls.",
    ],
    correct: 2,
    explanation:
      "Unexpected contaminated water changes the task's exposure profile. Assessment should consider contact, splashes, hygiene and other relevant hazards and arrange suitable controls. Odor and appearance are not dependable indicators of biological safety.",
    reference: {
      title: "Candidate NIOSH occupational biological-hazard resources",
      url: "https://www.cdc.gov/niosh/",
      classification: "professional_guidance",
    },
  }),
  draft({
    number: 31,
    objective: "K31",
    topic: "Concrete work",
    subtopic: "Wet-concrete contact",
    title: "Wet concrete trapped inside a boot",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "During a concrete placement, a worker reports that wet concrete entered a boot. There is little pain, and the worker proposes finishing the placement before dealing with it. Which interpretation is most appropriate?",
    choices: [
      "Limited pain does not rule out harmful contact; stop the exposure and promptly follow the product safety information and site response procedure.",
      "The main concern is discomfort, so changing socks at the next scheduled break is sufficient.",
      "The absence of a strong odor indicates that the material is not chemically hazardous.",
      "Leaving the boot on provides a useful barrier between the concrete and the skin.",
    ],
    rationales: [
      "Wet-concrete contact can be harmful without an immediate strong pain signal; exposure and response must not depend on pain alone.",
      "Deferring action prolongs contact and does not address the material's chemical hazards.",
      "Odor is not an appropriate indicator of the contact hazard.",
      "Contaminated clothing or footwear can trap material against the skin rather than protect it.",
    ],
    correct: 0,
    explanation:
      "A lack of immediate pain is not a reliable sign of harmless wet-concrete contact. The affected exposure should be ended and the applicable safety-data and response instructions followed promptly, with medical support as indicated by the response procedure. This is not a substitute for first-aid or clinical guidance.",
    reference: {
      title: "Candidate OSHA concrete and masonry construction requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.700",
    },
  }),
  draft({
    number: 32,
    objective: "S01",
    topic: "Hierarchy of controls",
    subtopic: "Removing recurring exposure",
    title: "Selecting a control for repeated overhead drilling",
    category: "foundational",
    difficulty: "intermediate",
    stem: "A design revision allows components that previously required repeated overhead field drilling to be fabricated with the needed openings before delivery. Which reason best explains why this option deserves priority in the control review?",
    choices: [
      "It removes the need to consider any risks during fabrication or installation.",
      "It is automatically the least expensive option for every project.",
      "It makes worker training unnecessary for the remaining installation work.",
      "It can eliminate the specific field-drilling exposure at its source, while any transferred or new risks still need evaluation.",
    ],
    rationales: [
      "Changing the process may transfer or create other risks, so the new arrangement still requires review.",
      "Control effectiveness is not established by an assumed cost advantage.",
      "Eliminating one task does not remove training needs for remaining work.",
      "Removing the hazardous task is a stronger approach to that exposure than relying only on individual protective behavior.",
    ],
    correct: 3,
    explanation:
      "The hierarchy of controls encourages eliminating an exposure where feasible. Prefabrication may remove a specific field task, but the review must also consider fabrication, transport and installation risks introduced or transferred by the change.",
    reference: {
      title: "Candidate NIOSH hierarchy-of-controls guidance",
      url: "https://www.cdc.gov/niosh/hierarchy-of-controls/about/",
      classification: "professional_guidance",
    },
  }),
  draft({
    number: 33,
    objective: "S02",
    topic: "Job hazard analysis",
    subtopic: "Task steps and interfaces",
    title: "A task analysis misses the setup exposure",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A job hazard analysis describes the main installation step and its controls but does not address unloading, positioning, temporary support or cleanup. What revision would best improve the analysis?",
    choices: [
      "Add a single instruction to use caution during all supporting work.",
      "Break the complete task into meaningful steps, identify exposures and interfaces for each, and assign specific controls and responsibilities.",
      "Limit the analysis to the longest step so it remains concise.",
      "Replace the step descriptions with a list of all PPE available on the project.",
    ],
    rationales: [
      "A general warning does not identify how hazards arise or what controls are required.",
      "A step-based review captures supporting activities and interfaces that can be missed when only the main operation is considered.",
      "Task duration alone does not determine which steps can create serious exposure.",
      "A PPE inventory does not describe task sequence, hazards or other control measures.",
    ],
    correct: 1,
    explanation:
      "A useful task analysis considers the work from preparation through completion, using enough detail to identify how exposures arise. Controls should relate to the actual steps and interfaces and identify responsibility rather than repeat generic cautions.",
    reference: {
      title: "Candidate OSHA job-hazard-analysis guidance",
      url: "https://www.osha.gov/publications/osha3071",
      classification: "professional_guidance",
    },
  }),
  draft({
    number: 34,
    objective: "S03",
    topic: "Risk prioritization",
    subtopic: "Interpreting an illustrative matrix",
    title: "Prioritize using a stated risk method",
    category: "reasoning_calculation",
    difficulty: "advanced",
    stem: "For this classroom exercise, a site's illustrative prioritization method multiplies severity score by exposure-frequency score; larger products receive earlier attention, while every imminent-danger condition is acted on immediately outside the ranking. Item A scores severity 5 and frequency 2. Item B scores severity 3 and frequency 4. Neither is designated imminent danger in the exercise. Which ranking follows the stated method? The scores are not a validated risk model or legal threshold.",
    choices: [
      "A first because its severity score is larger, regardless of the stated method.",
      "A and B tie because each pair of scores sums to seven.",
      "B first because its product is 12, compared with A's product of 10.",
      "A first because 5 divided by 2 exceeds 3 divided by 4.",
    ],
    rationales: [
      "Severity is important, but this answer does not apply the exercise's stated product method.",
      "The exercise specifies multiplication, not addition.",
      "Applying the supplied method gives A = 5 × 2 = 10 and B = 3 × 4 = 12.",
      "Division is not the stated scoring method and cannot be substituted without changing the model.",
    ],
    correct: 2,
    explanation:
      "Under the explicitly supplied illustrative rule, B ranks before A because 12 exceeds 10. Such scores are decision aids, not objective proof that a hazard is acceptable; serious or imminent conditions require appropriate immediate action regardless of a queue score. Actual prioritization requires a justified method and competent judgment.",
    reference: {
      title: "Candidate OSHA hazard-identification and assessment guidance",
      url: "https://www.osha.gov/safety-management/hazard-identification",
      classification: "professional_guidance",
    },
    steps: [
      "Use the supplied multiplication rule without substituting a different operation.",
      "Calculate A: 5 × 2 = 10.",
      "Calculate B: 3 × 4 = 12, so B is earlier under this exercise's method.",
      "Keep the explicit immediate-action exception and the model's limitations separate from the arithmetic.",
    ],
  }),
  draft({
    number: 35,
    objective: "S04",
    topic: "Exposure measurement",
    subtopic: "Selecting an appropriate instrument",
    title: "Choose measurement for a specified hazard",
    category: "foundational",
    difficulty: "intermediate",
    stem: "A task assessment identifies concern about a worker's noise exposure across changing locations during a shift. Which selection is most directly suited to characterizing that time-varying personal noise exposure, when properly configured and used?",
    choices: [
      "A personal noise dosimeter, supported by an appropriate measurement plan and checks.",
      "An area sound-level meter left in one quiet location that the worker visits only briefly.",
      "A vibration meter attached to the tool, used as a substitute for acoustic exposure measurements.",
      "A phone's highest instantaneous sound reading, treated as the worker's shift exposure without evaluating the device or task pattern.",
    ],
    rationales: [
      "A suitable personal dosimeter can collect noise-exposure information over the worker's task pattern; correct configuration and method remain essential.",
      "A fixed quiet-location measurement may not represent the worker's changing task locations or duration.",
      "Tool vibration is a different measurement and cannot substitute for the acoustic exposure being assessed.",
      "A highest instantaneous value from an unevaluated device does not establish a representative shift exposure.",
    ],
    correct: 0,
    explanation:
      "Instrument selection should start with the hazard and the exposure question. A properly selected and configured personal noise dosimeter can address a changing worker noise profile. Instrument identity alone does not establish a valid measurement without appropriate settings, checks and a representative plan.",
    reference: {
      title: "Candidate OSHA construction occupational-noise requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.52",
    },
  }),
  draft({
    number: 36,
    objective: "S05",
    topic: "Protective equipment selection",
    subtopic: "Chemical-resistant glove compatibility",
    title: "A glove selection for two chemicals",
    category: "applied_technical",
    difficulty: "intermediate",
    stem: "A worker will handle a product mixture using gloves previously selected for one component alone. What information is most important before accepting those gloves for the new task?",
    choices: [
      "Whether the gloves are compatible with the mixture's largest-volume component, without considering its other ingredients.",
      "Whether the worker used that glove material successfully on an unrelated task.",
      "Whether thicker gloves are available, without identifying their material.",
      "Applicable compatibility and permeation information for the actual mixture, task conditions and expected contact, with specialist advice where needed.",
    ],
    rationales: [
      "The largest-volume ingredient alone does not establish protective performance against the complete mixture.",
      "Experience with another chemical or task does not establish suitability for this mixture.",
      "Thickness alone does not identify resistance to the actual chemicals or conditions.",
      "Selection must match the actual exposure and relevant performance information, rather than the name of one component.",
    ],
    correct: 3,
    explanation:
      "Chemical protection depends on the particular product, glove material and use conditions. A previous selection for one component cannot simply be transferred to a mixture. Appropriate technical information and advice are needed where performance data are incomplete.",
    reference: {
      title:
        "Candidate OSHA construction personal-protective-equipment requirements",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.95",
    },
  }),
  draft({
    number: 37,
    objective: "K09",
    topic: "Hoisting and rigging",
    subtopic: "Illustrative symmetric sling forces",
    title: "Use a supplied two-leg statics formula",
    category: "reasoning_calculation",
    difficulty: "advanced",
    stem: "In an ideal classroom statics model, a 20 kN load is supported equally by two symmetric sling legs. Each leg is 60° from the vertical. The problem supplies T = W / (2 × cos θ), where T is force in one leg, and cos 60° = 0.5. Ignoring dynamics and all other effects solely for this arithmetic exercise, what is T? This does not establish sling adequacy or authorize a lift.",
    choices: ["10 kN", "20 kN", "17.3 kN", "40 kN"],
    rationales: [
      "10 kN is the vertical share per leg, not the inclined leg's tension under the supplied geometry.",
      "The denominator is 2 × 0.5 = 1, so the supplied formula gives 20 kN per leg.",
      "17.3 kN results from using an incompatible angle or trigonometric value, not the supplied cos 60°.",
      "40 kN omits the factor of two for the symmetric two-leg model.",
    ],
    correct: 1,
    explanation:
      "Substituting the given values produces T = 20 / (2 × 0.5) = 20 kN. The angle is explicitly measured from the vertical; changing the reference angle changes the trigonometric expression. Real lift planning must consider ratings, attachments, load distribution, dynamics and other conditions that this ideal model excludes.",
    reference: {
      title:
        "Candidate OSHA construction rigging-equipment requirements; separate mechanics review required for the supplied model",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.251",
    },
    steps: [
      "Identify the supplied angle reference: 60° from vertical.",
      "Use the supplied relation T = W / (2 × cos θ).",
      "Calculate the denominator: 2 × 0.5 = 1.",
      "Calculate T = 20 kN / 1 = 20 kN per leg; do not treat this ideal result as a rigging approval.",
    ],
  }),
];
