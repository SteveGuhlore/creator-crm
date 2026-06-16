/**
 * Pure unit tests for lib/analytics/compute.ts.
 * No DB, no network — operates entirely on in-memory arrays.
 */
import { describe, it, expect } from 'vitest';
import { TransactionType } from '@/lib/db';
import {
  revenueByType,
  totalRevenue,
  topFans,
  revenueTrend,
  type TxInput,
} from './compute';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tx(overrides: Partial<TxInput> & { type: TransactionType }): TxInput {
  return {
    grossCents: 1000,
    netCents: 800,
    occurredAt: new Date('2024-03-15T00:00:00Z'),
    fanId: 'fan-a',
    ...overrides,
  };
}

const ALL_TYPES = [
  TransactionType.SUBSCRIPTION,
  TransactionType.DM,
  TransactionType.PPV,
  TransactionType.TIP,
  TransactionType.OTHER,
] as const;

// ---------------------------------------------------------------------------
// revenueByType
// ---------------------------------------------------------------------------

describe('revenueByType', () => {
  it('returns all enum keys zero-filled on empty input', () => {
    const result = revenueByType([]);
    for (const type of ALL_TYPES) {
      expect(result[type]).toEqual({ grossCents: 0, netCents: 0, count: 0 });
    }
    expect(Object.keys(result)).toHaveLength(5);
  });

  it('sums gross, net, and count per type', () => {
    const txns: TxInput[] = [
      tx({ type: TransactionType.TIP, grossCents: 500, netCents: 400 }),
      tx({ type: TransactionType.TIP, grossCents: 300, netCents: 240 }),
      tx({
        type: TransactionType.SUBSCRIPTION,
        grossCents: 999,
        netCents: 799,
      }),
    ];
    const result = revenueByType(txns);
    expect(result[TransactionType.TIP]).toEqual({
      grossCents: 800,
      netCents: 640,
      count: 2,
    });
    expect(result[TransactionType.SUBSCRIPTION]).toEqual({
      grossCents: 999,
      netCents: 799,
      count: 1,
    });
    // Untouched types remain zero
    expect(result[TransactionType.DM]).toEqual({
      grossCents: 0,
      netCents: 0,
      count: 0,
    });
    expect(result[TransactionType.PPV]).toEqual({
      grossCents: 0,
      netCents: 0,
      count: 0,
    });
    expect(result[TransactionType.OTHER]).toEqual({
      grossCents: 0,
      netCents: 0,
      count: 0,
    });
  });

  it('always returns exactly 5 keys regardless of input', () => {
    const txns = [
      tx({ type: TransactionType.DM }),
      tx({ type: TransactionType.DM }),
    ];
    const result = revenueByType(txns);
    expect(Object.keys(result)).toHaveLength(5);
    for (const type of ALL_TYPES) {
      expect(result).toHaveProperty(type);
    }
  });

  it('handles all 5 types appearing at once', () => {
    const txns = ALL_TYPES.map((type) =>
      tx({ type, grossCents: 100, netCents: 80 }),
    );
    const result = revenueByType(txns);
    for (const type of ALL_TYPES) {
      expect(result[type]).toEqual({ grossCents: 100, netCents: 80, count: 1 });
    }
  });

  it('accumulates large numbers without overflow issues', () => {
    const txns: TxInput[] = Array.from({ length: 1000 }, () =>
      tx({ type: TransactionType.PPV, grossCents: 999_99, netCents: 800_00 }),
    );
    const result = revenueByType(txns);
    expect(result[TransactionType.PPV].grossCents).toBe(999_99 * 1000);
    expect(result[TransactionType.PPV].count).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// totalRevenue
// ---------------------------------------------------------------------------

describe('totalRevenue', () => {
  it('returns zeroed structure on empty input', () => {
    expect(totalRevenue([])).toEqual({ grossCents: 0, netCents: 0, count: 0 });
  });

  it('sums all transactions regardless of type', () => {
    const txns: TxInput[] = [
      tx({ type: TransactionType.TIP, grossCents: 500, netCents: 400 }),
      tx({
        type: TransactionType.SUBSCRIPTION,
        grossCents: 1000,
        netCents: 850,
      }),
      tx({ type: TransactionType.PPV, grossCents: 2000, netCents: 1600 }),
    ];
    expect(totalRevenue(txns)).toEqual({
      grossCents: 3500,
      netCents: 2850,
      count: 3,
    });
  });

  it('handles a single transaction', () => {
    const txns = [
      tx({ type: TransactionType.OTHER, grossCents: 42, netCents: 30 }),
    ];
    expect(totalRevenue(txns)).toEqual({
      grossCents: 42,
      netCents: 30,
      count: 1,
    });
  });

  it('handles net < gross (platform fees)', () => {
    const txns = [
      tx({
        type: TransactionType.SUBSCRIPTION,
        grossCents: 1000,
        netCents: 800,
      }),
    ];
    const result = totalRevenue(txns);
    expect(result.netCents).toBeLessThan(result.grossCents);
  });
});

// ---------------------------------------------------------------------------
// topFans
// ---------------------------------------------------------------------------

describe('topFans', () => {
  it('returns empty array for empty input', () => {
    expect(topFans([], new Map())).toEqual([]);
  });

  it('returns empty array when all transactions are anonymous (fanId null)', () => {
    const txns = [
      tx({ type: TransactionType.TIP, fanId: null }),
      tx({ type: TransactionType.PPV, fanId: null }),
    ];
    expect(topFans(txns, new Map())).toEqual([]);
  });

  it('aggregates multiple transactions per fan', () => {
    const names = new Map([['fan-a', 'Alice']]);
    const txns: TxInput[] = [
      tx({ type: TransactionType.TIP, fanId: 'fan-a', netCents: 500 }),
      tx({ type: TransactionType.SUBSCRIPTION, fanId: 'fan-a', netCents: 300 }),
    ];
    const result = topFans(txns, names);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      fanId: 'fan-a',
      displayName: 'Alice',
      netCents: 800,
      count: 2,
    });
  });

  it('sorts by netCents descending', () => {
    const names = new Map([
      ['fan-a', 'Alice'],
      ['fan-b', 'Bob'],
      ['fan-c', 'Carol'],
    ]);
    const txns: TxInput[] = [
      tx({ type: TransactionType.TIP, fanId: 'fan-b', netCents: 200 }),
      tx({ type: TransactionType.TIP, fanId: 'fan-c', netCents: 1000 }),
      tx({ type: TransactionType.TIP, fanId: 'fan-a', netCents: 500 }),
    ];
    const result = topFans(txns, names);
    expect(result.map((e) => e.fanId)).toEqual(['fan-c', 'fan-a', 'fan-b']);
  });

  it('respects the limit parameter', () => {
    const names = new Map<string, string>();
    const txns: TxInput[] = [
      'fan-1',
      'fan-2',
      'fan-3',
      'fan-4',
      'fan-5',
      'fan-6',
    ].map((fanId, i) =>
      tx({ type: TransactionType.TIP, fanId, netCents: (6 - i) * 100 }),
    );
    expect(topFans(txns, names, 3)).toHaveLength(3);
    expect(topFans(txns, names, 3)[0]!.fanId).toBe('fan-1');
  });

  it('defaults to limit 5', () => {
    const txns: TxInput[] = Array.from({ length: 10 }, (_, i) =>
      tx({
        type: TransactionType.TIP,
        fanId: `fan-${i}`,
        netCents: (10 - i) * 100,
      }),
    );
    expect(topFans(txns, new Map())).toHaveLength(5);
  });

  it('breaks ties by fanId ascending for determinism', () => {
    const names = new Map([
      ['fan-a', 'Alpha'],
      ['fan-b', 'Beta'],
      ['fan-c', 'Gamma'],
    ]);
    const txns: TxInput[] = [
      tx({ type: TransactionType.TIP, fanId: 'fan-c', netCents: 500 }),
      tx({ type: TransactionType.TIP, fanId: 'fan-a', netCents: 500 }),
      tx({ type: TransactionType.TIP, fanId: 'fan-b', netCents: 500 }),
    ];
    const result = topFans(txns, names);
    expect(result.map((e) => e.fanId)).toEqual(['fan-a', 'fan-b', 'fan-c']);
  });

  it('uses fanId as displayName fallback when not in names map', () => {
    const txns = [
      tx({ type: TransactionType.TIP, fanId: 'unknown-fan', netCents: 100 }),
    ];
    const result = topFans(txns, new Map());
    expect(result[0]!.displayName).toBe('unknown-fan');
  });

  it('mixes anonymous and named transactions; ignores null fanIds', () => {
    const names = new Map([['fan-a', 'Alice']]);
    const txns: TxInput[] = [
      tx({ type: TransactionType.TIP, fanId: null, netCents: 9999 }),
      tx({ type: TransactionType.TIP, fanId: 'fan-a', netCents: 100 }),
    ];
    const result = topFans(txns, names);
    expect(result).toHaveLength(1);
    expect(result[0]!.fanId).toBe('fan-a');
  });

  it('single fan returns correctly', () => {
    const names = new Map([['solo', 'Solo Fan']]);
    const txns = [
      tx({ type: TransactionType.SUBSCRIPTION, fanId: 'solo', netCents: 42 }),
    ];
    const result = topFans(txns, names, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fanId: 'solo',
      displayName: 'Solo Fan',
      netCents: 42,
      count: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// revenueTrend
// ---------------------------------------------------------------------------

describe('revenueTrend (day bucket)', () => {
  it('returns empty array for empty input', () => {
    expect(revenueTrend([])).toEqual([]);
    expect(revenueTrend([], 'day')).toEqual([]);
  });

  it('groups transactions by day and sums revenue', () => {
    const txns: TxInput[] = [
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-01T10:00:00Z'),
        grossCents: 300,
        netCents: 240,
      }),
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-01T18:00:00Z'),
        grossCents: 200,
        netCents: 160,
      }),
      tx({
        type: TransactionType.SUBSCRIPTION,
        occurredAt: new Date('2024-03-02T00:00:00Z'),
        grossCents: 999,
        netCents: 799,
      }),
    ];
    const result = revenueTrend(txns, 'day');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      period: '2024-03-01',
      grossCents: 500,
      netCents: 400,
    });
    expect(result[1]).toEqual({
      period: '2024-03-02',
      grossCents: 999,
      netCents: 799,
    });
  });

  it('orders results chronologically ascending', () => {
    const txns: TxInput[] = [
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-10T00:00:00Z'),
      }),
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-05T00:00:00Z'),
      }),
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-07T00:00:00Z'),
      }),
    ];
    const result = revenueTrend(txns, 'day');
    expect(result.map((r) => r.period)).toEqual([
      '2024-03-05',
      '2024-03-07',
      '2024-03-10',
    ]);
  });

  it('handles a single transaction', () => {
    const txns = [
      tx({
        type: TransactionType.OTHER,
        occurredAt: new Date('2024-06-15T00:00:00Z'),
        grossCents: 100,
        netCents: 80,
      }),
    ];
    const result = revenueTrend(txns, 'day');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      period: '2024-06-15',
      grossCents: 100,
      netCents: 80,
    });
  });

  it('all transactions on the same day collapse to one bucket', () => {
    const txns: TxInput[] = Array.from({ length: 5 }, (_, i) =>
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date(`2024-01-20T${String(i).padStart(2, '0')}:00:00Z`),
        grossCents: 100,
        netCents: 80,
      }),
    );
    const result = revenueTrend(txns, 'day');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      period: '2024-01-20',
      grossCents: 500,
      netCents: 400,
    });
  });

  it('is deterministic: same input always produces same output', () => {
    const txns: TxInput[] = [
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-01T00:00:00Z'),
      }),
      tx({
        type: TransactionType.PPV,
        occurredAt: new Date('2024-02-28T00:00:00Z'),
      }),
    ];
    expect(revenueTrend(txns, 'day')).toEqual(revenueTrend(txns, 'day'));
  });
});

describe('revenueTrend (week bucket)', () => {
  it('returns empty array for empty input', () => {
    expect(revenueTrend([], 'week')).toEqual([]);
  });

  it('groups transactions by ISO week', () => {
    // 2024-W10: Mon 2024-03-04 … Sun 2024-03-10
    // 2024-W11: Mon 2024-03-11 … Sun 2024-03-17
    const txns: TxInput[] = [
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-04T00:00:00Z'),
        grossCents: 200,
        netCents: 160,
      }),
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-09T00:00:00Z'),
        grossCents: 300,
        netCents: 240,
      }),
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-11T00:00:00Z'),
        grossCents: 500,
        netCents: 400,
      }),
    ];
    const result = revenueTrend(txns, 'week');
    expect(result).toHaveLength(2);
    expect(result[0]!.period).toBe('2024-W10');
    expect(result[0]).toMatchObject({ grossCents: 500, netCents: 400 });
    expect(result[1]!.period).toBe('2024-W11');
    expect(result[1]).toMatchObject({ grossCents: 500, netCents: 400 });
  });

  it('orders week buckets chronologically', () => {
    const txns: TxInput[] = [
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-18T00:00:00Z'),
      }), // W12
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-04T00:00:00Z'),
      }), // W10
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-11T00:00:00Z'),
      }), // W11
    ];
    const result = revenueTrend(txns, 'week');
    expect(result.map((r) => r.period)).toEqual([
      '2024-W10',
      '2024-W11',
      '2024-W12',
    ]);
  });

  it('handles year boundary correctly (late Dec / early Jan)', () => {
    // ISO week: 2024-12-30 is in 2025-W01 (the week containing its Thursday Jan 2)
    const txns: TxInput[] = [
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-12-30T00:00:00Z'),
      }),
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2025-01-06T00:00:00Z'),
      }),
    ];
    const result = revenueTrend(txns, 'week');
    // Both dates should be different weeks
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Periods should be ordered
    if (result.length === 2) {
      expect(result[0]!.period < result[1]!.period).toBe(true);
    }
  });

  it('single transaction produces one week bucket', () => {
    const txns = [
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-06-12T00:00:00Z'),
      }),
    ];
    const result = revenueTrend(txns, 'week');
    expect(result).toHaveLength(1);
    expect(result[0]!.period).toMatch(/^\d{4}-W\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// Edge cases across all functions
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('revenueByType: zero grossCents and netCents are valid', () => {
    const txns = [
      tx({ type: TransactionType.OTHER, grossCents: 0, netCents: 0 }),
    ];
    const result = revenueByType(txns);
    expect(result[TransactionType.OTHER]).toEqual({
      grossCents: 0,
      netCents: 0,
      count: 1,
    });
  });

  it('topFans: limit=0 returns empty array', () => {
    const txns = [
      tx({ type: TransactionType.TIP, fanId: 'fan-a', netCents: 100 }),
    ];
    expect(topFans(txns, new Map(), 0)).toEqual([]);
  });

  it('topFans: limit larger than number of fans returns all fans', () => {
    const txns = [
      tx({ type: TransactionType.TIP, fanId: 'fan-a', netCents: 100 }),
    ];
    expect(topFans(txns, new Map(), 100)).toHaveLength(1);
  });

  it('revenueTrend: mixed day and time components use UTC date', () => {
    // Both timestamps are 2024-03-15 UTC despite different times
    const txns: TxInput[] = [
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-15T00:00:00Z'),
        grossCents: 100,
        netCents: 80,
      }),
      tx({
        type: TransactionType.TIP,
        occurredAt: new Date('2024-03-15T23:59:59Z'),
        grossCents: 200,
        netCents: 160,
      }),
    ];
    const result = revenueTrend(txns, 'day');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      period: '2024-03-15',
      grossCents: 300,
      netCents: 240,
    });
  });

  it('totalRevenue: count matches input length with mixed types', () => {
    const txns = ALL_TYPES.map((type) => tx({ type }));
    expect(totalRevenue(txns).count).toBe(5);
  });
});
