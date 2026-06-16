import Link from 'next/link';
import { ALL_PLATFORMS, PLATFORM_LABELS, PLATFORM_SLUGS } from '@/lib/db';
import { getPrimaryModel, getPlatformCounts } from '@/lib/db/queries';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const model = await getPrimaryModel();
  if (!model) {
    return (
      <EmptyState message="No model seeded yet. Run `pnpm seed` to populate data." />
    );
  }

  const counts = await Promise.all(
    ALL_PLATFORMS.map(async (p) => ({
      platform: p,
      ...(await getPlatformCounts(model.id, p)),
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Managing <strong>{model.displayName}</strong> across{' '}
          {ALL_PLATFORMS.length} platforms. Each platform has its own separated
          dashboard.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map((c) => (
          <Link
            key={c.platform}
            href={`/dashboard/${PLATFORM_SLUGS[c.platform]}`}
          >
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle>{PLATFORM_LABELS[c.platform]}</CardTitle>
                <CardDescription>
                  {c.fans} fans · {c.transactions} transactions · {c.threads}{' '}
                  threads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-primary">Open dashboard →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
