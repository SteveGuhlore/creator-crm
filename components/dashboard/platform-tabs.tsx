'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Client tab shell for a single platform dashboard. Section content is rendered
 * on the server and passed in as slots, keeping data-fetching server-side while
 * the tab interaction stays client-side. Strictly per-platform — never merged.
 */
export function PlatformTabs({
  analytics,
  inbox,
}: {
  analytics: React.ReactNode;
  inbox: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="analytics" className="w-full">
      <TabsList>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="inbox">Inbox</TabsTrigger>
      </TabsList>
      <TabsContent value="analytics">{analytics}</TabsContent>
      <TabsContent value="inbox">{inbox}</TabsContent>
    </Tabs>
  );
}
