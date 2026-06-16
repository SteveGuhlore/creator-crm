import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { extractVariables } from './substitute';
import {
  templateCreateSchema,
  templateUpdateSchema,
  type TemplateCreateInput,
  type TemplateUpdateInput,
} from './schema';

// Message template CRUD. `variables` is always derived from the body so the
// stored list can never drift from the placeholders actually present. Every
// mutation writes an audit entry.

export interface TemplateMutationCtx {
  actorUserId?: string | null;
}

export async function listTemplates(modelId: string) {
  // A model sees its own templates plus shared (modelId = null) ones.
  return prisma.messageTemplate.findMany({
    where: { OR: [{ modelId }, { modelId: null }] },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function getTemplate(id: string) {
  return prisma.messageTemplate.findUnique({ where: { id } });
}

export async function createTemplate(
  input: TemplateCreateInput,
  ctx: TemplateMutationCtx = {},
) {
  const data = templateCreateSchema.parse(input);
  const variables = extractVariables(data.body);

  const created = await prisma.messageTemplate.create({
    data: {
      modelId: data.modelId ?? null,
      name: data.name,
      category: data.category,
      body: data.body,
      variables,
    },
  });

  await writeAudit({
    actorUserId: ctx.actorUserId,
    action: 'CREATE',
    entityType: 'MessageTemplate',
    entityId: created.id,
    metadata: { name: created.name, variables },
  });

  return created;
}

export async function updateTemplate(
  id: string,
  input: TemplateUpdateInput,
  ctx: TemplateMutationCtx = {},
) {
  const data = templateUpdateSchema.parse(input);
  const existing = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!existing) throw new Error(`Template ${id} not found`);

  const body = data.body ?? existing.body;
  const variables = extractVariables(body);

  const updated = await prisma.messageTemplate.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      category: data.category ?? existing.category,
      body,
      variables,
    },
  });

  await writeAudit({
    actorUserId: ctx.actorUserId,
    action: 'UPDATE',
    entityType: 'MessageTemplate',
    entityId: id,
    metadata: { name: updated.name, variables },
  });

  return updated;
}

export async function deleteTemplate(
  id: string,
  ctx: TemplateMutationCtx = {},
) {
  const deleted = await prisma.messageTemplate.delete({ where: { id } });
  await writeAudit({
    actorUserId: ctx.actorUserId,
    action: 'DELETE',
    entityType: 'MessageTemplate',
    entityId: id,
    metadata: { name: deleted.name },
  });
  return deleted;
}
