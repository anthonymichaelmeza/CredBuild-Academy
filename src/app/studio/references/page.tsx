import Link from "next/link";
import { actor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { referenceRegistry } from "@/modules/references/service";
import { ReferenceRegistry } from "@/components/reference-registry";
export const dynamic = "force-dynamic";
export default async function ReferencesPage() {
  const who = browserDemoEnabled() ? null : await actor();
  const initial = who
    ? await referenceRegistry(who).catch((error: unknown) => {
        if (error instanceof AccessError) return error;
        throw error;
      })
    : null;
  if (!initial || initial instanceof AccessError)
    return (
      <div className="page-wrap narrow">
        <div className="eyebrow">CREDBUILT REFERENCE REGISTRY</div>
        <h1>Reference administration is protected.</h1>
        <section className="card studio-panel">
          <p>
            {initial instanceof AccessError
              ? initial.message
              : "Use a connected administrator account. Browser demonstration storage cannot record source reviews."}
          </p>
          <Link className="button primary" href="/settings">
            Open account settings
          </Link>
        </section>
      </div>
    );
  return <ReferenceRegistry initial={initial} />;
}
