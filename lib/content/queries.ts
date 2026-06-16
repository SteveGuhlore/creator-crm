/**
 * DB-backed content queries. Every query is scoped by modelId.
 */
import { prisma } from '@/lib/db';
import type { ContentLike } from './filter';

// ---------------------------------------------------------------------------
// listContent
// ---------------------------------------------------------------------------

/**
 * Returns all content items for a model, ordered by createdAt descending.
 * Returns a plain array of ContentLike-compatible objects (subset of the DB row).
 */
export async function listContent(modelId: string): Promise<ContentLike[]> {
  const rows = await prisma.contentItem.findMany({
    where: { modelId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      tags: true,
      durationSec: true,
      createdAt: true,
    },
  });

  return rows;
}

// ---------------------------------------------------------------------------
// getContentItem
// ---------------------------------------------------------------------------

/**
 * Returns a single content item scoped by (modelId, id).
 * Returns null if the item does not exist or belongs to a different model.
 */
export async function getContentItem(
  modelId: string,
  id: string,
): Promise<ContentLike | null> {
  const row = await prisma.contentItem.findFirst({
    where: { id, modelId },
    select: {
      id: true,
      title: true,
      type: true,
      tags: true,
      durationSec: true,
      createdAt: true,
    },
  });

  return row ?? null;
}
