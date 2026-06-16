import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, ALL_PLATFORMS } from '@/lib/db';
import { runSeed } from '@/lib/seed';
import { dbAvailable, resetDb } from './db-helper';

// Integration tests against TEST_DATABASE_URL. Self-skip if no DB is reachable
// (e.g. CI without Postgres) so `pnpm verify` never hangs on infra.
const maybe = await dbAvailable();
const d = maybe ? describe : describe.skip;

d('seed — idempotency & invariants (DB)', () => {
  let first: Awaited<ReturnType<typeof runSeed>>;

  beforeAll(async () => {
    await resetDb();
    first = await runSeed({ seed: 1 });
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds the expected top-level structure', async () => {
    expect(first.accounts).toBe(ALL_PLATFORMS.length);
    expect(first.fans).toBeGreaterThan(0);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.model.count()).toBe(1);
    expect(await prisma.platformAccount.count()).toBe(ALL_PLATFORMS.length);
  });

  it('is idempotent — re-running does not duplicate rows', async () => {
    const before = await tableCounts();
    const second = await runSeed({ seed: 1 });
    const after = await tableCounts();

    expect(second.fans).toBe(first.fans);
    // Every data table holds the same number of rows after a second seed.
    for (const key of Object.keys(before) as (keyof typeof before)[]) {
      if (key === 'auditLog') continue; // seed appends one audit row per run
      expect(after[key], `table ${key} grew`).toBe(before[key]);
    }
  });

  it('enforces multi-tenant fields on every relevant record', async () => {
    const fans = await prisma.fan.findMany();
    for (const f of fans) {
      expect(f.modelId).toBeTruthy();
      expect(f.platformAccountId).toBeTruthy();
      expect(ALL_PLATFORMS).toContain(f.platform);
    }
    const txns = await prisma.transaction.findMany();
    for (const t of txns) {
      expect(t.modelId).toBeTruthy();
      expect(ALL_PLATFORMS).toContain(t.platform);
    }
  });

  it('keeps fans un-merged across platforms (separate rows)', async () => {
    // Each platform account owns its own fans; no fan row is shared.
    const grouped = await prisma.fan.groupBy({
      by: ['platformAccountId'],
      _count: true,
    });
    expect(grouped.length).toBe(ALL_PLATFORMS.length);
  });

  it('lifetimeValueCents equals the sum of the fan’s net transactions', async () => {
    const fans = await prisma.fan.findMany({ include: { transactions: true } });
    let checked = 0;
    for (const fan of fans) {
      const sum = fan.transactions.reduce((a, t) => a + t.netCents, 0);
      expect(fan.lifetimeValueCents).toBe(sum);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('all transactions reference a platform account that exists', async () => {
    const accountIds = new Set(
      (await prisma.platformAccount.findMany({ select: { id: true } })).map(
        (a) => a.id,
      ),
    );
    const txns = await prisma.transaction.findMany({
      select: { platformAccountId: true, modelId: true },
    });
    expect(txns.length).toBeGreaterThan(0);
    for (const t of txns) {
      expect(accountIds.has(t.platformAccountId)).toBe(true);
      expect(t.modelId).toBeTruthy();
    }
  });

  it('writes a seed audit entry', async () => {
    const audits = await prisma.auditLog.findMany({
      where: { entityType: 'Seed' },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[0]?.action).toBe('IMPORT');
  });
});

async function tableCounts() {
  const [
    user,
    model,
    platformAccount,
    fan,
    transaction,
    messageThread,
    message,
    contentItem,
    messageTemplate,
    auditLog,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.model.count(),
    prisma.platformAccount.count(),
    prisma.fan.count(),
    prisma.transaction.count(),
    prisma.messageThread.count(),
    prisma.message.count(),
    prisma.contentItem.count(),
    prisma.messageTemplate.count(),
    prisma.auditLog.count(),
  ]);
  return {
    user,
    model,
    platformAccount,
    fan,
    transaction,
    messageThread,
    message,
    contentItem,
    messageTemplate,
    auditLog,
  };
}
