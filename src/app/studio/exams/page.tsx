import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { adminSummary } from "@/modules/exams/service";
import { ExamAdmin } from "@/components/exam-admin";

export const dynamic = "force-dynamic";

function Unavailable({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow studio-unavailable">
      <div className="eyebrow">CREDBUILT EXAM ADMINISTRATION</div>
      <h1>
        Exam management is protected<span className="orange">.</span>
      </h1>
      <section className="card coverage-panel">
        <LockKeyhole size={30} aria-hidden="true" />
        <h2>An authorized administrator account is required.</h2>
        <p>{message}</p>
        <p>
          This view reads actual database eligibility, coverage and completed
          examination records. Browser-only demonstration storage cannot supply
          administrative metrics or grant permissions.
        </p>
        <Link className="button secondary" href="/exam">
          Open exam preparation and short rehearsals
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

export default async function ExamAdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  if (browserDemoEnabled())
    return (
      <Unavailable message="Exam administration is unavailable in the browser-only demonstration. No server database is accessed in this mode." />
    );
  const who = await actor();
  if (!who)
    return (
      <Unavailable message="Sign in with a configured managed account that has a trusted administrator role." />
    );
  const summary = await adminSummary(who).catch((error: unknown) => {
    if (error instanceof AccessError) return error;
    throw error;
  });
  if (summary instanceof AccessError)
    return <Unavailable message={summary.message} />;
  const parameters = (await searchParams) || {};
  const domain =
    typeof parameters.domain === "string" &&
    ["1", "2", "3", "4"].includes(parameters.domain)
      ? parameters.domain
      : "all";
  return <ExamAdmin summary={summary} domain={domain} />;
}
