import Link from "next/link";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { editorialSnapshot } from "@/modules/studio/editorial";
import { QuestionQualityStudio } from "@/components/question-quality-studio";
export const dynamic = "force-dynamic";
function Protected({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">CREDBUILT HUMAN CONTENT REVIEW</div>
      <h1>Editorial review is protected.</h1>
      <section className="card studio-panel">
        <p>{message}</p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
      </section>
    </div>
  );
}
export default async function QuestionQualityPage() {
  if (browserDemoEnabled())
    return (
      <Protected message="The browser demonstration has no connected editorial database or trusted reviewers." />
    );
  const who = await actor();
  if (!who)
    return (
      <Protected message="Sign in with a connected administrator or authorized reviewer account." />
    );
  const snapshot = await editorialSnapshot(who).catch((error: unknown) => {
    if (error instanceof AccessError) return error;
    throw error;
  });
  if (snapshot instanceof AccessError)
    return <Protected message={snapshot.message} />;
  return <QuestionQualityStudio key={who.id} initial={snapshot} />;
}
