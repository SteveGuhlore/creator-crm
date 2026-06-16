/**
 * ThreadView — server component.
 *
 * Renders a single thread's messages as a read-only conversation.
 * Scoping is enforced by getThread (returns null if modelId or platform mismatch).
 *
 * Read-only. Compose/reply UI is Phase 3.
 */
import type { Platform } from '@/lib/db';
import { PLATFORM_LABELS } from '@/lib/db';
import { getThread } from '@/lib/inbox/queries';
import { messageInitiator, formatRelativeTime } from '@/lib/inbox/format';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ThreadViewProps {
  modelId: string;
  platform: Platform;
  threadId: string;
}

export async function ThreadView({
  modelId,
  platform,
  threadId,
}: ThreadViewProps) {
  const thread = await getThread(modelId, platform, threadId);

  // null means the thread doesn't exist or belongs to a different platform/model.
  if (!thread) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Thread not found or not accessible on this platform.
        </CardContent>
      </Card>
    );
  }

  const platformLabel = PLATFORM_LABELS[platform];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {thread.fanDisplayName}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            on {platformLabel}
          </span>
        </CardTitle>
        <CardDescription>
          {thread.messages.length} message
          {thread.messages.length !== 1 ? 's' : ''} &mdash; read-only
        </CardDescription>
      </CardHeader>
      <CardContent>
        {thread.messages.length === 0 ? (
          <p className="py-6 text-center text-sm italic text-muted-foreground">
            No messages in this thread.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {thread.messages.map((message) => {
              const isOut = message.direction === 'OUT';
              const initiator = messageInitiator(message.direction);
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col gap-1',
                    isOut ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-prose rounded-lg px-4 py-2 text-sm',
                      isOut
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {message.body}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge
                      variant={isOut ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {initiator}
                    </Badge>
                    <span>{formatRelativeTime(message.sentAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
