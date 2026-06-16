import type { Platform } from '@/lib/db';
import { TransactionType, PLATFORM_LABELS } from '@/lib/db';
import { formatCents } from '@/lib/utils';
import { getPlatformAnalytics } from '@/lib/analytics/queries';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RevenueTrendChart } from './revenue-chart';

// CONTRACT: keep this export name and prop shape stable.
export interface PlatformAnalyticsProps {
  modelId: string;
  platform: Platform;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.SUBSCRIPTION]: 'Subscription',
  [TransactionType.DM]: 'DM',
  [TransactionType.PPV]: 'PPV',
  [TransactionType.TIP]: 'Tip',
  [TransactionType.OTHER]: 'Other',
};

const ALL_TYPES: TransactionType[] = [
  TransactionType.SUBSCRIPTION,
  TransactionType.DM,
  TransactionType.PPV,
  TransactionType.TIP,
  TransactionType.OTHER,
];

export async function PlatformAnalytics({
  modelId,
  platform,
}: PlatformAnalyticsProps) {
  const {
    totals,
    byType,
    topFans: fans,
    trend,
  } = await getPlatformAnalytics(modelId, platform);

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  if (totals.count === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No transactions recorded for {PLATFORM_LABELS[platform]} yet.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Import a CSV or run the seed to populate analytics data.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main analytics view
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Revenue</CardDescription>
            <CardTitle className="text-2xl">
              {formatCents(totals.netCents)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Gross {formatCents(totals.grossCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross Revenue</CardDescription>
            <CardTitle className="text-2xl">
              {formatCents(totals.grossCents)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Net {formatCents(totals.netCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transactions</CardDescription>
            <CardTitle className="text-2xl">{totals.count}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across {ALL_TYPES.filter((t) => byType[t].count > 0).length}{' '}
              revenue types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend</CardTitle>
          <CardDescription>Daily gross and net revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={trend} />
        </CardContent>
      </Card>

      {/* Per-type breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Type</CardTitle>
          <CardDescription>
            Breakdown per {PLATFORM_LABELS[platform]} revenue category
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ALL_TYPES.map((type) => {
                const b = byType[type];
                return (
                  <TableRow key={type}>
                    <TableCell>
                      <Badge variant={b.count > 0 ? 'secondary' : 'outline'}>
                        {TYPE_LABELS[type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {b.count > 0 ? formatCents(b.grossCents) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {b.count > 0 ? formatCents(b.netCents) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {b.count > 0 ? b.count : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top fans */}
      {fans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Fans</CardTitle>
            <CardDescription>
              By net revenue on {PLATFORM_LABELS[platform]}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fan</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fans.map((fan, i) => (
                  <TableRow key={fan.fanId}>
                    <TableCell>
                      <span className="mr-2 text-xs text-muted-foreground">
                        #{i + 1}
                      </span>
                      {fan.displayName}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCents(fan.netCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fan.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
