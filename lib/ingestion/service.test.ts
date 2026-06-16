/**
 * Ingestion service — DB integration test.
 *
 * GUARDS: only runs when a test database is available (DATABASE_URL set and
 * reachable). Creates its OWN isolated Model + PlatformAccount; cleans up
 * only those rows on exit. Does NOT truncate global tables.
 *
 * DO NOT run this file directly during CI-less builds — it requires a live DB.
 * The pure adapter tests cover the non-DB logic exhaustively.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dbAvailable } from '@/tests/db-helper';
import { prisma, Platform, TransactionType, MessageDirection } from '@/lib/db';
import { ingest } from './service';
import { ManualCsvAdapter } from './adapters/manual-csv';
import type { IngestCtx } from './types';

// ---------------------------------------------------------------------------
// Minimal CSV fixtures
// ---------------------------------------------------------------------------

const FANS_CSV = `externalRef,displayName,tags,lifetimeValueCents,firstSeenAt,lastSeenAt,notes
svc-fan-001,Alice,vip,0,2025-01-01T00:00:00.000Z,2025-06-01T00:00:00.000Z,
svc-fan-002,Bob,,0,2025-02-01T00:00:00.000Z,2025-06-01T00:00:00.000Z,`;

const TRANSACTIONS_CSV = `externalRef,type,grossCents,netCents,currency,occurredAt,fanExternalRef
svc-tx-001,SUBSCRIPTION,1999,1699,USD,2025-03-01T00:00:00.000Z,svc-fan-001
svc-tx-002,TIP,500,425,USD,2025-04-01T00:00:00.000Z,svc-fan-001`;

const MESSAGES_CSV = `threadFanExternalRef,externalRef,direction,body,sentAt
svc-fan-001,svc-msg-001,OUT,Hey Alice!,2025-05-01T10:00:00.000Z
svc-fan-001,svc-msg-002,IN,Thanks!,2025-05-01T11:00:00.000Z`;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ingest service (DB integration)', () => {
  let available = false;
  let modelId: string;
  let platformAccountId: string;

  beforeAll(async () => {
    available = await dbAvailable();
    if (!available) return;

    // Create isolated test fixtures — own rows, not shared seed data.
    const model = await prisma.model.create({
      data: { displayName: 'Test Model (ingest service test)' },
    });
    modelId = model.id;

    const pa = await prisma.platformAccount.create({
      data: {
        modelId,
        platform: Platform.ONLYFANS,
        handle: `test-handle-${Date.now()}`,
      },
    });
    platformAccountId = pa.id;
  });

  afterAll(async () => {
    if (!available) return;
    // Cascade delete via Model (FK onDelete: Cascade covers everything below).
    await prisma.model.delete({ where: { id: modelId } });
  });

  it('skips all assertions when DB is unavailable', async () => {
    if (available) return; // Only runs when DB is absent.
    expect(true).toBe(true); // Placeholder so the test isn't empty.
  });

  it('upserts fans, transactions, threads, and messages', async () => {
    if (!available) return;

    const ctx: IngestCtx = {
      modelId,
      platformAccountId,
      platform: Platform.ONLYFANS,
      raw: {
        fansCsv: FANS_CSV,
        transactionsCsv: TRANSACTIONS_CSV,
        messagesCsv: MESSAGES_CSV,
      },
    };

    const adapter = new ManualCsvAdapter(Platform.ONLYFANS);
    const result = await ingest(adapter, ctx, { actorUserId: null });

    expect(result.errors).toHaveLength(0);
    expect(result.fans).toBe(2);
    expect(result.transactions).toBe(2);
    expect(result.threads).toBe(1);
    expect(result.messages).toBe(2);
  });

  it('upsert is idempotent — running ingest twice yields the same row count', async () => {
    if (!available) return;

    const ctx: IngestCtx = {
      modelId,
      platformAccountId,
      platform: Platform.ONLYFANS,
      raw: {
        fansCsv: FANS_CSV,
        transactionsCsv: TRANSACTIONS_CSV,
        messagesCsv: MESSAGES_CSV,
      },
    };

    const adapter = new ManualCsvAdapter(Platform.ONLYFANS);
    await ingest(adapter, ctx);
    await ingest(adapter, ctx); // second run — should not duplicate

    const fanCount = await prisma.fan.count({ where: { platformAccountId } });
    const txCount = await prisma.transaction.count({
      where: { platformAccountId },
    });
    const threadCount = await prisma.messageThread.count({
      where: { platformAccountId },
    });

    expect(fanCount).toBe(2);
    expect(txCount).toBe(2);
    expect(threadCount).toBe(1);
  });

  it('recomputes lifetimeValueCents from net transactions', async () => {
    if (!available) return;

    const fan = await prisma.fan.findFirst({
      where: { platformAccountId, externalRef: 'svc-fan-001' },
    });
    expect(fan).not.toBeNull();
    // svc-tx-001 netCents=1699 + svc-tx-002 netCents=425 = 2124
    expect(fan!.lifetimeValueCents).toBe(2124);
  });

  it('writes an IMPORT audit log entry', async () => {
    if (!available) return;

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'PlatformAccount',
        entityId: platformAccountId,
        action: 'IMPORT',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit!.action).toBe('IMPORT');
    const meta = audit!.metadata as Record<string, unknown>;
    expect(meta['platform']).toBe(Platform.ONLYFANS);
  });

  it('stores correct fan fields in DB', async () => {
    if (!available) return;

    const alice = await prisma.fan.findFirst({
      where: { platformAccountId, externalRef: 'svc-fan-001' },
    });
    expect(alice).not.toBeNull();
    expect(alice!.displayName).toBe('Alice');
    expect(alice!.tags).toContain('vip');
    expect(alice!.platform).toBe(Platform.ONLYFANS);
  });

  it('stores correct transaction fields in DB', async () => {
    if (!available) return;

    const tx = await prisma.transaction.findFirst({
      where: { platformAccountId, externalRef: 'svc-tx-001' },
    });
    expect(tx).not.toBeNull();
    expect(tx!.type).toBe(TransactionType.SUBSCRIPTION);
    expect(tx!.grossCents).toBe(1999);
    expect(tx!.netCents).toBe(1699);
  });

  it('stores correct message fields in DB', async () => {
    if (!available) return;

    const thread = await prisma.messageThread.findFirst({
      where: { platformAccountId },
      include: { messages: { orderBy: { sentAt: 'asc' } } },
    });
    expect(thread).not.toBeNull();
    expect(thread!.messages).toHaveLength(2);
    expect(thread!.messages[0]!.direction).toBe(MessageDirection.OUT);
    expect(thread!.messages[0]!.body).toBe('Hey Alice!');
    expect(thread!.messages[1]!.direction).toBe(MessageDirection.IN);
  });

  it('skips transactions that reference unknown fan externalRefs gracefully', async () => {
    if (!available) return;

    const orphanTxCsv = `externalRef,type,grossCents,netCents,currency,occurredAt,fanExternalRef
svc-tx-orphan,TIP,100,85,USD,2025-05-01T00:00:00.000Z,unknown-fan-ref`;

    const ctx: IngestCtx = {
      modelId,
      platformAccountId,
      platform: Platform.ONLYFANS,
      raw: { transactionsCsv: orphanTxCsv },
    };

    // Should not throw — fanId will be null (fan not found)
    const adapter = new ManualCsvAdapter(Platform.ONLYFANS);
    const result = await ingest(adapter, ctx);
    expect(result.errors).toHaveLength(0);
    expect(result.transactions).toBe(1);

    const tx = await prisma.transaction.findFirst({
      where: { platformAccountId, externalRef: 'svc-tx-orphan' },
    });
    expect(tx).not.toBeNull();
    expect(tx!.fanId).toBeNull();
  });
});
