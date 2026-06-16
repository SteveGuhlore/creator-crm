/**
 * Pure inbox formatting helpers — no DB, no side-effects.
 * Safe to import anywhere including tests.
 */
import type { MessageDirection } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal message shape required by the helpers below. */
export type MessageLike = {
  body: string;
  direction: MessageDirection;
  sentAt: Date;
};

/** Minimal thread shape required by sortThreads. */
export type ThreadLike = {
  id: string;
  lastMessageAt: Date;
};

export type ThreadPreview = {
  lastBody: string | null;
  lastDirection: MessageDirection | null;
  lastSentAt: Date | null;
};

// ---------------------------------------------------------------------------
// threadPreview
// ---------------------------------------------------------------------------

/**
 * Returns the preview fields derived from a thread's messages.
 * The "last" message is the one with the greatest sentAt.
 * When messages is empty, all fields are null (never throws).
 * Tie-breaking on equal sentAt: the message that appears later in the input
 * array is preferred (stable, predictable).
 */
export function threadPreview(messages: MessageLike[]): ThreadPreview {
  if (messages.length === 0) {
    return { lastBody: null, lastDirection: null, lastSentAt: null };
  }

  let latest = messages[0]!;
  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i]!;
    if (msg.sentAt.getTime() >= latest.sentAt.getTime()) {
      latest = msg;
    }
  }

  return {
    lastBody: latest.body,
    lastDirection: latest.direction,
    lastSentAt: latest.sentAt,
  };
}

// ---------------------------------------------------------------------------
// sortThreads
// ---------------------------------------------------------------------------

/**
 * Returns threads ordered by lastMessageAt descending (newest first).
 * Stable: threads with equal lastMessageAt retain their original relative order.
 * The input array is not mutated.
 */
export function sortThreads<T extends ThreadLike>(threads: T[]): T[] {
  return [...threads].sort((a, b) => {
    const diff = b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    return diff; // equal times → diff === 0, preserving stable order
  });
}

// ---------------------------------------------------------------------------
// messageInitiator
// ---------------------------------------------------------------------------

/**
 * Human-readable label for the direction of a message.
 * IN = fan sent it; OUT = creator sent it.
 */
export function messageInitiator(direction: MessageDirection): 'Fan' | 'You' {
  return direction === 'IN' ? 'Fan' : 'You';
}

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

/**
 * Very lightweight relative-time formatter (no library dependency).
 * Produces strings like "just now", "5m ago", "3h ago", "2d ago".
 * Falls back to the locale date string for dates older than 30 days.
 */
export function formatRelativeTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
