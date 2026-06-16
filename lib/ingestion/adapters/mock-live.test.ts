/**
 * MockLiveAdapter — pure unit tests (no DB, no network).
 *
 * Verifies: non-empty deterministic fixture data; output validates against Zod
 * schemas; absolutely no network call is made.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { MockLiveAdapter } from './mock-live';
import {
  normalizedFanSchema,
  normalizedTransactionSchema,
  normalizedThreadSchema,
} from '@/lib/ingestion/types';
import { Platform } from '@/lib/db';

const ctx = {
  modelId: 'model-1',
  platformAccountId: 'pa-1',
  platform: Platform.ONLYFANS,
};

// Deterministic seed so tests are reproducible.
const OPTS = { seed: 42, now: new Date('2026-01-01T00:00:00.000Z') };

describe('MockLiveAdapter', () => {
  // Guard: intercept fetch/http to ensure no network call escapes.
  beforeAll(() => {
    vi.stubGlobal('fetch', () => {
      throw new Error('MockLiveAdapter must not make network calls');
    });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('mode is "mock-live"', () => {
    expect(new MockLiveAdapter(Platform.ONLYFANS).mode).toBe('mock-live');
  });

  it('platform reflects constructor argument', () => {
    expect(new MockLiveAdapter(Platform.FANSLY).platform).toBe(Platform.FANSLY);
  });

  it('fetchFans returns a non-empty array', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const fans = await adapter.fetchFans(ctx);
    expect(fans.length).toBeGreaterThan(0);
  });

  it('fetchFans output validates against normalizedFanSchema', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const fans = await adapter.fetchFans(ctx);
    for (const fan of fans) {
      const r = normalizedFanSchema.safeParse(fan);
      expect(
        r.success,
        `fan ${fan.externalRef}: ${!r.success ? r.error.message : ''}`,
      ).toBe(true);
    }
  });

  it('fetchFans is deterministic (same seed → same output)', async () => {
    const a = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const b = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const fansA = await a.fetchFans(ctx);
    const fansB = await b.fetchFans(ctx);
    expect(fansA).toEqual(fansB);
  });

  it('fetchFans produces different data for different platforms', async () => {
    const of = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const mv = new MockLiveAdapter(Platform.MANYVIDS, OPTS);
    const fansOf = await of.fetchFans(ctx);
    const fansMv = await mv.fetchFans({ ...ctx, platform: Platform.MANYVIDS });
    // externalRefs will differ because they are platform-prefixed
    expect(fansOf[0]!.externalRef).not.toBe(fansMv[0]!.externalRef);
  });

  it('fetchTransactions returns a non-empty array', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const txns = await adapter.fetchTransactions(ctx);
    expect(txns.length).toBeGreaterThan(0);
  });

  it('fetchTransactions output validates against normalizedTransactionSchema', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const txns = await adapter.fetchTransactions(ctx);
    for (const tx of txns) {
      const r = normalizedTransactionSchema.safeParse(tx);
      expect(
        r.success,
        `tx ${tx.externalRef}: ${!r.success ? r.error.message : ''}`,
      ).toBe(true);
    }
  });

  it('fetchTransactions fanExternalRefs reference fans from fetchFans', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const fans = await adapter.fetchFans(ctx);
    const txns = await adapter.fetchTransactions(ctx);
    const fanRefs = new Set(fans.map((f) => f.externalRef));
    for (const tx of txns) {
      if (tx.fanExternalRef) {
        expect(fanRefs.has(tx.fanExternalRef)).toBe(true);
      }
    }
  });

  it('fetchMessages returns a non-empty array of threads', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const threads = await adapter.fetchMessages(ctx);
    expect(threads.length).toBeGreaterThan(0);
  });

  it('fetchMessages output validates against normalizedThreadSchema', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const threads = await adapter.fetchMessages(ctx);
    for (const thread of threads) {
      const r = normalizedThreadSchema.safeParse(thread);
      expect(
        r.success,
        `thread ${thread.fanExternalRef}: ${!r.success ? r.error.message : ''}`,
      ).toBe(true);
    }
  });

  it('each thread has at least one message', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const threads = await adapter.fetchMessages(ctx);
    for (const thread of threads) {
      expect(thread.messages.length).toBeGreaterThan(0);
    }
  });

  it('lastMessageAt equals the max sentAt across thread messages', async () => {
    const adapter = new MockLiveAdapter(Platform.ONLYFANS, OPTS);
    const threads = await adapter.fetchMessages(ctx);
    for (const thread of threads) {
      const maxSentAt = thread.messages.reduce(
        (max, m) => (m.sentAt > max ? m.sentAt : max),
        thread.messages[0]!.sentAt,
      );
      expect(thread.lastMessageAt.getTime()).toBe(maxSentAt.getTime());
    }
  });

  it('works for all 5 platforms without throwing', async () => {
    const platforms = [
      Platform.MANYVIDS,
      Platform.FANSLY,
      Platform.HIDDEN,
      Platform.ONLYFANS,
      Platform.SEXTPANTHER,
    ];
    for (const p of platforms) {
      const adapter = new MockLiveAdapter(p, OPTS);
      const pCtx = { ...ctx, platform: p };
      await expect(adapter.fetchFans(pCtx)).resolves.not.toThrow();
      await expect(adapter.fetchTransactions(pCtx)).resolves.not.toThrow();
      await expect(adapter.fetchMessages(pCtx)).resolves.not.toThrow();
    }
  });
});
