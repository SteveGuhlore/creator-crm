/**
 * Pure analytics computation functions — no DB, operate on plain arrays.
 * All functions handle empty input gracefully (zeroed structures, no throw).
 */
import { TransactionType } from '@/lib/db';

export type TxInput = {
  type: TransactionType;
  grossCents: number;
  netCents: number;
  occurredAt: Date;
  fanId: string | null;
};

// ---------------------------------------------------------------------------
// Revenue by type
// ---------------------------------------------------------------------------

export type TypeBucket = {
  grossCents: number;
  netCents: number;
  count: number;
};

/** All enum keys are always present, zero-filled if there are no matching txns. */
export function revenueByType(
  txns: TxInput[],
): Record<TransactionType, TypeBucket> {
  const zero = (): TypeBucket => ({ grossCents: 0, netCents: 0, count: 0 });

  const result: Record<TransactionType, TypeBucket> = {
    [TransactionType.SUBSCRIPTION]: zero(),
    [TransactionType.DM]: zero(),
    [TransactionType.PPV]: zero(),
    [TransactionType.TIP]: zero(),
    [TransactionType.OTHER]: zero(),
  };

  for (const tx of txns) {
    const bucket = result[tx.type];
    bucket.grossCents += tx.grossCents;
    bucket.netCents += tx.netCents;
    bucket.count += 1;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Total revenue
// ---------------------------------------------------------------------------

export type TotalRevenue = {
  grossCents: number;
  netCents: number;
  count: number;
};

export function totalRevenue(txns: TxInput[]): TotalRevenue {
  let grossCents = 0;
  let netCents = 0;
  for (const tx of txns) {
    grossCents += tx.grossCents;
    netCents += tx.netCents;
  }
  return { grossCents, netCents, count: txns.length };
}

// ---------------------------------------------------------------------------
// Top fans
// ---------------------------------------------------------------------------

export type FanEntry = {
  fanId: string;
  displayName: string;
  netCents: number;
  count: number;
};

/**
 * Top fans by net revenue, descending. Excludes anonymous transactions
 * (fanId null). Ties are broken by fanId for determinism.
 */
export function topFans(
  txns: TxInput[],
  fanNames: Map<string, string>,
  limit = 5,
): FanEntry[] {
  const map = new Map<string, { netCents: number; count: number }>();

  for (const tx of txns) {
    if (tx.fanId === null) continue;
    const existing = map.get(tx.fanId);
    if (existing) {
      existing.netCents += tx.netCents;
      existing.count += 1;
    } else {
      map.set(tx.fanId, { netCents: tx.netCents, count: 1 });
    }
  }

  const entries: FanEntry[] = [];
  for (const [fanId, agg] of map) {
    entries.push({
      fanId,
      displayName: fanNames.get(fanId) ?? fanId,
      netCents: agg.netCents,
      count: agg.count,
    });
  }

  // Sort descending by netCents; tie-break by fanId ascending (deterministic).
  entries.sort((a, b) => {
    if (b.netCents !== a.netCents) return b.netCents - a.netCents;
    return a.fanId < b.fanId ? -1 : a.fanId > b.fanId ? 1 : 0;
  });

  return entries.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Revenue trend
// ---------------------------------------------------------------------------

export type TrendBucket = {
  period: string;
  grossCents: number;
  netCents: number;
};

/**
 * Revenue bucketed by day (ISO date "YYYY-MM-DD") or week (ISO week "YYYY-Www").
 * Results are ordered chronologically (ascending period string — ISO formats
 * sort correctly lexicographically).
 */
export function revenueTrend(
  txns: TxInput[],
  bucket: 'day' | 'week' = 'day',
): TrendBucket[] {
  const map = new Map<string, { grossCents: number; netCents: number }>();

  for (const tx of txns) {
    const period =
      bucket === 'day' ? toDayKey(tx.occurredAt) : toWeekKey(tx.occurredAt);
    const existing = map.get(period);
    if (existing) {
      existing.grossCents += tx.grossCents;
      existing.netCents += tx.netCents;
    } else {
      map.set(period, { grossCents: tx.grossCents, netCents: tx.netCents });
    }
  }

  const result: TrendBucket[] = [];
  for (const [period, agg] of map) {
    result.push({ period, grossCents: agg.grossCents, netCents: agg.netCents });
  }

  // ISO date/week strings sort lexicographically = chronologically.
  result.sort((a, b) =>
    a.period < b.period ? -1 : a.period > b.period ? 1 : 0,
  );

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns an ISO 8601 week key "YYYY-Www" using the UTC date components.
 * Uses a simple Thursday-based ISO week algorithm.
 */
function toWeekKey(date: Date): string {
  // Create a UTC-based Date to work with
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // ISO week: the week containing Thursday → the week's year is the year of
  // that Thursday. Shift so Monday = 0 … Sunday = 6.
  const day = (d.getUTCDay() + 6) % 7; // 0 = Mon … 6 = Sun
  // Nearest Thursday: current day + (3 - day) days
  d.setUTCDate(d.getUTCDate() + 3 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  // Week number = ceil of (day diff from Jan-4 / 7) + 1
  const yearDay0 = (yearStart.getUTCDay() + 6) % 7; // Monday=0
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - yearStart.getTime()) / 86_400_000 + yearDay0) / 7,
    );
  const year = d.getUTCFullYear();
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}
