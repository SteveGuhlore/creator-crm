import type { Platform } from '@/lib/db';

// CONTRACT (filled in by the analytics module, 2c): a server component that
// renders per-platform + per-revenue-type analytics for one platform.
// Keep this export name and prop shape stable.
export interface PlatformAnalyticsProps {
  modelId: string;
  platform: Platform;
}

export async function PlatformAnalytics(_props: PlatformAnalyticsProps) {
  return (
    <div className="py-8 text-sm text-muted-foreground">
      Analytics module not yet wired.
    </div>
  );
}
