/**
 * DB-backed analytics queries. Fetches data scoped strictly to (modelId, platform)
 * then delegates all aggregation to the pure functions in compute.ts.
 */
import { prisma, type Platform, ALL_PLATFORMS } from '@/lib/db';
import {
  revenueByType,
  totalRevenue,
  topFans,
  revenueTrend,
  type TxInput,
  type TypeBucket,
  type TotalRevenue,
  type FanEntry,
  type TrendBucket,
} from './compute';
import type { TransactionType } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types returned to callers
// ---------------------------------------------------------------------------

export type PlatformAnalyticsSummary = {
  totals: TotalRevenue;
  byType: Record<TransactionType, TypeBucket>;
  topFans: FanEntry[];
  trend: TrendBucket[];
};

export type PlatformOverviewEntry = {
  platform: Platform;
  totals: TotalRevenue;
};

// ---------------------------------------------------------------------------
// Per-platform analytics
// ---------------------------------------------------------------------------

/**
 * Full analytics summary for one (modelId, platform) pair.
 * Scoped by BOTH fields — never leaks cross-platform data.
 */
export async function getPlatformAnalytics(
  modelId: string,
  platform: Platform,
): Promise<PlatformAnalyticsSummary> {
  // Fetch transactions scoped to this model + platform only.
  const rawTxns = await prisma.transaction.findMany({
    where: { modelId, platform },
    orderBy: { occurredAt: 'asc' },
    select: {
      type: true,
      grossCents: true,
      netCents: true,
      occurredAt: true,
      fanId: true,
    },
  });

  const txns: TxInput[] = rawTxns.map((t) => ({
    type: t.type,
    grossCents: t.grossCents,
    netCents: t.netCents,
    occurredAt: t.occurredAt,
    fanId: t.fanId,
  }));

  // Collect unique fanIds so we can resolve display names in one query.
  const fanIds = [...new Set(txns.flatMap((t) => (t.fanId ? [t.fanId] : [])))];

  const fanNames = new Map<string, string>();
  if (fanIds.length > 0) {
    const fans = await prisma.fan.findMany({
      where: { id: { in: fanIds }, modelId, platform },
      select: { id: true, displayName: true },
    });
    for (const fan of fans) {
      fanNames.set(fan.id, fan.displayName);
    }
  }

  return {
    totals: totalRevenue(txns),
    byType: revenueByType(txns),
    topFans: topFans(txns, fanNames),
    trend: revenueTrend(txns, 'day'),
  };
}

// ---------------------------------------------------------------------------
// Overview: per-platform totals for a model
// ---------------------------------------------------------------------------

/**
 * Lightweight per-platform totals for all platforms belonging to modelId.
 * Each platform is computed independently — never summed into a single merged figure
 * unless the caller explicitly labels it as "all platforms overview".
 */
export async function getOverviewByPlatform(
  modelId: string,
): Promise<PlatformOverviewEntry[]> {
  // Single query for all transactions of this model; we'll group in memory.
  const rawTxns = await prisma.transaction.findMany({
    where: { modelId },
    select: {
      platform: true,
      type: true,
      grossCents: true,
      netCents: true,
      occurredAt: true,
      fanId: true,
    },
  });

  // Group by platform.
  const byPlatform = new Map<Platform, TxInput[]>();
  for (const tx of rawTxns) {
    const list = byPlatform.get(tx.platform);
    const entry: TxInput = {
      type: tx.type,
      grossCents: tx.grossCents,
      netCents: tx.netCents,
      occurredAt: tx.occurredAt,
      fanId: tx.fanId,
    };
    if (list) {
      list.push(entry);
    } else {
      byPlatform.set(tx.platform, [entry]);
    }
  }

  // Return in canonical display order; zero-fill platforms with no data.
  return ALL_PLATFORMS.map((platform) => ({
    platform,
    totals: totalRevenue(byPlatform.get(platform) ?? []),
  }));
}
