import { z } from 'zod';
import { zScheduledSendKind } from '@/lib/validation/common';

// A send's payload is deterministic content the operator drafts + reviews.
// There is NO AI generation here — just structured text the operator wrote.
export const sendPayloadSchema = z.object({
  // Free-form body the operator drafted (already substituted, or a template ref).
  body: z.string().trim().min(1).max(5000),
  // Optional subject/title (e.g. for a POST).
  title: z.string().trim().max(200).optional(),
  // Optional template id this was drafted from (provenance only).
  templateId: z.string().min(1).optional(),
});
export type SendPayload = z.infer<typeof sendPayloadSchema>;

export const draftCreateSchema = z.object({
  modelId: z.string().min(1),
  platformAccountId: z.string().min(1),
  kind: zScheduledSendKind,
  payload: sendPayloadSchema,
});
export type DraftCreateInput = z.infer<typeof draftCreateSchema>;

export const scheduleSchema = z.object({
  // Must be in the future when scheduling.
  scheduledFor: z.coerce.date(),
});
