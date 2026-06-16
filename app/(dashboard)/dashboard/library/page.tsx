import { getPrimaryModel } from '@/lib/db/queries';
import { listContent } from '@/lib/content/queries';
import { ContentLibrary } from '@/components/content/content-library';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const model = await getPrimaryModel();

  if (!model) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">
          No model seeded yet. Run{' '}
          <code className="font-mono text-sm">pnpm seed</code> to populate data.
        </p>
      </div>
    );
  }

  const items = await listContent(model.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Library</h1>
        <p className="text-muted-foreground">
          Vault for <strong>{model.displayName}</strong> — metadata and
          references only; no media is stored here.
        </p>
      </div>
      <ContentLibrary items={items} />
    </div>
  );
}
