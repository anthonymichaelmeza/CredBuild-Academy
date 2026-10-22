import { demoQuestions } from "@/demo/questions";

export type Lesson = {
  id: string;
  version: number;
  certification: string;
  domain: string;
  topic: string;
  title: string;
  summary: string;
  subtopics: string[];
  objectives: string[];
  readingMinutes: number;
  sections: {
    id: string;
    title: string;
    paragraphs: string[];
    reflection: string;
  }[];
  references: {
    title: string;
    url: string;
    section: string;
    verifiedAt: null;
  }[];
  checks: {
    id: string;
    stem: string;
    choices: { id: string; text: string }[];
    correctChoice: string;
    explanation: string;
  }[];
  questionIds: string[];
  contentKind: "demonstration";
  reviewStatus: "draft";
  blueprint: { version: "CHST5"; objective: null; verified: false };
};
type Seed = {
  id: string;
  domain: string;
  title: string;
  topic: string;
  subtopics: string[];
  objective: string;
  ids: number[];
  context: string;
  scenario: string;
  action: string;
};
const seeds: Seed[] = [
  {
    id: "recognize-hazards",
    domain: "1",
    title: "See the work. Recognize the risk.",
    topic: "Hazard recognition",
    subtopics: ["Task observation", "Changing conditions"],
    objective: "Describe how a task walk-through can reveal changing hazards",
    ids: [1, 3],
    context:
      "A task description tells you what is intended. Observing the work adds information about people, tools, materials, and nearby activities. A useful conversation asks what could cause harm, who could be exposed, and what might change during the task. A checklist can support that conversation, but it cannot substitute for understanding the actual work.",
    scenario:
      "A crew plans a routine material move. During the walk-through, another crew begins work in the same route. The original briefing did not consider the overlap. The learning opportunity is to recognize that the task's surroundings have changed, rather than assume that a familiar task has familiar conditions.",
    action:
      "Pause the affected activity and involve the responsible team in reassessing the interface. Describe the changed condition specifically, identify who needs to know, and agree how the team will check that the plan still fits. This example does not establish a complete lifting, traffic, or material-handling procedure.",
  },
  {
    id: "choose-controls",
    domain: "1",
    title: "Control the source, not just the symptom.",
    topic: "Control selection",
    subtopics: ["Control selection", "Effectiveness checks"],
    objective:
      "Distinguish changing a hazardous process from relying only on reminders",
    ids: [2, 1],
    context:
      "Different controls rely on different things going right. A process change can remove an exposure; a reminder relies on someone noticing and acting on it. Start by understanding the source and pathway of a hazard before deciding which control could address it. A real selection requires competent, task-specific technical assessment.",
    scenario:
      "A work step repeatedly places people near an avoidable conflict. One suggestion is to add another warning sign. Another is to redesign the sequence so the conflict does not occur. Compare what each option changes and what each still depends on.",
    action:
      "Ask the team to explain how the chosen control addresses the identified exposure and how its effectiveness will be checked. Consider new risks created by the change. These concepts are illustrative; no control is declared adequate for an actual site through this lesson.",
  },
  {
    id: "prepare-emergencies",
    domain: "2",
    title: "Make the response understandable.",
    topic: "Emergency planning",
    subtopics: ["Roles and communication", "Exercises and feedback"],
    objective:
      "Identify the role of clear responsibilities in a usable emergency plan",
    ids: [4, 6],
    context:
      "A plan is useful when people can understand and use it. Site-specific responsibilities, communication arrangements, and access to current information deserve deliberate attention. A long document does not demonstrate that workers know what to do. Emergency arrangements must be developed and reviewed by appropriately responsible personnel.",
    scenario:
      "During a discussion exercise, two people expect the other to make a critical call. The exercise has revealed an ambiguity before an actual event. Treat that observation as input for improving the plan rather than as evidence that running the exercise was enough.",
    action:
      "Record the ambiguity, assign responsibility for resolving it, and communicate the revised arrangement to those affected. Schedule an appropriate follow-up to see whether the confusion was resolved. This lesson is not an emergency-response instruction or a substitute for site-specific training.",
  },
  {
    id: "learn-from-incidents",
    domain: "2",
    title: "Turn an incident into useful learning.",
    topic: "Incident learning",
    subtopics: [
      "Evidence and contributing factors",
      "Corrective-action follow-up",
    ],
    objective:
      "Explain why an investigation should begin with evidence instead of blame",
    ids: [5, 6],
    context:
      "Starting with a predetermined explanation can narrow what an investigation notices. A learning-oriented investigation gathers relevant information and considers how work, conditions, decisions, and arrangements interacted. Responsible investigators must follow applicable procedures and preserve evidence appropriately.",
    scenario:
      "A report labels an event as carelessness before anyone has spoken with the people involved. Ask what information is missing and which contributing factors the label may hide. The purpose of this reflection is to improve questions, not to diagnose an actual event from a short story.",
    action:
      "Separate observations from interpretations. Connect proposed actions to the factors they are meant to address and plan how effectiveness will be checked. A closed report is not, by itself, proof that recurrence risk has decreased.",
  },
  {
    id: "close-corrective-actions",
    domain: "3",
    title: "Make follow-through part of the plan.",
    topic: "Corrective actions",
    subtopics: ["Ownership and due dates", "Verification of effectiveness"],
    objective:
      "Describe the minimum information needed to follow an improvement action",
    ids: [7, 8],
    context:
      "An action without an owner or a clear intended outcome is difficult to follow. A useful record describes the concern, the action, the responsible owner, the agreed time frame, and how effectiveness will be assessed. The appropriate action and urgency depend on the specific risk and responsible roles.",
    scenario:
      "A meeting note says 'improve housekeeping.' Different people understand that instruction differently, and no one knows who will confirm completion. Rewrite the action so the responsible team can understand the condition to address and how they will know the change worked.",
    action:
      "Review whether an action was completed and whether it produced the intended outcome. If the original concern remains, reconsider the action rather than treating a checked box as success. Do not use this demonstration as a replacement for formal risk control or inspection procedures.",
  },
  {
    id: "review-programs",
    domain: "3",
    title: "Look beyond activity counts.",
    topic: "Program review",
    subtopics: ["Meaningful measures", "Shared-work coordination"],
    objective:
      "Compare a count of activities with evidence of an intended safety outcome",
    ids: [8, 9],
    context:
      "Meetings, inspections, and training sessions are activities. Their counts can describe effort but do not alone establish effectiveness. Ask which conditions or exposures the program seeks to improve and what evidence would show a useful change. Measures need context, limitations, and responsible interpretation.",
    scenario:
      "A team reports that it held more coordination meetings. In the shared work area, crews still receive conflicting information. Discuss what the activity count reveals, what it does not reveal, and what additional observations would help the team understand the problem.",
    action:
      "Use relevant observations and worker feedback to examine whether the program is achieving its purpose. Avoid treating a single metric as a complete assessment. This is an introduction to thinking about measures, not a validated program audit method.",
  },
  {
    id: "check-understanding",
    domain: "4",
    title: "Teach for understanding, not attendance.",
    topic: "Training",
    subtopics: ["Knowledge checks", "Practice and feedback"],
    objective:
      "Choose a way to gather evidence of understanding after instruction",
    ids: [10, 12],
    context:
      "Attendance records who was present. They do not demonstrate what someone understood or can apply. An appropriate explanation, question, or safe demonstration can give an instructor information about learning. The form of assessment should fit the learning objective and any applicable competence requirements.",
    scenario:
      "After a presentation, the instructor asks only whether anyone has questions. Nobody speaks. Suggest a respectful way to learn more about understanding without assuming silence means competence. Keep the task safe and within the participants' responsibilities.",
    action:
      "Use specific feedback and an appropriate opportunity to practice. If a misunderstanding appears, revisit it before assuming the skill has transferred to the work. This demonstration lesson cannot establish or certify field competence.",
  },
  {
    id: "listen-and-follow-up",
    domain: "4",
    title: "Make it easier to raise a concern.",
    topic: "Communication",
    subtopics: ["Listening and clarification", "Visible follow-up"],
    objective:
      "Outline a constructive response when a worker raises a safety concern",
    ids: [11, 12],
    context:
      "A reporting conversation can help bring conditions to the attention of people who can address them. Listening, asking for clarification, and explaining the next step make the conversation more useful. The appropriate response and escalation depend on the nature and urgency of the concern.",
    scenario:
      "A newer worker notices a change but is unsure whether to interrupt. A supervisor dismisses the question to keep work moving. Consider what that response communicates and how a clearer response could help the team obtain useful information.",
    action:
      "Thank the person for raising the concern, clarify what was observed, and communicate responsible follow-up. Do not promise an outcome before the concern has been understood. The example illustrates communication only and does not replace an immediate site-specific response to danger.",
  },
];
export const lessons: Lesson[] = seeds.map((s) => ({
  id: s.id,
  version: 1,
  certification: "chst",
  domain: s.domain,
  topic: s.topic,
  title: s.title,
  summary: s.objective + ".",
  subtopics: s.subtopics,
  objectives: [
    s.objective,
    "Apply the idea to an illustrative work scenario",
    "Identify what still requires site-specific technical review",
  ],
  readingMinutes: 6,
  sections: [
    {
      id: "understand",
      title: "Understand the principle",
      paragraphs: [s.context],
      reflection:
        "What would you need to know about your actual work before applying this idea?",
    },
    {
      id: "apply",
      title: "Think through the scenario",
      paragraphs: [s.scenario],
      reflection:
        "What is known, what is assumed, and who should be involved in the next decision?",
    },
    {
      id: "reflect",
      title: "Bring it back to the work",
      paragraphs: [s.action],
      reflection:
        "Name one useful question you could bring to a responsible member of your team.",
    },
  ],
  references: [
    {
      title: "OSHA Recommended Practices for Safety and Health Programs",
      url: "https://www.osha.gov/safety-management",
      section: "Discovery link only. No exact technical section reviewed.",
      verifiedAt: null,
    },
    {
      title: "BCSP CHST certification and blueprint",
      url: "https://www.bcsp.org/construction-health-and-safety-technician-chst/",
      section:
        "Blueprint mapping not independently verified; no official objective code assigned.",
      verifiedAt: null,
    },
  ],
  checks: s.ids.map((n) => {
    const q = demoQuestions[n - 1];
    return {
      id: `check-${q.id}`,
      stem: q.stem,
      choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
      correctChoice: q.correctChoice,
      explanation: q.explanation,
    };
  }),
  questionIds: [...new Set(s.ids.map((n) => demoQuestions[n - 1].id))],
  contentKind: "demonstration",
  reviewStatus: "draft",
  blueprint: { version: "CHST5", objective: null, verified: false },
}));
export const lessonForQuestion = (id: string) =>
  lessons.find((l) => l.questionIds.includes(id));
export const focusedPracticeLink = (lesson: Lesson) =>
  `/practice?domain=${lesson.domain}&topic=${encodeURIComponent(lesson.topic)}&count=1`;
