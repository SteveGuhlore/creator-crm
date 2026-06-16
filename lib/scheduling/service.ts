import { prisma, ScheduledSendStatus, type Prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import {
  draftCreateSchema,
  scheduleSchema,
  type DraftCreateInput,
} from './schema';
import { noopQueue, type SendQueue } from './queue';

// Draft-then-review composer + scheduled-send lifecycle. "Sending" is always
// simulated (see process.ts). Review-then-send only: a draft never auto-sends;
// the operator must explicitly schedule (or send-now) it.

export interface SendServiceCtx {
  actorUserId?: string | null;
  /** Defaults to a no-op queue so the DB lifecycle works without Redis. */
  queue?: SendQueue;
  now?: Date;
}

/** Create a DRAFT scheduled send (the composer's save action). */
export async function createDraft(
  input: DraftCreateInput,
  ctx: SendServiceCtx = {},
) {
  const data = draftCreateSchema.parse(input);
  const createdBy = ctx.actorUserId ?? 'system';

  const draft = await prisma.scheduledSend.create({
    data: {
      modelId: data.modelId,
      platformAccountId: data.platformAccountId,
      kind: data.kind,
      payload: data.payload as unknown as Prisma.InputJsonValue,
      status: ScheduledSendStatus.DRAFT,
      createdBy,
    },
  });

  await writeAudit({
    actorUserId: ctx.actorUserId,
    action: 'CREATE',
    entityType: 'ScheduledSend',
    entityId: draft.id,
    metadata: { kind: draft.kind, status: draft.status },
  });

  return draft;
}

/** Move a DRAFT (or already-SCHEDULED) send to SCHEDULED for a future time. */
export async function scheduleSend(
  id: string,
  when: Date | string,
  ctx: SendServiceCtx = {},
) {
  const { scheduledFor } = scheduleSchema.parse({ scheduledFor: when });
  const now = ctx.now ?? new Date();
  if (scheduledFor.getTime() <= now.getTime()) {
    throw new Error('scheduledFor must be in the future');
  }

  const existing = await prisma.scheduledSend.findUnique({ where: { id } });
  if (!existing) throw new Error(`ScheduledSend ${id} not found`);
  if (
    existing.status !== ScheduledSendStatus.DRAFT &&
    existing.status !== ScheduledSendStatus.SCHEDULED
  ) {
    throw new Error(`Cannot schedule a send in status ${existing.status}`);
  }

  const updated = await prisma.scheduledSend.update({
    where: { id },
    data: { status: ScheduledSendStatus.SCHEDULED, scheduledFor },
  });

  const queue = ctx.queue ?? noopQueue;
  await queue.cancel(id); // clear any prior job before (re)enqueuing
  await queue.enqueue(id, scheduledFor.getTime() - now.getTime());

  await writeAudit({
    actorUserId: ctx.actorUserId,
    action: 'SCHEDULE',
    entityType: 'ScheduledSend',
    entityId: id,
    metadata: { scheduledFor: scheduledFor.toISOString() },
  });

  return updated;
}

/** Reschedule an existing SCHEDULED send to a new future time. */
export async function rescheduleSend(
  id: string,
  when: Date | string,
  ctx: SendServiceCtx = {},
) {
  return scheduleSend(id, when, ctx);
}

/** Cancel a DRAFT or SCHEDULED send. A cancelled send can never be processed. */
export async function cancelSend(id: string, ctx: SendServiceCtx = {}) {
  const existing = await prisma.scheduledSend.findUnique({ where: { id } });
  if (!existing) throw new Error(`ScheduledSend ${id} not found`);
  if (
    existing.status === ScheduledSendStatus.SENT_SIMULATED ||
    existing.status === ScheduledSendStatus.CANCELLED
  ) {
    throw new Error(`Cannot cancel a send in status ${existing.status}`);
  }

  const updated = await prisma.scheduledSend.update({
    where: { id },
    data: { status: ScheduledSendStatus.CANCELLED },
  });

  const queue = ctx.queue ?? noopQueue;
  await queue.cancel(id);

  await writeAudit({
    actorUserId: ctx.actorUserId,
    action: 'CANCEL',
    entityType: 'ScheduledSend',
    entityId: id,
    metadata: { previousStatus: existing.status },
  });

  return updated;
}

export async function listScheduledSends(modelId: string) {
  return prisma.scheduledSend.findMany({
    where: { modelId },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function getScheduledSend(id: string) {
  return prisma.scheduledSend.findUnique({ where: { id } });
}
