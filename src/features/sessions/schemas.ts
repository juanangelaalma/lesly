import { z } from "zod";

export const completeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  requestKey: z.string().uuid(),
  topicName: z.string().trim().min(1).max(120),
  understanding: z.enum(["independent", "assisted", "repeat"]),
  note: z.string().trim().max(300),
});

export const updateSessionNoteSchema = z.object({
  noteId: z.string().uuid(),
  sessionId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  topicName: z.string().trim().min(1).max(120),
  understanding: z.enum(["independent", "assisted", "repeat"]),
  note: z.string().trim().max(300),
  reason: z.string().trim().min(1).max(300),
});

export const reopenSessionSchema = z.object({
  sessionId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1).max(300),
});
