import { Academy } from "@/components/academy";
import Link from "next/link";
import { actor } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { requirePublishedLearner } from "@/modules/practice/service";
import { listPublishedLessons } from "@/modules/studio/publication";
import { publishedLessonMetadata } from "@/modules/learning/published-types";
import { readLearning } from "@/modules/learning/service";
export const dynamic = "force-dynamic";
export default async function LearnPage() {
  if (browserDemoEnabled()) return <Academy />;
  const who = await actor();
  let connected = false;
  if (who) {
    try {
      requirePublishedLearner(who);
      connected = true;
    } catch {}
  }
  if (!who || !connected) return <Academy />;
  const [published, progress] = await Promise.all([
    listPublishedLessons(),
    readLearning(who.id),
  ]);
  const metadata = published.map(publishedLessonMetadata);
  return (
    <>
      <section className="page-wrap" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">YOUR CONNECTED LEARNING LIBRARY</div>
        <h2>Published instructional lessons</h2>
        <p>
          Independent technical review attaches to each published revision.
          Completion and practice belong to your learner identity.
        </p>
        {metadata.length ? (
          <div className="lesson-grid">
            {metadata.map((lesson) => {
              const saved = progress.state.progress[lesson.id];
              const done =
                saved?.lessonVersion === lesson.version &&
                Boolean(saved.completedAt);
              const locked = lesson.prerequisites.some(
                (id) => !progress.state.progress[id]?.completedAt,
              );
              return (
                <article className="card academy-lesson" key={lesson.id}>
                  <div className="eyebrow">
                    {lesson.certification.toUpperCase()} · DOMAIN{" "}
                    {lesson.domain} · REVISION {lesson.version}
                  </div>
                  <h3>
                    <Link href={`/learn/${lesson.id}`}>{lesson.title}</Link>
                  </h3>
                  <p>{lesson.summary}</p>
                  <p className="fine-print">
                    {lesson.readingMinutes} min estimated ·{" "}
                    {done
                      ? "Completed"
                      : locked
                        ? "Prerequisite learning required"
                        : saved
                          ? "In progress"
                          : "Ready to begin"}
                  </p>
                  <Link className="text-link" href={`/learn/${lesson.id}`}>
                    {done ? "Revisit lesson" : "Open published lesson"}
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card empty-block">
            <h3>No instructional lessons are published yet.</h3>
            <p>
              The demonstration curriculum below remains available. Unreviewed
              drafts do not enter this library.
            </p>
          </div>
        )}
      </section>
      <Academy />
    </>
  );
}
