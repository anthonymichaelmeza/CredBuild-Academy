import { z } from "zod";
import { AccessError, requireActor } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import { requirePublishedLearner } from "@/modules/practice/service";
import {
  publishedLessonResource,
  saveLesson,
} from "@/modules/learning/service";
import { lessonWriteSchema } from "@/modules/learning/requests";
import { getPublishedLesson } from "@/modules/studio/publication";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function rejectBrowserDemo() {
  if (browserDemoEnabled())
    throw new AccessError(
      "Published instruction requires a connected account. Browser demonstration progress stays on this device.",
      403,
    );
}
export async function GET(request: Request) {
  try {
    rejectBrowserDemo();
    const who = await requireActor();
    requirePublishedLearner(who);
    const id = z
      .string()
      .min(1)
      .max(100)
      .parse(new URL(request.url).searchParams.get("lessonId"));
    return privateJson(await publishedLessonResource(who, id));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    rejectBrowserDemo();
    const who = await requireActor();
    requirePublishedLearner(who);
    limitWrites(`${who.id}:published-learning`, 120);
    const input = lessonWriteSchema.parse(await readJson(request));
    if (!(await getPublishedLesson(input.lessonId)))
      throw new AccessError("Published lesson not found.", 404);
    await saveLesson(who, input);
    return privateJson(await publishedLessonResource(who, input.lessonId));
  } catch (error) {
    return apiError(error);
  }
}
