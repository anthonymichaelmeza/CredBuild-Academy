import { describe, expect, it } from "vitest";
import { sessionConfigSchema, sessionView } from "@/modules/practice/engine";
import { createBrowserSession } from "@/demo/browser-store";
import {
  safePublishedLesson,
  type ConnectedLesson,
} from "@/modules/learning/published-types";
import { demoQuestions } from "@/demo/questions";
import type { Session, Question } from "@/modules/practice/types";
const question: Question = {
  ...demoQuestions[0],
  contentKind: "instructional",
  reviewStatus: "approved",
  origin: "human_authored",
  questionType: "calculation",
  media: [
    {
      url: "https://media.example.test/original.png",
      alt: "Original test diagram",
      rights: "Test fixture only",
    },
  ],
  solutionSteps: ["A worked solution that must remain hidden."],
};
const session: Session = {
  id: "test-session",
  ownerId: "private-owner",
  questionIds: [question.id],
  questionVersions: { [question.id]: question.version },
  answers: {},
  flags: [],
  mode: "exam",
  status: "in_progress",
  createdAt: "2026-10-23T09:00:00.000Z",
  submittedAt: null,
  revision: 0,
  bank: "published",
};
describe("published learner payload boundaries", () => {
  it("shows reviewed media but withholds worked solutions until examination submission", () => {
    const active = sessionView(session, [question]);
    expect(active.questions[0].media).toEqual(question.media);
    expect(JSON.stringify(active)).not.toContain(question.solutionSteps![0]);
    expect(active.questions[0]).not.toHaveProperty("correctChoice");
    const submitted = sessionView(
      {
        ...session,
        status: "submitted",
        submittedAt: "2026-10-23T09:01:00.000Z",
      },
      [question],
    );
    expect(submitted.feedback[question.id].solutionSteps).toEqual(
      question.solutionSteps,
    );
  });
  it("projects instructional lessons explicitly and hides check keys, explanations and editorial fields", () => {
    const lesson: ConnectedLesson & { privateReview: string } = {
      id: "test-lesson",
      version: 1,
      certification: "test",
      domain: "1",
      topic: "test",
      title: "A fictional isolated fixture",
      summary: "Test-only content",
      subtopics: [],
      objectives: ["Test an action"],
      readingMinutes: 1,
      sections: [
        {
          id: "one",
          title: "Read",
          paragraphs: ["Original test text"],
          reflection: "Consider this",
        },
      ],
      references: [],
      checks: [
        {
          id: "check",
          stem: "Choose",
          choices: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
          ],
          correctChoice: "a",
          explanation: "Private grading explanation",
        },
      ],
      questionIds: [],
      relatedLessonIds: [],
      prerequisites: [],
      media: [],
      transcript: "",
      contentKind: "instructional",
      reviewStatus: "published",
      blueprint: { version: "TEST", objective: "TEST-1", verified: true },
      privateReview: "Do not send review notes to learners",
    };
    const payload = safePublishedLesson(lesson);
    expect(payload.checks[0]).toEqual({
      id: "check",
      stem: "Choose",
      choices: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    });
    expect(JSON.stringify(payload)).not.toContain(
      "Private grading explanation",
    );
    expect(payload).not.toHaveProperty("privateReview");
  });
  it("preserves legacy configuration while blocking published banks in browser-only practice", () => {
    const input = {
      count: 1,
      mode: "learning",
      domain: "all",
      prioritizeMissed: false,
    };
    expect(sessionConfigSchema.parse(input)).not.toHaveProperty("bank");
    expect(() => createBrowserSession({ ...input, bank: "published" })).toThrow(
      "connected account",
    );
  });
});
