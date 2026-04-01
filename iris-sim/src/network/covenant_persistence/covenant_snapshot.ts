/**
 * Microstep 14O — Covenant Persistence Layer. Snapshot reconstruction.
 */

import type { CovenantDefinition } from '../covenant_dsl/index.js';
import type { CovenantPersistenceRecord } from './covenant_persistence_types.js';

/**
 * Build a deterministic snapshot from persistence records.
 * - Latest version per covenant_id.
 * - If last action = DISABLE → exclude from snapshot.
 * Same records → same snapshot.
 */
export function buildCovenantSnapshot(
  records: readonly CovenantPersistenceRecord[],
): Map<string, CovenantDefinition> {
  const byCovenant = new Map<string, CovenantPersistenceRecord[]>();
  for (const r of records) {
    const list = byCovenant.get(r.covenant_id) ?? [];
    list.push(r);
    byCovenant.set(r.covenant_id, list);
  }
  const snapshot = new Map<string, CovenantDefinition>();
  for (const [, list] of byCovenant) {
    const sorted = [...list].sort((a, b) => a.version - b.version);
    const latest = sorted[sorted.length - 1]!;
    if (latest.action === 'DISABLE') continue;
    snapshot.set(latest.covenant_id, latest.definition);
  }
  return snapshot;
}
