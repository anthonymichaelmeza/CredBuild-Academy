import Link from "next/link";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { curriculumCoverage } from "@/modules/curriculum/service";
import { CurriculumCoverageDashboard } from "@/components/curriculum-coverage";
export const dynamic = "force-dynamic";
function Unavailable({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">CREDBUILT CONTENT STUDIO</div>
      <h1>
        Coverage access is protected<span className="orange">.</span>
      </h1>
      <section className="card coverage-panel">
        <h2>An authorized reviewer or administrator is required.</h2>
        <p>{message}</p>
        <p>
          The browser-only demonstration has no editorial database and cannot
          supply live editorial metrics or report triage.
        </p>
        <Link className="button secondary" href="/curriculum">
          Explore the public CHST5 study map
        </Link>
        <p>
          <Link className="text-link" href="/settings">
            Open account settings
          </Link>
        </p>
      </section>
    </div>
  );
}
export default async function CoveragePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  if (browserDemoEnabled())
    return (
      <Unavailable message="Connected editorial access is unavailable in browser demonstration mode." />
    );
  const who = await actor();
  if (!who)
    return (
      <Unavailable message="Sign in with a configured account and trusted editorial role." />
    );
  const parameters = (await searchParams) || {};
  const value = (key: string) =>
    typeof parameters[key] === "string"
      ? String(parameters[key]).slice(0, 200)
      : undefined;
  const initial = await curriculumCoverage(who, {
    domain: value("domain"),
    objective: value("objective"),
    status: value("status"),
    search: value("search"),
  }).catch((error: unknown) => {
    if (error instanceof AccessError) return error;
    throw error;
  });
  if (initial instanceof AccessError)
    return <Unavailable message={initial.message} />;
  return <CurriculumCoverageDashboard key={who.id} initial={initial} />;
}
