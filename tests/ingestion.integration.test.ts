import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Platform, TransactionType } from '@/lib/db';
import { ManualCsvAdapter } from '@/lib/ingestion/adapters/manual-csv';
import { MockLiveAdapter } from '@/lib/ingestion/adapters/mock-live';
import { ingest } from '@/lib/ingestion/service';
import type { IngestCtx } from '@/lib/ingestion/types';
import { dbAvailable, resetDb } from './db-helper';

// Central DB integration test for the ingestion service: upsert-by-externalRef,
// idempotency, audit writes, LTV recompute. Self-skips with no DB.
const ready = await dbAvailable();
const d = ready ? describe : describe.skip;

d('ingestion service (DB)', () => {
  let modelId: string;
  let accountId: string;

  beforeAll(async () => {
    await resetDb();
    const model = await prisma.model.create({
      data: { id: 'ingest-test-model', displayName: 'Ingest Test' },
    });
    modelId = model.id;
    const account = await prisma.platformAccount.create({
      data: { modelId, platform: Platform.FANSLY, handle: 'ingest_test' },
    });
    accountId = account.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function ctx(): IngestCtx {
    return { modelId, platformAccountId: accountId, platform: Platform.FANSLY };
  }

  const fansCsv = [
    'externalRef,displayName,tags,lifetimeValueCents,firstSeenAt,lastSeenAt,notes',
    'f1,Alice,vip|whale,0,2026-01-01T00:00:00.000Z,2026-02-01T00:00:00.000Z,hi',
    'f2,Bob,new,0,2026-01-15T00:00:00.000Z,2026-02-15T00:00:00.000Z,',
  ].join('\n');

  const txCsv = [
    'externalRef,type,grossCents,netCents,currency,occurredAt,fanExternalRef',
    't1,SUBSCRIPTION,1999,1800,USD,2026-02-01T00:00:00.000Z,f1',
    't2,TIP,5000,4500,USD,2026-02-05T00:00:00.000Z,f1',
    't3,PPV,3000,2700,USD,2026-02-10T00:00:00.000Z,f2',
  ].join('\n');

  const msgCsv = [
    'threadFanExternalRef,externalRef,direction,body,sentAt',
    'f1,m1,IN,Hi there,2026-02-01T10:00:00.000Z',
    'f1,m2,OUT,Thanks!,2026-02-01T11:00:00.000Z',
  ].join('\n');

  it('imports CSV data and upserts by externalRef', async () => {
    const adapter = new ManualCsvAdapter(Platform.FANSLY);
    const result = await ingest(adapter, {
      ...ctx(),
      raw: { fansCsv, transactionsCsv: txCsv, messagesCsv: msgCsv },
    });

    expect(await prisma.fan.count({ where: { modelId } })).toBe(2);
    expect(await prisma.transaction.count({ where: { modelId } })).toBe(3);
    expect(result.errors?.length ?? 0).toBe(0);
  });

  it('recomputes lifetimeValueCents from net transactions', async () => {
    const alice = await prisma.fan.findFirst({
      where: { platformAccountId: accountId, externalRef: 'f1' },
    });
    // t1 net 1800 + t2 net 4500 = 6300
    expect(alice?.lifetimeValueCents).toBe(6300);
  });

  it('is idempotent — re-importing the same CSV does not duplicate', async () => {
    const adapter = new ManualCsvAdapter(Platform.FANSLY);
    await ingest(adapter, {
      ...ctx(),
      raw: { fansCsv, transactionsCsv: txCsv, messagesCsv: msgCsv },
    });
    expect(await prisma.fan.count({ where: { modelId } })).toBe(2);
    expect(await prisma.transaction.count({ where: { modelId } })).toBe(3);
  });

  it('writes an IMPORT audit entry', async () => {
    const audits = await prisma.auditLog.findMany({
      where: { action: 'IMPORT' },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects malformed rows but imports the good ones', async () => {
    const badTx = [
      'externalRef,type,grossCents,netCents,currency,occurredAt,fanExternalRef',
      't4,NOT_A_TYPE,1000,900,USD,2026-03-01T00:00:00.000Z,f1', // bad enum
      't5,TIP,notanumber,900,USD,2026-03-01T00:00:00.000Z,f1', // bad number
      't6,TIP,2000,1800,USD,2026-03-02T00:00:00.000Z,f2', // good
    ].join('\n');
    const adapter = new ManualCsvAdapter(Platform.FANSLY);
    const result = await ingest(adapter, {
      ...ctx(),
      raw: { transactionsCsv: badTx },
    });
    expect(result.errors?.length ?? 0).toBeGreaterThanOrEqual(2);
    const t6 = await prisma.transaction.findFirst({
      where: { platformAccountId: accountId, externalRef: 't6' },
    });
    expect(t6?.type).toBe(TransactionType.TIP);
  });

  it('MockLiveAdapter ingests generated data without any network call', async () => {
    // Fresh account to isolate counts.
    const acct = await prisma.platformAccount.create({
      data: { modelId, platform: Platform.ONLYFANS, handle: 'mocklive_test' },
    });
    const adapter = new MockLiveAdapter(Platform.ONLYFANS);
    const result = await ingest(adapter, {
      modelId,
      platformAccountId: acct.id,
      platform: Platform.ONLYFANS,
    });
    expect(result.fans).toBeGreaterThan(0);
    expect(
      await prisma.fan.count({ where: { platformAccountId: acct.id } }),
    ).toBe(result.fans);
  });
});
