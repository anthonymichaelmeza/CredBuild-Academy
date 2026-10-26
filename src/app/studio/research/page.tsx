import Link from "next/link";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { researchSnapshot } from "@/modules/research/service";
import { ResearchStudio } from "@/components/research-studio";
import "@/app/research.css";
export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const who = browserDemoEnabled() ? null : await actor();
  const initial = who
    ? await researchSnapshot(who).catch((error: unknown) => {
        if (error instanceof AccessError) return error;
        throw error;
      })
    : null;
  if (!initial || initial instanceof AccessError)
    return (
      <div className="page-wrap narrow">
        <div className="eyebrow">CREDBUILT SOURCE RESEARCH</div>
        <h1>Research administration is protected.</h1>
        <section className="card studio-panel">
          <p>
            {initial instanceof AccessError
              ? initial.message
              : "Use a connected administrator account. The public browser demonstration cannot inspect private source documents, queue retrievals or record source examinations."}
          </p>
          <Link className="button primary" href="/settings">
            Open account settings
          </Link>
        </section>
      </div>
    );
  return <ResearchStudio key={who!.id} initial={initial} />;
}
