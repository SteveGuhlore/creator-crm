// Queue abstraction for scheduled sends. The service depends on this small
// interface so its DB lifecycle is testable WITHOUT Redis/BullMQ. The BullMQ
// implementation is constructed lazily and only when actually used (the worker
// process and the real server action), never at import time / in unit tests.

export const SEND_QUEUE_NAME = 'scheduled-sends';

export interface SendQueue {
  /** Enqueue a delayed job to process `sendId` after `delayMs`. */
  enqueue(sendId: string, delayMs: number): Promise<void>;
  /** Remove a pending job for `sendId` (used on cancel/reschedule). */
  cancel(sendId: string): Promise<void>;
}

/** No-op queue: lifecycle works without any worker (sends stay SCHEDULED until
 *  processed manually or by a running worker). Default in tests. */
export const noopQueue: SendQueue = {
  async enqueue() {},
  async cancel() {},
};

let bullQueue: SendQueue | null = null;

/**
 * Lazily build a BullMQ-backed queue from REDIS_URL. Imported dynamically so
 * test/build environments never need ioredis/bullmq connected.
 */
export async function getBullSendQueue(): Promise<SendQueue> {
  if (bullQueue) return bullQueue;

  const { Queue } = await import('bullmq');
  const { redisConnectionOptions } = await import('./connection');
  const queue = new Queue(SEND_QUEUE_NAME, {
    connection: redisConnectionOptions(),
  });

  bullQueue = {
    async enqueue(sendId, delayMs) {
      await queue.add(
        'process',
        { sendId },
        { jobId: sendId, delay: Math.max(0, delayMs), removeOnComplete: true },
      );
    },
    async cancel(sendId) {
      const job = await queue.getJob(sendId);
      if (job) await job.remove();
    },
  };
  return bullQueue;
}
