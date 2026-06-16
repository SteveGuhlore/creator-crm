/**
 * HttpLiveApiClient — talks to a sanctioned, configurable HTTP API (YOUR API or
 * an authorized gateway). It knows NOTHING about any platform's private web
 * endpoints; it only calls the documented contract below against a base URL you
 * supply, authenticated with a per-account bearer token.
 *
 * Contract (REST):
 *   GET  {base}/v1/accounts/{accountId}/fans         -> NormalizedFan[]
 *   GET  {base}/v1/accounts/{accountId}/transactions -> NormalizedTransaction[]
 *   GET  {base}/v1/accounts/{accountId}/threads      -> NormalizedThread[]
 *   POST {base}/v1/accounts/{accountId}/messages     -> SendMessageResult
 *   POST {base}/v1/accounts/{accountId}/posts        -> CreatePostResult
 */
import { z } from 'zod';
import {
  normalizedFanSchema,
  normalizedTransactionSchema,
  normalizedThreadSchema,
  sendMessageResultSchema,
  createPostResultSchema,
  type LiveApiClient,
  type LiveCapabilities,
  type LiveScope,
  type SendMessageInput,
  type CreatePostInput,
} from './contract';
import { LiveApiError } from './errors';
import type { Platform } from '@/lib/db';

export interface HttpLiveConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  /** Optional capability override; defaults to all-on (backend enforces too). */
  capabilities?: Partial<LiveCapabilities>;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class HttpLiveApiClient implements LiveApiClient {
  readonly source = 'http' as const;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly caps: LiveCapabilities;
  private readonly fetchImpl: typeof fetch;

  constructor(config: HttpLiveConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.caps = {
      readFans: true,
      readTransactions: true,
      readMessages: true,
      sendMessage: true,
      createPost: true,
      ...config.capabilities,
    };
  }

  capabilities(_platform: Platform): LiveCapabilities {
    return this.caps;
  }

  private async request<S extends z.ZodTypeAny>(
    method: 'GET' | 'POST',
    path: string,
    schema: S,
    body?: unknown,
  ): Promise<z.infer<S>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'network error';
      throw new LiveApiError(`Live API request failed: ${reason}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new LiveApiError(
        `Live API responded ${res.status} ${res.statusText} for ${method} ${path}`,
        res.status,
      );
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new LiveApiError('Live API returned a non-JSON response.');
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new LiveApiError(
        `Live API response failed validation: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  private acct(scope: LiveScope, suffix: string): string {
    return `/v1/accounts/${encodeURIComponent(scope.platformAccountId)}/${suffix}`;
  }

  listFans(scope: LiveScope) {
    return this.request(
      'GET',
      this.acct(scope, 'fans'),
      z.array(normalizedFanSchema),
    );
  }

  listTransactions(scope: LiveScope) {
    return this.request(
      'GET',
      this.acct(scope, 'transactions'),
      z.array(normalizedTransactionSchema),
    );
  }

  listThreads(scope: LiveScope) {
    return this.request(
      'GET',
      this.acct(scope, 'threads'),
      z.array(normalizedThreadSchema),
    );
  }

  sendMessage(scope: LiveScope, input: SendMessageInput) {
    return this.request(
      'POST',
      this.acct(scope, 'messages'),
      sendMessageResultSchema,
      input,
    );
  }

  createPost(scope: LiveScope, input: CreatePostInput) {
    return this.request(
      'POST',
      this.acct(scope, 'posts'),
      createPostResultSchema,
      input,
    );
  }
}
