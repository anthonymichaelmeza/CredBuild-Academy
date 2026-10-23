import type { DraftQuestionRecord } from "./draft-types";

/** Original AI drafts only. No listed publication was reviewed for technical support. */
type Choice = readonly [text: string, rationale: string];
type Category = DraftQuestionRecord["category"];
const references = {
  training: {
    id: "candidate-wan-incidental-trainer",
    title:
      "Incidental Trainer: A Reference Guide for Training Design, Development and Delivery — Wan (2014), bibliography-listed candidate",
    url: "",
    edition: "2014",
    section: "",
    classification: "professional_guidance" as const,
  },
  leadership: {
    id: "candidate-manuele-advanced-safety",
    title:
      "Advanced Safety Management: Focusing on Z10 & Serious Injury Prevention — Manuele (2008), bibliography-listed candidate",
    url: "",
    edition: "2008",
    section: "",
    classification: "professional_guidance" as const,
  },
  supervision: {
    id: "candidate-nsc-supervisors-manual",
    title:
      "Supervisors’ Safety Manual — National Safety Council, 11th Edition (2018), bibliography-listed candidate",
    url: "",
    edition: "11th Edition (2018)",
    section: "",
    classification: "professional_guidance" as const,
  },
  ethics: {
    id: "candidate-bcsp-ethics-bibliography",
    title:
      "BCSP Code of Ethics — 2013 bibliography-listed candidate; actual content not examined",
    url: "",
    edition: "2013 bibliography entry",
    section: "",
    classification: "professional_guidance" as const,
  },
  information: {
    id: "candidate-bcsp-official-information",
    title: "BCSP official website — candidate location for version checks",
    url: "https://www.bcsp.org/",
    edition: "",
    section: "",
    classification: "supplemental_resource" as const,
  },
  health: {
    id: "candidate-niosh-total-worker-health",
    title:
      "NIOSH Total Worker Health resources — candidate guidance entry point",
    url: "https://www.cdc.gov/niosh/twh/",
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
      domain: "4",
      objectiveCode: `CHST5-2022.04.12-D4-${objective}`,
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
export const domain4Drafts: DraftQuestionRecord[] = [
  draft(
    80,
    "K01",
    "Training methods",
    "Demonstrating task competence",
    "foundational",
    "introductory",
    "A crew must learn to perform a task-specific equipment pre-use inspection. Which training approach gives the strongest direct evidence that workers can perform the inspection?",
    [
      [
        "Demonstrate the inspection, provide supervised practice, and observe each worker using defined task criteria.",
        "Observed performance against relevant criteria directly tests the skill that the training is intended to develop.",
      ],
      [
        "Email the inspection form and record whether each worker opened the message.",
        "Opening a message establishes delivery activity rather than the ability to perform the inspection.",
      ],
      [
        "Use a presentation and count the number of slides covered.",
        "Content coverage alone does not demonstrate that a worker can apply the inspection process.",
      ],
      [
        "Ask workers to sign that the session was useful without observing the task.",
        "A satisfaction or attendance signature is not direct evidence of practical competence.",
      ],
    ],
    "a",
    "The assessment should match the learning outcome. A practical inspection skill is best evaluated through relevant observed performance, supported by explanation, demonstration, practice, and feedback. This draft does not establish a legally sufficient qualification process for any particular equipment.",
    "training",
  ),
  draft(
    81,
    "K02",
    "Motivation and reporting",
    "Incentive side effects",
    "scenario",
    "intermediate",
    "A project rewards crews only when they report no injuries for a month. Workers say they are reluctant to report minor events because they may lose the reward. Which redesign best addresses the unintended incentive?",
    [
      [
        "Increase the value of the reward so workers pay more attention to the injury count.",
        "A larger reward tied to no reported injuries can increase the same pressure to suppress reporting.",
      ],
      [
        "Keep the reward but remove the near-miss reporting form.",
        "Removing a reporting channel hides information rather than addressing why people are reluctant to use it.",
      ],
      [
        "Recognize useful hazard reports, effective control improvements, and honest participation without discouraging injury reporting.",
        "These measures encourage activities that can improve safety while preserving reporting and learning.",
      ],
      [
        "Publish individual injury reports to make workers accountable for losing the reward.",
        "Publicly attributing lost rewards can intensify blame, discourage reporting, and expose sensitive information.",
      ],
    ],
    "c",
    "The observed problem is a conflict between reporting and reward. Recognition should encourage useful safety activity and effective risk reduction while maintaining honest reporting. A favorable number achieved through suppressed information does not establish improved safety.",
    "leadership",
  ),
  draft(
    82,
    "K03",
    "Communication strategies",
    "Checking shared understanding",
    "applied_technical",
    "intermediate",
    "After a multilingual pre-task briefing, the supervisor asks, 'Does everyone understand?' Nobody responds. Which follow-up provides stronger evidence of shared understanding?",
    [
      [
        "Repeat the same briefing more loudly and assume silence confirms agreement.",
        "Volume and silence do not demonstrate comprehension or the ability to apply the information.",
      ],
      [
        "Use appropriate language support and ask workers to explain or demonstrate the key hazards, controls, and stop-work triggers in their own words.",
        "An appropriate teach-back or demonstration exposes misunderstandings and checks application of the message.",
      ],
      [
        "Ask the most fluent worker to sign for the entire crew.",
        "One person's signature does not demonstrate every worker's understanding.",
      ],
      [
        "Replace the briefing with an attendance sheet containing the procedure title.",
        "Attendance records do not establish that the message was understood or can be applied.",
      ],
    ],
    "b",
    "Communication is more than transmitting a message. Appropriate language and literacy support, questions, teach-back, and relevant demonstrations help verify a shared understanding of critical information. A respectful process should make it safe to reveal uncertainty.",
    "training",
  ),
  draft(
    83,
    "K04",
    "Consulting specialists",
    "Equipment compatibility uncertainty",
    "scenario",
    "intermediate",
    "A rental attachment physically fits a machine, but the team cannot find confirmation that the attachment and machine are compatible in the proposed configuration. Who should be involved before the task relies on that arrangement?",
    [
      [
        "Only the crew member who can connect the attachment fastest.",
        "Connection speed does not establish compatibility, limitations, or authority to approve the configuration.",
      ],
      [
        "Only the purchasing department, because the rental agreement has been signed.",
        "Commercial approval does not establish technical suitability or safe operating limitations.",
      ],
      [
        "Only the operator of a similar machine on a different project.",
        "Experience with another arrangement does not resolve this model- and configuration-specific question.",
      ],
      [
        "The responsible qualified equipment personnel and relevant manufacturer or supplier support able to resolve the compatibility and limitation questions.",
        "The uncertainty calls for information and expertise applicable to the actual equipment and intended use.",
      ],
    ],
    "d",
    "Physical fit is not proof of compatibility or suitability. The team should obtain information and review from the responsible qualified people and relevant manufacturer or supplier resources, resolving ratings and operating limitations before use.",
    "supervision",
  ),
  draft(
    84,
    "K05",
    "Confidential information",
    "Sharing lessons without medical details",
    "foundational",
    "introductory",
    "A supervisor wants to share a lesson learned from a worker's medical event with all subcontractors. Which approach best supports learning while protecting confidential information?",
    [
      [
        "Share the relevant work conditions and prevention lessons using the minimum necessary information, with access and disclosure reviewed through the responsible process.",
        "Useful learning can often be communicated without unnecessary identifying or medical details.",
      ],
      [
        "Distribute the worker's complete medical record so recipients can assess the event themselves.",
        "Complete medical records contain sensitive information beyond what is normally needed for a prevention message.",
      ],
      [
        "Include the worker's name and diagnosis in the general toolbox-talk attendance record.",
        "A widely accessible attendance record is not an appropriate default place for identifiable medical details.",
      ],
      [
        "Post the event details to a public group because the purpose is safety improvement.",
        "A beneficial purpose does not remove the need to control sensitive disclosures and follow applicable requirements.",
      ],
    ],
    "a",
    "The prevention purpose should guide what information is shared and with whom. Confidentiality, applicable law, organizational authority, and necessary access require consideration. This draft describes a privacy-conscious approach rather than giving legal advice about a particular disclosure.",
    "ethics",
  ),
  draft(
    85,
    "K06",
    "Leading risk management",
    "Critical-control verification",
    "applied_technical",
    "intermediate",
    "A project wants an indicator that helps identify weaknesses before a serious event. Which measure is most directly connected to whether a critical control is functioning?",
    [
      [
        "The total number of safety posters printed during the month.",
        "Printing activity does not establish whether the control is present and working at the point of exposure.",
      ],
      [
        "The number of injury-free days displayed at the project gate.",
        "An injury-free period is a lagging outcome and does not directly verify control performance.",
      ],
      [
        "The proportion of planned critical-control checks completed to defined quality criteria, with deficiencies corrected and rechecked.",
        "This connects verification activity to control condition and corrective follow-through.",
      ],
      [
        "The number of pages in the latest monthly safety report.",
        "Report length is not evidence of control implementation or effectiveness.",
      ],
    ],
    "c",
    "A useful leading measure should connect to important exposures and the quality of controls, including what happens when deficiencies are found. Check counts alone can become a paperwork measure, so defined quality criteria and corrective follow-through matter.",
    "leadership",
  ),
  draft(
    86,
    "K07",
    "Safety leadership",
    "Responding to a work pause",
    "scenario",
    "intermediate",
    "A worker pauses a planned lift because the landing area differs from the briefing. The schedule is tight. Which supervisor response best supports constructive safety leadership?",
    [
      [
        "Tell the worker to raise the concern after the lift so the schedule is protected.",
        "Deferring the concern leaves the changed landing conditions unresolved during the activity.",
      ],
      [
        "Acknowledge the concern, maintain the pause while the responsible team reassesses the landing conditions, and communicate the agreed controls before restarting.",
        "The response makes it practical to raise uncertainty and ensures changed conditions are addressed before work resumes.",
      ],
      [
        "Replace the worker with someone willing to proceed under the original briefing.",
        "Replacing the person does not resolve the changed work conditions or the control question.",
      ],
      [
        "Ask the crew to vote on whether the concern is worth the delay.",
        "A vote is not a substitute for assessing a safety-critical change with the responsible personnel.",
      ],
    ],
    "b",
    "Leadership is demonstrated by the response to concerns under real production pressure. Acknowledging the concern, maintaining appropriate control of the task, assessing the change, and communicating the resolution support both learning and reliable work planning.",
    "leadership",
  ),
  draft(
    87,
    "S01",
    "Site-specific training needs",
    "New task and environment",
    "applied_technical",
    "intermediate",
    "An experienced crew joins a project to perform a task it knows well, but this site has different access restrictions, adjacent operations, and emergency arrangements. What should the training-needs review emphasize?",
    [
      [
        "Omit site-specific instruction because the crew has already done the task elsewhere.",
        "Prior task experience does not establish knowledge of this site's interfaces, restrictions, or emergency arrangements.",
      ],
      [
        "Repeat all entry-level trade training without considering what workers already know.",
        "An indiscriminate repeat may overlook the actual site-specific gaps and does not use evidence of existing competence.",
      ],
      [
        "Choose training only by the number of years each worker has been in construction.",
        "Years of service do not identify which site conditions or responsibilities are unfamiliar.",
      ],
      [
        "Compare the planned job and site conditions with existing competence, then address the specific hazards, interfaces, controls, and response arrangements the crew needs.",
        "A needs review should identify the gap between what the work requires and what the people can already demonstrate.",
      ],
    ],
    "d",
    "Training needs follow the job tasks, work environment, interfaces, and demonstrated competence. Experience should inform the review, but should not replace site-specific preparation for different access, nearby activities, and emergency arrangements.",
    "training",
  ),
  draft(
    88,
    "S02",
    "Document management",
    "Superseded work instructions",
    "foundational",
    "introductory",
    "A revised work instruction has been approved, but printed copies of the previous revision remain at two work locations. What is the most effective document-control action?",
    [
      [
        "Make the current approved revision available at the point of use, remove or clearly control superseded copies, and communicate the relevant changes.",
        "Point-of-use availability and control of obsolete versions reduce conflicting instructions.",
      ],
      [
        "Save the new revision in an office folder and rely on workers to discover it.",
        "An office copy does not ensure that the people doing the work can identify and use the current instruction.",
      ],
      [
        "Leave both versions available and let each crew select the one it prefers.",
        "Uncontrolled choice between revisions can produce inconsistent or incompatible work methods.",
      ],
      [
        "Rename the old printed copies with today's date without changing their content.",
        "Changing a date does not make superseded technical content current and damages revision traceability.",
      ],
    ],
    "a",
    "Document management should preserve revision history while ensuring that the correct approved information is identifiable and available where needed. Obsolete copies should be removed from uncontrolled use or clearly managed, and affected people need to understand relevant changes.",
    "supervision",
  ),
  draft(
    89,
    "S03",
    "Foreseeable risk recognition",
    "Changing site interfaces",
    "scenario",
    "intermediate",
    "A delivery route crosses a pedestrian path. Both are currently visible, but a planned storage stack will block the sight line next week. Which action best addresses foreseeable at-risk conditions?",
    [
      [
        "Wait for the stack to be built and an observation to confirm a near miss.",
        "The planned change already provides a basis for assessing and preventing the foreseeable conflict.",
      ],
      [
        "Keep the existing route because no collision has been recorded under the current arrangement.",
        "Past performance under different visibility conditions does not establish suitability after the change.",
      ],
      [
        "Review the planned layout and interactions now, and establish effective separation, access, and communication arrangements before the sight line is lost.",
        "The known future change should trigger preventive planning rather than waiting for an event.",
      ],
      [
        "Add the future stack to a drawing but make no change to route planning.",
        "Documenting a foreseeable obstruction does not itself control the resulting vehicle–pedestrian interaction.",
      ],
    ],
    "c",
    "Foreseeable changes are opportunities for prevention. The team should assess how the new layout affects movements and visibility and establish suitable controls before the changed condition occurs, rather than rely solely on the absence of past incidents.",
    "supervision",
  ),
  draft(
    90,
    "S04",
    "Recognizing immediate danger",
    "Uncontrolled suspended-load area",
    "scenario",
    "intermediate",
    "A planned lift is paused with a suspended load, and workers from another crew begin moving into its landing and travel area. Which response best addresses the developing danger?",
    [
      [
        "Continue the lift faster so the period of exposure is shorter.",
        "Increasing speed does not resolve uncontrolled access and may introduce additional handling risk.",
      ],
      [
        "Use the established stop/hold communication, keep people out of the affected area, and coordinate the crews before proceeding.",
        "Immediate task control and coordinated access management address the exposure before movement resumes.",
      ],
      [
        "Make a note for the next coordination meeting but allow the current movements to continue.",
        "A later discussion does not control the people entering the affected area now.",
      ],
      [
        "Assume the other crew has accepted the risk because the load is visible.",
        "Visibility does not establish understanding, authorization, or effective control of the interaction.",
      ],
    ],
    "b",
    "Recognizing danger should lead to timely action through established task-control and communication arrangements. The relevant crews need to coordinate access and movement before work proceeds. This question is not a lifting procedure or a substitute for a qualified lift plan.",
    "supervision",
  ),
  draft(
    91,
    "S05",
    "Current technical information",
    "Unconfirmed document currency",
    "applied_technical",
    "intermediate",
    "A learner has a CHST5 blueprint marked version 2022.04.12 and a references document marked version 2021.06.09. The official website cannot be reached to check for replacements. Which description of these materials is most accurate?",
    [
      [
        "They are confirmed as the current official documents because their filenames contain CHST.",
        "A filename does not establish that no newer official document exists.",
      ],
      [
        "The reference document is invalid solely because its version predates the blueprint.",
        "Different printed version dates alone do not establish whether a bibliography is invalid or replaced.",
      ],
      [
        "Both version numbers should be replaced with today's date to indicate that the files were opened today.",
        "A review or access date is different from the source's printed version identifier.",
      ],
      [
        "Identify the supplied versions exactly and state that newer-version verification remains unavailable.",
        "This preserves provenance without making an unsupported claim of current official status.",
      ],
    ],
    "d",
    "Accessing a supplied file can establish what that file contains and which version it displays. It does not establish current official status when a replacement check is unavailable. Preserve source versions and record the limitation instead of substituting an access date or assuming currency.",
    "information",
  ),
  draft(
    92,
    "S06",
    "Total worker health",
    "Fatigue and work organization",
    "scenario",
    "intermediate",
    "Workers report fatigue during repeated extended shifts. A manager proposes only a voluntary wellness leaflet. Which response better addresses total worker health in the work context?",
    [
      [
        "Assess scheduling, workload, recovery opportunities, task demands, and worker input while addressing relevant exposures and access to appropriate support.",
        "A work-system review can address factors contributing to fatigue rather than placing the entire burden on individual wellness choices.",
      ],
      [
        "Treat fatigue as unrelated to work whenever participation in wellness activities is voluntary.",
        "Voluntary wellness participation does not establish that scheduling or task demands are irrelevant.",
      ],
      [
        "Require workers to disclose unrelated private medical information to the entire crew before raising scheduling concerns.",
        "Unnecessary public disclosure can undermine privacy and is not a suitable prerequisite for reviewing work conditions.",
      ],
      [
        "Use the absence of a recorded injury to conclude that the current schedule needs no review.",
        "An injury-free period does not demonstrate that fatigue risks or harmful work demands are adequately controlled.",
      ],
    ],
    "a",
    "A total-worker-health approach considers how work organization and exposures affect well-being, alongside appropriate support. Worker input and privacy-conscious assessment can help identify improvements. A leaflet alone does not resolve scheduling or workload conditions.",
    "health",
  ),
  draft(
    93,
    "S07",
    "Risk reduction",
    "Verifying a changed control",
    "applied_technical",
    "intermediate",
    "A team redesigns a material-delivery process to remove a manual handling step. What should follow before the team concludes that the change reduced risk overall?",
    [
      [
        "Count the redesign meetings and treat a higher count as proof of reduced exposure.",
        "Meeting activity does not establish whether the new process works or creates other hazards.",
      ],
      [
        "Assume every design change is more effective than the previous method.",
        "A change may reduce, transfer, or introduce risks; its effect needs evaluation.",
      ],
      [
        "Observe the revised work, check the intended exposure reduction, examine new interfaces and hazards, and address any deficiencies.",
        "Verification should test both the intended benefit and unintended consequences under actual work conditions.",
      ],
      [
        "Wait for a full year of injury data before checking how the revised process operates.",
        "Operational verification can and should begin before waiting for a lagging injury outcome.",
      ],
    ],
    "c",
    "Risk-reduction activity should be followed by implementation and effectiveness checks. Observation and relevant exposure/control evidence help determine whether the intended benefit occurs and whether the new method introduces additional problems.",
    "leadership",
  ),
  draft(
    94,
    "K01",
    "Training evaluation",
    "Knowledge score versus practical transfer",
    "reasoning_calculation",
    "advanced",
    "A crew scores well on a short online quiz about equipment isolation, but a supervised simulation reveals that several workers cannot identify all of the task's energy sources. Which conclusion is best supported?",
    [
      [
        "The quiz score establishes that the observed simulation difficulties are unimportant.",
        "A knowledge score does not override direct evidence of a gap in applying a safety-critical skill.",
      ],
      [
        "The assessment has identified an application gap requiring task-focused instruction, practice, and reassessment before competence is relied upon.",
        "The learning objective includes applying the process; the observed gap should guide further training and assessment.",
      ],
      [
        "The practical assessment should be removed so it does not conflict with the quiz result.",
        "Removing evidence of a gap does not improve competence or resolve the underlying learning need.",
      ],
      [
        "Workers should repeat the identical quiz until the simulation results can be ignored.",
        "Repetition of the same knowledge test does not necessarily develop or demonstrate the missing application skill.",
      ],
    ],
    "b",
    "Different assessments measure different aspects of learning. The supervised simulation provides evidence of an application gap that a quiz alone did not detect. Training and reassessment should address that gap; no course score is claimed to predict real-world performance or examination success.",
    "training",
  ),
  draft(
    95,
    "K03",
    "Shift communication",
    "Closed-loop handover",
    "scenario",
    "intermediate",
    "The day shift changes an exclusion boundary before the night shift arrives. A note is left in the office, but the night supervisor has not confirmed receipt. Which handover practice best reduces conflicting assumptions?",
    [
      [
        "Assume the note will be read because it is placed beside the attendance sheet.",
        "Placement near another record does not establish that critical information was received and understood.",
      ],
      [
        "Tell only one arriving worker and rely on informal word of mouth.",
        "An unassigned relay can omit responsible people or change the meaning of the message.",
      ],
      [
        "Wait until the next morning to learn whether the night shift encountered a problem.",
        "Delayed feedback leaves the boundary change unclear during the affected work period.",
      ],
      [
        "Communicate the change directly through the assigned handover process and confirm the incoming team's understanding before affected work begins.",
        "A closed-loop handover checks receipt and understanding of information that changes how work must be controlled.",
      ],
    ],
    "d",
    "A safety-critical handover should establish that the responsible incoming people received and understood the change. A note can support the process, but is not by itself confirmation of shared operational understanding.",
    "supervision",
  ),
  draft(
    96,
    "K06",
    "Leading indicators",
    "Quality rather than activity count",
    "reasoning_calculation",
    "advanced",
    "Two supervisors each record ten pre-task reviews. In one area the reviews use copied hazards and unresolved actions; in the other, workers identify current interfaces and verify the agreed controls. What is the most defensible metric interpretation?",
    [
      [
        "Equal review counts do not establish equal control quality; examine task relevance, participation, control verification, and action closure.",
        "The same activity count can represent very different quality and effectiveness.",
      ],
      [
        "Both areas have equivalent risk management because the leading-indicator totals match.",
        "An equal count is insufficient evidence that the reviews addressed the work or controlled exposure.",
      ],
      [
        "The area with shorter forms is necessarily safer because it uses less paperwork.",
        "Form length alone does not establish whether hazards and controls were properly addressed.",
      ],
      [
        "Only the following month's injury count can be used to evaluate the review process.",
        "Lagging outcomes do not replace direct assessment of how the reviews and controls function.",
      ],
    ],
    "a",
    "A leading indicator should not be reduced to an activity quota. Quality, relevance, participation, verification, and follow-through determine what the activity tells the team. Equal counts need not mean equal risk management, and neither establishes an examination-readiness prediction.",
    "leadership",
  ),
  draft(
    97,
    "K07",
    "Leadership and coordination",
    "Respectful resolution of disagreement",
    "scenario",
    "intermediate",
    "An experienced foreperson and a newer worker disagree about whether changed ground conditions affect the planned access route. Which leadership approach best supports a technically defensible decision?",
    [
      [
        "Choose the foreperson's view automatically because experience resolves uncertainty.",
        "Experience is relevant but does not replace checking the changed conditions and applicable controls.",
      ],
      [
        "Choose the newer worker's view automatically to encourage future reporting.",
        "Encouraging reporting does not require treating every proposed interpretation as technically established.",
      ],
      [
        "Keep the affected activity controlled, examine the conditions and relevant information with the responsible people, and explain the resulting decision respectfully.",
        "This supports reporting while resolving the technical question through evidence and appropriate responsibility.",
      ],
      [
        "Ask both people to stop raising the issue until the schedule pressure has passed.",
        "Suppressing a disagreement leaves the changed conditions unresolved and discourages future communication.",
      ],
    ],
    "c",
    "Constructive leadership separates respect for the people from evaluation of the technical issue. A controlled pause, appropriate evidence, and responsible expertise can resolve uncertainty while encouraging future concerns and communicating the reasons for the decision.",
    "leadership",
  ),
  draft(
    98,
    "S01",
    "Training logistics",
    "Supervised-practice capacity",
    "reasoning_calculation",
    "introductory",
    "A project plans a supervised practice session for 48 workers. For this exercise, the training plan allows no more than 8 learners in each session and every worker must attend once. What is the minimum number of sessions if all sessions are filled? This is a planning assumption, not an official training ratio.",
    [
      [
        "4 sessions",
        "Four sessions at eight learners cover only 32 workers, leaving 16 without a session.",
      ],
      [
        "6 sessions",
        "48 workers divided by 8 learners per session equals 6 sessions.",
      ],
      [
        "8 sessions",
        "Eight sessions would provide more capacity than the minimum needed under the stated assumptions.",
      ],
      [
        "12 sessions",
        "Twelve sessions would be needed at four learners each, not the stated eight.",
      ],
    ],
    "b",
    "Under the stated planning assumptions, 48 ÷ 8 = 6 full sessions. Actual training design also depends on learning needs, task complexity, equipment, accessibility, supervision, and assessment quality; the assumed group size is not a regulatory or certification requirement.",
    "training",
    [
      "Determine the required attendance: 48 workers, each attending once.",
      "Use the assumed capacity: 8 learners/session.",
      "48 workers ÷ 8 learners/session = 6 full sessions; this is the minimum under the supplied assumptions.",
    ],
  ),
  draft(
    99,
    "S05",
    "Source currency",
    "File packaging date versus source version",
    "foundational",
    "intermediate",
    "A downloaded blueprint file has a recent filesystem date, but the document footer identifies an older printed version. Which date should be preserved as the blueprint's version identifier until replacement is confirmed?",
    [
      [
        "The download date, because downloading makes the document current.",
        "A download records access to a file; it does not change the version of its content.",
      ],
      [
        "The computer's current date, because the learner opened the file today.",
        "An access date is useful provenance but is different from a document's source version.",
      ],
      [
        "The newest date visible anywhere in the operating system's file properties.",
        "Packaging and filesystem dates may describe handling rather than the version printed by the publisher.",
      ],
      [
        "The version printed in the document, with access or packaging dates recorded separately and currency still subject to verification.",
        "This preserves the source's identifier without confusing file handling with a verified publication update.",
      ],
    ],
    "d",
    "A source version, an access date, and file metadata describe different facts. Preserve the publisher's printed version identifier and record handling dates separately. Whether a newer official version exists requires a separate check rather than inference from file properties.",
    "information",
  ),
  draft(
    100,
    "S07",
    "Risk-reduction evaluation",
    "Exposure evidence after redesign",
    "reasoning_calculation",
    "advanced",
    "Before a handling redesign, observers record 40 manual lifts during 10 comparable task cycles. Afterward they record 12 manual lifts during 6 comparable cycles. Assuming comparable observation definitions, what conclusion follows from manual lifts per cycle alone?",
    [
      [
        "The observed rate fell from 4 to 2 manual lifts per cycle, but the team still needs to evaluate remaining exposures and any new hazards.",
        "Normalizing by task cycles shows a lower observed handling frequency without proving total risk reduction.",
      ],
      [
        "The observed rate fell by 70%, so all handling risk has been eliminated.",
        "A 70% raw-count reduction ignores differing cycle counts and cannot establish elimination of all risk.",
      ],
      [
        "The observed rate rose because fewer cycles were completed after the redesign.",
        "Using the stated counts, 12/6 is lower than 40/10; fewer cycles alone do not imply a higher rate.",
      ],
      [
        "The two rates cannot be compared even under the stated comparability assumptions.",
        "The supplied comparable cycle denominator permits this limited frequency comparison, though it does not capture all dimensions of risk.",
      ],
    ],
    "a",
    "The observed frequency is 40/10 = 4 lifts per cycle before and 12/6 = 2 afterward, a 50% reduction in this rate. Load characteristics, posture, duration, other exposures, and introduced hazards still matter. The calculation measures one observed feature rather than proving that the entire task is safe.",
    "leadership",
    [
      "Before: 40 manual lifts ÷ 10 cycles = 4 lifts/cycle.",
      "After: 12 manual lifts ÷ 6 cycles = 2 lifts/cycle.",
      "Relative rate decrease: (4 − 2) ÷ 4 × 100 = 50%; assess the remaining and any new hazards separately.",
    ],
  ),
];
