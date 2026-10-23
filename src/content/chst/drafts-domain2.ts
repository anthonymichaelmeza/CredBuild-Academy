import type { DraftQuestionRecord } from "./draft-types";

/** Original AI-authored drafts. Candidate references were NOT examined for answer support. */
type Choice = readonly [text: string, rationale: string];
type Category = DraftQuestionRecord["category"];
const references = {
  fire: {
    id: "candidate-osha-fire-protection",
    title: "OSHA construction fire protection — candidate regulation",
    url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.150",
    edition: "",
    section: "",
    classification: "regulatory_requirement" as const,
  },
  plan: {
    id: "candidate-osha-emergency-action",
    title: "OSHA construction emergency action plans — candidate regulation",
    url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.35",
    edition: "",
    section: "",
    classification: "regulatory_requirement" as const,
  },
  incident: {
    id: "candidate-incident-management-molino",
    title:
      "Emergency Incident Management Systems: Fundamentals and Applications — Molino (2006), bibliography-listed candidate",
    url: "",
    edition: "2006",
    section: "",
    classification: "professional_guidance" as const,
  },
  medical: {
    id: "candidate-osha-medical-first-aid",
    title:
      "OSHA construction medical services and first aid — candidate regulation",
    url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.50",
    edition: "",
    section: "",
    classification: "regulatory_requirement" as const,
  },
  exposure: {
    id: "candidate-niosh-worker-health",
    title:
      "NIOSH occupational health resources — candidate research entry point",
    url: "https://www.cdc.gov/niosh/",
    edition: "",
    section: "",
    classification: "professional_guidance" as const,
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
      domain: "2",
      objectiveCode: `CHST5-2022.04.12-D2-${objective}`,
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
export const domain2Drafts: DraftQuestionRecord[] = [
  draft(
    38,
    "K01",
    "Fire protection",
    "Accessible response equipment",
    "scenario",
    "intermediate",
    "A fire-protection inspection finds that newly delivered masonry supplies obstruct the designated extinguisher cabinet. The inspection tag is current and the cabinet is still visible above the pallets. What finding best addresses the situation?",
    [
      [
        "The current inspection tag establishes readiness until its next scheduled inspection date.",
        "A prior inspection does not establish that the equipment remains accessible after site conditions change.",
      ],
      [
        "The obstruction should be corrected and the designated equipment access kept usable as part of the fire-protection arrangement.",
        "Usable access is a functional part of readiness; visibility and an inspection tag do not resolve the obstruction.",
      ],
      [
        "The supplies can remain if the cabinet location is added to the next toolbox-talk presentation.",
        "Knowing the location does not make obstructed equipment promptly accessible.",
      ],
      [
        "The cabinet can be removed from the inspection list because another contractor may have an extinguisher.",
        "An assumed alternative does not establish an assessed, available fire-protection arrangement for this location.",
      ],
    ],
    "b",
    "Fire-protection readiness depends on actual conditions, including usable access to designated resources. A current inspection tag records an earlier check; it is not evidence that a newly obstructed cabinet remains accessible. The draft does not assert a verified spacing or access-distance requirement.",
    "fire",
  ),
  draft(
    39,
    "K02",
    "Emergency action plans",
    "Accountability responsibilities",
    "foundational",
    "introductory",
    "A project emergency plan identifies an alarm signal, evacuation routes, and an assembly point. During a review, nobody can explain who reconciles subcontractor attendance or reports missing people to responders. Which addition most directly addresses this gap?",
    [
      [
        "A second assembly-point map with a larger drawing scale.",
        "A clearer map may help navigation but does not assign accountability responsibilities.",
      ],
      [
        "A list of the most common injury types on similar projects.",
        "Injury examples do not establish who reconciles attendance during an evacuation.",
      ],
      [
        "An instruction that every foreperson independently decide when to announce an all-clear.",
        "Independent all-clear decisions can conflict with incident coordination and leave missing people unreported.",
      ],
      [
        "A defined accountability process, assigned coordinators, and a method for escalating unresolved absences.",
        "Named roles and escalation connect attendance information to the people coordinating the response.",
      ],
    ],
    "d",
    "Evacuation directions and attendance accountability serve different functions. The plan needs a usable process for reconciling personnel, reporting unresolved absences, and communicating with the response organization. Exact regulatory applicability and required wording remain for source verification.",
    "plan",
  ),
  draft(
    40,
    "K03",
    "Environmental emergency response",
    "Unknown spill near drainage",
    "scenario",
    "intermediate",
    "Workers discover an unidentified liquid leaking from a damaged container beside a storm drain. The leak has no readable label and no one has established its hazards. Which initial planning decision is most defensible?",
    [
      [
        "Keep people away, prevent untrained contact, and activate the site's reporting and qualified-response process.",
        "Isolation and notification avoid assuming the unknown material can be handled with ordinary cleanup methods.",
      ],
      [
        "Assign the nearest available crew to absorb the liquid using the spill kit they have used for diesel.",
        "A diesel cleanup method is not automatically suitable for an unidentified substance or untrained responders.",
      ],
      [
        "Wash the liquid toward the drain to reduce slip exposure in the work area.",
        "Moving an unknown substance into drainage may spread contamination and does not resolve its hazards.",
      ],
      [
        "Take a close visual sample before notifying the supervisor so the report is more specific.",
        "Untrained sampling introduces contact risk before hazards and appropriate response capability are established.",
      ],
    ],
    "a",
    "The response should reflect uncertainty about the material and available responder competence. Protecting people, keeping untrained workers out, and initiating the established qualified-response process are appropriate priorities. This draft does not provide hazardous-material containment instructions.",
    "incident",
  ),
  draft(
    41,
    "K04",
    "Incident command",
    "Transfer of command",
    "applied_technical",
    "intermediate",
    "A site supervisor starts the initial emergency response. A responding agency then assumes incident command. What communication best supports a controlled transfer?",
    [
      [
        "The supervisor leaves once the first response vehicle reaches the gate.",
        "Arrival alone does not transfer knowledge of hazards, actions, personnel status, and resources.",
      ],
      [
        "Each subcontractor sends separate instructions directly to all responding crews.",
        "Multiple instruction channels can create conflicting direction and obscure the command structure.",
      ],
      [
        "The current lead briefs the incoming command on the situation, hazards, actions, personnel status, and resources, and the transfer is communicated.",
        "A briefing and communicated transfer help preserve operational continuity and clarify who coordinates decisions.",
      ],
      [
        "The original site lead retains command of every responder because the event began on the project.",
        "Site familiarity does not automatically establish command authority over responding agencies.",
      ],
    ],
    "c",
    "A transfer needs more than physical arrival. Relevant situation information and a clearly communicated change in command reduce gaps and conflicting direction. Actual jurisdictional arrangements and the applicable incident-management source must be checked before approval.",
    "incident",
  ),
  draft(
    42,
    "K05",
    "Crisis management",
    "Unconfirmed public information",
    "scenario",
    "intermediate",
    "After a serious site event, several employees receive media messages asking whether a subcontractor caused the incident. The cause has not been investigated. Which approach best supports an accurate crisis response?",
    [
      [
        "Ask forepersons to share their most likely explanation so the project appears responsive.",
        "Speculation can become an inaccurate public claim before evidence is assessed.",
      ],
      [
        "Use the designated communication lead to share confirmed information and explain what remains unknown.",
        "A designated channel and explicit uncertainty help keep communications consistent and evidence based.",
      ],
      [
        "Publish a complete cause statement using the first witness account, then revise it if necessary.",
        "An early witness account can be incomplete and should not be treated as an established cause finding.",
      ],
      [
        "Send incident photographs to every requester so they can reach their own conclusions.",
        "Uncontrolled distribution can expose sensitive information and does not provide an accurate, coordinated account.",
      ],
    ],
    "b",
    "Crisis communication should distinguish confirmed facts from unresolved questions and follow designated responsibilities. A prompt factual update can acknowledge uncertainty without speculating about responsibility. Confidentiality and disclosure duties require separate legal and organizational review.",
    "incident",
  ),
  draft(
    43,
    "K06",
    "Emergency response equipment",
    "Readiness inspection",
    "applied_technical",
    "intermediate",
    "An emergency equipment cabinet is intact and its inventory list is complete. An inspection finds that a consumable is past its labeled replacement date and a required device self-test has not been checked. What is the strongest readiness conclusion?",
    [
      [
        "The equipment is ready because all listed items are physically present.",
        "Inventory completeness does not establish serviceability or suitability for use.",
      ],
      [
        "The cabinet can be treated as ready if workers know its location.",
        "Location awareness is valuable but does not resolve expired items or unverified operating condition.",
      ],
      [
        "The self-test can be deferred until the next emergency because checking it could disturb the cabinet.",
        "An emergency is the wrong time to discover that equipment is not serviceable.",
      ],
      [
        "Readiness remains unconfirmed until the deficiencies are resolved using the applicable equipment instructions and assigned inspection process.",
        "Readiness includes serviceability, maintenance status, and inspection evidence in addition to inventory.",
      ],
    ],
    "d",
    "A stocked cabinet is not necessarily a ready resource. Responsible personnel should address the identified deficiencies and verify the required checks against the relevant instructions. The question makes no device-specific maintenance interval claim.",
    "incident",
  ),
  draft(
    44,
    "K07",
    "First aid and medical response",
    "Limits of responder competence",
    "scenario",
    "intermediate",
    "A worker collapses in an accessible area with no apparent continuing environmental hazard. The nearest coworker has no first-aid training. Which response is most appropriate for the coworker's role?",
    [
      [
        "Activate the site's emergency medical process, summon trained assistance, and follow emergency-dispatch directions within their capability.",
        "This promptly connects the worker to appropriate help without assuming the coworker has clinical competence.",
      ],
      [
        "Move the worker to a vehicle immediately so transport starts before responders are contacted.",
        "Unplanned movement or private transport can add harm and delay appropriate medical coordination.",
      ],
      [
        "Give the worker food or a drink to address a possible low-energy condition.",
        "An untrained coworker should not assume the cause of collapse or administer oral substances.",
      ],
      [
        "Wait for the supervisor to determine whether the collapse is work related before calling for help.",
        "Medical response should not wait for an administrative determination of work-relatedness.",
      ],
    ],
    "a",
    "The defensible action is prompt activation of the emergency medical process and trained assistance, with actions guided by dispatch and actual competence. This is a response-planning draft, not a substitute for first-aid or resuscitation training.",
    "medical",
  ),
  draft(
    45,
    "K08",
    "Exposure precautions",
    "Potential blood contact",
    "foundational",
    "introductory",
    "A trained first-aid responder is preparing to assist a worker with visible bleeding. Which principle best guides selection of exposure precautions?",
    [
      [
        "Choose precautions based only on whether the injured worker reports a known infection.",
        "Reported health status does not reliably establish the presence or absence of a bloodborne exposure hazard.",
      ],
      [
        "Use only the protective equipment normally worn for the injured worker's construction task.",
        "Task PPE for construction work may not address foreseeable blood contact or splashes.",
      ],
      [
        "Assess foreseeable blood contact and splashes and use the appropriate protective barriers and trained procedures.",
        "Precautions should address the expected route and extent of exposure rather than assumptions about the person's health.",
      ],
      [
        "Treat visible blood as a minor exposure if the injury happened outdoors.",
        "An outdoor location does not remove contact or splash exposure pathways.",
      ],
    ],
    "c",
    "Exposure precautions should be selected for the contact and splash risks of the assistance task. A person's reported infection status is not a reliable basis for omitting protective measures. The applicable exposure-control requirements and medical guidance still need source review.",
    "exposure",
  ),
  draft(
    46,
    "S01",
    "Emergency mitigation preparation",
    "Responder access route",
    "scenario",
    "intermediate",
    "A project emergency plan directs fire and medical responders through the east gate. A scheduled concrete placement will block that gate for several hours. What should the project team do before the placement?",
    [
      [
        "Keep the plan unchanged because the gate will be blocked only temporarily.",
        "A temporary access restriction can still coincide with an emergency and invalidate the planned response route.",
      ],
      [
        "Establish and communicate a usable alternative access arrangement with the relevant site and response contacts before the gate is blocked.",
        "Preparing and communicating an alternative addresses the predictable loss of responder access.",
      ],
      [
        "Rely on workers to move equipment after a response vehicle arrives.",
        "Clearing access during the event can add delay and may not be practicable.",
      ],
      [
        "Post the construction delivery schedule inside the locked project office.",
        "An inaccessible schedule does not provide a usable, communicated emergency access arrangement.",
      ],
    ],
    "b",
    "Preparing a site for emergencies includes anticipated access restrictions. The team should establish a practical alternative and communicate it to those who must use or manage the route before the obstruction occurs.",
    "plan",
  ),
  draft(
    47,
    "S02",
    "Site emergency planning",
    "Different shift conditions",
    "applied_technical",
    "intermediate",
    "A building project adds a night shift using a different entrance and a smaller supervisory team. Which change most directly makes the emergency action plan usable for that shift?",
    [
      [
        "Add the night-shift start time to the cover page while leaving daytime roles unchanged.",
        "An updated cover page does not address changed access, supervision, or response responsibilities.",
      ],
      [
        "Issue the daytime plan only to the day superintendent and require workers to request it if needed.",
        "A plan must be accessible and communicated to the workers and responsible people who need to act on it.",
      ],
      [
        "Use the day-shift assembly roster because both shifts work for the same contractor.",
        "A daytime roster may omit or misidentify the people actually present at night.",
      ],
      [
        "Reassess routes, alarms, contacts, accountability, and assigned roles for night conditions and communicate the revised arrangements.",
        "The plan should reflect how the night shift actually accesses the site and obtains help.",
      ],
    ],
    "d",
    "A site-specific plan must remain usable under the conditions of each affected shift. Changes in entrances, supervisory resources, visibility, and available contacts can affect evacuation and response, so the relevant arrangements need reassessment and communication.",
    "plan",
  ),
  draft(
    48,
    "S03",
    "Emergency recovery",
    "Controlled return to work",
    "scenario",
    "intermediate",
    "Workers evacuated after smoke entered an occupied construction area. The visible smoke has cleared, but the source and remaining hazards have not been assessed. Which return-to-work decision is most defensible?",
    [
      [
        "Keep the area restricted until the responsible response and site personnel assess hazards, authorize reentry, and communicate restart controls.",
        "A controlled release should depend on assessed conditions and assigned authority, not appearance alone.",
      ],
      [
        "Allow a small crew to return first and report whether anyone experiences irritation.",
        "Using workers as a test of an unassessed environment exposes them to unresolved hazards.",
      ],
      [
        "Reopen the area as soon as the original evacuation signal stops sounding.",
        "Silencing an alarm does not demonstrate that hazards have been assessed or reentry authorized.",
      ],
      [
        "Resume all tasks if a majority of forepersons believe the smoke has dissipated.",
        "A vote does not replace assessment of remaining hazards or the established authority to release an area.",
      ],
    ],
    "a",
    "Emergency recovery requires an intentional transition back to work. The responsible personnel should assess residual hazards, establish necessary controls, authorize reentry, and communicate conditions for restarting. Clearing visible smoke alone does not establish safety.",
    "incident",
  ),
  draft(
    49,
    "S04",
    "Emergency coordination",
    "Shared situation information",
    "scenario",
    "advanced",
    "Two response groups arrive for a site incident: one manages a damaged utility and another prepares a medical access route. Their activities could conflict. What best supports coordinated operations?",
    [
      [
        "Let each group work independently because it has specialist competence.",
        "Specialist competence does not remove the need to coordinate interacting work areas and hazards.",
      ],
      [
        "Ask the first arriving subcontractor to approve every technical decision for both groups.",
        "Arrival order does not establish authority or competence to approve unrelated specialist decisions.",
      ],
      [
        "Use the designated incident coordination structure to share hazards, priorities, boundaries, and responsibilities between the groups.",
        "Shared situation information and assigned coordination reduce conflicts while retaining each group's specialist role.",
      ],
      [
        "Give both groups the original site logistics drawing and assume their plans are compatible.",
        "A static drawing may omit incident-specific hazards, access needs, and changing boundaries.",
      ],
    ],
    "c",
    "Interacting response activities need coordinated priorities, hazard information, boundaries, and responsibilities. Coordination does not require every person to make every technical decision; it creates a common operating picture through the designated structure.",
    "incident",
  ),
  draft(
    50,
    "S05",
    "Emergency notifications",
    "Acknowledged communication",
    "applied_technical",
    "intermediate",
    "A site coordinator sends an emergency notification to the designated response contact but receives no acknowledgement. The site's notification procedure identifies an alternate contact and escalation path. What should the coordinator do?",
    [
      [
        "Record that the message was sent and assume the notification obligation is complete.",
        "A sent message may not have reached anyone able to act; the established escalation path addresses that uncertainty.",
      ],
      [
        "Follow the alternate-contact and escalation process and communicate essential facts without unconfirmed conclusions.",
        "Escalation helps reach a responsible recipient while preserving accuracy of the initial information.",
      ],
      [
        "Wait until the incident investigation confirms all details before attempting another contact.",
        "Urgent notification should not be delayed until a complete investigation is available.",
      ],
      [
        "Post the notification to an unrelated group channel with the largest number of subscribers.",
        "A large audience is not a substitute for reaching the designated responsible contacts.",
      ],
    ],
    "b",
    "A usable communication process anticipates failed contacts. The coordinator should use the established alternate and escalation path, provide the essential known facts, and avoid presenting assumptions as findings. This does not establish any particular statutory reporting deadline.",
    "plan",
  ),
  draft(
    51,
    "S06",
    "Emergency service activation",
    "Unassessed rescue hazard",
    "scenario",
    "advanced",
    "A worker is unresponsive inside a space that may contain a hazardous atmosphere. Coworkers have no entry-rescue training or atmospheric assessment equipment. Which action best recognizes the need for specialist emergency services?",
    [
      [
        "Send two coworkers in together so one can assist the other if needed.",
        "Adding untrained entrants can create additional casualties without controlling the atmosphere or providing a rescue capability.",
      ],
      [
        "Allow an experienced worker to enter while another person watches from the opening.",
        "Observation from outside does not make an untrained entry into an unassessed atmosphere safe.",
      ],
      [
        "Open the access point and wait until the air seems normal before attempting entry.",
        "Appearance or odor cannot establish atmospheric safety or an adequate rescue arrangement.",
      ],
      [
        "Prevent untrained entry and immediately activate the established qualified-rescue and emergency-service process.",
        "The potential atmosphere and lack of rescue capability require the designated specialist response rather than improvised entry.",
      ],
    ],
    "d",
    "The key planning judgment is recognizing that ordinary coworkers lack the capability to manage this rescue hazard. They should prevent additional untrained entry and activate the qualified emergency response process. This draft deliberately does not instruct anyone to perform a hazardous-space rescue.",
    "incident",
  ),
  draft(
    52,
    "S07",
    "Emergency exercises",
    "Testing exercise objectives",
    "foundational",
    "introductory",
    "An evacuation exercise was completed quickly, but observers found that several visitors were never included in the final headcount. Which evaluation best reflects the exercise's learning purpose?",
    [
      [
        "Record the accountability failure, identify its causes, assign improvements, and verify them in a follow-up exercise.",
        "A useful exercise identifies and corrects gaps in the response system rather than relying on a single speed measure.",
      ],
      [
        "Treat the exercise as successful because the average evacuation time improved.",
        "Faster evacuation does not resolve missing people or prove that accountability worked.",
      ],
      [
        "Remove visitors from future exercises so the results are more consistent.",
        "Excluding a group that may be present during a real event hides an important planning need.",
      ],
      [
        "Repeat the identical exercise immediately without changing responsibilities or recording observations.",
        "Repetition without analyzing the failure may reproduce the same weakness without improving the process.",
      ],
    ],
    "a",
    "Exercise objectives should include relevant outcomes such as alarm recognition, evacuation, accountability, and communication. Findings should lead to assigned corrective actions and a way to verify improvement; completion time alone is not a sufficient evaluation.",
    "incident",
  ),
  draft(
    53,
    "K02",
    "Emergency action plans",
    "Visitors and changing attendance",
    "scenario",
    "intermediate",
    "A delivery driver is signed in for a brief site visit when an evacuation occurs. Subcontractor forepersons reconcile their crew lists, but none includes the driver. Which planning improvement most directly prevents this accountability gap?",
    [
      [
        "Require drivers to decide for themselves whether an alarm applies to them.",
        "Self-selection does not provide a reliable process for accounting for people present on the site.",
      ],
      [
        "Count delivery vehicles rather than individual visitors.",
        "Vehicle counts do not establish which people are present or whether they reached a safe location.",
      ],
      [
        "Connect visitor sign-in and departure information to a designated evacuation-accountability role.",
        "A defined interface between access records and accountability includes short-term visitors in the response process.",
      ],
      [
        "Ask every subcontractor to include all visitors on every crew roster.",
        "Duplicating visitors across unrelated rosters can create conflicting counts without clear responsibility.",
      ],
    ],
    "c",
    "Attendance systems and emergency accountability need an explicit connection. A designated role should be able to use current visitor information, reconcile arrivals and departures, and escalate unresolved absences rather than assume crew rosters contain everyone.",
    "plan",
  ),
  draft(
    54,
    "K06",
    "Emergency equipment planning",
    "Classroom supply calculation",
    "reasoning_calculation",
    "intermediate",
    "For a classroom equipment-planning exercise only, assume one demonstration device consumes 3.6 L/min for 18 minutes at a constant rate. Ignore reserve, leakage, and pressure effects. What volume is consumed? These assumptions are not suitable for selecting life-safety equipment.",
    [
      [
        "5 L",
        "Dividing time by flow does not produce the required volume and uses the units incorrectly.",
      ],
      [
        "64.8 L",
        "Multiplying 3.6 L/min by 18 min gives 64.8 L under the stated classroom assumptions.",
      ],
      [
        "21.6 L",
        "Adding the numeric rate and duration does not calculate volume; the quantities also have different units.",
      ],
      ["648 L", "This is a factor-of-ten error in the multiplication."],
    ],
    "b",
    "For the simplified exercise, consumed volume equals constant volumetric flow multiplied by elapsed time. Real emergency-equipment selection must use manufacturer data, actual operating conditions, required reserves, and qualified planning; this arithmetic is not a service-duration rating.",
    "incident",
    [
      "Use V = Q × t only for the stated constant-flow model.",
      "V = 3.6 L/min × 18 min.",
      "The minute units cancel, leaving V = 64.8 L. No life-safety equipment adequacy is inferred.",
    ],
  ),
  draft(
    55,
    "S01",
    "Emergency mitigation preparation",
    "Planned fire-protection impairment",
    "applied_technical",
    "advanced",
    "A planned utility isolation will temporarily interrupt a water supply used by the site's fire-protection arrangement. The construction team has a maintenance schedule but no agreed impairment plan. What preparation is most important before the isolation?",
    [
      [
        "Keep the work schedule unchanged because the interruption has a planned end time.",
        "A known duration does not by itself address the loss of a protection resource during the interruption.",
      ],
      [
        "Notify only the maintenance crew because they control the isolation valves.",
        "The people operating the valves cannot alone resolve site-wide fire-protection and emergency-response implications.",
      ],
      [
        "Assume portable extinguishers provide an equivalent substitute without reviewing the affected hazards or system function.",
        "Different protection resources are not automatically interchangeable for the hazards and conditions involved.",
      ],
      [
        "Coordinate an impairment review with the responsible fire-protection and site personnel, establish the necessary temporary arrangements and notifications, and verify restoration.",
        "Planning should address the protection gap, relevant coordination, controlled duration, and return to normal service.",
      ],
    ],
    "d",
    "A predictable interruption to a protection resource should be assessed and coordinated before it occurs. Responsible qualified personnel need to determine acceptable arrangements, notifications, restrictions, and restoration checks for the actual conditions. This draft does not design a substitute fire-protection system or claim a particular compensating measure is adequate.",
    "incident",
  ),
  draft(
    56,
    "S05",
    "Emergency communications",
    "Alarm accessibility",
    "scenario",
    "intermediate",
    "During a supervised drill, workers wearing required hearing protection in a noisy work zone do not recognize the site's audible evacuation signal. What should the evaluation team prioritize?",
    [
      [
        "Reassess signal recognition in the actual work conditions and establish suitable, coordinated notification methods before relying on the system again.",
        "The finding indicates a communication-system gap that must be addressed under realistic exposure and work conditions.",
      ],
      [
        "Tell workers to remove hearing protection whenever they think an alarm might occur.",
        "Removing required protection is not a reliable or appropriate solution to an emergency-notification gap.",
      ],
      [
        "Assume workers outside the noisy area will eventually pass the message along.",
        "An unassigned informal relay is not a dependable notification arrangement.",
      ],
      [
        "Record the drill time as slower and retain the same alarm arrangements.",
        "Measuring delay does not correct the demonstrated inability to recognize the signal.",
      ],
    ],
    "a",
    "Emergency communications must reach the people who need to act under actual work conditions. The demonstrated gap should prompt evaluation of suitable coordinated notification methods and subsequent confirmation that workers can recognize and respond to them.",
    "plan",
  ),
  draft(
    57,
    "S07",
    "Emergency exercise evaluation",
    "Accountability performance measure",
    "reasoning_calculation",
    "introductory",
    "A drill evaluation objective is to reconcile all 24 people shown on the exercise attendance list by the planned checkpoint. Observers confirm that 18 were reconciled by that checkpoint. What percentage met this exercise measure? This is an exercise metric, not an examination score or compliance threshold.",
    [
      [
        "25%",
        "This is the unreconciled proportion: 6 divided by 24, rather than the proportion meeting the measure.",
      ],
      [
        "66.7%",
        "This does not follow from the stated numerator of 18 and denominator of 24.",
      ],
      ["75%", "18 divided by 24 equals 0.75, or 75%."],
      [
        "133.3%",
        "Dividing total attendance by reconciled attendance reverses the intended numerator and denominator.",
      ],
    ],
    "c",
    "The measure uses the number reconciled by the checkpoint divided by the total exercise attendance. The remaining six people identify an accountability gap to investigate; the percentage alone does not explain why the gap occurred or establish overall response readiness.",
    "incident",
    [
      "Identify the numerator: 18 people reconciled by the exercise checkpoint.",
      "Identify the denominator: 24 people on the exercise attendance list.",
      "Calculate 18 ÷ 24 × 100 = 75%; investigate the six unresolved records separately.",
    ],
  ),
];
