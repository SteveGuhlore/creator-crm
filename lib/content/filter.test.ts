/**
 * Pure unit tests for lib/content/filter.ts — no DB, no network.
 */
import { describe, it, expect } from 'vitest';
import { filterContent, collectTags, formatDuration } from './filter';
import { ContentType } from '@/lib/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMAGE = ContentType.IMAGE;
const VIDEO = ContentType.VIDEO;
const BUNDLE = ContentType.BUNDLE;

function makeItem(
  overrides: Partial<{
    id: string;
    title: string;
    type: (typeof ContentType)[keyof typeof ContentType];
    tags: string[];
    durationSec: number | null;
    createdAt: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? 'item-1',
    title: overrides.title ?? 'Untitled',
    type: overrides.type ?? IMAGE,
    tags: overrides.tags ?? [],
    durationSec: overrides.durationSec ?? null,
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00Z'),
  };
}

const FIXTURE = [
  makeItem({
    id: '1',
    title: 'Sunset Photo',
    type: IMAGE,
    tags: ['nature', 'sunset'],
  }),
  makeItem({
    id: '2',
    title: 'Ocean Swim Video',
    type: VIDEO,
    tags: ['ocean', 'nature'],
    durationSec: 120,
  }),
  makeItem({
    id: '3',
    title: 'Travel Bundle',
    type: BUNDLE,
    tags: ['travel', 'nature', 'ocean'],
  }),
  makeItem({
    id: '4',
    title: 'City Lights Photo',
    type: IMAGE,
    tags: ['urban', 'night'],
  }),
  makeItem({
    id: '5',
    title: 'Morning Jog Video',
    type: VIDEO,
    tags: ['fitness', 'morning'],
    durationSec: 300,
  }),
];

// ---------------------------------------------------------------------------
// filterContent — empty criteria
// ---------------------------------------------------------------------------

describe('filterContent — empty criteria', () => {
  it('returns all items when criteria object is empty', () => {
    expect(filterContent(FIXTURE, {})).toHaveLength(FIXTURE.length);
  });

  it('returns empty array when items array is empty', () => {
    expect(filterContent([], { search: 'anything' })).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const copy = [...FIXTURE];
    filterContent(FIXTURE, { search: 'Ocean' });
    expect(FIXTURE).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// filterContent — search
// ---------------------------------------------------------------------------

describe('filterContent — search', () => {
  it('matches case-insensitively', () => {
    const results = filterContent(FIXTURE, { search: 'sunset' });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('1');
  });

  it('matches partial substring in the middle of title', () => {
    const results = filterContent(FIXTURE, { search: 'wim' }); // "Swim"
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('2');
  });

  it('matches multiple items when search term spans titles', () => {
    // "Video" appears in ids 2 and 5
    const results = filterContent(FIXTURE, { search: 'video' });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain('2');
    expect(results.map((r) => r.id)).toContain('5');
  });

  it('returns empty when no title matches the search', () => {
    expect(filterContent(FIXTURE, { search: 'xyznotfound' })).toHaveLength(0);
  });

  it('treats empty string search as no filter (returns all)', () => {
    expect(filterContent(FIXTURE, { search: '' })).toHaveLength(FIXTURE.length);
  });

  it('treats whitespace-only search as no filter', () => {
    expect(filterContent(FIXTURE, { search: '   ' })).toHaveLength(
      FIXTURE.length,
    );
  });

  it('matches when search term equals full title (case-insensitive)', () => {
    const results = filterContent(FIXTURE, { search: 'TRAVEL BUNDLE' });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('3');
  });
});

// ---------------------------------------------------------------------------
// filterContent — type
// ---------------------------------------------------------------------------

describe('filterContent — type', () => {
  it('filters to only IMAGE items', () => {
    const results = filterContent(FIXTURE, { type: IMAGE });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.type === IMAGE)).toBe(true);
  });

  it('filters to only VIDEO items', () => {
    const results = filterContent(FIXTURE, { type: VIDEO });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.type === VIDEO)).toBe(true);
  });

  it('filters to only BUNDLE items', () => {
    const results = filterContent(FIXTURE, { type: BUNDLE });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('3');
  });

  it('returns all items when type is undefined', () => {
    expect(filterContent(FIXTURE, { type: undefined })).toHaveLength(
      FIXTURE.length,
    );
  });

  it('returns empty when no items match the type (fixture has no unmatched type)', () => {
    // Use a mini fixture with only images
    const images = [
      makeItem({ type: IMAGE }),
      makeItem({ id: 'b', type: IMAGE }),
    ];
    expect(filterContent(images, { type: VIDEO })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterContent — tags (AND semantics)
// ---------------------------------------------------------------------------

describe('filterContent — tags', () => {
  it('filters items that contain a single tag', () => {
    const results = filterContent(FIXTURE, { tags: ['ocean'] });
    // ids 2 and 3 both have "ocean"
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain('2');
    expect(results.map((r) => r.id)).toContain('3');
  });

  it('AND semantics: item must contain ALL provided tags', () => {
    // Both "nature" and "ocean" — only ids 2 and 3 qualify
    const results = filterContent(FIXTURE, { tags: ['nature', 'ocean'] });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain('2');
    expect(results.map((r) => r.id)).toContain('3');
  });

  it('AND semantics: three-tag intersection narrows to fewest items', () => {
    // "nature" + "ocean" + "travel" — only id 3
    const results = filterContent(FIXTURE, {
      tags: ['nature', 'ocean', 'travel'],
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('3');
  });

  it('returns empty when no item has all required tags', () => {
    const results = filterContent(FIXTURE, { tags: ['fitness', 'ocean'] });
    // No item has both fitness AND ocean
    expect(results).toHaveLength(0);
  });

  it('treats empty tags array as no filter (returns all)', () => {
    expect(filterContent(FIXTURE, { tags: [] })).toHaveLength(FIXTURE.length);
  });

  it('treats undefined tags as no filter (returns all)', () => {
    expect(filterContent(FIXTURE, { tags: undefined })).toHaveLength(
      FIXTURE.length,
    );
  });

  it('does not partial-match tags (tag must be exact element)', () => {
    // "nat" is NOT "nature"
    const results = filterContent(FIXTURE, { tags: ['nat'] });
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterContent — combined criteria
// ---------------------------------------------------------------------------

describe('filterContent — combined criteria', () => {
  it('applies search + type simultaneously', () => {
    // Search "video" + type VIDEO → both VIDEO items... but "Sunset Photo" won't match
    const results = filterContent(FIXTURE, { search: 'ocean', type: VIDEO });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('2');
  });

  it('applies search + tags simultaneously', () => {
    const results = filterContent(FIXTURE, {
      search: 'ocean',
      tags: ['nature'],
    });
    // "Ocean Swim Video" has "nature" tag and matches search
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('2');
  });

  it('applies type + tags simultaneously', () => {
    const results = filterContent(FIXTURE, { type: IMAGE, tags: ['nature'] });
    // Only "Sunset Photo" is IMAGE and has "nature"
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('1');
  });

  it('applies all three criteria simultaneously', () => {
    const results = filterContent(FIXTURE, {
      search: 'swim',
      type: VIDEO,
      tags: ['ocean'],
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('2');
  });

  it('returns empty when combined criteria match nothing', () => {
    const results = filterContent(FIXTURE, {
      search: 'sunset',
      type: VIDEO,
      tags: ['nature'],
    });
    // "Sunset Photo" is IMAGE not VIDEO
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// collectTags
// ---------------------------------------------------------------------------

describe('collectTags', () => {
  it('returns empty array for empty items', () => {
    expect(collectTags([])).toEqual([]);
  });

  it('returns empty array for items with no tags', () => {
    const items = [makeItem({ tags: [] }), makeItem({ id: 'b', tags: [] })];
    expect(collectTags(items)).toEqual([]);
  });

  it('counts each tag across all items', () => {
    const result = collectTags(FIXTURE);
    const tagMap = Object.fromEntries(result.map((t) => [t.tag, t.count]));
    // "nature" appears in ids 1, 2, 3
    expect(tagMap['nature']).toBe(3);
    // "ocean" appears in ids 2, 3
    expect(tagMap['ocean']).toBe(2);
    // "sunset" appears only in id 1
    expect(tagMap['sunset']).toBe(1);
    // "travel" appears only in id 3
    expect(tagMap['travel']).toBe(1);
  });

  it('de-duplicates: each unique tag appears exactly once in the result', () => {
    const result = collectTags(FIXTURE);
    const tags = result.map((t) => t.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('sorts tags alphabetically ascending', () => {
    const result = collectTags(FIXTURE);
    const tags = result.map((t) => t.tag);
    const sorted = [...tags].sort((a, b) => a.localeCompare(b));
    expect(tags).toEqual(sorted);
  });

  it('handles a single item with multiple tags', () => {
    const item = makeItem({ tags: ['z-tag', 'a-tag', 'm-tag'] });
    const result = collectTags([item]);
    expect(result).toEqual([
      { tag: 'a-tag', count: 1 },
      { tag: 'm-tag', count: 1 },
      { tag: 'z-tag', count: 1 },
    ]);
  });

  it('counts correctly when the same item has duplicate tags (edge case)', () => {
    // The schema is String[] so duplicates in a single item are technically possible
    const item = makeItem({ tags: ['foo', 'foo', 'bar'] });
    const result = collectTags([item]);
    const tagMap = Object.fromEntries(result.map((t) => [t.tag, t.count]));
    // "foo" appears twice in the single item
    expect(tagMap['foo']).toBe(2);
    expect(tagMap['bar']).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
  it('returns "—" for null', () => {
    expect(formatDuration(null)).toBe('—');
  });

  it('returns "0:00" for 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds under a minute correctly', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats exactly 60 seconds as "1:00"', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('formats 90 seconds as "1:30"', () => {
    expect(formatDuration(90)).toBe('1:30');
  });

  it('formats 3661 seconds as "61:01" (no hours rollover)', () => {
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('zero-pads seconds to two digits', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(601)).toBe('10:01');
  });

  it('handles single-digit seconds with zero pad', () => {
    expect(formatDuration(9)).toBe('0:09');
  });

  it('handles large durations', () => {
    // 2 hours = 7200 seconds
    expect(formatDuration(7200)).toBe('120:00');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(90.9)).toBe('1:30');
  });
});
