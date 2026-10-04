import { z } from "zod";

const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const localDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createScheduleRuleSchema = z.object({
  studentId: z.string().uuid(),
  weekday: z.coerce.number().int().min(1).max(7),
  localStart: localTimeSchema,
  durationMinutes: z.coerce.number().int().min(15).max(240),
  effectiveFrom: dateSchema,
  effectiveUntil: z
    .union([dateSchema, z.literal("")])
    .transform((value) => (value === "" ? null : value)),
});

export const endScheduleRuleSchema = z.object({
  ruleId: z.string().uuid(),
  effectiveUntil: dateSchema,
});

export const createAdhocSessionSchema = z.object({
  studentId: z.string().uuid(),
  startsAt: localDateTimeSchema,
  endsAt: localDateTimeSchema,
});

export const rescheduleSessionSchema = z.object({
  sessionId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  startsAt: localDateTimeSchema,
  endsAt: localDateTimeSchema,
});

export const nonbillableSessionSchema = z.object({
  sessionId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  state: z.enum(["student_absent", "teacher_cancelled"]),
  reason: z.string().trim().min(1).max(300),
});
