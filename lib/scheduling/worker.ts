import 'dotenv/config';
import { Worker } from 'bullmq';
import { SEND_QUEUE_NAME } from './queue';
import { redisConnectionOptions } from './connection';
import { processScheduledSend } from './process';

// Background worker that fires scheduled sends. When a job's delay elapses, it
// calls processScheduledSend(), which performs the SIMULATED transition + audit
// and contacts NO external platform. Run with `pnpm worker`.

function main() {
  const worker = new Worker(
    SEND_QUEUE_NAME,
    async (job) => {
      const sendId = (job.data as { sendId: string }).sendId;
      const result = await processScheduledSend(sendId);
      return result;
    },
    { connection: redisConnectionOptions() },
  );

  worker.on('completed', (job) => {
    // eslint-disable-next-line no-console
    console.log(`[worker] processed send ${job.id}`);
  });
  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[worker] failed send ${job?.id}:`, err.message);
  });

  // eslint-disable-next-line no-console
  console.log(`[worker] listening on queue "${SEND_QUEUE_NAME}"`);
}

main();
