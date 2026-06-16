// Pure display helpers for the template library UI. No DB calls, no imports
// from lib/db — safe to unit-test without any environment setup.

export interface TemplateRow {
  id: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  modelId: string | null;
  createdAt: Date | string;
}

/** Group a flat template list into { category → templates[] }, sorted by name. */
export function groupByCategory(
  templates: TemplateRow[],
): Map<string, TemplateRow[]> {
  const map = new Map<string, TemplateRow[]>();
  for (const t of templates) {
    const bucket = map.get(t.category) ?? [];
    bucket.push(t);
    map.set(t.category, bucket);
  }
  // Sort each bucket by name, and return categories in alphabetical order.
  const sorted = new Map<string, TemplateRow[]>();
  for (const key of Array.from(map.keys()).sort()) {
    sorted.set(
      key,
      (map.get(key) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    );
  }
  return sorted;
}

/** True if the template is shared across models (modelId == null). */
export function isShared(template: Pick<TemplateRow, 'modelId'>): boolean {
  return template.modelId === null;
}
