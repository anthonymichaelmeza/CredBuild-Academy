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
export default async function StudioPage() {
  if (browserDemoEnabled())
    return (
      <Unavailable message="The browser-only demonstration has no accounts or server database. Content Studio is unavailable in this mode; no editorial work is stored locally." />
    );
  const who = await actor();
  if (!who)
    return (
      <Unavailable message="Sign in with a configured managed account that has an editorial role." />
    );
  const snapshot = await studioSnapshot(who).catch((error: unknown) => {
    if (error instanceof AccessError) return error;
    throw error;
  });
  if (snapshot instanceof AccessError)
    return <Unavailable message={snapshot.message} />;
  return <ContentStudio key={who.id} initial={snapshot} />;
}
