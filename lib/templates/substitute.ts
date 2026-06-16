// Deterministic template substitution. NO AI — pure string interpolation of
// {{variable}} placeholders. Used by the template library + draft composer.

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Extract the unique variable names referenced in a template body, in order. */
export function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of body.matchAll(PLACEHOLDER)) {
    const name = match[1]!;
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

export interface SubstituteResult {
  /** The body with all known variables replaced. */
  text: string;
  /** Variables referenced in the body but absent from `values`. */
  missing: string[];
  /** Variables supplied in `values` but never referenced in the body. */
  unused: string[];
}

export interface SubstituteOptions {
  /**
   * What to render for a variable with no provided value.
   * - 'keep' (default): leave the original `{{var}}` placeholder in place.
   * - 'blank': replace with an empty string.
   * - 'marker': replace with `[var]` so gaps are visible in a preview.
   */
  onMissing?: 'keep' | 'blank' | 'marker';
}

/**
 * Substitute `{{var}}` placeholders in `body` using `values`. Deterministic and
 * side-effect free. Reports missing/unused variables so the composer can warn
 * the operator before they save a draft (review-then-send).
 */
export function substitute(
  body: string,
  values: Record<string, string | number | null | undefined>,
  options: SubstituteOptions = {},
): SubstituteResult {
  const onMissing = options.onMissing ?? 'keep';
  const referenced = extractVariables(body);
  const missing: string[] = [];

  const text = body.replace(PLACEHOLDER, (_full, rawName: string) => {
    const name = rawName.trim();
    const value = values[name];
    if (value === undefined || value === null || value === '') {
      if (!missing.includes(name)) missing.push(name);
      switch (onMissing) {
        case 'blank':
          return '';
        case 'marker':
          return `[${name}]`;
        case 'keep':
        default:
          return `{{${name}}}`;
      }
    }
    return String(value);
  });

  const provided = Object.keys(values).filter(
    (k) => values[k] !== undefined && values[k] !== null && values[k] !== '',
  );
  const unused = provided.filter((k) => !referenced.includes(k));

  return { text, missing, unused };
}

/** Build a sample values map (`{{name}}` → "name") for a live preview. */
export function sampleValues(variables: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of variables) {
    out[v] = `<${v}>`;
  }
  return out;
}
