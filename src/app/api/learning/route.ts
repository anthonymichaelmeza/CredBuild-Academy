import {
  actor,
  demoEnabled,
  requireActor,
  AccessError,
} from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { readJson, privateJson, apiError } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import { readLearning, saveLesson } from "@/modules/learning/service";
import { lessonWriteSchema } from "@/modules/learning/requests";
import { emptyLearning } from "@/modules/learning/progress";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function rejectBrowserDemo() {
  if (browserDemoEnabled())
    throw new AccessError(
      "Browser demonstration progress stays in this browser; server learning storage is disabled.",
      403,
    );
}
export async function GET() {
  try {
    rejectBrowserDemo();
    const who = await actor();
    if (!who && demoEnabled())
      return privateJson({ state: emptyLearning(), revisions: {} });
    if (!who)
      throw new AccessError(
        "Sign in to save lesson progress to your account.",
        401,
      );
    return privateJson(await readLearning(who.id));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    rejectBrowserDemo();
    const input = lessonWriteSchema.parse(await readJson(request));
    const who = await requireActor(true);
    limitWrites(`${who.id}:learning`, 120);
    return privateJson(await saveLesson(who, input));
  } catch (error) {
    return apiError(error);
  }
}
