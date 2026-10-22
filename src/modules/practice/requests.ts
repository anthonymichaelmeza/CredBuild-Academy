import { z } from "zod";
import { sessionConfigSchema, answerSchema } from "./engine";

export const practiceActionSchema = z.discriminatedUnion("action", [
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
