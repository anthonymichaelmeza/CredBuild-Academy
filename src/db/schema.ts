import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { Question, Session } from "@/modules/practice/types";
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
