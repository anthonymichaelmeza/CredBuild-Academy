import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { users, sessions, questionVersions, bookmarks } from "@/db/schema";
import { AccessError, type Actor } from "@/modules/identity/auth";
import { selectQuestions, sessionView, type Config } from "./engine";
import type { Confidence, Question, Session } from "./types";
import { deadlinePassed, finalize, recordAnswer } from "./lifecycle";
let seeded: Promise<void> | undefined;
async function ready() {
  await (seeded ??= seedDemo());
  return db();
}
export async function pool(): Promise<Question[]> {
  const orm = await ready();
  return (
    await orm
      .select()
      .from(questionVersions)
      .where(
        and(
          eq(questionVersions.certificationId, "chst"),
          eq(questionVersions.contentKind, "demonstration"),
        ),
      )
  ).map((r) => r.data);
}
export async function history(owner: string): Promise<Session[]> {
  const orm = await ready();
  return (
    await orm
      .select()
      .from(sessions)
      .where(eq(sessions.ownerId, owner))
      .orderBy(desc(sessions.createdAt))
      .limit(200)
  ).map((r) => r.data);
}
export async function startSession(who: Actor, config: Config) {
  const orm = await ready();
  const previous = await history(who.id);
  const attempts = [...previous]
    .reverse()
    .filter((s) => s.mode !== "exam" || s.status === "submitted")
    .flatMap((s) =>
      Object.entries(s.answers).map(([questionId, a]) => ({
        questionId,
        ...a,
      })),
    );
  const selected = selectQuestions(await pool(), config, attempts);
  await orm
    .insert(users)
    .values({ id: who.id, identityMode: who.mode })
    .onConflictDoNothing();
  const session: Session = {
    id: randomUUID(),
    ownerId: who.id,
    questionIds: selected.map((q) => q.id),
    answers: {},
    flags: [],
    mode: config.mode,
    status: "in_progress",
    createdAt: new Date().toISOString(),
    submittedAt: null,
    revision: 0,
    ...(config.topic && config.topic !== "all" ? { topic: config.topic } : {}),
    ...(["timed", "exam"].includes(config.mode)
      ? {
          deadlineAt: new Date(
            Date.now() + config.durationSeconds! * 1000,
          ).toISOString(),
        }
      : {}),
  };
  await orm.insert(sessions).values({
    id: session.id,
    ownerId: who.id,
    status: session.status,
    data: session,
  });
  return session.id;
}
export async function ownedSession(id: string, owner: string) {
  const orm = await ready();
  const [row] = await orm
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.ownerId, owner)));
  if (!row) throw new AccessError("Session not found.", 404);
  return row.data;
}
async function save(session: Session) {
  const orm = await ready();
  const revision = session.revision;
  const updated = { ...session, revision: revision + 1 };
  const saved = await orm
    .update(sessions)
    .set({ status: updated.status, revision: updated.revision, data: updated })
    .where(
      and(
        eq(sessions.id, session.id),
        eq(sessions.ownerId, session.ownerId),
        eq(sessions.revision, revision),
      ),
    )
    .returning();
  if (!saved.length)
    throw new AccessError(
      "This session changed in another tab. Refresh and try again.",
      409,
    );
  return sessionView(updated, await pool());
}
export async function view(id: string, owner: string) {
  const session = await ownedSession(id, owner);
  if (deadlinePassed(session)) return save(finalize(session));
  return sessionView(session, await pool());
}
export async function answer(
  id: string,
  owner: string,
  input: {
    questionId: string;
    choiceId: string;
    confidence: Confidence;
    responseMs: number;
  },
) {
  const session = await ownedSession(id, owner);
  if (session.status !== "in_progress")
    throw new AccessError("Session already submitted.", 409);
  if (!session.questionIds.includes(input.questionId))
    throw new AccessError("Question not in this session.", 400);
  const updated = recordAnswer(session, await pool(), input);
  if (updated === session) return sessionView(session, await pool());
  return save(updated);
}
export async function submit(id: string, owner: string) {
  const s = await ownedSession(id, owner);
  if (s.status === "submitted") return sessionView(s, await pool());
  return save(finalize(s));
}
export async function flag(id: string, owner: string, questionId: string) {
  const s = await ownedSession(id, owner);
  if (deadlinePassed(s)) return save(finalize(s));
  if (s.status !== "in_progress" || !s.questionIds.includes(questionId))
    throw new AccessError("Cannot flag this question.", 400);
  s.flags = s.flags.includes(questionId)
    ? s.flags.filter((id) => id !== questionId)
    : [...s.flags, questionId];
  return save(s);
}
export async function bookmarkList(owner: string) {
  const orm = await ready();
  return (
    await orm.select().from(bookmarks).where(eq(bookmarks.ownerId, owner))
  ).map((b) => b.questionId);
}
export async function setBookmark(
  owner: string,
  questionId: string,
  enabled: boolean,
) {
  const orm = await ready();
  if (!(await pool()).some((q) => q.id === questionId))
    throw new AccessError("Unknown question.", 400);
  if (enabled)
    await orm
      .insert(bookmarks)
      .values({ ownerId: owner, questionId })
      .onConflictDoNothing();
  else
    await orm
      .delete(bookmarks)
      .where(
        and(eq(bookmarks.ownerId, owner), eq(bookmarks.questionId, questionId)),
      );
  return bookmarkList(owner);
}
