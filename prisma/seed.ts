import 'dotenv/config';
import { prisma } from '@/lib/db';
import { runSeed } from '@/lib/seed';

// Thin CLI wrapper. All logic lives in lib/seed so tests can drive it too.
runSeed()
  .then(async (r) => {
    // eslint-disable-next-line no-console
    console.log(
      `Seed complete: model=${r.modelId}, accounts=${r.accounts}, ` +
        `fans=${r.fans}, tx=${r.transactions}, threads=${r.threads}, ` +
        `content=${r.content}`,
    );
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
