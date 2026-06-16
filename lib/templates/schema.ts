import { z } from 'zod';

// Input validation for template mutations (boundary validation, §8).
export const templateCreateSchema = z.object({
  modelId: z.string().min(1).nullish(), // null = shared across models
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(5000),
});
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;

export const templateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  body: z.string().trim().min(1).max(5000).optional(),
});
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
