/**
 * Ingestion service — takes any IngestionAdapter, validates the output with
 * Zod, upserts records into the DB, recomputes fan lifetime values, and writes
 * an audit entry summarising the import.
 *
 * Returns counts of processed records plus any row-level errors surfaced by
 * the adapter. Designed for both ManualCsvAdapter and MockLiveAdapter (and
 * eventually a LiveAdapter when that slot is filled).
 */
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import {
  normalizedFanSchema,
  normalizedTransactionSchema,
  normalizedThreadSchema,
  type IngestionAdapter,
  type IngestCtx,
  type NormalizedFan,
  type NormalizedTransaction,
  type NormalizedThread,
} from '@/lib/ingestion/types';
import type { ManualCsvAdapter } from '@/lib/ingestion/adapters/manual-csv';

export interface IngestOptions {
  actorUserId?: string | null;
}

export interface IngestResult {
  fans: number;
  transactions: number;
  threads: number;
  messages: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Defensive Zod validation on adapter output
// ---------------------------------------------------------------------------

function validateFans(raw: NormalizedFan[]): {
  valid: NormalizedFan[];
  errors: string[];
} {
  const valid: NormalizedFan[] = [];
  const errors: string[] = [];
  raw.forEach((item, i) => {
    const r = normalizedFanSchema.safeParse(item);
    if (r.success) {
      valid.push(r.data);
    } else {
      errors.push(`fan[${i}]: ${r.error.message}`);
    }
  });
  return { valid, errors };
}

function validateTransactions(raw: NormalizedTransaction[]): {
  valid: NormalizedTransaction[];
  errors: string[];
} {
  const valid: NormalizedTransaction[] = [];
  const errors: string[] = [];
  raw.forEach((item, i) => {
    const r = normalizedTransactionSchema.safeParse(item);
    if (r.success) {
      valid.push(r.data);
    } else {
      errors.push(`transaction[${i}]: ${r.error.message}`);
    }
  });
  return { valid, errors };
}

function validateThreads(raw: NormalizedThread[]): {
  valid: NormalizedThread[];
  errors: string[];
} {
  const valid: NormalizedThread[] = [];
  const errors: string[] = [];
  raw.forEach((item, i) => {
    const r = normalizedThreadSchema.safeParse(item);
    if (r.success) {
      valid.push(r.data);
    } else {
      errors.push(`thread[${i}]: ${r.error.message}`);
    }
  });
  return { valid, errors };
}

// ---------------------------------------------------------------------------
// Main ingest function
// ---------------------------------------------------------------------------

export async function ingest(
  adapter: IngestionAdapter,
  ctx: IngestCtx,
  opts: IngestOptions = {},
): Promise<IngestResult> {
  const allErrors: string[] = [];

  // Reset the CSV adapter's row-error buffer at this batch boundary so the
  // three concurrent fetch* calls accumulate cleanly (and stale errors from a
  // prior ingest on a reused adapter don't leak in).
  const csvAdapterPre = adapter as Partial<ManualCsvAdapter>;
  if (Array.isArray(csvAdapterPre.lastErrors)) {
    csvAdapterPre.lastErrors = [];
  }

  // 1. Fetch from adapter.
  const [rawFans, rawTransactions, rawThreads] = await Promise.all([
    adapter.fetchFans(ctx),
    adapter.fetchTransactions(ctx),
    adapter.fetchMessages(ctx),
  ]);

  // Collect adapter-level row errors (ManualCsvAdapter exposes them).
  const csvAdapter = adapter as Partial<ManualCsvAdapter>;
  if (Array.isArray(csvAdapter.lastErrors)) {
    for (const e of csvAdapter.lastErrors) {
      allErrors.push(
        `row ${e.row}${e.field ? ` (${e.field})` : ''}: ${e.message}`,
      );
    }
  }

  // 2. Defensive Zod validation of adapter output.
  const { valid: fans, errors: fanErrors } = validateFans(rawFans);
  const { valid: transactions, errors: txErrors } =
    validateTransactions(rawTransactions);
  const { valid: threads, errors: threadErrors } = validateThreads(rawThreads);

  allErrors.push(...fanErrors, ...txErrors, ...threadErrors);

  // 3. Persist inside a Prisma interactive transaction.
  let fansUpserted = 0;
  let txUpserted = 0;
  let threadsUpserted = 0;
  let messagesUpserted = 0;

  await prisma.$transaction(async (tx) => {
    // --- Fans ---
    for (const fan of fans) {
      await tx.fan.upsert({
        where: {
          platformAccountId_externalRef: {
            platformAccountId: ctx.platformAccountId,
            externalRef: fan.externalRef,
          },
        },
        create: {
          modelId: ctx.modelId,
          platformAccountId: ctx.platformAccountId,
          platform: ctx.platform,
          externalRef: fan.externalRef,
          displayName: fan.displayName,
          tags: fan.tags,
          lifetimeValueCents: fan.lifetimeValueCents,
          firstSeenAt: fan.firstSeenAt,
          lastSeenAt: fan.lastSeenAt,
          notes: fan.notes ?? null,
        },
        update: {
          displayName: fan.displayName,
          tags: fan.tags,
          lastSeenAt: fan.lastSeenAt,
          notes: fan.notes ?? null,
        },
      });
      fansUpserted++;
    }

    // Build externalRef → fanId lookup for this account.
    const fanRows = await tx.fan.findMany({
      where: { platformAccountId: ctx.platformAccountId },
      select: { id: true, externalRef: true },
    });
    const fanIdByRef = new Map(fanRows.map((f) => [f.externalRef, f.id]));

    // --- Transactions ---
    for (const txn of transactions) {
      const fanId = txn.fanExternalRef
        ? (fanIdByRef.get(txn.fanExternalRef) ?? null)
        : null;
      await tx.transaction.upsert({
        where: {
          platformAccountId_externalRef: {
            platformAccountId: ctx.platformAccountId,
            externalRef: txn.externalRef,
          },
        },
        create: {
          modelId: ctx.modelId,
          platformAccountId: ctx.platformAccountId,
          platform: ctx.platform,
          fanId,
          type: txn.type,
          grossCents: txn.grossCents,
          netCents: txn.netCents,
          currency: txn.currency,
          occurredAt: txn.occurredAt,
          externalRef: txn.externalRef,
        },
        update: {
          fanId,
          type: txn.type,
          grossCents: txn.grossCents,
          netCents: txn.netCents,
          currency: txn.currency,
          occurredAt: txn.occurredAt,
        },
      });
      txUpserted++;
    }

    // Recompute lifetimeValueCents for every touched fan.
    const touchedFanIds = [...fanIdByRef.values()];
    if (touchedFanIds.length > 0) {
      const aggregates = await tx.transaction.groupBy({
        by: ['fanId'],
        where: {
          platformAccountId: ctx.platformAccountId,
          fanId: { in: touchedFanIds },
        },
        _sum: { netCents: true },
      });
      for (const agg of aggregates) {
        if (!agg.fanId) continue;
        await tx.fan.update({
          where: { id: agg.fanId },
          data: { lifetimeValueCents: agg._sum.netCents ?? 0 },
        });
      }
    }

    // --- Threads + Messages ---
    for (const thread of threads) {
      const fanId = fanIdByRef.get(thread.fanExternalRef);
      if (!fanId) {
        allErrors.push(
          `thread: fan externalRef "${thread.fanExternalRef}" not found in account — thread skipped`,
        );
        continue;
      }

      // Find-or-create the thread (one thread per fan per account).
      let dbThread = await tx.messageThread.findFirst({
        where: { platformAccountId: ctx.platformAccountId, fanId },
      });
      if (!dbThread) {
        dbThread = await tx.messageThread.create({
          data: {
            modelId: ctx.modelId,
            platformAccountId: ctx.platformAccountId,
            platform: ctx.platform,
            fanId,
            lastMessageAt: thread.lastMessageAt,
          },
        });
        threadsUpserted++;
      } else {
        // Update lastMessageAt if newer.
        if (thread.lastMessageAt > dbThread.lastMessageAt) {
          await tx.messageThread.update({
            where: { id: dbThread.id },
            data: { lastMessageAt: thread.lastMessageAt },
          });
        }
        threadsUpserted++;
      }

      // Upsert messages within the thread.
      for (const msg of thread.messages) {
        await tx.message.upsert({
          where: {
            threadId_externalRef: {
              threadId: dbThread.id,
              externalRef: msg.externalRef,
            },
          },
          create: {
            threadId: dbThread.id,
            direction: msg.direction,
            body: msg.body,
            sentAt: msg.sentAt,
            externalRef: msg.externalRef,
          },
          update: {
            direction: msg.direction,
            body: msg.body,
            sentAt: msg.sentAt,
          },
        });
        messagesUpserted++;
      }
    }

    // --- Audit entry ---
    await writeAudit(
      {
        actorUserId: opts.actorUserId ?? null,
        action: 'IMPORT',
        entityType: 'PlatformAccount',
        entityId: ctx.platformAccountId,
        metadata: {
          platform: ctx.platform,
          adapter: adapter.mode,
          fans: fansUpserted,
          transactions: txUpserted,
          threads: threadsUpserted,
          messages: messagesUpserted,
          errorCount: allErrors.length,
        },
      },
      tx,
    );
  });

  return {
    fans: fansUpserted,
    transactions: txUpserted,
    threads: threadsUpserted,
    messages: messagesUpserted,
    errors: allErrors,
  };
}
