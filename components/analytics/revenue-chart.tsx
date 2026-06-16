'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TrendBucket } from '@/lib/analytics/compute';

// ---------------------------------------------------------------------------
// Revenue trend chart
// ---------------------------------------------------------------------------

interface RevenueTrendChartProps {
  data: TrendBucket[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No trend data available.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    period: d.period,
    gross: +(d.grossCents / 100).toFixed(2),
    net: +(d.netCents / 100).toFixed(2),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `$${v}`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `$${value.toFixed(2)}`,
            name === 'gross' ? 'Gross' : 'Net',
          ]}
        />
        <Legend
          formatter={(value: string) => (value === 'gross' ? 'Gross' : 'Net')}
        />
        <Bar
          dataKey="gross"
          fill="hsl(var(--primary) / 0.35)"
          radius={[3, 3, 0, 0]}
        />
        <Bar dataKey="net" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
