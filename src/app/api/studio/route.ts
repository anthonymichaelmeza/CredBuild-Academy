import { requireActor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import {
  studioSnapshot,
  readStudio,
  studioAction,
  requireStudioAccess,
} from "@/modules/studio/service";
import { questionTemplate } from "@/modules/studio/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function rejectBrowser() {
  if (browserDemoEnabled())
    throw new AccessError(
      "Content Studio is unavailable in browser demonstration mode. A connected account and trusted editorial role are required.",
      403,
    );
}
export async function GET(request: Request) {
  try {
    rejectBrowser();
    const who = await requireActor();
    const url = new URL(request.url);
    if (url.searchParams.get("template") === "questions") {
      await requireStudioAccess(who);
      return privateJson([questionTemplate], {
        headers: {
          "Content-Disposition":
            'attachment; filename="credbuilt-question-import-template.json"',
        },
      });
    }
    const id = url.searchParams.get("id");
    if (id) return privateJson(await readStudio(who, id.slice(0, 100)));
    return privateJson(
      await studioSnapshot(who, {
        page: Number(url.searchParams.get("page")) || 1,
        search: url.searchParams.get("search") || undefined,
        status: url.searchParams.get("status") || undefined,
        domain: url.searchParams.get("domain") || undefined,
        objective: url.searchParams.get("objective") || undefined,
        kind: url.searchParams.get("kind") || undefined,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    rejectBrowser();
    const input = await readJson(request, 512_000);
    const who = await requireActor();
    limitWrites(`${who.id}:studio`, 60);
    return privateJson(await studioAction(who, input));
  } catch (error) {
    return apiError(error);
  }
}
