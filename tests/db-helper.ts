import { prisma } from '@/lib/db';

/** True when a test database is configured and reachable. */
export async function dbAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** Truncate all data tables (FK-safe via CASCADE). Order-independent. */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog","Message","MessageThread","Transaction","Fan",
      "ScheduledSend","ContentItem","MessageTemplate","PayoutSplit",
      "PlatformAccount","Model","User"
    RESTART IDENTITY CASCADE;
  `);
}
