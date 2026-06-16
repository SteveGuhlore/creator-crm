import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, Platform, MessageDirection } from '@/lib/db';
import { getPlatformThreads, getThread } from '@/lib/inbox/queries';
import { dbAvailable, resetDb } from './db-helper';

// Enforces the firm product decision: inbox is SEPARATED per platform.
// Platform A's view must never surface Platform B's threads/messages.
const ready = await dbAvailable();
const d = ready ? describe : describe.skip;

d('inbox per-platform isolation (DB)', () => {
  let modelId: string;
  const ids: Record<
    string,
    { accountId: string; fanId: string; threadId: string }
  > = {};

  beforeAll(async () => {
    await resetDb();
    const model = await prisma.model.create({
      data: { id: 'inbox-test-model', displayName: 'Inbox Test' },
    });
    modelId = model.id;

    for (const platform of [Platform.FANSLY, Platform.ONLYFANS] as const) {
      const account = await prisma.platformAccount.create({
        data: { modelId, platform, handle: `inbox_${platform}` },
      });
      const fan = await prisma.fan.create({
        data: {
          modelId,
          platformAccountId: account.id,
          platform,
          externalRef: `${platform}-fan`,
          displayName: `${platform} Fan`,
        },
      });
      const thread = await prisma.messageThread.create({
        data: {
          modelId,
          platformAccountId: account.id,
          platform,
          fanId: fan.id,
          lastMessageAt: new Date('2026-03-01T00:00:00.000Z'),
        },
      });
      await prisma.message.create({
        data: {
          threadId: thread.id,
          direction: MessageDirection.IN,
          body: `secret ${platform} message`,
          sentAt: new Date('2026-03-01T00:00:00.000Z'),
          externalRef: `${platform}-m1`,
        },
      });
      ids[platform] = {
        accountId: account.id,
        fanId: fan.id,
        threadId: thread.id,
      };
    }
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns only the requested platform’s threads', async () => {
    const fansly = await getPlatformThreads(modelId, Platform.FANSLY);
    const onlyfans = await getPlatformThreads(modelId, Platform.ONLYFANS);
    expect(fansly).toHaveLength(1);
    expect(onlyfans).toHaveLength(1);
    expect(fansly[0]!.id).toBe(ids[Platform.FANSLY]!.threadId);
    expect(fansly[0]!.id).not.toBe(ids[Platform.ONLYFANS]!.threadId);
  });

  it('getThread returns null for a thread that belongs to another platform', async () => {
    // Ask for the OnlyFans thread id under the FANSLY scope → must be null.
    const leaked = await getThread(
      modelId,
      Platform.FANSLY,
      ids[Platform.ONLYFANS]!.threadId,
    );
    expect(leaked).toBeNull();

    // Correct scope resolves.
    const ok = await getThread(
      modelId,
      Platform.ONLYFANS,
      ids[Platform.ONLYFANS]!.threadId,
    );
    expect(ok?.id).toBe(ids[Platform.ONLYFANS]!.threadId);
  });
});
