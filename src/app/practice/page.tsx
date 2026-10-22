import { SessionBuilder } from "@/components/session-builder";
import { actor, demoEnabled } from "@/modules/identity/auth";
export const dynamic = "force-dynamic";
export default async function Practice() {
  return <SessionBuilder available={demoEnabled() || Boolean(await actor())} />;
}
