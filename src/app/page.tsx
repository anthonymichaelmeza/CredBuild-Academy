import { actor } from "@/modules/identity/auth";
import { history } from "@/modules/practice/service";
import { Dashboard } from "@/components/dashboard";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { BrowserDashboard } from "@/components/browser-demo";
import { readLearning } from "@/modules/learning/service";
import { lessons } from "@/modules/learning/catalog";
import { completedLesson } from "@/modules/learning/progress";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (browserDemoEnabled()) return <BrowserDashboard />;
  const who = await actor();
  const state = who ? (await readLearning(who.id)).state : null;
  const next = lessons.find((l) => !state || !completedLesson(l.id, state));
  return (
    <Dashboard
      sessions={who ? await history(who.id) : []}
      managed={who?.mode === "managed"}
      learning={{
        completed: state
          ? lessons.filter((l) => completedLesson(l.id, state)).length
          : 0,
        title: next?.title || "All representative lessons completed",
        href: next ? `/learn/${next.id}` : "/learn",
      }}
    />
  );
}
