import { z } from "zod";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid calendar date.");
export const profileSchema = z
  .object({
    certification: z.literal("chst"),
    targetDate: dateOnly.nullable(),
    studyDays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Select at least one study day.")
      .max(7)
      .refine(
        (days) => new Set(days).size === days.length,
        "Study days cannot be repeated.",
      ),
    minutesPerSession: z.number().int().min(10).max(120),
    preference: z.enum(["reading", "practice", "mixed"]),
    priorityDomains: z
      .array(z.enum(["1", "2", "3", "4"]))
      .max(4)
      .refine(
        (domains) => new Set(domains).size === domains.length,
        "Priority domains cannot be repeated.",
      ),
  })
  .strict();
export type LearnerProfile = z.infer<typeof profileSchema>;
export const taskIdSchema = z
  .string()
  .max(150)
  .regex(
    /^\d{4}-\d{2}-\d{2}:(lesson|practice|review):[a-z0-9-]+(?::v[1-9]\d*)?$/,
  );
export const plannerStateSchema = z
  .object({
    version: z.literal(1),
    profile: profileSchema,
    completedTaskIds: z.array(taskIdSchema).max(500),
    onboardedAt: z.iso.datetime(),
    schedule: z
      .object({
        createdOn: dateOnly,
        assignments: z
          .array(
            z
              .object({
                date: dateOnly,
                lessonId: z.string().min(1).max(100),
                lessonVersion: z.number().int().positive(),
                kind: z.enum(["lesson", "review"]),
                reason: z.string().max(400),
              })
              .strict(),
          )
          .max(7),
      })
      .strict()
      .optional(),
  })
  .strict();
export type PlannerState = z.infer<typeof plannerStateSchema>;
export type PlannerSnapshot = { state: PlannerState | null; revision: number };
export const emptyPlanner: PlannerSnapshot = { state: null, revision: 0 };
export const plannerActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("regenerate"),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      action: z.literal("save"),
      profile: profileSchema,
      revision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      action: z.literal("complete"),
      taskId: taskIdSchema,
      completed: z.boolean(),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
]);
export type PlannerAction = z.infer<typeof plannerActionSchema>;
export const defaultProfile: LearnerProfile = {
  certification: "chst",
  targetDate: null,
  studyDays: [1, 3, 5],
  minutesPerSession: 30,
  preference: "mixed",
  priorityDomains: [],
};
export function utcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
export function validateProfile(input: unknown, today = utcDate()) {
  const profile = profileSchema.parse(input);
  if (profile.targetDate && profile.targetDate < today)
    throw new Error(
      "Your target exam date has passed. Choose today or a future date.",
    );
  return profile;
}
