import { prisma, type Platform } from '@/lib/db';

// Shared, minimal read helpers used by the dashboard shell. Heavier per-module
// queries live under each feature module's own directory.

/** The single owner-operated model (tonight there is exactly one). */
export async function getPrimaryModel() {
  return prisma.model.findFirst({ orderBy: { createdAt: 'asc' } });
}

export async function listPlatformAccounts(modelId: string) {
  return prisma.platformAccount.findMany({
    where: { modelId },
    orderBy: { platform: 'asc' },
  });
}

export async function getPlatformAccount(modelId: string, platform: Platform) {
  return prisma.platformAccount.findFirst({
    where: { modelId, platform },
  });
}

/** Lightweight per-platform counts for the overview cards. */
export async function getPlatformCounts(modelId: string, platform: Platform) {
  const [fans, transactions, threads] = await Promise.all([
    prisma.fan.count({ where: { modelId, platform } }),
    prisma.transaction.count({ where: { modelId, platform } }),
    prisma.messageThread.count({ where: { modelId, platform } }),
  ]);
  return { fans, transactions, threads };
}
