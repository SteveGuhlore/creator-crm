import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/db';

/**
 * Audit logging. Every create/update/delete across the app routes through here.
 *
 * Accepts an optional transaction client so the audit row commits atomically
 * with the mutation it records.
 */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'IMPORT'
  | 'SCHEDULE'
  | 'CANCEL'
  | 'SEND_SIMULATED'
  | 'LOGIN';

export interface AuditInput {
  actorUserId?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

type Client = Pick<typeof prisma, 'auditLog'> | Prisma.TransactionClient;

export async function writeAudit(input: AuditInput, client: Client = prisma) {
  return client.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? undefined,
    },
  });
}

/** Convenience for recording several audit entries (e.g. bulk import). */
export async function writeAuditMany(
  inputs: AuditInput[],
  client: Client = prisma,
) {
  if (inputs.length === 0) return { count: 0 };
  return client.auditLog.createMany({
    data: inputs.map((i) => ({
      actorUserId: i.actorUserId ?? null,
      action: i.action,
      entityType: i.entityType,
      entityId: i.entityId,
      metadata: (i.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });
}
