import { notFound } from "next/navigation";
import { lessons } from "@/modules/learning/catalog";
import { LessonReader } from "@/components/lesson-reader";
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!lessons.some((l) => l.id === slug)) notFound();
  return <LessonReader key={slug} lessonId={slug} />;
}
