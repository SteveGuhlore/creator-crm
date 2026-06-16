/**
 * LiveAdapter — read side of the live integration. Implements the ingestion
 * contract by delegating to a {@link LiveApiClient} (sandbox today, a sanctioned
 * HTTP backend when configured). It performs NO scraping and knows nothing about
 * any platform's private endpoints; it only calls the configured client.
 *
 * Write actions (send message / create post) live in `lib/live/actions`, not
 * here — ingestion is read-only by design.
 *
 * If no backend is configured and no client is injected, resolving the client
 * throws LiveBackendNotConfiguredError — a missing config fails loudly rather
 * than silently doing nothing.
 */
import type {
  IngestionAdapter,
  IngestCtx,
  NormalizedFan,
  NormalizedTransaction,
  NormalizedThread,
} from '@/lib/ingestion/types';
import type { Platform } from '@/lib/db';
import { resolveLiveClient, type ResolveLiveOptions } from '@/lib/live/resolve';
import type { LiveApiClient, LiveScope } from '@/lib/live/contract';

export class LiveAdapter implements IngestionAdapter {
  readonly platform: Platform;
  readonly mode = 'live' as const;
  private readonly client: LiveApiClient;

  /**
   * @param platform  the platform this adapter reads from
   * @param clientOrOpts  an injected client (tests) OR resolution options
   *                      (forceSandbox, apiKey, baseUrl, …). Omit to resolve
   *                      from the environment.
   */
  constructor(
    platform: Platform,
    clientOrOpts?: LiveApiClient | ResolveLiveOptions,
  ) {
    this.platform = platform;
    if (clientOrOpts && 'listFans' in clientOrOpts) {
      this.client = clientOrOpts;
    } else {
      this.client = resolveLiveClient(clientOrOpts ?? {});
    }
  }

  /** Provenance of the backing client: 'sandbox' or 'http'. */
  get source(): LiveApiClient['source'] {
    return this.client.source;
  }

  private scope(ctx: IngestCtx): LiveScope {
    return {
      modelId: ctx.modelId,
      platformAccountId: ctx.platformAccountId,
      platform: ctx.platform,
    };
  }

  fetchFans(ctx: IngestCtx): Promise<NormalizedFan[]> {
    return this.client.listFans(this.scope(ctx));
  }

  fetchTransactions(ctx: IngestCtx): Promise<NormalizedTransaction[]> {
    return this.client.listTransactions(this.scope(ctx));
  }

  fetchMessages(ctx: IngestCtx): Promise<NormalizedThread[]> {
    return this.client.listThreads(this.scope(ctx));
  }
}
