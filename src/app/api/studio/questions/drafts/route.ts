import { requireActor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { apiError, privateJson } from "@/modules/http/requests";
import { requireStudioAccess, requireStudioRole } from "@/modules/studio/roles";
import { domain1Batch001 } from "@/content/chst/domain1-batch-001";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Downloading authoring data never ingests, verifies, or publishes it. */
export async function GET() {
  try {
    if (browserDemoEnabled())
      throw new AccessError(
        "Question drafting requires a connected administrator account.",
        403,
      );
    const who = await requireActor();
    requireStudioRole(await requireStudioAccess(who), ["administrator"]);
    return privateJson(
      domain1Batch001.map(({ id, content, category }) => ({
        id,
        content: { ...content, instructionalCategory: category },
      })),
      {
        headers: {
          "Content-Disposition":
            'attachment; filename="credbuilt-domain1-batch001-unverified-drafts.json"',
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
