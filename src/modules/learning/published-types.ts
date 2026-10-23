/** Full immutable server snapshot. Never pass this object to a client: checks
 * include grading keys. PublishedLessonView is the learner-safe projection. */
export type ConnectedLesson = {
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
    verifiedAt: string | null;
    edition?: string;
  }[];
  checks: {
    id: string;
    stem: string;
    choices: { id: string; text: string }[];
    correctChoice: string;
    explanation: string;
  }[];
  questionIds: string[];
  relatedLessonIds: string[];
  prerequisites: string[];
  media: {
    kind: "image" | "video" | "audio";
    url: string;
    title: string;
    caption?: string;
  }[];
  transcript: string;
  contentKind: "instructional";
  reviewStatus: "approved" | "published";
  blueprint: { version: string; objective: string; verified: true };
};
export type PublishedLessonMetadata = Pick<
  ConnectedLesson,
  | "id"
  | "version"
  | "certification"
  | "domain"
  | "topic"
  | "title"
  | "summary"
  | "readingMinutes"
  | "prerequisites"
>;
export type PublishedLessonView = Omit<ConnectedLesson, "checks"> & {
  checks: Pick<ConnectedLesson["checks"][number], "id" | "stem" | "choices">[];
};
export function publishedLessonMetadata(
  lesson: ConnectedLesson,
): PublishedLessonMetadata {
  return {
    id: lesson.id,
    version: lesson.version,
    certification: lesson.certification,
    domain: lesson.domain,
    topic: lesson.topic,
    title: lesson.title,
    summary: lesson.summary,
    readingMinutes: lesson.readingMinutes,
    prerequisites: [...lesson.prerequisites],
  };
}
export function safePublishedLesson(
  lesson: ConnectedLesson,
): PublishedLessonView {
  return {
    id: lesson.id,
    version: lesson.version,
    certification: lesson.certification,
    domain: lesson.domain,
    topic: lesson.topic,
    title: lesson.title,
    summary: lesson.summary,
    subtopics: [...lesson.subtopics],
    objectives: [...lesson.objectives],
    readingMinutes: lesson.readingMinutes,
    sections: lesson.sections.map((section) => ({
      id: section.id,
      title: section.title,
      paragraphs: [...section.paragraphs],
      reflection: section.reflection,
    })),
    references: lesson.references.map((reference) => ({
      title: reference.title,
      url: reference.url,
      section: reference.section,
      verifiedAt: reference.verifiedAt,
      ...(reference.edition ? { edition: reference.edition } : {}),
    })),
    checks: lesson.checks.map(({ id, stem, choices }) => ({
      id,
      stem,
      choices: choices.map((choice) => ({ id: choice.id, text: choice.text })),
    })),
    questionIds: [...lesson.questionIds],
    relatedLessonIds: [...lesson.relatedLessonIds],
    prerequisites: [...lesson.prerequisites],
    media: lesson.media.map((media) => ({
      kind: media.kind,
      url: media.url,
      title: media.title,
      ...(media.caption ? { caption: media.caption } : {}),
    })),
    transcript: lesson.transcript,
    contentKind: "instructional",
    reviewStatus: lesson.reviewStatus,
    blueprint: {
      version: lesson.blueprint.version,
      objective: lesson.blueprint.objective,
      verified: true,
    },
  };
}
