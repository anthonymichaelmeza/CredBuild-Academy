import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { view } from "@/modules/exams/service";
import { FullExamSession } from "@/components/full-exam-session";
import { BrowserFullExam } from "@/components/browser-full-exam";

export const dynamic = "force-dynamic";

export default async function FullExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  if (browserDemoEnabled()) return <BrowserFullExam key={id} id={id} />;
  const who = await actor();
  if (!who) redirect("/settings");
  const initial = await view(id, who.id).catch((error: unknown) => {
    if (error instanceof AccessError && error.status === 404) notFound();
    throw error;
  });
  return <FullExamSession key={`${who.id}:${id}`} initial={initial} />;
}
