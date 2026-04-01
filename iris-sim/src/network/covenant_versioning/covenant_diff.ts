/**
 * Microstep 14P — Versioning & Immutable History. Diff engine.
 */

import type { CovenantDefinition } from '../covenant_dsl/index.js';

export interface CovenantDiffResult {
  readonly changed: boolean;
  readonly fields: readonly {
    readonly field: string;
    readonly from: unknown;
    readonly to: unknown;
  }[];
}

const FIELDS: (keyof CovenantDefinition)[] = ['condition', 'severity', 'enabled', 'name', 'description'];

/**
 * Compare two covenant definitions. Ignores id.
 * Returns changed=true if any compared field differs.
 */
export function diffCovenants(a: CovenantDefinition, b: CovenantDefinition): CovenantDiffResult {
  const fields: { field: string; from: unknown; to: unknown }[] = [];
  for (const key of FIELDS) {
    const from = a[key];
    const to = b[key];
    if (from !== to) {
      fields.push({ field: key, from, to });
    }
  }
  return Object.freeze({
    changed: fields.length > 0,
    fields: Object.freeze(fields),
  });
}
