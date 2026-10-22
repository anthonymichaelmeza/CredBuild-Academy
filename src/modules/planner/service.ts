import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { learnerProfiles, sessions, users } from "@/db/schema";
import { AccessError, type Actor } from "@/modules/identity/auth";
import { lessons } from "@/modules/learning/catalog";
import { completedLesson } from "@/modules/learning/progress";
import { readLearning } from "@/modules/learning/service";
import { pool } from "@/modules/practice/service";
import {
  emptyPlanner,
  plannerActionSchema,
  plannerStateSchema,
  type PlannerSnapshot,
} from "./model";
import {
  generateStudyPlan,
  updatePlanner,
  weakDomainsFromSessions,
} from "./plan";

export async function readProfile(owner: string): Promise<PlannerSnapshot> {
  const orm = await db();
  const [row] = await orm
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.ownerId, owner));
  return row
    ? { state: plannerStateSchema.parse(row.data), revision: row.revision }
    : emptyPlanner;
}
export async function profileEvidence(owner: string) {
  const orm = await db();
  const rows = await orm
    .select()
    .from(sessions)
    .where(eq(sessions.ownerId, owner))
    .orderBy(desc(sessions.createdAt))
    .limit(200);
  return {
    weakDomains: weakDomainsFromSessions(
      rows.map((row) => row.data),
      await pool(),
    ),
  };
}
export async function saveProfile(who: Actor, input: unknown) {
  const action = plannerActionSchema.parse(input);
  const current = await readProfile(who.id);
  if (current.revision !== action.revision)
    throw new AccessError(
      "This study plan changed in another tab. Refresh and try again.",
      409,
    );
  const [learning, evidence] = await Promise.all([
    readLearning(who.id),
    profileEvidence(who.id),
  ]);
  const completed = lessons
    .filter((lesson) => completedLesson(lesson.id, learning.state))
    .map((lesson) => lesson.id);
  if (action.action === "complete") {
    if (
      !current.state ||
      !generateStudyPlan(current.state, completed, evidence.weakDomains).some(
        (day) => day.tasks.some((task) => task.id === action.taskId),
      )
    )
      throw new AccessError(
        "This task is no longer in your current week. Refresh your plan.",
        400,
      );
  }
  let state;
  try {
    state = plannerStateSchema.parse(
      updatePlanner(
        current.state,
        action,
        undefined,
        undefined,
        completed,
        evidence.weakDomains,
      ),
    );
  } catch (error) {
    throw new AccessError(
      error instanceof Error ? error.message : "Check your study preferences.",
      400,
    );
  }
  const orm = await db();
  await orm
    .insert(users)
    .values({ id: who.id, identityMode: who.mode })
    .onConflictDoNothing();
  const revision = current.revision + 1;
  const saved = current.state
    ? await orm
        .update(learnerProfiles)
        .set({ data: state, revision, updatedAt: new Date() })
        .where(
          and(
            eq(learnerProfiles.ownerId, who.id),
            eq(learnerProfiles.revision, current.revision),
          ),
        )
        .returning()
    : await orm
        .insert(learnerProfiles)
        .values({ ownerId: who.id, revision, data: state })
        .onConflictDoNothing()
        .returning();
  if (!saved.length)
    throw new AccessError(
      "This study plan changed in another tab. Refresh and try again.",
      409,
    );
  return { state, revision };
}
