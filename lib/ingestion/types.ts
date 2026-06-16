import { z } from 'zod';
import {
  zPlatform,
  zTransactionType,
  zMessageDirection,
  zCents,
  zCurrency,
  zDate,
  zTags,
} from '@/lib/validation/common';
import type { Platform } from '@/lib/db';

// ---------------------------------------------------------------------------
// Normalized ingestion contract.
//
// Every adapter (ManualCsvAdapter, MockLiveAdapter, and a future LiveAdapter)
// returns these normalized shapes. Modeled on the public endpoint taxonomies
// documented by OFAuth / OnlyFansAPI (fans, messages, transactions/earnings)
// so the shape is realistic for a future live adapter — WITHOUT any network
// call tonight. The ingestion service validates this output with Zod and
// upserts by `externalRef`.
// ---------------------------------------------------------------------------

export const normalizedFanSchema = z.object({
  externalRef: z.string().min(1),
  displayName: z.string().min(1),
  tags: zTags,
  lifetimeValueCents: zCents.nonnegative().default(0),
  firstSeenAt: zDate,
  lastSeenAt: zDate,
  notes: z.string().nullish(),
});
export type NormalizedFan = z.infer<typeof normalizedFanSchema>;

export const normalizedTransactionSchema = z.object({
  externalRef: z.string().min(1),
  type: zTransactionType,
  grossCents: zCents,
  netCents: zCents,
  currency: zCurrency,
  occurredAt: zDate,
  // Links to a fan by their platform-side id (may be absent for anonymous events).
  fanExternalRef: z.string().min(1).nullish(),
});
export type NormalizedTransaction = z.infer<typeof normalizedTransactionSchema>;

export const normalizedMessageSchema = z.object({
  externalRef: z.string().min(1),
  direction: zMessageDirection,
  body: z.string(),
  sentAt: zDate,
});
export type NormalizedMessage = z.infer<typeof normalizedMessageSchema>;

export const normalizedThreadSchema = z.object({
  fanExternalRef: z.string().min(1),
  lastMessageAt: zDate,
  messages: z.array(normalizedMessageSchema),
});
export type NormalizedThread = z.infer<typeof normalizedThreadSchema>;

/** Context passed to an adapter for a single (model, platform account) ingest. */
export interface IngestCtx {
  modelId: string;
  platformAccountId: string;
  platform: Platform;
  /** Optional raw payloads (e.g. CSV text) for manual adapters. */
  raw?: {
    fansCsv?: string;
    transactionsCsv?: string;
    messagesCsv?: string;
  };
}

export interface IngestionAdapter {
  readonly platform: Platform;
  readonly mode: 'manual' | 'mock-live' | 'live';
  fetchFans(ctx: IngestCtx): Promise<NormalizedFan[]>;
  fetchTransactions(ctx: IngestCtx): Promise<NormalizedTransaction[]>;
  fetchMessages(ctx: IngestCtx): Promise<NormalizedThread[]>;
}

/** Validate a full adapter payload; used by the ingestion service. */
export const zPlatformValue = zPlatform;
