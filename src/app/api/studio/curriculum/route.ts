import { requireActor, AccessError } from "@/modules/identity/auth";
import { privateJson, apiError } from "@/modules/http/requests";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { requireStudioAccess, requireStudioRole } from "@/modules/studio/roles";
import { curriculumManagerSnapshot } from "@/modules/curriculum/manager-service";
import { lessonResearchBriefs } from "@/content/chst/lesson-briefs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    if (browserDemoEnabled())
      throw new AccessError(
        "Curriculum management requires a connected administrator account.",
        403,
      );
    const who = await requireActor();
    requireStudioRole(await requireStudioAccess(who), ["administrator"]);
    const briefId = new URL(request.url).searchParams.get("brief");
    if (briefId) {
      const brief = lessonResearchBriefs.find((item) => item.id === briefId);
      if (!brief)
        throw new AccessError("Lesson research brief not found.", 404);
      return privateJson(brief.draft, {
        headers: {
          "Content-Disposition": `attachment; filename="${brief.id}-SOURCE-BLOCKED.json"`,
        },
      });
    }
    return privateJson(await curriculumManagerSnapshot(who));
  } catch (error) {
    return apiError(error);
  }
}
