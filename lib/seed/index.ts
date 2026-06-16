import bcrypt from 'bcryptjs';
import { prisma, ALL_PLATFORMS, Role } from '@/lib/db';
import {
  generateFans,
  generateTransactions,
  generateThreads,
  generateContent,
  computeLifetimeValues,
} from '@/fixtures/generators';

// Idempotent seed logic, importable by both the CLI (prisma/seed.ts) and tests.
// Upserts by unique keys so it can run repeatedly without duplicating rows.

export const SHARED_TEMPLATES = [
  {
    name: 'Welcome',
    category: 'onboarding',
    body: 'Hey {{fanName}}! Thanks for subscribing to {{handle}} 💕',
    variables: ['fanName', 'handle'],
  },
  {
    name: 'PPV offer',
    category: 'sales',
    body: 'New {{contentTitle}} just dropped — unlock it for {{price}}!',
    variables: ['contentTitle', 'price'],
  },
  {
    name: 'Tip thank-you',
    category: 'retention',
    body: 'Thank you so much for the tip, {{fanName}}! You’re the best 🙏',
    variables: ['fanName'],
  },
  {
    name: 'Re-engagement',
    category: 'winback',
    body: 'Miss you {{fanName}}! Here’s a little something just for you.',
    variables: ['fanName'],
  },
];

export const SEED_MODEL_ID = 'seed-model-owner';

export interface SeedOptions {
  seed?: number;
  now?: Date;
  ownerEmail?: string;
  ownerPassword?: string;
}

export interface SeedResult {
  ownerId: string;
  modelId: string;
  accounts: number;
  fans: number;
  transactions: number;
  threads: number;
  content: number;
}

export async function runSeed(options: SeedOptions = {}): Promise<SeedResult> {
  const seed = options.seed ?? Number(process.env.SEED_SEED ?? 1);
  const now = options.now ?? new Date('2026-06-15T12:00:00.000Z');
  const email =
    options.ownerEmail ??
    process.env.SEED_OWNER_EMAIL ??
    'owner@creatorcrm.local';
  const password =
    options.ownerPassword ?? process.env.SEED_OWNER_PASSWORD ?? 'ownerpass123';

  const passwordHash = await bcrypt.hash(password, 10);

  const owner = await prisma.user.upsert({
    where: { email },
    update: { role: Role.OWNER },
    create: { email, passwordHash, role: Role.OWNER },
  });

  const model = await prisma.model.upsert({
    where: { id: SEED_MODEL_ID },
    update: { displayName: 'Me (Owner)' },
    create: {
      id: SEED_MODEL_ID,
      displayName: 'Me (Owner)',
      notes: 'The single owner-operated creator (seed).',
    },
  });

  for (const t of SHARED_TEMPLATES) {
    const existing = await prisma.messageTemplate.findFirst({
      where: { modelId: null, name: t.name },
    });
    if (existing) {
      await prisma.messageTemplate.update({
        where: { id: existing.id },
        data: { category: t.category, body: t.body, variables: t.variables },
      });
    } else {
      await prisma.messageTemplate.create({ data: { modelId: null, ...t } });
    }
  }

  let totalFans = 0;
  let totalTx = 0;
  let totalThreads = 0;
  let totalContent = 0;

  for (const platform of ALL_PLATFORMS) {
    const handle = `me_on_${platform.toLowerCase()}`;
    const account = await prisma.platformAccount.upsert({
      where: {
        modelId_platform_handle: { modelId: model.id, platform, handle },
      },
      update: {},
      create: { modelId: model.id, platform, handle },
    });

    const fans = generateFans(platform, { seed, now });
    const txns = generateTransactions(platform, fans, { seed, now });
    const threads = generateThreads(platform, fans, { seed, now });
    const content = generateContent(platform, { seed, now });
    const ltv = computeLifetimeValues(fans, txns);

    const fanIdByRef = new Map<string, string>();
    for (const f of fans) {
      const row = await prisma.fan.upsert({
        where: {
          platformAccountId_externalRef: {
            platformAccountId: account.id,
            externalRef: f.externalRef,
          },
        },
        update: {
          displayName: f.displayName,
          tags: f.tags,
          lifetimeValueCents: ltv.get(f.externalRef) ?? 0,
          lastSeenAt: f.lastSeenAt,
          notes: f.notes ?? null,
        },
        create: {
          modelId: model.id,
          platformAccountId: account.id,
          platform,
          externalRef: f.externalRef,
          displayName: f.displayName,
          tags: f.tags,
          lifetimeValueCents: ltv.get(f.externalRef) ?? 0,
          firstSeenAt: f.firstSeenAt,
          lastSeenAt: f.lastSeenAt,
          notes: f.notes ?? null,
        },
      });
      fanIdByRef.set(f.externalRef, row.id);
    }
    totalFans += fans.length;

    for (const tx of txns) {
      const fanId = tx.fanExternalRef
        ? (fanIdByRef.get(tx.fanExternalRef) ?? null)
        : null;
      await prisma.transaction.upsert({
        where: {
          platformAccountId_externalRef: {
            platformAccountId: account.id,
            externalRef: tx.externalRef,
          },
        },
        update: {
          type: tx.type,
          grossCents: tx.grossCents,
          netCents: tx.netCents,
          occurredAt: tx.occurredAt,
          fanId,
        },
        create: {
          modelId: model.id,
          platformAccountId: account.id,
          platform,
          fanId,
          type: tx.type,
          grossCents: tx.grossCents,
          netCents: tx.netCents,
          currency: tx.currency,
          occurredAt: tx.occurredAt,
          externalRef: tx.externalRef,
        },
      });
    }
    totalTx += txns.length;

    for (const th of threads) {
      const fanId = fanIdByRef.get(th.fanExternalRef);
      if (!fanId) continue;
      let thread = await prisma.messageThread.findFirst({
        where: { platformAccountId: account.id, fanId },
      });
      thread ??= await prisma.messageThread.create({
        data: {
          modelId: model.id,
          platformAccountId: account.id,
          platform,
          fanId,
          lastMessageAt: th.lastMessageAt,
        },
      });
      await prisma.messageThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: th.lastMessageAt },
      });
      for (const m of th.messages) {
        await prisma.message.upsert({
          where: {
            threadId_externalRef: {
              threadId: thread.id,
              externalRef: m.externalRef,
            },
          },
          update: { body: m.body, sentAt: m.sentAt, direction: m.direction },
          create: {
            threadId: thread.id,
            direction: m.direction,
            body: m.body,
            sentAt: m.sentAt,
            externalRef: m.externalRef,
          },
        });
      }
    }
    totalThreads += threads.length;

    for (const c of content) {
      const existing = await prisma.contentItem.findFirst({
        where: { modelId: model.id, storageRef: c.storageRef },
      });
      if (existing) {
        await prisma.contentItem.update({
          where: { id: existing.id },
          data: { title: c.title, tags: c.tags, type: c.type },
        });
      } else {
        await prisma.contentItem.create({
          data: {
            modelId: model.id,
            title: c.title,
            type: c.type,
            tags: c.tags,
            storageRef: c.storageRef,
            durationSec: c.durationSec,
          },
        });
      }
    }
    totalContent += content.length;
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: owner.id,
      action: 'IMPORT',
      entityType: 'Seed',
      entityId: model.id,
      metadata: {
        source: 'seed',
        seed,
        fans: totalFans,
        transactions: totalTx,
        threads: totalThreads,
        content: totalContent,
      },
    },
  });

  return {
    ownerId: owner.id,
    modelId: model.id,
    accounts: ALL_PLATFORMS.length,
    fans: totalFans,
    transactions: totalTx,
    threads: totalThreads,
    content: totalContent,
  };
}
