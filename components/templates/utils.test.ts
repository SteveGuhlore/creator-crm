import { describe, it, expect } from 'vitest';
import { groupByCategory, isShared } from './utils';
import type { TemplateRow } from './utils';

const make = (overrides: Partial<TemplateRow> = {}): TemplateRow => ({
  id: 'id-1',
  name: 'Template A',
  category: 'Greeting',
  body: 'Hello {{name}}',
  variables: ['name'],
  modelId: 'model-1',
  createdAt: new Date('2025-01-01'),
  ...overrides,
});

describe('groupByCategory', () => {
  it('returns an empty map for empty input', () => {
    expect(groupByCategory([])).toEqual(new Map());
  });

  it('groups templates by category', () => {
    const templates: TemplateRow[] = [
      make({ id: '1', name: 'B', category: 'Cat1' }),
      make({ id: '2', name: 'A', category: 'Cat2' }),
      make({ id: '3', name: 'C', category: 'Cat1' }),
    ];
    const result = groupByCategory(templates);
    expect([...result.keys()]).toEqual(['Cat1', 'Cat2']);
    expect(result.get('Cat1')!.map((t) => t.name)).toEqual(['B', 'C']);
    expect(result.get('Cat2')!.map((t) => t.name)).toEqual(['A']);
  });

  it('sorts categories alphabetically', () => {
    const templates: TemplateRow[] = [
      make({ id: '1', category: 'Zzz' }),
      make({ id: '2', category: 'Aaa' }),
      make({ id: '3', category: 'Mmm' }),
    ];
    const result = groupByCategory(templates);
    expect([...result.keys()]).toEqual(['Aaa', 'Mmm', 'Zzz']);
  });

  it('sorts templates within each category by name', () => {
    const templates: TemplateRow[] = [
      make({ id: '1', name: 'Zebra', category: 'Cat' }),
      make({ id: '2', name: 'Apple', category: 'Cat' }),
      make({ id: '3', name: 'Mango', category: 'Cat' }),
    ];
    const result = groupByCategory(templates);
    expect(result.get('Cat')!.map((t) => t.name)).toEqual([
      'Apple',
      'Mango',
      'Zebra',
    ]);
  });
});

describe('isShared', () => {
  it('returns true when modelId is null', () => {
    expect(isShared({ modelId: null })).toBe(true);
  });

  it('returns false when modelId is a non-null string', () => {
    expect(isShared({ modelId: 'model-1' })).toBe(false);
  });
});
