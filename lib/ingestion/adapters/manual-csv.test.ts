/**
 * ManualCsvAdapter — pure unit tests (no DB, no network).
 *
 * Covers: valid CSV round-trips, tag splitting, malformed/edge-case row
 * rejection, empty input, whitespace handling, and structural integrity.
 */
import { describe, it, expect } from 'vitest';
import {
  parseFansCsv,
  parseTransactionsCsv,
  parseMessagesCsv,
  ManualCsvAdapter,
} from './manual-csv';
import { Platform } from '@/lib/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAN_HEADER =
  'externalRef,displayName,tags,lifetimeValueCents,firstSeenAt,lastSeenAt,notes';

function fanRow(
  overrides: Partial<{
    externalRef: string;
    displayName: string;
    tags: string;
    lifetimeValueCents: string;
    firstSeenAt: string;
    lastSeenAt: string;
    notes: string;
  }> = {},
): string {
  const d = {
    externalRef: 'fan-001',
    displayName: 'TestFan',
    tags: 'vip|whale',
    lifetimeValueCents: '5000',
    firstSeenAt: '2025-01-01T00:00:00.000Z',
    lastSeenAt: '2025-06-01T00:00:00.000Z',
    notes: '',
    ...overrides,
  };
  return `${d.externalRef},${d.displayName},${d.tags},${d.lifetimeValueCents},${d.firstSeenAt},${d.lastSeenAt},${d.notes}`;
}

const TX_HEADER =
  'externalRef,type,grossCents,netCents,currency,occurredAt,fanExternalRef';

function txRow(
  overrides: Partial<{
    externalRef: string;
    type: string;
    grossCents: string;
    netCents: string;
    currency: string;
    occurredAt: string;
    fanExternalRef: string;
  }> = {},
): string {
  const d = {
    externalRef: 'tx-001',
    type: 'SUBSCRIPTION',
    grossCents: '1999',
    netCents: '1699',
    currency: 'USD',
    occurredAt: '2025-03-15T00:00:00.000Z',
    fanExternalRef: 'fan-001',
    ...overrides,
  };
  return `${d.externalRef},${d.type},${d.grossCents},${d.netCents},${d.currency},${d.occurredAt},${d.fanExternalRef}`;
}

const MSG_HEADER = 'threadFanExternalRef,externalRef,direction,body,sentAt';

function msgRow(
  overrides: Partial<{
    threadFanExternalRef: string;
    externalRef: string;
    direction: string;
    body: string;
    sentAt: string;
  }> = {},
): string {
  const d = {
    threadFanExternalRef: 'fan-001',
    externalRef: 'msg-001',
    direction: 'OUT',
    body: 'Hey!',
    sentAt: '2025-06-01T10:00:00.000Z',
    ...overrides,
  };
  return `${d.threadFanExternalRef},${d.externalRef},${d.direction},${d.body},${d.sentAt}`;
}

// ---------------------------------------------------------------------------
// parseFansCsv
// ---------------------------------------------------------------------------

describe('parseFansCsv', () => {
  it('parses a valid single-row CSV', () => {
    const csv = [FAN_HEADER, fanRow()].join('\n');
    const { records, errors } = parseFansCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(1);
    const fan = records[0]!;
    expect(fan.externalRef).toBe('fan-001');
    expect(fan.displayName).toBe('TestFan');
    expect(fan.lifetimeValueCents).toBe(5000);
  });

  it('splits tags on pipe separator', () => {
    const csv = [FAN_HEADER, fanRow({ tags: 'vip|whale|loyal' })].join('\n');
    const { records, errors } = parseFansCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records[0]!.tags).toEqual(['vip', 'whale', 'loyal']);
  });

  it('handles a single tag (no pipe)', () => {
    const csv = [FAN_HEADER, fanRow({ tags: 'subscriber' })].join('\n');
    const { records } = parseFansCsv(csv);
    expect(records[0]!.tags).toEqual(['subscriber']);
  });

  it('handles empty tags field → empty array', () => {
    const csv = [FAN_HEADER, fanRow({ tags: '' })].join('\n');
    const { records } = parseFansCsv(csv);
    expect(records[0]!.tags).toEqual([]);
  });

  it('deduplicates tags', () => {
    const csv = [FAN_HEADER, fanRow({ tags: 'vip|vip|whale' })].join('\n');
    const { records } = parseFansCsv(csv);
    expect(records[0]!.tags).toEqual(['vip', 'whale']);
  });

  it('trims whitespace from tags', () => {
    const csv = [FAN_HEADER, fanRow({ tags: ' vip | whale ' })].join('\n');
    const { records } = parseFansCsv(csv);
    expect(records[0]!.tags).toEqual(['vip', 'whale']);
  });

  it('parses multiple valid rows', () => {
    const csv = [
      FAN_HEADER,
      fanRow({ externalRef: 'fan-001' }),
      fanRow({ externalRef: 'fan-002', displayName: 'OtherFan' }),
    ].join('\n');
    const { records, errors } = parseFansCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(2);
  });

  it('returns empty result for empty input', () => {
    const { records, errors } = parseFansCsv('');
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('returns empty result for header-only CSV', () => {
    const { records, errors } = parseFansCsv(FAN_HEADER);
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('rejects row with missing required externalRef', () => {
    const csv = [FAN_HEADER, fanRow({ externalRef: '' })].join('\n');
    const { records, errors } = parseFansCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.row).toBe(2);
  });

  it('rejects row with missing required displayName', () => {
    const csv = [FAN_HEADER, fanRow({ displayName: '' })].join('\n');
    const { records, errors } = parseFansCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects row with non-numeric lifetimeValueCents', () => {
    const csv = [
      FAN_HEADER,
      fanRow({ lifetimeValueCents: 'not-a-number' }),
    ].join('\n');
    const { records, errors } = parseFansCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.field).toContain('lifetimeValueCents');
  });

  it('rejects row with float lifetimeValueCents', () => {
    const csv = [FAN_HEADER, fanRow({ lifetimeValueCents: '19.99' })].join(
      '\n',
    );
    const { records, errors } = parseFansCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects row with invalid date in firstSeenAt', () => {
    const csv = [FAN_HEADER, fanRow({ firstSeenAt: 'not-a-date' })].join('\n');
    const { records, errors } = parseFansCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('skips bad rows but keeps good ones in a mixed CSV', () => {
    const csv = [
      FAN_HEADER,
      fanRow({ externalRef: 'fan-good' }),
      fanRow({ externalRef: '', displayName: '' }), // bad
      fanRow({ externalRef: 'fan-also-good' }),
    ].join('\n');
    const { records, errors } = parseFansCsv(csv);
    expect(records).toHaveLength(2);
    expect(errors.length).toBeGreaterThan(0);
    expect(records.map((r) => r.externalRef)).toEqual([
      'fan-good',
      'fan-also-good',
    ]);
  });

  it('handles extra whitespace around values', () => {
    // csv-parse trim:true should strip cell whitespace
    const csv = `${FAN_HEADER}\n  fan-001 ,  TestFan ,vip,5000,2025-01-01T00:00:00.000Z,2025-06-01T00:00:00.000Z,`;
    const { records, errors } = parseFansCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records[0]!.externalRef).toBe('fan-001');
    expect(records[0]!.displayName).toBe('TestFan');
  });

  it('accepts notes as null/undefined', () => {
    const csv = [FAN_HEADER, fanRow({ notes: '' })].join('\n');
    const { records } = parseFansCsv(csv);
    // empty notes → null or undefined (nullish)
    expect(records[0]!.notes == null || records[0]!.notes === '').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseTransactionsCsv
// ---------------------------------------------------------------------------

describe('parseTransactionsCsv', () => {
  it('parses a valid transaction row', () => {
    const csv = [TX_HEADER, txRow()].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(1);
    const tx = records[0]!;
    expect(tx.externalRef).toBe('tx-001');
    expect(tx.type).toBe('SUBSCRIPTION');
    expect(tx.grossCents).toBe(1999);
    expect(tx.netCents).toBe(1699);
    expect(tx.currency).toBe('USD');
    expect(tx.fanExternalRef).toBe('fan-001');
  });

  it('accepts all valid TransactionType enum values', () => {
    const types = ['SUBSCRIPTION', 'DM', 'PPV', 'TIP', 'OTHER'];
    for (const type of types) {
      const csv = [TX_HEADER, txRow({ externalRef: `tx-${type}`, type })].join(
        '\n',
      );
      const { records, errors } = parseTransactionsCsv(csv);
      expect(errors).toHaveLength(0);
      expect(records[0]!.type).toBe(type);
    }
  });

  it('rejects an invalid type enum value', () => {
    const csv = [TX_HEADER, txRow({ type: 'INVALID_TYPE' })].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.field).toContain('type');
  });

  it('rejects non-numeric grossCents', () => {
    const csv = [TX_HEADER, txRow({ grossCents: 'abc' })].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects float netCents', () => {
    const csv = [TX_HEADER, txRow({ netCents: '16.99' })].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects missing externalRef', () => {
    const csv = [TX_HEADER, txRow({ externalRef: '' })].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('allows absent fanExternalRef (anonymous transactions)', () => {
    const csv = [TX_HEADER, txRow({ fanExternalRef: '' })].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records[0]!.fanExternalRef).toBeFalsy();
  });

  it('defaults currency to USD when omitted', () => {
    const csv = [TX_HEADER, txRow({ currency: '' })].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records[0]!.currency).toBe('USD');
  });

  it('returns empty result for empty input', () => {
    const { records, errors } = parseTransactionsCsv('');
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('skips bad rows but keeps good rows in a mixed CSV', () => {
    const csv = [
      TX_HEADER,
      txRow({ externalRef: 'tx-good' }),
      txRow({ type: 'BAD_ENUM' }), // bad
      txRow({ externalRef: 'tx-good-2' }),
    ].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(records).toHaveLength(2);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid occurredAt date', () => {
    const csv = [TX_HEADER, txRow({ occurredAt: 'not-a-date' })].join('\n');
    const { records, errors } = parseTransactionsCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// parseMessagesCsv
// ---------------------------------------------------------------------------

describe('parseMessagesCsv', () => {
  it('parses a valid single-message CSV into one thread', () => {
    const csv = [MSG_HEADER, msgRow()].join('\n');
    const { records, errors } = parseMessagesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(1);
    const thread = records[0]!;
    expect(thread.fanExternalRef).toBe('fan-001');
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0]!.body).toBe('Hey!');
  });

  it('groups multiple rows with the same threadFanExternalRef into one thread', () => {
    const csv = [
      MSG_HEADER,
      msgRow({ externalRef: 'msg-001', sentAt: '2025-06-01T10:00:00.000Z' }),
      msgRow({
        externalRef: 'msg-002',
        direction: 'IN',
        body: 'Reply',
        sentAt: '2025-06-01T11:00:00.000Z',
      }),
    ].join('\n');
    const { records, errors } = parseMessagesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(1);
    expect(records[0]!.messages).toHaveLength(2);
  });

  it('sets lastMessageAt to the max sentAt across thread messages', () => {
    const csv = [
      MSG_HEADER,
      msgRow({ externalRef: 'msg-001', sentAt: '2025-06-01T10:00:00.000Z' }),
      msgRow({ externalRef: 'msg-002', sentAt: '2025-06-02T12:00:00.000Z' }),
      msgRow({ externalRef: 'msg-003', sentAt: '2025-06-01T08:00:00.000Z' }),
    ].join('\n');
    const { records } = parseMessagesCsv(csv);
    expect(records[0]!.lastMessageAt.toISOString()).toBe(
      '2025-06-02T12:00:00.000Z',
    );
  });

  it('produces separate threads for different fanExternalRefs', () => {
    const csv = [
      MSG_HEADER,
      msgRow({ threadFanExternalRef: 'fan-001', externalRef: 'msg-001' }),
      msgRow({ threadFanExternalRef: 'fan-002', externalRef: 'msg-002' }),
    ].join('\n');
    const { records, errors } = parseMessagesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(2);
  });

  it('rejects row with missing threadFanExternalRef', () => {
    const csv = [MSG_HEADER, msgRow({ threadFanExternalRef: '' })].join('\n');
    const { records, errors } = parseMessagesCsv(csv);
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.field).toBe('threadFanExternalRef');
  });

  it('rejects row with invalid direction enum', () => {
    const csv = [MSG_HEADER, msgRow({ direction: 'SIDEWAYS' })].join('\n');
    const { errors } = parseMessagesCsv(csv);
    // thread still formed if other rows valid; this row rejected
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.field).toContain('direction');
  });

  it('accepts both IN and OUT directions', () => {
    const csv = [
      MSG_HEADER,
      msgRow({ externalRef: 'msg-in', direction: 'IN' }),
      msgRow({ externalRef: 'msg-out', direction: 'OUT' }),
    ].join('\n');
    const { records, errors } = parseMessagesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records[0]!.messages.map((m) => m.direction).sort()).toEqual([
      'IN',
      'OUT',
    ]);
  });

  it('rejects row with invalid sentAt date', () => {
    const csv = [MSG_HEADER, msgRow({ sentAt: 'not-a-date' })].join('\n');
    const { errors } = parseMessagesCsv(csv);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects row with missing externalRef', () => {
    const csv = [MSG_HEADER, msgRow({ externalRef: '' })].join('\n');
    const { errors } = parseMessagesCsv(csv);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns empty result for empty input', () => {
    const { records, errors } = parseMessagesCsv('');
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('keeps valid rows when a row in the same thread is invalid', () => {
    const csv = [
      MSG_HEADER,
      msgRow({ externalRef: 'msg-good', sentAt: '2025-06-01T10:00:00.000Z' }),
      msgRow({ externalRef: '', direction: 'INVALID' }), // bad
      msgRow({ externalRef: 'msg-good-2', sentAt: '2025-06-02T10:00:00.000Z' }),
    ].join('\n');
    const { records, errors } = parseMessagesCsv(csv);
    expect(errors.length).toBeGreaterThan(0);
    // The two good messages still form a thread
    expect(records).toHaveLength(1);
    expect(records[0]!.messages).toHaveLength(2);
  });

  it('handles body with commas (quoted CSV field)', () => {
    const csvText = `${MSG_HEADER}\nfan-001,msg-001,OUT,"Hey, how are you?",2025-06-01T10:00:00.000Z`;
    const { records, errors } = parseMessagesCsv(csvText);
    expect(errors).toHaveLength(0);
    expect(records[0]!.messages[0]!.body).toBe('Hey, how are you?');
  });
});

// ---------------------------------------------------------------------------
// ManualCsvAdapter (integration of all three parsers via ctx.raw)
// ---------------------------------------------------------------------------

describe('ManualCsvAdapter', () => {
  const ctx = {
    modelId: 'model-1',
    platformAccountId: 'pa-1',
    platform: Platform.ONLYFANS,
  };

  it('fetchFans returns parsed fans', async () => {
    const adapter = new ManualCsvAdapter(Platform.ONLYFANS);
    const csv = [FAN_HEADER, fanRow()].join('\n');
    const fans = await adapter.fetchFans({ ...ctx, raw: { fansCsv: csv } });
    expect(fans).toHaveLength(1);
    expect(fans[0]!.externalRef).toBe('fan-001');
  });

  it('fetchTransactions returns parsed transactions', async () => {
    const adapter = new ManualCsvAdapter(Platform.ONLYFANS);
    const csv = [TX_HEADER, txRow()].join('\n');
    const txns = await adapter.fetchTransactions({
      ...ctx,
      raw: { transactionsCsv: csv },
    });
    expect(txns).toHaveLength(1);
    expect(txns[0]!.type).toBe('SUBSCRIPTION');
  });

  it('fetchMessages returns parsed threads', async () => {
    const adapter = new ManualCsvAdapter(Platform.ONLYFANS);
    const csv = [MSG_HEADER, msgRow()].join('\n');
    const threads = await adapter.fetchMessages({
      ...ctx,
      raw: { messagesCsv: csv },
    });
    expect(threads).toHaveLength(1);
    expect(threads[0]!.messages).toHaveLength(1);
  });

  it('returns empty arrays when raw is absent', async () => {
    const adapter = new ManualCsvAdapter(Platform.ONLYFANS);
    const fans = await adapter.fetchFans(ctx);
    const txns = await adapter.fetchTransactions(ctx);
    const threads = await adapter.fetchMessages(ctx);
    expect(fans).toHaveLength(0);
    expect(txns).toHaveLength(0);
    expect(threads).toHaveLength(0);
  });

  it('exposes lastErrors after a fetch with bad rows', async () => {
    const adapter = new ManualCsvAdapter(Platform.ONLYFANS);
    const csv = [FAN_HEADER, fanRow({ externalRef: '' })].join('\n');
    await adapter.fetchFans({ ...ctx, raw: { fansCsv: csv } });
    expect(adapter.lastErrors.length).toBeGreaterThan(0);
  });

  it('mode is "manual"', () => {
    const adapter = new ManualCsvAdapter(Platform.FANSLY);
    expect(adapter.mode).toBe('manual');
  });

  it('platform reflects constructor argument', () => {
    const adapter = new ManualCsvAdapter(Platform.MANYVIDS);
    expect(adapter.platform).toBe(Platform.MANYVIDS);
  });
});
