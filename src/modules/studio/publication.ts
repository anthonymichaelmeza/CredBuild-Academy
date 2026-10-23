import "server-only";
import { connection } from "@/db/client";
import type { Question } from "@/modules/practice/types";
import type { ConnectedLesson } from "@/modules/learning/published-types";

/** Full server snapshots only. Learner routes must apply safe DTOs before delivery. */
export async function listPublishedQuestions(
  includeRetiredForHistory = false,
): Promise<Question[]> {
  const query = (await connection()).query;
  const result = includeRetiredForHistory
    ? await query(
        "SELECT v.data FROM question_versions v WHERE v.content_kind='instructional' AND EXISTS(SELECT 1 FROM studio_audit a WHERE a.revision_id=v.id AND a.event='published') ORDER BY v.question_id,v.version",
      )
    : await query(
        "SELECT v.data FROM published_questions p JOIN question_versions v ON v.id=p.question_version_id ORDER BY p.published_at DESC",
      );
  return result.rows.map((r) => r.data as Question);
}
export async function listPublishedLessons(): Promise<ConnectedLesson[]> {
  return (
    await (
      await connection()
    ).query(
      "SELECT v.data FROM published_lessons p JOIN lesson_versions v ON v.id=p.lesson_version_id ORDER BY p.published_at DESC LIMIT 500",
    )
  ).rows.map((r) => r.data as ConnectedLesson);
}
export async function getPublishedLesson(
  id: string,
  version?: number,
): Promise<ConnectedLesson | null> {
  const query = (await connection()).query;
  const result =
    version === undefined
      ? await query(
          "SELECT v.data FROM published_lessons p JOIN lesson_versions v ON v.id=p.lesson_version_id WHERE p.lesson_id=$1",
          [id],
        )
      : await query(
          "SELECT v.data FROM lesson_versions v WHERE v.lesson_id=$1 AND v.version=$2 AND EXISTS(SELECT 1 FROM studio_audit a WHERE a.revision_id=v.id AND a.event='published')",
          [id, version],
        );
  return result.rows.length ? (result.rows[0].data as ConnectedLesson) : null;
}
