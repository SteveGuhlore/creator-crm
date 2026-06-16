'use server';

import { requireUser } from '@/lib/auth/rbac';
import { getPrimaryModel, getPlatformAccount } from '@/lib/db/queries';
import { zPlatform } from '@/lib/validation/common';
import { ManualCsvAdapter } from '@/lib/ingestion/adapters/manual-csv';
import { MockLiveAdapter } from '@/lib/ingestion/adapters/mock-live';
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

/**
 * Sandbox sync — pulls a batch of data through the `MockLiveAdapter`, the safe
 * local "sandbox" that shapes data like a future live adapter would WITHOUT any
 * network call or account scraping. This is how you exercise the full ingestion
 * path end-to-end without touching a real platform. (A real OFAuth-style sandbox
 * would slot in behind the deferred `LiveAdapter` later — by deliberate choice.)
 */
export async function runSandboxSync(
  _prev: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  let actorUserId: string;
  try {
    const user = await requireUser();
    actorUserId = user.id;
  } catch {
    return { error: 'Authentication required.' };
  }

  const platformResult = zPlatform.safeParse(formData.get('platform'));
  if (!platformResult.success) {
    return { error: 'Please select a valid platform.' };
  }
  const platform = platformResult.data;

  const model = await getPrimaryModel();
  if (!model) {
    return { error: 'No model found. Run `pnpm seed` first.' };
  }
  const platformAccount = await getPlatformAccount(model.id, platform);
  if (!platformAccount) {
    return { error: `No platform account found for ${platform}.` };
  }

  // Vary the seed each run so the sandbox produces fresh-but-deterministic data.
  const seed = Number(formData.get('seed') ?? Date.now() % 100000);
  const ctx: IngestCtx = {
    modelId: model.id,
    platformAccountId: platformAccount.id,
    platform,
  };

  try {
    const adapter = new MockLiveAdapter(platform, { seed });
    const result = await ingest(adapter, ctx, { actorUserId });
    return { result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { error: message };
  }
}
