import { describe, it, expect } from 'vitest';
import {
  generateFans,
  generateTransactions,
  generateThreads,
  generateContent,
  computeLifetimeValues,
} from './generators';
import { ALL_PLATFORMS, Platform, TransactionType } from '@/lib/db';
import {
  normalizedFanSchema,
  normalizedTransactionSchema,
  normalizedThreadSchema,
} from '@/lib/ingestion/types';

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('fixture generators — determinism', () => {
  it('produces identical output for the same seed', () => {
    const a = generateFans(Platform.ONLYFANS, { seed: 7, now: NOW });
    const b = generateFans(Platform.ONLYFANS, { seed: 7, now: NOW });
    expect(a).toEqual(b);
  });

  it('produces different output for different seeds', () => {
    const a = generateFans(Platform.ONLYFANS, { seed: 1, now: NOW });
    const b = generateFans(Platform.ONLYFANS, { seed: 2, now: NOW });
    expect(a).not.toEqual(b);
  });

  it('produces different data per platform', () => {
    const of = generateFans(Platform.ONLYFANS, { seed: 1, now: NOW });
    const mv = generateFans(Platform.MANYVIDS, { seed: 1, now: NOW });
    expect(of[0]?.externalRef).not.toEqual(mv[0]?.externalRef);
  });
});

describe('fixture generators — invariants', () => {
  for (const platform of ALL_PLATFORMS) {
    it(`${platform}: fans have unique externalRefs and valid shape`, () => {
      const fans = generateFans(platform, { seed: 3, now: NOW });
      expect(fans.length).toBeGreaterThan(0);
      const refs = new Set(fans.map((f) => f.externalRef));
      expect(refs.size).toBe(fans.length);
      for (const f of fans) {
        expect(() => normalizedFanSchema.parse(f)).not.toThrow();
        expect(f.lastSeenAt.getTime()).toBeGreaterThanOrEqual(
          f.firstSeenAt.getTime(),
        );
      }
    });

    it(`${platform}: transactions reference known fans and are well-formed`, () => {
      const fans = generateFans(platform, { seed: 3, now: NOW });
      const txns = generateTransactions(platform, fans, { seed: 3, now: NOW });
      const fanRefs = new Set(fans.map((f) => f.externalRef));
      const txRefs = new Set<string>();
      expect(txns.length).toBeGreaterThan(0);
      for (const tx of txns) {
        expect(() => normalizedTransactionSchema.parse(tx)).not.toThrow();
        expect(txRefs.has(tx.externalRef)).toBe(false);
        txRefs.add(tx.externalRef);
        if (tx.fanExternalRef)
          expect(fanRefs.has(tx.fanExternalRef)).toBe(true);
        expect(tx.netCents).toBeLessThanOrEqual(tx.grossCents);
        expect(Object.values(TransactionType)).toContain(tx.type);
      }
    });

    it(`${platform}: threads reference known fans with ordered messages`, () => {
      const fans = generateFans(platform, { seed: 3, now: NOW });
      const threads = generateThreads(platform, fans, { seed: 3, now: NOW });
      const fanRefs = new Set(fans.map((f) => f.externalRef));
      for (const th of threads) {
        expect(() => normalizedThreadSchema.parse(th)).not.toThrow();
        expect(fanRefs.has(th.fanExternalRef)).toBe(true);
        expect(th.messages.length).toBeGreaterThan(0);
        const last = th.messages[th.messages.length - 1]!;
        expect(th.lastMessageAt.getTime()).toBe(last.sentAt.getTime());
      }
    });

    it(`${platform}: content items are well-formed`, () => {
      const content = generateContent(platform, { seed: 3, now: NOW });
      expect(content.length).toBeGreaterThan(0);
      for (const c of content) {
        expect(c.title.length).toBeGreaterThan(0);
        expect(c.storageRef).toMatch(/^mock:\/\//);
      }
    });
  }
});

describe('computeLifetimeValues', () => {
  it('sums net cents per fan from transactions', () => {
    const fans = generateFans(Platform.FANSLY, { seed: 5, now: NOW });
    const txns = generateTransactions(Platform.FANSLY, fans, {
      seed: 5,
      now: NOW,
    });
    const ltv = computeLifetimeValues(fans, txns);
    const manual = new Map<string, number>();
    for (const tx of txns) {
      if (!tx.fanExternalRef) continue;
      manual.set(
        tx.fanExternalRef,
        (manual.get(tx.fanExternalRef) ?? 0) + tx.netCents,
      );
    }
    for (const [ref, val] of manual) {
      expect(ltv.get(ref)).toBe(val);
    }
  });
});
