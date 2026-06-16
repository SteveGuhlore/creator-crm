'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/rbac';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/templates/service';
import { getPrimaryModel } from '@/lib/db/queries';

// Typed result state for useActionState — every action returns one of these.
export type TemplateActionState =
  | null
  | { success: true; message: string }
  | { error: string };

// ── List (server-side call, not an action) ─────────────────────────────────

export async function fetchTemplates() {
  const model = await getPrimaryModel();
  if (!model) return [];
  return listTemplates(model.id);
}

// ── Create ─────────────────────────────────────────────────────────────────

export async function createTemplateAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  let actorUserId: string;
  try {
    const user = await requireUser();
    actorUserId = user.id;
  } catch {
    return { error: 'Authentication required.' };
  }

  const model = await getPrimaryModel();
  if (!model) return { error: 'No model found. Run `pnpm seed` first.' };

  const name = (formData.get('name') as string | null) ?? '';
  const category = (formData.get('category') as string | null) ?? '';
  const body = (formData.get('body') as string | null) ?? '';

  try {
    await createTemplate(
      { modelId: model.id, name, category, body },
      { actorUserId },
    );
    revalidatePath('/dashboard/templates');
    return { success: true, message: `Template "${name}" created.` };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { error: message };
  }
}

// ── Update ─────────────────────────────────────────────────────────────────

export async function updateTemplateAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  let actorUserId: string;
  try {
    const user = await requireUser();
    actorUserId = user.id;
  } catch {
    return { error: 'Authentication required.' };
  }

  const id = (formData.get('id') as string | null) ?? '';
  const name = (formData.get('name') as string | null) ?? '';
  const category = (formData.get('category') as string | null) ?? '';
  const body = (formData.get('body') as string | null) ?? '';

  if (!id) return { error: 'Template ID is required.' };

  try {
    await updateTemplate(id, { name, category, body }, { actorUserId });
    revalidatePath('/dashboard/templates');
    return { success: true, message: `Template "${name}" updated.` };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { error: message };
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────

export async function deleteTemplateAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  try {
    const user = await requireUser();
    const id = (formData.get('id') as string | null) ?? '';
    if (!id) return { error: 'Template ID is required.' };
    await deleteTemplate(id, { actorUserId: user.id });
    revalidatePath('/dashboard/templates');
    return { success: true, message: 'Template deleted.' };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { error: message };
  }
}
