import Link from "next/link";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { curriculumManagerSnapshot } from "@/modules/curriculum/manager-service";
import { CurriculumManager } from "@/components/curriculum-manager";
import "@/app/curriculum-manager.css";
export const dynamic = "force-dynamic";
function Unavailable({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow">
      <div className="eyebrow">CREDBUILT CURRICULUM MANAGEMENT</div>
      <h1>Curriculum management is protected.</h1>
      <section className="card studio-panel">
        <p>{message}</p>
        <p>
          Curriculum evidence and editorial counts require a connected
          administrator account. Browser demonstrations cannot verify sources or
          approve lessons.
        </p>
        <Link className="button primary" href="/settings">
          Open account settings
        </Link>
      </section>
    </div>
  );
}
export default async function CurriculumManagerPage() {
  if (browserDemoEnabled())
    return (
      <Unavailable message="Browser demonstration mode has no connected editorial database." />
    );
  const who = await actor();
  if (!who)
    return (
      <Unavailable message="Sign in with a connected administrator account." />
    );
  const snapshot = await curriculumManagerSnapshot(who).catch(
    (error: unknown) => {
      if (error instanceof AccessError) return error;
      throw error;
    },
  );
  if (snapshot instanceof AccessError)
    return <Unavailable message={snapshot.message} />;
  return <CurriculumManager initial={snapshot} />;
}
