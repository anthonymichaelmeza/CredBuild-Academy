import { AccessError, requireActor } from "@/modules/identity/auth";
import { readJson, privateJson, apiError } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import { practiceActionSchema } from "@/modules/practice/requests";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import * as service from "@/modules/practice/service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (browserDemoEnabled())
    return privateJson(
      {
        error:
          "Browser demo mode does not accept server-side progress. Practice data stays in your browser.",
      },
      { status: 403 },
    );
  try {
    const action = practiceActionSchema.parse(await readJson(request));
    const who = await requireActor(action.action === "start");
    limitWrites(`${who.id}:practice`, 180);
    if (action.action === "start") {
      try {
        return privateJson({
          id: await service.startSession(who, action.config),
        });
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Only "))
          return privateJson({ error: e.message }, { status: 422 });
        throw e;
      }
    }
    if (action.action === "answer")
      return privateJson(
        await service.answer(action.sessionId, who.id, action.input),
      );
    if (action.action === "submit")
      return privateJson(await service.submit(action.sessionId, who.id));
    if (action.action === "flag")
      return privateJson(
        await service.flag(action.sessionId, who.id, action.questionId),
      );
    const session = await service.ownedSession(action.sessionId, who.id);
    if (!session.questionIds.includes(action.questionId))
      throw new AccessError("Question not in this session.", 400);
    return privateJson({
      bookmarks: await service.setBookmark(
        who.id,
        action.questionId,
        action.enabled,
      ),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Choose an available answer."
    )
      return privateJson({ error: error.message }, { status: 400 });
    return apiError(error);
  }
}
