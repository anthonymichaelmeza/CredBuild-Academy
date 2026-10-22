import { SessionBuilder } from "@/components/session-builder";
import { actor, demoEnabled } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
export const dynamic = "force-dynamic";
export default async function Practice() {
  if (browserDemoEnabled()) return <SessionBuilder available browserOnly />;
  return <SessionBuilder available={demoEnabled() || Boolean(await actor())} />;
}
