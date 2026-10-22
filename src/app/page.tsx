import { actor } from "@/modules/identity/auth";
import { history } from "@/modules/practice/service";
import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default async function Page() {
  const who = await actor();
  return <Dashboard sessions={who ? await history(who.id) : []} />;
}
