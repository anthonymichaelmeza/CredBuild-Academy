import { actor } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { history } from "@/modules/exams/service";
import { FullExamHistory } from "@/components/full-exam-history";

export const dynamic = "force-dynamic";

export default async function ExamHistoryPage() {
  if (browserDemoEnabled()) return <FullExamHistory browserOnly />;
  const who = await actor();
  return (
    <FullExamHistory
      key={who?.id || "signed-out"}
      initial={who ? await history(who.id) : []}
      signedIn={Boolean(who)}
    />
  );
}
