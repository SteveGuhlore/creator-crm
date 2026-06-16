/**
 * PlatformInbox — server component.
 *
 * Renders the SEPARATED per-platform message thread list.
 * Platform A's view never shows Platform B's data — scoping is enforced
 * at the query layer (getPlatformThreads filters by BOTH modelId AND platform).
 *
 * Read-only display only. Compose/reply UI is Phase 3.
 */
import type { Platform } from '@/lib/db';
import { PLATFORM_LABELS } from '@/lib/db';
import { getPlatformThreads } from '@/lib/inbox/queries';
import { messageInitiator, formatRelativeTime } from '@/lib/inbox/format';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface PlatformInboxProps {
  modelId: string;
  platform: Platform;
}

export async function PlatformInbox({ modelId, platform }: PlatformInboxProps) {
  const threads = await getPlatformThreads(modelId, platform);
  const platformLabel = PLATFORM_LABELS[platform];

  if (threads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{platformLabel} Inbox</CardTitle>
          <CardDescription>
            Message threads from {platformLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="mb-4 h-12 w-12 text-muted-foreground/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="text-sm font-medium text-muted-foreground">
              No message threads yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Import messages via CSV to populate the {platformLabel} inbox.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{platformLabel} Inbox</CardTitle>
        <CardDescription>
          {threads.length} thread{threads.length !== 1 ? 's' : ''} &mdash;
          read-only view
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fan</TableHead>
              <TableHead>Last message</TableHead>
              <TableHead className="w-16 text-center">Dir</TableHead>
              <TableHead className="w-16 text-right">Msgs</TableHead>
              <TableHead className="w-28 text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {threads.map((thread) => {
              const { lastBody, lastDirection, lastSentAt } = thread.preview;
              return (
                <TableRow key={thread.id}>
                  <TableCell className="font-medium">
                    {thread.fanDisplayName}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {lastBody ?? <span className="italic">No messages</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {lastDirection !== null ? (
                      <DirectionBadge direction={lastDirection} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {thread.messageCount}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {lastSentAt !== null ? formatRelativeTime(lastSentAt) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function DirectionBadge({ direction }: { direction: 'IN' | 'OUT' }) {
  const label = messageInitiator(direction);
  return (
    <Badge
      variant={direction === 'IN' ? 'secondary' : 'default'}
      className="text-xs"
    >
      {label}
    </Badge>
  );
}
