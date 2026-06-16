/**
 * Pure unit tests for lib/inbox/format.ts — no DB, no network.
 */
import { describe, it, expect } from 'vitest';
import {
  threadPreview,
  sortThreads,
  messageInitiator,
  formatRelativeTime,
} from './format';
import { MessageDirection } from '@/lib/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function msg(body: string, direction: MessageDirection, sentAt: Date) {
  return { body, direction, sentAt };
}

function thread(id: string, lastMessageAt: Date) {
  return { id, lastMessageAt };
}

const D_IN = MessageDirection.IN;
const D_OUT = MessageDirection.OUT;

// ---------------------------------------------------------------------------
// threadPreview
// ---------------------------------------------------------------------------

describe('threadPreview', () => {
  it('returns nulls for empty messages array', () => {
    const preview = threadPreview([]);
    expect(preview.lastBody).toBeNull();
    expect(preview.lastDirection).toBeNull();
    expect(preview.lastSentAt).toBeNull();
  });

  it('returns the single message as the preview for a one-message thread', () => {
    const sentAt = new Date('2025-01-01T10:00:00Z');
    const preview = threadPreview([msg('Hello', D_IN, sentAt)]);
    expect(preview.lastBody).toBe('Hello');
    expect(preview.lastDirection).toBe(D_IN);
    expect(preview.lastSentAt).toEqual(sentAt);
  });

  it('picks the message with the greatest sentAt when messages are in order', () => {
    const t1 = new Date('2025-01-01T08:00:00Z');
    const t2 = new Date('2025-01-01T09:00:00Z');
    const t3 = new Date('2025-01-01T10:00:00Z');
    const preview = threadPreview([
      msg('First', D_OUT, t1),
      msg('Second', D_IN, t2),
      msg('Third', D_OUT, t3),
    ]);
    expect(preview.lastBody).toBe('Third');
    expect(preview.lastDirection).toBe(D_OUT);
    expect(preview.lastSentAt).toEqual(t3);
  });

  it('picks the message with the greatest sentAt when messages are out of order', () => {
    const t1 = new Date('2025-01-01T10:00:00Z');
    const t2 = new Date('2025-01-01T08:00:00Z');
    const t3 = new Date('2025-01-01T09:00:00Z');
    const preview = threadPreview([
      msg('Latest', D_IN, t1),
      msg('Earliest', D_OUT, t2),
      msg('Middle', D_IN, t3),
    ]);
    expect(preview.lastBody).toBe('Latest');
    expect(preview.lastDirection).toBe(D_IN);
  });

  it('prefers the later array position when sentAt values are equal (stable tie-break)', () => {
    const sameTime = new Date('2025-06-01T12:00:00Z');
    const preview = threadPreview([
      msg('First message', D_IN, sameTime),
      msg('Second message', D_OUT, sameTime),
    ]);
    // The tie-break selects the later element in the array
    expect(preview.lastBody).toBe('Second message');
    expect(preview.lastDirection).toBe(D_OUT);
  });

  it('works with a two-message thread (IN then OUT)', () => {
    const t1 = new Date('2025-03-01T07:00:00Z');
    const t2 = new Date('2025-03-01T08:00:00Z');
    const preview = threadPreview([
      msg('Fan says hi', D_IN, t1),
      msg('You reply', D_OUT, t2),
    ]);
    expect(preview.lastBody).toBe('You reply');
    expect(preview.lastDirection).toBe(D_OUT);
    expect(preview.lastSentAt).toEqual(t2);
  });

  it('does not mutate the input array', () => {
    const messages = [
      msg('A', D_IN, new Date('2025-01-02T00:00:00Z')),
      msg('B', D_OUT, new Date('2025-01-01T00:00:00Z')),
    ];
    const copy = [...messages];
    threadPreview(messages);
    expect(messages).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// sortThreads
// ---------------------------------------------------------------------------

describe('sortThreads', () => {
  it('returns empty array for empty input', () => {
    expect(sortThreads([])).toEqual([]);
  });

  it('returns a single-element array unchanged', () => {
    const t = [thread('a', new Date('2025-06-01T00:00:00Z'))];
    expect(sortThreads(t)).toEqual(t);
  });

  it('orders threads by lastMessageAt descending', () => {
    const threads = [
      thread('oldest', new Date('2025-01-01T00:00:00Z')),
      thread('newest', new Date('2025-06-01T00:00:00Z')),
      thread('middle', new Date('2025-03-15T00:00:00Z')),
    ];
    const sorted = sortThreads(threads);
    expect(sorted.map((t) => t.id)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('is stable for equal timestamps (preserves original relative order)', () => {
    const sameTime = new Date('2025-05-01T12:00:00Z');
    const threads = [
      thread('first-in-input', sameTime),
      thread('second-in-input', sameTime),
      thread('third-in-input', sameTime),
    ];
    const sorted = sortThreads(threads);
    expect(sorted.map((t) => t.id)).toEqual([
      'first-in-input',
      'second-in-input',
      'third-in-input',
    ]);
  });

  it('does not mutate the original array', () => {
    const threads = [
      thread('b', new Date('2025-01-01T00:00:00Z')),
      thread('a', new Date('2025-06-01T00:00:00Z')),
    ];
    const originalOrder = threads.map((t) => t.id);
    sortThreads(threads);
    expect(threads.map((t) => t.id)).toEqual(originalOrder);
  });

  it('handles two threads in already-correct order', () => {
    const threads = [
      thread('newer', new Date('2025-06-01T00:00:00Z')),
      thread('older', new Date('2025-01-01T00:00:00Z')),
    ];
    const sorted = sortThreads(threads);
    expect(sorted.map((t) => t.id)).toEqual(['newer', 'older']);
  });

  it('handles two threads in reverse order', () => {
    const threads = [
      thread('older', new Date('2025-01-01T00:00:00Z')),
      thread('newer', new Date('2025-06-01T00:00:00Z')),
    ];
    const sorted = sortThreads(threads);
    expect(sorted.map((t) => t.id)).toEqual(['newer', 'older']);
  });

  it('preserves extra properties on thread objects', () => {
    const extended = [
      { id: 'a', lastMessageAt: new Date('2025-01-01T00:00:00Z'), extra: 1 },
      { id: 'b', lastMessageAt: new Date('2025-06-01T00:00:00Z'), extra: 2 },
    ];
    const sorted = sortThreads(extended);
    expect(sorted[0]!.extra).toBe(2);
    expect(sorted[1]!.extra).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// messageInitiator
// ---------------------------------------------------------------------------

describe('messageInitiator', () => {
  it('returns "Fan" for IN direction', () => {
    expect(messageInitiator(D_IN)).toBe('Fan');
  });

  it('returns "You" for OUT direction', () => {
    expect(messageInitiator(D_OUT)).toBe('You');
  });
});

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe('formatRelativeTime', () => {
  const now = new Date('2025-06-16T12:00:00Z');

  it('returns "just now" for dates under 60 seconds ago', () => {
    const date = new Date('2025-06-16T11:59:30Z'); // 30s ago
    expect(formatRelativeTime(date, now)).toBe('just now');
  });

  it('returns minutes for dates 1-59 minutes ago', () => {
    const date = new Date('2025-06-16T11:55:00Z'); // 5m ago
    expect(formatRelativeTime(date, now)).toBe('5m ago');
  });

  it('returns hours for dates 1-23 hours ago', () => {
    const date = new Date('2025-06-16T09:00:00Z'); // 3h ago
    expect(formatRelativeTime(date, now)).toBe('3h ago');
  });

  it('returns days for dates 1-29 days ago', () => {
    const date = new Date('2025-06-14T12:00:00Z'); // 2d ago
    expect(formatRelativeTime(date, now)).toBe('2d ago');
  });

  it('falls back to locale date string for dates 30+ days ago', () => {
    const date = new Date('2025-05-01T12:00:00Z'); // ~46 days ago
    const result = formatRelativeTime(date, now);
    // Should not be "Xd ago" or relative format — just a date string
    expect(result).not.toMatch(/ago$/);
  });
});
