import { requireActor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import { requireStudioAccess, requireStudioRole } from "@/modules/studio/roles";
import {
  confirmQuestionBatch,
  previewQuestionBatch,
} from "@/modules/studio/service";
import {
  questionBatchRequest,
  questionImportTemplates,
} from "@/modules/studio/batch-import";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function rejectBrowser() {
  if (browserDemoEnabled())
    throw new AccessError(
      "Question Bank administration requires an authorized connected administrator. Demonstration exams cannot create or publish instructional content.",
      403,
    );
}
export async function GET(request: Request) {
  try {
    rejectBrowser();
    const who = await requireActor();
    requireStudioRole(await requireStudioAccess(who), ["administrator"]);
    const format = new URL(request.url).searchParams.get("template");
    const template = questionImportTemplates();
    if (format === "csv")
      return new Response(template.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="credbuilt-question-bank-template.csv"',
          "Cache-Control": "private, no-store",
          Vary: "Cookie, Authorization",
        },
      });
    if (format === "json")
      return privateJson(JSON.parse(template.json), {
        headers: {
          "Content-Disposition":
            'attachment; filename="credbuilt-question-bank-template.json"',
        },
      });
    throw new AccessError("Choose a CSV or JSON question template.", 400);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    rejectBrowser();
    const input = questionBatchRequest.parse(await readJson(request, 512_000));
    const who = await requireActor();
    requireStudioRole(await requireStudioAccess(who), ["administrator"]);
    limitWrites(`${who.id}:question-bank`, 60);
    if (input.action === "preview")
      return privateJson(
        await previewQuestionBatch(who, input.format, input.text),
      );
    return privateJson(await confirmQuestionBatch(who, input.previewId));
  } catch (error) {
    return apiError(error);
  }
}
