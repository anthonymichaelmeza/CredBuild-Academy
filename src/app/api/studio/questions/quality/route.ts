import { requireActor } from "@/modules/identity/auth";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import {
  editorialSnapshot,
  recordEditorialDecision,
} from "@/modules/studio/editorial";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return privateJson(await editorialSnapshot(await requireActor()));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const input = await readJson(request, 20000),
      who = await requireActor();
    limitWrites(`${who.id}:editorial`, 60);
    return privateJson(await recordEditorialDecision(who, input));
  } catch (error) {
    return apiError(error);
  }
}
