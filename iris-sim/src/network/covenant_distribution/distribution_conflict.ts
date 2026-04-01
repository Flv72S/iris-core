/**
 * Microstep 14R — Distribution & Sync Engine. Conflict detection.
 */

import type { CovenantPersistenceRecord } from '../covenant_persistence/index.js';
import type { CovenantDefinition } from '../covenant_dsl/index.js';

function definitionEqual(a: CovenantDefinition, b: CovenantDefinition): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    (a.description ?? '') === (b.description ?? '') &&
    a.enabled === b.enabled &&
    a.severity === b.severity &&
    a.condition === b.condition
  );
}

/**
 * Conflict exists if same covenant_id, same version, but different definition.
 * For now: log conflict, do not overwrite, keep both histories.
 */
export function detectConflict(
  local: readonly CovenantPersistenceRecord[],
  incoming: readonly CovenantPersistenceRecord[],
): boolean {
  for (const inc of incoming) {
    const localSame = local.filter(
      (l) => l.covenant_id === inc.covenant_id && l.version === inc.version,
    );
    for (const l of localSame) {
      if (!definitionEqual(l.definition, inc.definition)) {
        return true;
      }
    }
  }
  return false;
}
