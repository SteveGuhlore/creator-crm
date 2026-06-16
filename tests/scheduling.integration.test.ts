import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, Platform, ScheduledSendStatus } from '@/lib/db';
import {
  createDraft,
  scheduleSend,
  rescheduleSend,
  cancelSend,
  processScheduledSend,
  type SendQueue,
} from '@/lib/scheduling';
import { dbAvailable, resetDb } from './db-helper';

// Full scheduled-send lifecycle against the DB, using a FAKE queue (no Redis):
// draft → schedule → simulated send → audit, plus cancel/reschedule and the
// guardrail that a cancelled/sent job never (re)sends.
const ready = await dbAvailable();
const d = ready ? describe : describe.skip;

class FakeQueue implements SendQueue {
  enqueued: Array<{ sendId: string; delayMs: number }> = [];
  cancelled: string[] = [];
  async enqueue(sendId: string, delayMs: number) {
    this.enqueued.push({ sendId, delayMs });
  }
  async cancel(sendId: string) {
    this.cancelled.push(sendId);
  }
}

d('scheduled-send lifecycle (DB, fake queue)', () => {
  let modelId: string;
  let accountId: string;
  let userId: string;
  const NOW = new Date('2026-06-16T00:00:00.000Z');
  const FUTURE = new Date('2026-06-16T01:00:00.000Z');

  beforeAll(async () => {
    await resetDb();
    const user = await prisma.user.create({
      data: { email: 'sched-tester@local', passwordHash: 'x' },
    });
    userId = user.id;
    const model = await prisma.model.create({
      data: { id: 'sched-test-model', displayName: 'Sched Test' },
    });
    modelId = model.id;
    const account = await prisma.platformAccount.create({
      data: { modelId, platform: Platform.ONLYFANS, handle: 'sched_test' },
    });
    accountId = account.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  let queue: FakeQueue;
  beforeEach(() => {
    queue = new FakeQueue();
  });

  async function newDraft() {
    return createDraft(
      {
        modelId,
        platformAccountId: accountId,
        kind: 'DM',
        payload: { body: 'Hello {{fanName}}, thanks!' },
      },
      { actorUserId: userId },
    );
  }

  it('creates a DRAFT with an audit entry', async () => {
    const draft = await newDraft();
    expect(draft.status).toBe(ScheduledSendStatus.DRAFT);
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'ScheduledSend',
        entityId: draft.id,
        action: 'CREATE',
      },
    });
    expect(audit).not.toBeNull();
  });

  it('schedules a draft for the future and enqueues a delayed job', async () => {
    const draft = await newDraft();
    const scheduled = await scheduleSend(draft.id, FUTURE, {
      queue,
      now: NOW,
      actorUserId: userId,
    });
    expect(scheduled.status).toBe(ScheduledSendStatus.SCHEDULED);
    expect(scheduled.scheduledFor?.toISOString()).toBe(FUTURE.toISOString());
    expect(queue.enqueued).toHaveLength(1);
    expect(queue.enqueued[0]!.delayMs).toBe(60 * 60 * 1000);
  });

  it('rejects scheduling in the past', async () => {
    const draft = await newDraft();
    await expect(
      scheduleSend(draft.id, new Date('2020-01-01T00:00:00.000Z'), {
        queue,
        now: NOW,
      }),
    ).rejects.toThrow(/future/);
  });

  it('processes a SCHEDULED send into SENT_SIMULATED with an audit entry', async () => {
    const draft = await newDraft();
    await scheduleSend(draft.id, FUTURE, { queue, now: NOW });
    const result = await processScheduledSend(draft.id, { now: FUTURE });
    expect(result.transitioned).toBe(true);
    expect(result.status).toBe(ScheduledSendStatus.SENT_SIMULATED);

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'ScheduledSend',
        entityId: draft.id,
        action: 'SEND_SIMULATED',
      },
    });
    expect(audit).not.toBeNull();
    // The audit metadata records that NO external platform was contacted.
    expect(JSON.stringify(audit?.metadata)).toContain('simulated');
  });

  it('is idempotent — processing an already-sent job is a no-op', async () => {
    const draft = await newDraft();
    await scheduleSend(draft.id, FUTURE, { queue, now: NOW });
    await processScheduledSend(draft.id, { now: FUTURE });
    const second = await processScheduledSend(draft.id, { now: FUTURE });
    expect(second.transitioned).toBe(false);
    const sends = await prisma.auditLog.count({
      where: { entityId: draft.id, action: 'SEND_SIMULATED' },
    });
    expect(sends).toBe(1);
  });

  it('cancels a scheduled send; a cancelled send never sends', async () => {
    const draft = await newDraft();
    await scheduleSend(draft.id, FUTURE, { queue, now: NOW });
    const cancelled = await cancelSend(draft.id, { queue });
    expect(cancelled.status).toBe(ScheduledSendStatus.CANCELLED);
    expect(queue.cancelled).toContain(draft.id);

    const result = await processScheduledSend(draft.id, { now: FUTURE });
    expect(result.transitioned).toBe(false);
    expect(result.status).toBe(ScheduledSendStatus.CANCELLED);
  });

  it('reschedules a scheduled send to a new future time', async () => {
    const draft = await newDraft();
    await scheduleSend(draft.id, FUTURE, { queue, now: NOW });
    const later = new Date('2026-06-16T02:00:00.000Z');
    const r = await rescheduleSend(draft.id, later, { queue, now: NOW });
    expect(r.scheduledFor?.toISOString()).toBe(later.toISOString());
    // reschedule cancels the prior job before re-enqueuing.
    expect(queue.cancelled).toContain(draft.id);
  });

  it('cannot cancel an already-sent send', async () => {
    const draft = await newDraft();
    await scheduleSend(draft.id, FUTURE, { queue, now: NOW });
    await processScheduledSend(draft.id, { now: FUTURE });
    await expect(cancelSend(draft.id, { queue })).rejects.toThrow();
  });
});
