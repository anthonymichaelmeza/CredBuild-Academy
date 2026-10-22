import { StudyPlanner } from "@/components/study-planner";
import { actor, demoEnabled } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
export const dynamic = "force-dynamic";
export default async function OnboardingPage() {
  const browserOnly = browserDemoEnabled();
  const who = browserOnly ? null : await actor();
  return (
    <StudyPlanner
      key={browserOnly ? "browser" : who?.id || "signed-out"}
      onboarding
      browserOnly={browserOnly}
      available={browserOnly || demoEnabled() || Boolean(who)}
    />
  );
}
