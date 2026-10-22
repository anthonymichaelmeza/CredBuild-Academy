import { actor, AccessError, requireActor } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { readJson, privateJson, apiError } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import {
  readProfile,
  profileEvidence,
  saveProfile,
} from "@/modules/planner/service";
import { emptyPlanner } from "@/modules/planner/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function rejectBrowserMode() {
  if (browserDemoEnabled())
    throw new AccessError(
      "Browser demo study preferences stay on this device. Server storage is disabled.",
      403,
    );
}
export async function GET() {
  try {
    rejectBrowserMode();
    const who = await actor();
    if (!who) return privateJson({ ...emptyPlanner, weakDomains: [] });
    const [snapshot, evidence] = await Promise.all([
      readProfile(who.id),
      profileEvidence(who.id),
    ]);
    return privateJson({ ...snapshot, ...evidence });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    rejectBrowserMode();
    const input = await readJson(request);
    const who = await requireActor(true);
    limitWrites(`${who.id}:profile`);
    return privateJson(await saveProfile(who, input));
  } catch (error) {
    return apiError(error);
  }
}
