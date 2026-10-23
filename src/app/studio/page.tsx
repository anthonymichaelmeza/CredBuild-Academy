import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { studioSnapshot } from "@/modules/studio/service";
import { ContentStudio } from "@/components/content-studio";
export const dynamic = "force-dynamic";

function Unavailable({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow studio-unavailable">
      <div className="eyebrow">CREDBUILT CONTENT STUDIO</div>
      <h1>
        Editorial access is protected<span className="orange">.</span>
      </h1>
      <section className="card studio-panel">
        <LockKeyhole size={30} />
        <h2>An authorized editorial account is required.</h2>
        <p>{message}</p>
        <p>
          Author, technical-reviewer, and administrator permissions are assigned
          through trusted server administration. This page cannot grant roles.
        </p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
        <p>
          <Link className="text-link" href="/admin">
            View the public content-review inspector
          </Link>
        </p>
      </section>
    </div>
  );
}
export default async function StudioPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  if (browserDemoEnabled())
    return (
      <Unavailable message="The browser-only demonstration has no accounts or server database. Content Studio is unavailable in this mode; no editorial work is stored locally." />
    );
  const who = await actor();
  if (!who)
    return (
      <Unavailable message="Sign in with a configured managed account that has an editorial role." />
    );
  const parameters = (await searchParams) || {};
  const text = (key: string) =>
    typeof parameters[key] === "string"
      ? String(parameters[key]).slice(0, 200)
      : undefined;
  const filters = {
    page: Number(text("page")) || 1,
    search: text("search"),
    status: text("status"),
    domain: text("domain"),
    objective: text("objective"),
    kind: text("kind"),
  };
  const snapshot = await studioSnapshot(who, filters).catch(
    (error: unknown) => {
      if (error instanceof AccessError) return error;
      throw error;
    },
  );
  if (snapshot instanceof AccessError)
    return <Unavailable message={snapshot.message} />;
  return (
    <ContentStudio key={who.id} initial={snapshot} initialFilters={filters} />
  );
}
