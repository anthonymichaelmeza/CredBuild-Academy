import { z } from "zod";
import { actor, requireActor, AccessError } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { apiError, privateJson, readJson } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import { examActionSchema } from "@/modules/exams/requests";
import * as service from "@/modules/exams/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function connected() {
  if (browserDemoEnabled())
    throw new AccessError(
      "The browser-only demonstration cannot start or save a full-length exam. Existing short rehearsals remain available.",
      403,
    );
}
export async function GET(request: Request) {
  try {
    connected();
    const p = new URL(request.url).searchParams;
    if (p.get("view") === "availability")
      return privateJson(await service.availability(await actor()));
    const who = await requireActor();
    if (p.get("view") === "admin")
      return privateJson(await service.adminSummary(who));
    if (p.get("view") === "history") {
      const before = p.get("before")
        ? z.uuid().parse(p.get("before"))
        : undefined;
      const attempts = await service.history(who.id, before);
      return privateJson({
        attempts,
        nextCursor: attempts.length === 50 ? attempts.at(-1)!.id : null,
      });
    }
    return privateJson(await service.view(z.uuid().parse(p.get("id")), who.id));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    connected();
    const input = examActionSchema.parse(await readJson(request));
    const who = await requireActor(input.action === "start");
    limitWrites(`${who.id}:full-exams`, 240);
    if (input.action === "start")
      return privateJson({ id: await service.start(who, input.requestId) });
    if (input.action === "answer")
      return privateJson(await service.answer(input.sessionId, who.id, input));
    if (input.action === "flag")
      return privateJson(
        await service.flag(
          input.sessionId,
          who.id,
          input.questionId,
          input.enabled,
        ),
      );
    if (input.action === "navigate")
      return privateJson(
        await service.navigate(input.sessionId, who.id, input.index),
      );
    if (input.action === "study_missed")
      return privateJson({
        id: await service.studyMissed(input.sessionId, who),
      });
    return privateJson(await service.submit(input.sessionId, who.id));
  } catch (error) {
    return apiError(error);
  }
}
