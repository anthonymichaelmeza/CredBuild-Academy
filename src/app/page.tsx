import { actor } from "@/modules/identity/auth";
import { history } from "@/modules/practice/service";
import { Dashboard } from "@/components/dashboard";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { BrowserDashboard } from "@/components/browser-demo";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (browserDemoEnabled()) return <BrowserDashboard />;
  const who = await actor();
  return <Dashboard sessions={who ? await history(who.id) : []} />;
}
