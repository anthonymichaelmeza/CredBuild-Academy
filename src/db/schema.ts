import {
  pgTable,
  text,
  integer,
  boolean,
  unique,
  timestamp,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { Question, Session } from "@/modules/practice/types";
import type { Lesson } from "@/modules/learning/catalog";
import type { LessonProgress } from "@/modules/learning/progress";
import type { PlannerState } from "@/modules/planner/model";
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  identityMode: text("identity_mode").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const certifications = pgTable("certifications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
});
export const questionVersions = pgTable("question_versions", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull(),
  version: integer("version").notNull(),
  certificationId: text("certification_id")
    .notNull()
    .references(() => certifications.id),
  domain: text("domain").notNull(),
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull(),
  contentKind: text("content_kind").notNull(),
  origin: text("origin").notNull(),
  reviewStatus: text("review_status").notNull(),
  authorId: text("author_id").notNull(),
  reviewerId: text("reviewer_id"),
  data: jsonb("data").$type<Question>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const sessions = pgTable("learning_sessions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull(),
  revision: integer("revision").notNull().default(0),
  data: jsonb("data").$type<Session>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
/** Trusted provenance and idempotency for full exams, sharing learner session history. */
export const fullExamAttempts = pgTable(
  "full_exam_attempts",
  {
    sessionId: text("session_id")
      .primaryKey()
      .references(() => sessions.id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    requestKey: text("request_key").notNull(),
    policyVersion: text("policy_version").notNull(),
    developmentFixture: boolean("development_fixture").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.ownerId, table.requestKey)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    questionId: text("question_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.questionId] })],
);

export const lessonVersions = pgTable("lesson_versions", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull(),
  version: integer("version").notNull(),
  certificationId: text("certification_id")
    .notNull()
    .references(() => certifications.id),
  blueprintRevisionId: text("blueprint_revision_id").notNull(),
  domain: text("domain").notNull(),
  topic: text("topic").notNull(),
  subtopics: jsonb("subtopics").$type<string[]>().notNull(),
  objectiveCodes: jsonb("objective_codes").$type<string[]>().notNull(),
  contentKind: text("content_kind").notNull(),
  reviewStatus: text("review_status").notNull(),
  data: jsonb("data").$type<Lesson>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    lessonVersionId: text("lesson_version_id")
      .notNull()
      .references(() => lessonVersions.id),
    revision: integer("revision").notNull().default(0),
    data: jsonb("data").$type<LessonProgress>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.lessonVersionId] })],
);
export const learnerProfiles = pgTable("learner_profiles", {
  ownerId: text("owner_id")
    .primaryKey()
    .references(() => users.id),
  revision: integer("revision").notNull().default(0),
  data: jsonb("data").$type<PlannerState>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const editorialRoles = pgTable(
  "editorial_roles",
  {
    subjectId: text("subject_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    grantedBy: text("granted_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.subjectId, t.role] })],
);
export const studioContent = pgTable("studio_content", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  certificationId: text("certification_id")
    .notNull()
    .references(() => certifications.id),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  currentRevision: integer("current_revision").notNull(),
  rowVersion: integer("row_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const studioRevisions = pgTable("studio_revisions", {
  id: text("id").primaryKey(),
  contentId: text("content_id")
    .notNull()
    .references(() => studioContent.id),
  revision: integer("revision").notNull(),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const publishedLessons = pgTable("published_lessons", {
  lessonId: text("lesson_id").primaryKey(),
  lessonVersionId: text("lesson_version_id")
    .notNull()
    .references(() => lessonVersions.id),
  publishedBy: text("published_by").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const curriculumDocuments = pgTable("curriculum_documents", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  version: text("version").notNull(),
  filename: text("filename").notNull(),
  sha256: text("sha256").notNull(),
  pages: integer("pages").notNull(),
  provenance: text("provenance").notNull(),
  data: jsonb("data").notNull(),
});
export const curriculumObjectives = pgTable("curriculum_objectives", {
  id: text("id").primaryKey(),
  certificationId: text("certification_id")
    .notNull()
    .references(() => certifications.id),
  blueprintRevisionId: text("blueprint_revision_id").notNull(),
  documentId: text("document_id")
    .notNull()
    .references(() => curriculumDocuments.id),
  domain: text("domain").notNull(),
  kind: text("kind").notNull(),
  officialNumber: integer("official_number").notNull(),
  statement: text("statement").notNull(),
  page: integer("page").notNull(),
});
export const referencePublications = pgTable("reference_publications", {
  id: text("id").primaryKey(),
  documentId: text("document_id").references(() => curriculumDocuments.id),
  title: text("title").notNull(),
  edition: text("edition").notNull(),
  classification: text("classification").notNull(),
  url: text("url"),
  data: jsonb("data").notNull(),
});
export const studioSourceVerifications = pgTable(
  "studio_source_verifications",
  {
    id: text("id").primaryKey(),
    revisionId: text("revision_id")
      .notNull()
      .references(() => studioRevisions.id),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => users.id),
    decision: text("decision").notNull(),
    findings: text("findings").notNull(),
    sourceChecks: jsonb("source_checks").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);
export const contentErrorReports = pgTable("content_error_reports", {
  id: text("id").primaryKey(),
  contentId: text("content_id")
    .notNull()
    .references(() => studioContent.id),
  revisionId: text("revision_id")
    .notNull()
    .references(() => studioRevisions.id),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id),
  category: text("category").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
