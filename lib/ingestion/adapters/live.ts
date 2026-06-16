/**
 * LiveAdapter stub — a placeholder that makes the "live adapter" slot visible
 * in the codebase without containing any live-integration code.
 *
 * EVERY method throws NotImplementedError. This is intentional and permanent
 * until a deliberate decision is made to build live integration.
 */
import type {
  IngestionAdapter,
  IngestCtx,
  NormalizedFan,
  NormalizedTransaction,
  NormalizedThread,
} from '@/lib/ingestion/types';
import type { Platform } from '@/lib/db';
import { NotImplementedError } from '@/lib/ingestion/errors';

export class LiveAdapter implements IngestionAdapter {
  readonly platform: Platform;
  readonly mode = 'mock-live' as const;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  fetchFans(_ctx: IngestCtx): Promise<NormalizedFan[]> {
    throw new NotImplementedError('live integration is deferred');
  }

  fetchTransactions(_ctx: IngestCtx): Promise<NormalizedTransaction[]> {
    throw new NotImplementedError('live integration is deferred');
  }

  fetchMessages(_ctx: IngestCtx): Promise<NormalizedThread[]> {
    throw new NotImplementedError('live integration is deferred');
  }
}
