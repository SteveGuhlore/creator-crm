/**
 * MockLiveAdapter — returns deterministic fixture data shaped like what a
 * future live adapter would return. Uses the same generators as the seed
 * script so analytics stay consistent.
 *
 * NEVER makes a network call. NEVER contacts any external service.
 */
import {
  generateFans,
  generateTransactions,
  generateThreads,
  type GenerateOptions,
} from '@/fixtures/generators';
import type {
  IngestionAdapter,
  IngestCtx,
  NormalizedFan,
  NormalizedTransaction,
  NormalizedThread,
} from '@/lib/ingestion/types';
import type { Platform } from '@/lib/db';

export class MockLiveAdapter implements IngestionAdapter {
  readonly platform: Platform;
  readonly mode = 'mock-live' as const;

  private readonly opts: GenerateOptions;

  constructor(platform: Platform, opts: GenerateOptions = {}) {
    this.platform = platform;
    this.opts = opts;
  }

  async fetchFans(_ctx: IngestCtx): Promise<NormalizedFan[]> {
    return generateFans(this.platform, this.opts);
  }

  async fetchTransactions(ctx: IngestCtx): Promise<NormalizedTransaction[]> {
    // Generate fans first so transaction fanExternalRefs are consistent.
    const fans = await this.fetchFans(ctx);
    return generateTransactions(this.platform, fans, this.opts);
  }

  async fetchMessages(ctx: IngestCtx): Promise<NormalizedThread[]> {
    const fans = await this.fetchFans(ctx);
    return generateThreads(this.platform, fans, this.opts);
  }
}
