import { requireActor } from "@/modules/identity/auth";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import {
  referenceRegistry,
  referenceRegistryAction,
} from "@/modules/references/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return privateJson(await referenceRegistry(await requireActor()));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const input = await readJson(request, 32_000),
      who = await requireActor();
    limitWrites(`${who.id}:reference-registry`, 60);
    return privateJson(await referenceRegistryAction(who, input));
  } catch (error) {
    return apiError(error);
  }
}
