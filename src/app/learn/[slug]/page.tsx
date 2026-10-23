import { notFound } from "next/navigation";
import { lessons } from "@/modules/learning/catalog";
import { LessonReader } from "@/components/lesson-reader";
import { PublishedLessonReader } from "@/components/published-lesson-reader";
import { actor } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { getPublishedLesson } from "@/modules/studio/publication";
import { requirePublishedLearner } from "@/modules/practice/service";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (lessons.some((l) => l.id === slug))
    return <LessonReader key={slug} lessonId={slug} />;
  if (browserDemoEnabled()) notFound();
  const who = await actor();
  if (!who)
    return (
      <div className="page-wrap narrow">
        <h1>Sign in to open published instruction.</h1>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
      </div>
    );
  try {
    requirePublishedLearner(who);
  } catch {
    notFound();
  }
  if (!(await getPublishedLesson(slug))) notFound();
  return <PublishedLessonReader key={`${who.id}:${slug}`} lessonId={slug} />;
}
