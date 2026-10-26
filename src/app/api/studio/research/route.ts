import { requireActor, AccessError } from "@/modules/identity/auth";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { researchAction, researchSnapshot } from "@/modules/research/service";
import { RESEARCH_JSON_MAX_BYTES } from "@/modules/research/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function connected() {
  if (browserDemoEnabled())
    throw new AccessError(
      "Research administration requires a connected administrator; browser demonstrations cannot index or verify sources.",
      403,
    );
}
export async function GET(request: Request) {
  try {
    connected();
    const url = new URL(request.url);
    return privateJson(
      await researchSnapshot(await requireActor(), {
        search: url.searchParams.get("search") || undefined,
        status: url.searchParams.get("status") || undefined,
        page: Number(url.searchParams.get("page")) || 1,
        sourceId: url.searchParams.get("sourceId") || undefined,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    connected();
    const input = await readJson(request, RESEARCH_JSON_MAX_BYTES),
      who = await requireActor();
    limitWrites(`${who.id}:research`, 60);
    return privateJson(await researchAction(who, input));
  } catch (error) {
    return apiError(error);
  }
}
