/**
 * Live write actions — unit tests with a fake client + fake audit sink (no DB).
 */
import { describe, it, expect } from 'vitest';
import { sendMessageViaLive, createPostViaLive } from './actions';
import { LiveCapabilityError } from './errors';
import type { LiveApiClient, LiveCapabilities } from './contract';
import { Platform } from '@/lib/db';

const scope = {
  modelId: 'm1',
  platformAccountId: 'acct-1',
  platform: Platform.ONLYFANS,
};

function fakeClient(
  source: 'sandbox' | 'http',
  caps: Partial<LiveCapabilities> = {},
): LiveApiClient {
  return {
    source,
    capabilities: () => ({
      readFans: true,
      readTransactions: true,
      readMessages: true,
      sendMessage: true,
      createPost: true,
      ...caps,
    }),
    listFans: async () => [],
    listTransactions: async () => [],
    listThreads: async () => [],
    sendMessage: async () => ({ externalRef: 'msg-1', sentAt: new Date() }),
    createPost: async () => ({ externalRef: 'post-1', createdAt: new Date() }),
  };
}

describe('live write actions', () => {
  it('sends a message and flags sandbox sends as simulated', async () => {
    const audits: unknown[] = [];
    const res = await sendMessageViaLive(
      scope,
      { fanExternalRef: 'fan-1', body: 'hi', mediaRefs: [] },
      {
        client: fakeClient('sandbox'),
        audit: async (e) => void audits.push(e),
      },
    );
    expect(res.simulated).toBe(true);
    expect(res.source).toBe('sandbox');
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      action: 'LIVE_SEND_MESSAGE',
      metadata: { simulated: true, humanInitiated: true },
    });
  });

  it('marks http sends as NOT simulated', async () => {
    const res = await sendMessageViaLive(
      scope,
      { fanExternalRef: 'fan-1', body: 'hi', mediaRefs: [] },
      { client: fakeClient('http'), audit: async () => {} },
    );
    expect(res.simulated).toBe(false);
    expect(res.source).toBe('http');
  });

  it('rejects when the connection lacks the capability', async () => {
    await expect(
      sendMessageViaLive(
        scope,
        { fanExternalRef: 'fan-1', body: 'hi', mediaRefs: [] },
        {
          client: fakeClient('http', { sendMessage: false }),
          audit: async () => {},
        },
      ),
    ).rejects.toBeInstanceOf(LiveCapabilityError);
  });

  it('validates input (empty body rejected)', async () => {
    await expect(
      sendMessageViaLive(
        scope,
        { fanExternalRef: 'fan-1', body: '', mediaRefs: [] },
        { client: fakeClient('sandbox'), audit: async () => {} },
      ),
    ).rejects.toThrow();
  });

  it('creates a post and audits it', async () => {
    const audits: unknown[] = [];
    const res = await createPostViaLive(
      scope,
      { body: 'new drop', mediaRefs: [] },
      { client: fakeClient('http'), audit: async (e) => void audits.push(e) },
    );
    expect(res.externalRef).toBe('post-1');
    expect(audits[0]).toMatchObject({ action: 'LIVE_CREATE_POST' });
  });
});
