/**
 * LiveAdapter — pure unit tests (no DB, no network).
 *
 * Every method must throw NotImplementedError. This is the safety gate that
 * ensures live platform integration can never accidentally execute.
 */
import { describe, it, expect } from 'vitest';
import { LiveAdapter } from './live';
import { NotImplementedError } from '@/lib/ingestion/errors';
import { Platform } from '@/lib/db';

const ctx = {
  modelId: 'model-1',
  platformAccountId: 'pa-1',
  platform: Platform.ONLYFANS,
};

describe('LiveAdapter', () => {
  it('fetchFans throws NotImplementedError', () => {
    const adapter = new LiveAdapter(Platform.ONLYFANS);
    expect(() => adapter.fetchFans(ctx)).toThrow(NotImplementedError);
  });

  it('fetchTransactions throws NotImplementedError', () => {
    const adapter = new LiveAdapter(Platform.FANSLY);
    expect(() => adapter.fetchTransactions(ctx)).toThrow(NotImplementedError);
  });

  it('fetchMessages throws NotImplementedError', () => {
    const adapter = new LiveAdapter(Platform.MANYVIDS);
    expect(() => adapter.fetchMessages(ctx)).toThrow(NotImplementedError);
  });

  it('error message contains "live integration is deferred"', () => {
    const adapter = new LiveAdapter(Platform.ONLYFANS);
    expect(() => adapter.fetchFans(ctx)).toThrow(
      'live integration is deferred',
    );
  });

  it('thrown error is an instance of Error', () => {
    const adapter = new LiveAdapter(Platform.ONLYFANS);
    try {
      adapter.fetchFans(ctx);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(NotImplementedError);
    }
  });

  it('NotImplementedError has the correct name property', () => {
    const err = new NotImplementedError();
    expect(err.name).toBe('NotImplementedError');
  });

  it('platform reflects constructor argument', () => {
    expect(new LiveAdapter(Platform.MANYVIDS).platform).toBe(Platform.MANYVIDS);
    expect(new LiveAdapter(Platform.SEXTPANTHER).platform).toBe(
      Platform.SEXTPANTHER,
    );
  });

  it('all platforms produce NotImplementedError on fetchFans', () => {
    const platforms = [
      Platform.MANYVIDS,
      Platform.FANSLY,
      Platform.HIDDEN,
      Platform.ONLYFANS,
      Platform.SEXTPANTHER,
    ];
    for (const p of platforms) {
      const adapter = new LiveAdapter(p);
      expect(() => adapter.fetchFans({ ...ctx, platform: p })).toThrow(
        NotImplementedError,
      );
    }
  });
});
