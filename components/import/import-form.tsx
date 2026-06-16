'use client';

/**
 * ImportForm — client component for the CSV import page.
 *
 * Renders three textareas (fans, transactions, messages), a platform selector,
 * and a submit button. Calls the server action and displays results or errors.
 */
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  runImport,
  type ImportActionState,
} from '@/app/(dashboard)/dashboard/import/actions';
import { ALL_PLATFORMS, PLATFORM_LABELS } from '@/lib/db';

const INITIAL_STATE: ImportActionState = null;

export function ImportForm() {
  const [state, formAction, isPending] = useActionState(
    runImport,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Platform selector */}
      <div className="space-y-1">
        <Label htmlFor="platform">Platform</Label>
        <select
          id="platform"
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

      {/* Fans CSV */}
      <div className="space-y-1">
        <Label htmlFor="fansCsv">
          Fans CSV{' '}
          <span className="text-xs text-muted-foreground">
            (columns: externalRef, displayName, tags, lifetimeValueCents,
            firstSeenAt, lastSeenAt, notes)
          </span>
        </Label>
        <Textarea
          id="fansCsv"
          name="fansCsv"
          rows={6}
          placeholder="externalRef,displayName,tags,lifetimeValueCents,firstSeenAt,lastSeenAt,notes&#10;fan-001,Alice,vip|whale,0,2025-01-01,2025-06-01,"
          className="font-mono text-xs"
        />
      </div>

      {/* Transactions CSV */}
      <div className="space-y-1">
        <Label htmlFor="transactionsCsv">
          Transactions CSV{' '}
          <span className="text-xs text-muted-foreground">
            (columns: externalRef, type, grossCents, netCents, currency,
            occurredAt, fanExternalRef)
          </span>
        </Label>
        <Textarea
          id="transactionsCsv"
          name="transactionsCsv"
          rows={6}
          placeholder="externalRef,type,grossCents,netCents,currency,occurredAt,fanExternalRef&#10;tx-001,SUBSCRIPTION,1999,1699,USD,2025-03-01,fan-001"
          className="font-mono text-xs"
        />
      </div>

      {/* Messages CSV */}
      <div className="space-y-1">
        <Label htmlFor="messagesCsv">
          Messages CSV{' '}
          <span className="text-xs text-muted-foreground">
            (columns: threadFanExternalRef, externalRef, direction, body,
            sentAt)
          </span>
        </Label>
        <Textarea
          id="messagesCsv"
          name="messagesCsv"
          rows={6}
          placeholder="threadFanExternalRef,externalRef,direction,body,sentAt&#10;fan-001,msg-001,OUT,Hey!,2025-05-01T10:00:00.000Z"
          className="font-mono text-xs"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Importing…' : 'Import CSV data'}
      </Button>

      {/* Results */}
      {state && 'error' in state && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <p className="font-semibold">Import failed</p>
          <p>{state.error}</p>
        </div>
      )}

      {state && 'result' in state && (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <p className="mb-3 font-semibold">Import complete</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{state.result.fans} fans</Badge>
            <Badge variant="secondary">
              {state.result.transactions} transactions
            </Badge>
            <Badge variant="secondary">{state.result.threads} threads</Badge>
            <Badge variant="secondary">{state.result.messages} messages</Badge>
          </div>
          {state.result.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="font-medium text-destructive">
                {state.result.errors.length} row error(s):
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-destructive">
                {state.result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
