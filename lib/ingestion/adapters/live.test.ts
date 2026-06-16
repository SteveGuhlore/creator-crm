/**
 * LiveAdapter — pure unit tests (no DB).
 *
 * The adapter is read-only and only ever talks to the injected/resolved
 * LiveApiClient — it has no platform-endpoint knowledge and performs no
 * scraping. These tests cover: the sandbox backend, an injected HTTP-shaped
 * client, and the "fail loudly when unconfigured" guarantee.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { LiveAdapter } from './live';
import { Platform } from '@/lib/db';
import { SandboxLiveApiClient } from '@/lib/live/sandbox-client';
import { LiveBackendNotConfiguredError } from '@/lib/live/errors';

const ctx = {
  modelId: 'model-1',
  platformAccountId: 'pa-1',
  platform: Platform.ONLYFANS,
};

describe('LiveAdapter', () => {
  const origBase = process.env.LIVE_API_BASE_URL;
  const origKey = process.env.LIVE_API_KEY;
  afterEach(() => {
    if (origBase === undefined) delete process.env.LIVE_API_BASE_URL;
    else process.env.LIVE_API_BASE_URL = origBase;
    if (origKey === undefined) delete process.env.LIVE_API_KEY;
    else process.env.LIVE_API_KEY = origKey;
  });

  it('reports mode "live"', () => {
    const a = new LiveAdapter(Platform.ONLYFANS, new SandboxLiveApiClient());
    expect(a.mode).toBe('live');
  });

  it('reads through the sandbox client (no network)', async () => {
    const a = new LiveAdapter(Platform.ONLYFANS, new SandboxLiveApiClient());
    expect(a.source).toBe('sandbox');
    const fans = await a.fetchFans(ctx);
    expect(fans.length).toBeGreaterThan(0);
    const txns = await a.fetchTransactions(ctx);
    expect(Array.isArray(txns)).toBe(true);
    const threads = await a.fetchMessages(ctx);
    expect(Array.isArray(threads)).toBe(true);
  });

  it('forceSandbox resolves the sandbox client', async () => {
    const a = new LiveAdapter(Platform.FANSLY, { forceSandbox: true });
    expect(a.source).toBe('sandbox');
    expect((await a.fetchFans(ctx)).length).toBeGreaterThan(0);
  });

  it('throws LiveBackendNotConfiguredError when nothing is configured', () => {
    delete process.env.LIVE_API_BASE_URL;
    delete process.env.LIVE_API_KEY;
    expect(() => new LiveAdapter(Platform.ONLYFANS)).toThrow(
      LiveBackendNotConfiguredError,
    );
  });

  it('delegates to an injected client and never invents endpoints', async () => {
    const calls: string[] = [];
    const fake = {
      source: 'http' as const,
      capabilities: () => ({
        readFans: true,
        readTransactions: true,
        readMessages: true,
        sendMessage: true,
        createPost: true,
      }),
      listFans: async () => {
        calls.push('fans');
        return [];
      },
      listTransactions: async () => {
        calls.push('transactions');
        return [];
      },
      listThreads: async () => {
        calls.push('threads');
        return [];
      },
      sendMessage: async () => ({ externalRef: 'x', sentAt: new Date() }),
      createPost: async () => ({ externalRef: 'y', createdAt: new Date() }),
    };
    const a = new LiveAdapter(Platform.ONLYFANS, fake);
    expect(a.source).toBe('http');
    await a.fetchFans(ctx);
    await a.fetchTransactions(ctx);
    await a.fetchMessages(ctx);
    expect(calls).toEqual(['fans', 'transactions', 'threads']);
  });

  it('the adapter exposes no send/post methods (ingestion is read-only)', () => {
    const a = new LiveAdapter(Platform.ONLYFANS, new SandboxLiveApiClient());
    const rec = a as unknown as Record<string, unknown>;
    expect(rec.sendMessage).toBeUndefined();
    expect(rec.createPost).toBeUndefined();
  });
});
