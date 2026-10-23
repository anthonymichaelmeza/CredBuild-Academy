import { requireActor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import { reportContentError } from "@/modules/curriculum/service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (browserDemoEnabled())
      throw new AccessError("Content reports need a connected account.", 403);
    const who = await requireActor();
    limitWrites(`${who.id}:content-report`, 10);
    return privateJson(await reportContentError(who, await readJson(request)), {
      status: 201,
    });
  } catch (error) {
    return apiError(error);
  }
}
