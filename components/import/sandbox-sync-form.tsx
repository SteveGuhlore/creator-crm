'use client';

/**
 * SandboxSyncForm — pulls a batch of data through the local `MockLiveAdapter`
 * (the offline "sandbox"). No network, no keys, no scraping: it shapes data the
 * way a future live adapter would, so the full ingestion path can be exercised
 * end-to-end safely. A real OFAuth-style sandbox would later slot in behind the
 * deferred LiveAdapter — by deliberate choice, not tonight.
 */
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  runSandboxSync,
  type ImportActionState,
} from '@/app/(dashboard)/dashboard/import/actions';
import { ALL_PLATFORMS, PLATFORM_LABELS } from '@/lib/db';

const INITIAL_STATE: ImportActionState = null;

export function SandboxSyncForm() {
  const [state, formAction, isPending] = useActionState(
    runSandboxSync,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="sandbox-platform">Platform</Label>
        <select
          id="sandbox-platform"
          name="platform"
          required
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select a platform…</option>
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? 'Syncing sandbox…' : 'Pull sandbox data (mock-live)'}
      </Button>

      {state && 'error' in state && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <p className="font-semibold">Sandbox sync failed</p>
          <p>{state.error}</p>
        </div>
      )}

      {state && 'result' in state && (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <p className="mb-3 font-semibold">Sandbox sync complete</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{state.result.fans} fans</Badge>
            <Badge variant="secondary">
              {state.result.transactions} transactions
            </Badge>
            <Badge variant="secondary">{state.result.threads} threads</Badge>
            <Badge variant="secondary">{state.result.messages} messages</Badge>
          </div>
          {state.result.errors.length > 0 && (
            <ul className="mt-3 list-inside list-disc space-y-0.5 text-xs text-destructive">
              {state.result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
