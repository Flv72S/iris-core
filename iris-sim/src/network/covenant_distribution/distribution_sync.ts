/**
 * Microstep 14R — Distribution & Sync Engine. Idempotent sync.
 */

import type { CovenantPersistenceStore } from '../covenant_persistence/index.js';
import type { CovenantPersistenceRecord } from '../covenant_persistence/index.js';

export class DistributionSyncEngine {
  constructor(private readonly store: CovenantPersistenceStore) {}

  /**
   * Apply incoming records idempotently: if record_id already exists, skip; else append.
   */
  apply(records: readonly CovenantPersistenceRecord[]): void {
    const existingIds = new Set(this.store.getAll().map((r) => r.record_id));
    for (const r of records) {
      if (!existingIds.has(r.record_id)) {
        this.store.append(r);
        existingIds.add(r.record_id);
      }
    }
  }
}
