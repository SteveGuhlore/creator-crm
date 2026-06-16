import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/rbac';
import { ALL_PLATFORMS, PLATFORM_LABELS, PLATFORM_SLUGS } from '@/lib/db';
import { PlatformNav } from '@/components/dashboard/platform-nav';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { doSignOut } from './actions';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const items = ALL_PLATFORMS.map((p) => ({
    label: PLATFORM_LABELS[p],
    slug: PLATFORM_SLUGS[p],
  }));

  const sidebar = (
    <>
      <div className="hidden px-3 pb-4 md:block">
        <p className="text-lg font-bold">Creator CRM</p>
        <p className="text-xs text-muted-foreground">Mock + CSV data</p>
      </div>
      <PlatformNav
        items={items}
        tools={[
          { label: 'Templates', href: '/dashboard/templates' },
          { label: 'Composer', href: '/dashboard/composer' },
          { label: 'Scheduled Sends', href: '/dashboard/sends' },
          { label: 'Content Library', href: '/dashboard/library' },
          { label: 'Import / Sandbox', href: '/dashboard/import' },
        ]}
      />
      <div className="mt-auto px-3 pt-4">
        <p className="truncate pb-2 text-xs text-muted-foreground">
          {user.email} · {user.role}
        </p>
        <form action={doSignOut}>
          <Button variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );

  return <DashboardShell sidebar={sidebar}>{children}</DashboardShell>;
}
