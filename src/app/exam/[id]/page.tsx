import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { view } from "@/modules/exams/service";
import { FullExamSession } from "@/components/full-exam-session";

export const dynamic = "force-dynamic";

export default async function FullExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  if (browserDemoEnabled())
    return (
      <div className="page-wrap narrow">
        <h1>A connected account is required</h1>
        <section className="card">
          <p>
            Full-length examination records are stored on the server and are
            unavailable in the browser-only demonstration.
          </p>
          <Link className="button primary" href="/exam">
            Return to Exam Simulator
          </Link>
        </section>
      </div>
    );
  const who = await actor();
  if (!who) redirect("/settings");
  const initial = await view(id, who.id).catch((error: unknown) => {
    if (error instanceof AccessError && error.status === 404) notFound();
    throw error;
  });
  return <FullExamSession key={`${who.id}:${id}`} initial={initial} />;
}
