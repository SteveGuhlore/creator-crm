'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/lib/db';
import type { TagCount } from '@/lib/content/filter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentFilterState = {
  search: string;
  type: ContentType | undefined;
  tags: string[];
};

export type ContentFiltersProps = {
  tagCounts: TagCount[];
  state: ContentFilterState;
  onChange: (next: ContentFilterState) => void;
};

const TYPE_OPTIONS: { label: string; value: ContentType | undefined }[] = [
  { label: 'All types', value: undefined },
  { label: 'Image', value: 'IMAGE' },
  { label: 'Video', value: 'VIDEO' },
  { label: 'Bundle', value: 'BUNDLE' },
];

// ---------------------------------------------------------------------------
// ContentFilters
// ---------------------------------------------------------------------------

/**
 * Filter controls for the content library: search, type selector, tag toggles.
 * Fully controlled — parent owns the state.
 */
export function ContentFilters({
  tagCounts,
  state,
  onChange,
}: ContentFiltersProps) {
  function setSearch(search: string) {
    onChange({ ...state, search });
  }

  function setType(type: ContentType | undefined) {
    onChange({ ...state, type });
  }

  function toggleTag(tag: string) {
    const next = state.tags.includes(tag)
      ? state.tags.filter((t) => t !== tag)
      : [...state.tags, tag];
    onChange({ ...state, tags: next });
  }

  function clearAll() {
    onChange({ search: '', type: undefined, tags: [] });
  }

  const hasActiveFilters =
    state.search.trim() !== '' ||
    state.type !== undefined ||
    state.tags.length > 0;

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        type="search"
        placeholder="Search by title…"
        value={state.search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search content by title"
      />

      {/* Type selector */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
          Type
        </p>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                'rounded-md border px-3 py-1 text-xs font-medium transition-colors',
                state.type === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
              )}
              aria-pressed={state.type === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag toggles */}
      {tagCounts.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tagCounts.map(({ tag, count }) => {
              const active = state.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {tag}
                  <span
                    className={cn(
                      'tabular-nums',
                      active ? 'opacity-80' : 'text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-7 px-2 text-xs"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
