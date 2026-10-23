import { requireActor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import {
  curriculumCoverage,
  triageContentReport,
} from "@/modules/curriculum/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function connected() {
  if (browserDemoEnabled())
    throw new AccessError(
      "Content coverage requires a connected editorial account.",
      403,
    );
}
export async function GET(request: Request) {
  try {
    connected();
    const who = await requireActor();
    const p = new URL(request.url).searchParams;
    return privateJson(
      await curriculumCoverage(who, {
        domain: p.get("domain") || undefined,
        objective: p.get("objective") || undefined,
        status: p.get("status") || undefined,
        search: p.get("search") || undefined,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    connected();
    const who = await requireActor();
    limitWrites(`${who.id}:report-triage`, 30);
    return privateJson(await triageContentReport(who, await readJson(request)));
  } catch (error) {
    return apiError(error);
  }
}
