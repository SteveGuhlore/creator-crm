'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ContentFilters, type ContentFilterState } from './content-filters';
import {
  filterContent,
  collectTags,
  formatDuration,
  type ContentLike,
} from '@/lib/content/filter';
import type { ContentType } from '@/lib/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<ContentType, string> = {
  IMAGE: 'Image',
  VIDEO: 'Video',
  BUNDLE: 'Bundle',
};

const TYPE_VARIANTS: Record<ContentType, 'default' | 'secondary' | 'outline'> =
  {
    IMAGE: 'secondary',
    VIDEO: 'default',
    BUNDLE: 'outline',
  };

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// ContentLibrary
// ---------------------------------------------------------------------------

export type ContentLibraryProps = {
  items: ContentLike[];
};

/**
 * Client component: holds filter state and renders the full content library
 * view — filters sidebar + results table.
 *
 * Filtering is done in-memory over the server-fetched item list; no round-trip
 * required for filter interactions.
 */
export function ContentLibrary({ items }: ContentLibraryProps) {
  const [filters, setFilters] = useState<ContentFilterState>({
    search: '',
    type: undefined,
    tags: [],
  });

  const tagCounts = useMemo(() => collectTags(items), [items]);

  const filtered = useMemo(
    () => filterContent(items, filters),
    [items, filters],
  );

  return (
    <div className="flex gap-6">
      {/* Sidebar — filters */}
      <aside className="w-56 shrink-0">
        <ContentFilters
          tagCounts={tagCounts}
          state={filters}
          onChange={setFilters}
        />
      </aside>

      {/* Main content area */}
      <div className="min-w-0 flex-1">
        <p className="mb-3 text-sm text-muted-foreground">
          {filtered.length === items.length
            ? `${items.length} item${items.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${items.length} item${items.length === 1 ? '' : 's'}`}
        </p>

        {filtered.length === 0 ? (
          <EmptyState hasItems={items.length > 0} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-20 text-right">Duration</TableHead>
                <TableHead className="w-32">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant={TYPE_VARIANTS[item.type]}>
                      {TYPE_LABELS[item.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.tags.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        item.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatDuration(item.durationSec)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ hasItems }: { hasItems: boolean }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed">
      <p className="text-sm font-medium text-muted-foreground">
        {hasItems
          ? 'No items match your filters.'
          : 'No content in the vault yet.'}
      </p>
      {!hasItems && (
        <p className="mt-1 text-xs text-muted-foreground">
          Run <code className="font-mono">pnpm seed</code> to populate mock
          data.
        </p>
      )}
    </div>
  );
}
