import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessError, requireActor } from "@/modules/identity/auth";
import { sessionConfigSchema, answerSchema } from "@/modules/practice/engine";
import * as service from "@/modules/practice/service";
export const runtime = "nodejs";
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), config: sessionConfigSchema }),
  z.object({
    action: z.literal("answer"),
    sessionId: z.uuid(),
    input: answerSchema,
  }),
  z.object({ action: z.literal("submit"), sessionId: z.uuid() }),
  z.object({
    action: z.literal("flag"),
    sessionId: z.uuid(),
    questionId: z.string().max(80),
  }),
  z.object({
    action: z.literal("bookmark"),
    sessionId: z.uuid(),
    questionId: z.string().max(80),
    enabled: z.boolean(),
  }),
]);
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const expectedOrigin =
      process.env.APP_ORIGIN ||
      `${url.protocol}//${request.headers.get("host") || url.host}`;
    if (request.headers.get("origin") !== expectedOrigin)
      throw new AccessError("Request origin rejected.", 403);
    if (Number(request.headers.get("content-length") || 0) > 16384)
      throw new AccessError("Request too large.", 413);
    const action = actionSchema.parse(await request.json());
    const who = await requireActor(action.action === "start");
    if (action.action === "start") {
      try {
        return NextResponse.json({
          id: await service.startSession(who, action.config),
        });
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Only "))
          return NextResponse.json({ error: e.message }, { status: 422 });
        throw e;
      }
    }
    if (action.action === "answer")
      return NextResponse.json(
        await service.answer(action.sessionId, who.id, action.input),
      );
    if (action.action === "submit")
      return NextResponse.json(await service.submit(action.sessionId, who.id));
    if (action.action === "flag")
      return NextResponse.json(
        await service.flag(action.sessionId, who.id, action.questionId),
      );
    await service.ownedSession(action.sessionId, who.id);
    return NextResponse.json({
      bookmarks: await service.setBookmark(
        who.id,
        action.questionId,
        action.enabled,
      ),
    });
  } catch (error) {
    if (error instanceof AccessError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        {
          error:
            "Invalid request. Check the session configuration and try again.",
        },
        { status: 400 },
      );
    if (
      error instanceof Error &&
      error.message === "Choose an available answer."
    )
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(
      "Practice operation failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      {
        error:
          "Unable to save progress. Please retry; your last saved answer is retained.",
      },
      { status: 500 },
    );
  }
}
