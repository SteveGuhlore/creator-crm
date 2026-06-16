import { prisma, ScheduledSendStatus } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

// The SIMULATED send. This is the only place a scheduled send is "delivered" —
// and it NEVER contacts any external platform. It flips the row to
// SENT_SIMULATED and writes an audit entry. That is the entire effect.
//
// SAFETY BOUNDARY: do not add any network/platform call here. Live delivery is
// deferred to a future, deliberately-built adapter.

export interface ProcessResult {
  status: ScheduledSendStatus;
  /** True only when this call performed the simulated transition. */
  transitioned: boolean;
  reason?: string;
}

export interface ProcessCtx {
  actorUserId?: string | null;
  /** Injectable clock for deterministic tests. */
  now?: Date;
}

/**
 * Process one scheduled send by id. Idempotent and safe to call from a worker.
 * Only SCHEDULED sends transition to SENT_SIMULATED; anything else is a no-op
 * (a cancelled or already-sent job must never "send").
 */
export async function processScheduledSend(
  id: string,
  ctx: ProcessCtx = {},
): Promise<ProcessResult> {
  const now = ctx.now ?? new Date();
  const send = await prisma.scheduledSend.findUnique({ where: { id } });

  if (!send) {
    return {
      status: ScheduledSendStatus.FAILED,
      transitioned: false,
      reason: 'not_found',
    };
  }

  if (send.status !== ScheduledSendStatus.SCHEDULED) {
    // Cancelled, draft, already sent, or failed → never (re)send.
    return {
      status: send.status,
      transitioned: false,
      reason: `not_scheduled:${send.status}`,
    };
  }

  const updated = await prisma.scheduledSend.update({
    where: { id },
    data: { status: ScheduledSendStatus.SENT_SIMULATED },
  });

  await writeAudit({
    actorUserId: ctx.actorUserId ?? send.createdBy,
    action: 'SEND_SIMULATED',
    entityType: 'ScheduledSend',
    entityId: id,
    metadata: {
      kind: send.kind,
      platformAccountId: send.platformAccountId,
      simulatedAt: now.toISOString(),
      note: 'No external platform was contacted (simulated send).',
    },
  });

  return { status: updated.status, transitioned: true };
}
