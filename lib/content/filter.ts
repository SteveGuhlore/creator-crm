/**
 * Pure content filtering helpers — no DB, no side-effects.
 * Safe to import anywhere including tests.
 */
import type { ContentType } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal content shape required by the helpers below. */
export type ContentLike = {
  id: string;
  title: string;
  type: ContentType;
  tags: string[];
  durationSec: number | null;
  createdAt: Date;
};

/** Criteria for filterContent. All fields are optional; omitted = no filter. */
export type ContentFilterCriteria = {
  /** Case-insensitive substring match on title. */
  search?: string;
  /** Exact match on ContentType enum value. */
  type?: ContentType;
  /**
   * AND semantics: item must contain ALL provided tags.
   * Empty array or undefined = no tag filtering.
   */
  tags?: string[];
};

/** Tag entry returned by collectTags. */
export type TagCount = {
  tag: string;
  count: number;
};

// ---------------------------------------------------------------------------
// filterContent
// ---------------------------------------------------------------------------

/**
 * Returns items matching ALL provided criteria.
 *
 * - search: case-insensitive substring on title. Absent/empty = match all.
 * - type:   exact ContentType enum value. Absent/undefined = match all.
 * - tags:   item must contain EVERY tag in the list (AND semantics).
 *           Empty array or undefined = match all.
 *
 * The input array is not mutated.
 */
export function filterContent<T extends ContentLike>(
  items: T[],
  criteria: ContentFilterCriteria,
): T[] {
  const { search, type, tags } = criteria;

  const trimmedSearch = search?.trim().toLowerCase() ?? '';
  const filterTags = tags && tags.length > 0 ? tags : null;

  return items.filter((item) => {
    // --- search ---
    if (trimmedSearch && !item.title.toLowerCase().includes(trimmedSearch)) {
      return false;
    }

    // --- type ---
    if (type !== undefined && item.type !== type) {
      return false;
    }

    // --- tags (AND: item must have ALL requested tags) ---
    if (filterTags !== null) {
      for (const requiredTag of filterTags) {
        if (!item.tags.includes(requiredTag)) {
          return false;
        }
      }
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// collectTags
// ---------------------------------------------------------------------------

/**
 * Returns a sorted (alphabetically ascending) list of unique tags with
 * the count of items that carry each tag. Handles empty arrays gracefully.
 */
export function collectTags(items: ContentLike[]): TagCount[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

/**
 * Formats a duration in seconds as "mm:ss".
 * Returns '—' when durationSec is null (e.g. images and bundles).
 *
 * Examples:
 *   null  → '—'
 *   0     → '0:00'
 *   45    → '0:45'
 *   90    → '1:30'
 *   3661  → '61:01'
 */
export function formatDuration(durationSec: number | null): string {
  if (durationSec === null) return '—';

  const totalSec = Math.max(0, Math.floor(durationSec));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
