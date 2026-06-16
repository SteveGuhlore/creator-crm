/**
 * ManualCsvAdapter — parses pasted/uploaded CSV text into normalized records.
 *
 * CSV text is supplied via `ctx.raw.fansCsv`, `ctx.raw.transactionsCsv`, and
 * `ctx.raw.messagesCsv`. Each is optional; missing ones return an empty array.
 *
 * Row-level errors (bad enum, non-numeric cents, missing required col, …) are
 * collected and returned alongside the valid rows — one bad row never aborts
 * the whole import.
 */
import { parse } from 'csv-parse/sync';
import {
  normalizedFanSchema,
  normalizedTransactionSchema,
  normalizedMessageSchema,
  type NormalizedFan,
  type NormalizedTransaction,
  type NormalizedThread,
  type NormalizedMessage,
  type IngestCtx,
  type IngestionAdapter,
} from '@/lib/ingestion/types';
import type { Platform } from '@/lib/db';

export interface CsvRowError {
  row: number;
  field?: string;
  message: string;
}

export interface CsvParseResult<T> {
  records: T[];
  errors: CsvRowError[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parse CSV text into raw string-keyed objects. Returns [] for blank input. */
function parseCsv(text: string): Record<string, string>[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return parse(trimmed, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as Record<string, string>[];
}

/** Coerce a string that represents an integer (cents) or return NaN. */
function parseCents(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return NaN;
  const n = Number(raw.trim());
  return Number.isInteger(n) ? n : NaN;
}

/** Split a pipe-separated tag string into an array (empty string → []). */
function parseTags(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') return [];
  return raw
    .split('|')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// Fan CSV parser
// ---------------------------------------------------------------------------
// Columns: externalRef,displayName,tags,lifetimeValueCents,firstSeenAt,lastSeenAt,notes

export function parseFansCsv(text: string): CsvParseResult<NormalizedFan> {
  const records: NormalizedFan[] = [];
  const errors: CsvRowError[] = [];

  let rows: Record<string, string>[];
  try {
    rows = parseCsv(text);
  } catch (e) {
    errors.push({ row: 0, message: `CSV parse error: ${String(e)}` });
    return { records, errors };
  }

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2; // 1-based, row 1 = header
    const result = normalizedFanSchema.safeParse({
      externalRef: raw['externalRef'],
      displayName: raw['displayName'],
      tags: parseTags(raw['tags']),
      lifetimeValueCents: parseCents(raw['lifetimeValueCents']),
      firstSeenAt: raw['firstSeenAt'],
      lastSeenAt: raw['lastSeenAt'],
      notes: raw['notes'] ?? null,
    });

    if (result.success) {
      records.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNum,
          field: issue.path.join('.') || undefined,
          message: issue.message,
        });
      }
    }
  });

  return { records, errors };
}

// ---------------------------------------------------------------------------
// Transaction CSV parser
// ---------------------------------------------------------------------------
// Columns: externalRef,type,grossCents,netCents,currency,occurredAt,fanExternalRef

export function parseTransactionsCsv(
  text: string,
): CsvParseResult<NormalizedTransaction> {
  const records: NormalizedTransaction[] = [];
  const errors: CsvRowError[] = [];

  let rows: Record<string, string>[];
  try {
    rows = parseCsv(text);
  } catch (e) {
    errors.push({ row: 0, message: `CSV parse error: ${String(e)}` });
    return { records, errors };
  }

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2;
    const result = normalizedTransactionSchema.safeParse({
      externalRef: raw['externalRef'],
      type: raw['type'],
      grossCents: parseCents(raw['grossCents']),
      netCents: parseCents(raw['netCents']),
      currency: raw['currency'] || 'USD',
      occurredAt: raw['occurredAt'],
      fanExternalRef: raw['fanExternalRef'] || null,
    });

    if (result.success) {
      records.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNum,
          field: issue.path.join('.') || undefined,
          message: issue.message,
        });
      }
    }
  });

  return { records, errors };
}

// ---------------------------------------------------------------------------
// Messages CSV parser → threads
// ---------------------------------------------------------------------------
// Columns: threadFanExternalRef,externalRef,direction,body,sentAt
// Rows are grouped by threadFanExternalRef; lastMessageAt = max sentAt in group.

export function parseMessagesCsv(
  text: string,
): CsvParseResult<NormalizedThread> {
  const errors: CsvRowError[] = [];

  let rows: Record<string, string>[];
  try {
    rows = parseCsv(text);
  } catch (e) {
    errors.push({ row: 0, message: `CSV parse error: ${String(e)}` });
    return { records: [], errors };
  }

  // Group valid messages by threadFanExternalRef.
  const threadMap = new Map<
    string,
    { messages: NormalizedMessage[]; lastMessageAt: Date }
  >();

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2;
    const threadFanRef = (raw['threadFanExternalRef'] ?? '').trim();
    if (!threadFanRef) {
      errors.push({
        row: rowNum,
        field: 'threadFanExternalRef',
        message: 'threadFanExternalRef is required',
      });
      return;
    }

    const msgResult = normalizedMessageSchema.safeParse({
      externalRef: raw['externalRef'],
      direction: raw['direction'],
      body: raw['body'] ?? '',
      sentAt: raw['sentAt'],
    });

    if (!msgResult.success) {
      for (const issue of msgResult.error.issues) {
        errors.push({
          row: rowNum,
          field: issue.path.join('.') || undefined,
          message: issue.message,
        });
      }
      return;
    }

    const msg = msgResult.data;
    const existing = threadMap.get(threadFanRef);
    if (existing) {
      existing.messages.push(msg);
      if (msg.sentAt > existing.lastMessageAt) {
        existing.lastMessageAt = msg.sentAt;
      }
    } else {
      threadMap.set(threadFanRef, {
        messages: [msg],
        lastMessageAt: msg.sentAt,
      });
    }
  });

  const records: NormalizedThread[] = [];
  for (const [fanExternalRef, data] of threadMap) {
    records.push({
      fanExternalRef,
      lastMessageAt: data.lastMessageAt,
      messages: data.messages,
    });
  }

  return { records, errors };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class ManualCsvAdapter implements IngestionAdapter {
  readonly platform: Platform;
  readonly mode = 'manual' as const;

  /** Accumulated parse errors from the last fetch* call. */
  lastErrors: CsvRowError[] = [];

  constructor(platform: Platform) {
    this.platform = platform;
  }

  async fetchFans(ctx: IngestCtx): Promise<NormalizedFan[]> {
    const csv = ctx.raw?.fansCsv ?? '';
    const { records, errors } = parseFansCsv(csv);
    this.lastErrors.push(...errors);
    return records;
  }

  async fetchTransactions(ctx: IngestCtx): Promise<NormalizedTransaction[]> {
    const csv = ctx.raw?.transactionsCsv ?? '';
    const { records, errors } = parseTransactionsCsv(csv);
    this.lastErrors.push(...errors);
    return records;
  }

  async fetchMessages(ctx: IngestCtx): Promise<NormalizedThread[]> {
    const csv = ctx.raw?.messagesCsv ?? '';
    const { records, errors } = parseMessagesCsv(csv);
    this.lastErrors.push(...errors);
    return records;
  }
}
