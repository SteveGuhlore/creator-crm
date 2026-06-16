import type { Platform } from '@/lib/db';

// CONTRACT (filled in by the inbox module, 2d): a server component that renders
// the SEPARATED per-platform message threads (read-only). Platform A's view
// must never show Platform B's data. Keep this export name and prop shape stable.
export interface PlatformInboxProps {
  modelId: string;
  platform: Platform;
}

export async function PlatformInbox(_props: PlatformInboxProps) {
  return (
    <div className="py-8 text-sm text-muted-foreground">
      Inbox module not yet wired.
    </div>
  );
}
