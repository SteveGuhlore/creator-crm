'use server';

import { requireUser } from '@/lib/auth/rbac';
import { getPrimaryModel, getPlatformAccount } from '@/lib/db/queries';
import { zPlatform } from '@/lib/validation/common';
import { ManualCsvAdapter } from '@/lib/ingestion/adapters/manual-csv';
import { ingest, type IngestResult } from '@/lib/ingestion/service';
import type { IngestCtx } from '@/lib/ingestion/types';

export type ImportActionState =
  | null
  | { error: string }
  | { result: IngestResult };

export async function runImport(
  _prev: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  // Auth gate — must be a logged-in user.
  let actorUserId: string;
  try {
    const user = await requireUser();
    actorUserId = user.id;
  } catch {
    return { error: 'Authentication required.' };
  }

  // Validate platform.
  const rawPlatform = formData.get('platform');
  const platformResult = zPlatform.safeParse(rawPlatform);
  if (!platformResult.success) {
    return { error: 'Please select a valid platform.' };
  }
  const platform = platformResult.data;

  // Look up the primary model's platform account for the selected platform.
  const model = await getPrimaryModel();
  if (!model) {
    return {
      error: 'No model found. Run `pnpm seed` to populate the database first.',
    };
  }

  const platformAccount = await getPlatformAccount(model.id, platform);
  if (!platformAccount) {
    return {
      error: `No platform account found for ${platform}. Ensure the DB is seeded.`,
    };
  }

  // Extract CSV text from form fields (empty string if not provided).
  const fansCsv = (formData.get('fansCsv') as string | null) ?? '';
  const transactionsCsv =
    (formData.get('transactionsCsv') as string | null) ?? '';
  const messagesCsv = (formData.get('messagesCsv') as string | null) ?? '';

  const ctx: IngestCtx = {
    modelId: model.id,
    platformAccountId: platformAccount.id,
    platform,
    raw: { fansCsv, transactionsCsv, messagesCsv },
  };

  try {
    const adapter = new ManualCsvAdapter(platform);
    const result = await ingest(adapter, ctx, { actorUserId });
    return { result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { error: message };
  }
}
