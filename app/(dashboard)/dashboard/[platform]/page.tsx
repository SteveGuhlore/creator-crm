import { notFound } from 'next/navigation';
import { PLATFORM_LABELS, platformFromSlug } from '@/lib/db';
import { getPrimaryModel, getPlatformAccount } from '@/lib/db/queries';
import { PlatformTabs } from '@/components/dashboard/platform-tabs';
import { PlatformAnalytics } from '@/components/analytics/platform-analytics';
import { PlatformInbox } from '@/components/inbox/platform-inbox';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function PlatformDashboardPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform: slug } = await params;
  const platform = platformFromSlug(slug);
  if (!platform) notFound();

  const model = await getPrimaryModel();
  if (!model) notFound();

  const account = await getPlatformAccount(model.id, platform);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{PLATFORM_LABELS[platform]}</h1>
        {account ? (
          <Badge variant="secondary">@{account.handle}</Badge>
        ) : (
          <Badge variant="outline">no account</Badge>
        )}
      </div>
      <PlatformTabs
        analytics={<PlatformAnalytics modelId={model.id} platform={platform} />}
        inbox={<PlatformInbox modelId={model.id} platform={platform} />}
      />
    </div>
  );
}
