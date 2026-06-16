/**
 * HttpLiveApiClient — unit tests with an injected fetch (no real network).
 */
import { describe, it, expect } from 'vitest';
import { HttpLiveApiClient } from './http-client';
import { LiveApiError } from './errors';
import { Platform } from '@/lib/db';

const scope = {
  modelId: 'm1',
  platformAccountId: 'acct-1',
  platform: Platform.ONLYFANS,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const validFan = {
  externalRef: 'fan-1',
  displayName: 'Alice',
  tags: [],
  lifetimeValueCents: 0,
  firstSeenAt: '2025-01-01T00:00:00.000Z',
  lastSeenAt: '2025-02-01T00:00:00.000Z',
};

describe('HttpLiveApiClient', () => {
  it('GETs fans with bearer auth and validates the response', async () => {
    let seenUrl = '';
    let seenAuth = '';
    const client = new HttpLiveApiClient({
      baseUrl: 'https://api.example.com/',
      apiKey: 'sk_test_123',
      fetchImpl: async (url, init) => {
        seenUrl = String(url);
        seenAuth = (init?.headers as Record<string, string>).Authorization!;
        return jsonResponse([validFan]);
      },
    });
    const fans = await client.listFans(scope);
    expect(fans).toHaveLength(1);
    expect(seenUrl).toBe('https://api.example.com/v1/accounts/acct-1/fans');
    expect(seenAuth).toBe('Bearer sk_test_123');
  });

  it('throws LiveApiError on a non-2xx response (with status)', async () => {
    const client = new HttpLiveApiClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      fetchImpl: async () => jsonResponse({ error: 'nope' }, 403),
    });
    await expect(client.listFans(scope)).rejects.toMatchObject({
      name: 'LiveApiError',
      status: 403,
    });
  });

  it('throws LiveApiError when the response fails schema validation', async () => {
    const client = new HttpLiveApiClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      fetchImpl: async () => jsonResponse([{ displayName: 'no externalRef' }]),
    });
    await expect(client.listFans(scope)).rejects.toBeInstanceOf(LiveApiError);
  });

  it('POSTs a message with the reviewed body and returns the result', async () => {
    let seenBody: unknown;
    const client = new HttpLiveApiClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      fetchImpl: async (_url, init) => {
        seenBody = JSON.parse(String(init?.body));
        return jsonResponse({
          externalRef: 'msg-9',
          sentAt: '2026-06-16T00:00:00.000Z',
        });
      },
    });
    const res = await client.sendMessage(scope, {
      fanExternalRef: 'fan-1',
      body: 'hello',
      mediaRefs: [],
    });
    expect(res.externalRef).toBe('msg-9');
    expect(seenBody).toMatchObject({ fanExternalRef: 'fan-1', body: 'hello' });
  });

  it('surfaces network failures as LiveApiError', async () => {
    const client = new HttpLiveApiClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    await expect(client.listFans(scope)).rejects.toBeInstanceOf(LiveApiError);
  });
});
