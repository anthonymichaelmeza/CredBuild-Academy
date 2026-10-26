import Link from "next/link";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { questionProductionSummary } from "@/modules/studio/production";
import { QuestionProduction } from "@/components/question-production";
import "@/app/production.css";

export const dynamic = "force-dynamic";

function Unavailable({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">CREDBUILT QUESTION BANK</div>
      <h1>Question production is protected.</h1>
      <section className="card coverage-panel">
        <h2>An authorized administrator account is required.</h2>
        <p>{message}</p>
        <p>
          Production metrics come from the connected editorial database. Public
          demonstration fixtures cannot grant access, approve questions or
          supply live bank counts.
        </p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
      </section>
    </div>
  );
}

export default async function QuestionProductionPage() {
  if (browserDemoEnabled())
    return (
      <Unavailable message="Browser demonstration mode has no connected editorial database or administrator account." />
    );
  const who = await actor();
  if (!who)
    return (
      <Unavailable message="Sign in with a connected administrator account." />
    );
  const summary = await questionProductionSummary(who).catch(
    (error: unknown) => {
      if (error instanceof AccessError) return error;
      throw error;
    },
  );
  if (summary instanceof AccessError)
    return <Unavailable message={summary.message} />;
  return <QuestionProduction summary={summary} />;
}
