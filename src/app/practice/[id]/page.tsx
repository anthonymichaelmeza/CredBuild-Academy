import { notFound, redirect } from "next/navigation";
import { actor, AccessError } from "@/modules/identity/auth";
import { view, bookmarkList } from "@/modules/practice/service";
import { PracticeSession } from "@/components/practice-session";
export const dynamic = "force-dynamic";
export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const who = await actor();
  if (!who) redirect("/settings");
  const { id } = await params;
  const initial = await view(id, who.id).catch((e) => {
    if (e instanceof AccessError && e.status === 404) notFound();
    throw e;
  });
  return (
    <PracticeSession
      initial={initial}
      initialBookmarks={await bookmarkList(who.id)}
    />
  );
}
