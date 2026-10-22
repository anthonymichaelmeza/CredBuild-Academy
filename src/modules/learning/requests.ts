import { z } from "zod";
import { lessonActionSchema } from "./progress";
export const lessonWriteSchema = z
  .object({
    lessonId: z.string().min(1).max(100),
    lessonVersion: z.number().int().positive(),
    revision: z.number().int().nonnegative(),
    action: lessonActionSchema,
  })
  .strict();
export type LessonWrite = z.infer<typeof lessonWriteSchema>;
