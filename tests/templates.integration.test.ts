import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listTemplates,
} from '@/lib/templates/service';
import { dbAvailable, resetDb } from './db-helper';

const ready = await dbAvailable();
const d = ready ? describe : describe.skip;

d('template CRUD (DB)', () => {
  let modelId: string;
  let userId: string;

  beforeAll(async () => {
    await resetDb();
    const user = await prisma.user.create({
      data: { email: 'tmpl-tester@local', passwordHash: 'x' },
    });
    userId = user.id;
    const model = await prisma.model.create({
      data: { id: 'tmpl-test-model', displayName: 'Tmpl Test' },
    });
    modelId = model.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a template, deriving variables from the body, with an audit entry', async () => {
    const t = await createTemplate(
      {
        modelId,
        name: 'Welcome',
        category: 'onboarding',
        body: 'Hi {{fanName}}, welcome to {{handle}}!',
      },
      { actorUserId: userId },
    );
    expect(t.variables.sort()).toEqual(['fanName', 'handle']);
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'MessageTemplate',
        entityId: t.id,
        action: 'CREATE',
      },
    });
    expect(audit).not.toBeNull();
  });

  it('rejects invalid input (empty body) via Zod', async () => {
    await expect(
      createTemplate({ modelId, name: 'x', category: 'y', body: '   ' }),
    ).rejects.toThrow();
  });

  it('re-derives variables on update', async () => {
    const t = await createTemplate({
      modelId,
      name: 'Promo',
      category: 'sales',
      body: 'Old {{a}}',
    });
    const u = await updateTemplate(t.id, { body: 'New {{x}} and {{y}}' });
    expect(u.variables.sort()).toEqual(['x', 'y']);
  });

  it('lists model-owned plus shared templates', async () => {
    await prisma.messageTemplate.create({
      data: {
        modelId: null,
        name: 'Shared',
        category: 'g',
        body: 'hi',
        variables: [],
      },
    });
    const list = await listTemplates(modelId);
    expect(list.some((t) => t.modelId === null)).toBe(true);
    expect(list.some((t) => t.modelId === modelId)).toBe(true);
  });

  it('deletes a template with an audit entry', async () => {
    const t = await createTemplate({
      modelId,
      name: 'Temp',
      category: 'misc',
      body: 'bye',
    });
    await deleteTemplate(t.id, { actorUserId: userId });
    expect(
      await prisma.messageTemplate.findUnique({ where: { id: t.id } }),
    ).toBeNull();
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'MessageTemplate',
        entityId: t.id,
        action: 'DELETE',
      },
    });
    expect(audit).not.toBeNull();
  });
});
