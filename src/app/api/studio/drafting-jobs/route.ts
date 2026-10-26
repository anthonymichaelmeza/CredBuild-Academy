import { requireActor } from "@/modules/identity/auth";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import {
  draftingJobAction,
  draftingJobs,
} from "@/modules/studio/drafting-jobs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return privateJson(
      await draftingJobs(
        await requireActor(),
        Number(new URL(request.url).searchParams.get("page")) || 1,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const input = await readJson(request, 16_384),
      who = await requireActor();
    limitWrites(`${who.id}:drafting-jobs`, 30);
    return privateJson(await draftingJobAction(who, input));
  } catch (error) {
    return apiError(error);
  }
}
