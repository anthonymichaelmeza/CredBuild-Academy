import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessError, requireActor } from "@/modules/identity/auth";
import { practiceActionSchema } from "@/modules/practice/requests";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import * as service from "@/modules/practice/service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (browserDemoEnabled())
    return NextResponse.json(
      {
        error:
          "Browser demo mode does not accept server-side progress. Practice data stays in your browser.",
      },
      { status: 403 },
    );
  try {
    const url = new URL(request.url);
    const expectedOrigin =
      process.env.APP_ORIGIN ||
      `${url.protocol}//${request.headers.get("host") || url.host}`;
    if (request.headers.get("origin") !== expectedOrigin)
      throw new AccessError("Request origin rejected.", 403);
    if (Number(request.headers.get("content-length") || 0) > 16384)
      throw new AccessError("Request too large.", 413);
    const action = practiceActionSchema.parse(await request.json());
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
