import { describe, it, expect } from 'vitest';
import { extractVariables, substitute, sampleValues } from './substitute';

describe('extractVariables', () => {
  it('returns unique variables in order of first appearance', () => {
    expect(
      extractVariables('Hi {{name}}, your {{plan}} — thanks {{name}}!'),
    ).toEqual(['name', 'plan']);
  });

  it('tolerates whitespace inside braces', () => {
    expect(extractVariables('{{ a }}{{b}}{{  c  }}')).toEqual(['a', 'b', 'c']);
  });

  it('returns empty for no placeholders', () => {
    expect(extractVariables('plain text')).toEqual([]);
  });

  it('ignores malformed single-brace tokens', () => {
    expect(extractVariables('{not} {{good}}')).toEqual(['good']);
  });
});

describe('substitute', () => {
  it('replaces known variables', () => {
    const r = substitute('Hi {{name}}!', { name: 'Alex' });
    expect(r.text).toBe('Hi Alex!');
    expect(r.missing).toEqual([]);
    expect(r.unused).toEqual([]);
  });

  it('coerces numbers to strings', () => {
    expect(substitute('{{count}} fans', { count: 42 }).text).toBe('42 fans');
  });

  it('keeps placeholder for missing vars by default and reports them', () => {
    const r = substitute('Hi {{name}} from {{handle}}', { name: 'Alex' });
    expect(r.text).toBe('Hi Alex from {{handle}}');
    expect(r.missing).toEqual(['handle']);
  });

  it('onMissing=blank empties missing vars', () => {
    const r = substitute('Hi {{name}}!', {}, { onMissing: 'blank' });
    expect(r.text).toBe('Hi !');
    expect(r.missing).toEqual(['name']);
  });

  it('onMissing=marker shows [var]', () => {
    const r = substitute('Hi {{name}}!', {}, { onMissing: 'marker' });
    expect(r.text).toBe('Hi [name]!');
  });

  it('treats empty-string and null values as missing', () => {
    const r = substitute('{{a}}{{b}}', { a: '', b: null });
    expect(r.missing).toEqual(['a', 'b']);
  });

  it('reports unused provided values', () => {
    const r = substitute('Hi {{name}}', { name: 'Alex', extra: 'x' });
    expect(r.unused).toEqual(['extra']);
  });

  it('dedupes missing across repeated placeholders', () => {
    const r = substitute('{{x}} {{x}} {{x}}', {});
    expect(r.missing).toEqual(['x']);
  });

  it('is deterministic and does not mutate inputs', () => {
    const values = { name: 'Alex' };
    const body = 'Hi {{name}}';
    expect(substitute(body, values).text).toBe(substitute(body, values).text);
    expect(values).toEqual({ name: 'Alex' });
  });
});

describe('sampleValues', () => {
  it('builds placeholder preview values', () => {
    expect(sampleValues(['name', 'plan'])).toEqual({
      name: '<name>',
      plan: '<plan>',
    });
  });
});
