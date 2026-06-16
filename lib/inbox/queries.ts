/**
 * DB-backed inbox queries. Every query is scoped by BOTH modelId AND platform.
 * Cross-platform data leakage is structurally impossible — platform is always
 * in the WHERE clause, never just modelId alone.
 */
import { prisma, type Platform, type MessageDirection } from '@/lib/db';
import { threadPreview, sortThreads } from './format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessagePreview = {
  lastBody: string | null;
  lastDirection: MessageDirection | null;
  lastSentAt: Date | null;
};

export type ThreadSummary = {
  id: string;
  modelId: string;
  platform: Platform;
  platformAccountId: string;
  fanId: string;
  fanDisplayName: string;
  messageCount: number;
  lastMessageAt: Date;
  preview: MessagePreview;
};

export type MessageRow = {
  id: string;
  threadId: string;
  direction: MessageDirection;
  body: string;
  sentAt: Date;
  externalRef: string;
};

export type ThreadDetail = {
  id: string;
  modelId: string;
  platform: Platform;
  platformAccountId: string;
  fanId: string;
  fanDisplayName: string;
  lastMessageAt: Date;
  messages: MessageRow[];
};

// ---------------------------------------------------------------------------
// getPlatformThreads
// ---------------------------------------------------------------------------

/**
 * Returns all threads for a (modelId, platform) pair, ordered by
 * lastMessageAt descending. Each entry includes the fan's displayName,
 * a computed message preview, and a message count.
 *
 * Scoped by BOTH modelId AND platform — never returns cross-platform data.
 */
export async function getPlatformThreads(
  modelId: string,
  platform: Platform,
): Promise<ThreadSummary[]> {
  const rawThreads = await prisma.messageThread.findMany({
    where: { modelId, platform },
    include: {
      fan: {
        select: { displayName: true },
      },
      messages: {
        select: {
          body: true,
          direction: true,
          sentAt: true,
        },
        orderBy: { sentAt: 'asc' },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  const summaries: ThreadSummary[] = rawThreads.map((thread) => {
    const preview = threadPreview(thread.messages);
    return {
      id: thread.id,
      modelId: thread.modelId,
      platform: thread.platform,
      platformAccountId: thread.platformAccountId,
      fanId: thread.fanId,
      fanDisplayName: thread.fan.displayName,
      messageCount: thread.messages.length,
      lastMessageAt: thread.lastMessageAt,
      preview,
    };
  });

  // sortThreads provides a stable descending sort; the DB already returns desc
  // but we apply it here so the pure layer is the single source of truth.
  return sortThreads(summaries);
}

// ---------------------------------------------------------------------------
// getThread
// ---------------------------------------------------------------------------

/**
 * Returns a single thread with its messages (ordered sentAt asc) and fan info.
 *
 * Returns null if:
 * - The thread does not exist.
 * - The thread belongs to a different modelId or platform (scoping guard).
 *   This is the enforcement point: a request for thread from Platform A using
 *   Platform B's context will get null, not the data.
 */
export async function getThread(
  modelId: string,
  platform: Platform,
  threadId: string,
): Promise<ThreadDetail | null> {
  const thread = await prisma.messageThread.findFirst({
    where: {
      id: threadId,
      modelId, // must match
      platform, // must match — cross-platform isolation enforced here
    },
    include: {
      fan: {
        select: { displayName: true },
      },
      messages: {
        orderBy: { sentAt: 'asc' },
      },
    },
  });

  if (!thread) return null;

  return {
    id: thread.id,
    modelId: thread.modelId,
    platform: thread.platform,
    platformAccountId: thread.platformAccountId,
    fanId: thread.fanId,
    fanDisplayName: thread.fan.displayName,
    lastMessageAt: thread.lastMessageAt,
    messages: thread.messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      direction: m.direction,
      body: m.body,
      sentAt: m.sentAt,
      externalRef: m.externalRef,
    })),
  };
}
