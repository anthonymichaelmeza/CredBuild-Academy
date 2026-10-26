import { z } from "zod";
const sessionId = z.uuid();
const questionId = z.string().min(1).max(80);
export const examActionSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("start"), requestId: z.uuid().optional() })
    .strict(),
  z
    .object({
      action: z.literal("answer"),
      sessionId,
      questionId,
      choiceId: z.string().min(1).max(20),
      responseMs: z.number().int().min(0).max(86_400_000),
    })
    .strict(),
  z
    .object({
      action: z.literal("flag"),
      sessionId,
      questionId,
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("navigate"),
      sessionId,
      index: z.number().int().min(0).max(199),
    })
    .strict(),
  z.object({ action: z.literal("submit"), sessionId }).strict(),
  z.object({ action: z.literal("study_missed"), sessionId }).strict(),
]);
