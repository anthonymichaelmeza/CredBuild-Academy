import { notFound, redirect } from "next/navigation";
import { actor, AccessError } from "@/modules/identity/auth";
import { view, bookmarkList } from "@/modules/practice/service";
import { PracticeSession } from "@/components/practice-session";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { BrowserSession } from "@/components/browser-demo";
export const dynamic = "force-dynamic";
export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (browserDemoEnabled()) return <BrowserSession id={id} />;
  const who = await actor();
  if (!who) redirect("/settings");
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
