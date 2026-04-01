/**
 * Microstep 14P — Versioning & Immutable History. History engine.
 */

import type { CovenantPersistenceStore } from '../covenant_persistence/index.js';
import type { CovenantVersion } from './covenant_versioning_types.js';

export class CovenantHistoryEngine {
  constructor(private readonly store: CovenantPersistenceStore) {}

  /**
   * Full version timeline per covenant, sorted by version ASC.
   */
  getHistory(covenant_id: string): CovenantVersion[] {
    const records = this.store.getByCovenantId(covenant_id);
    const sorted = [...records].sort((a, b) => a.version - b.version);
    return sorted.map((r) => ({
      covenant_id: r.covenant_id,
      version: r.version,
      definition: r.definition,
      timestamp: r.timestamp,
      action: r.action,
    }));
  }

  /** Unique covenant_ids present in the store. */
  getCovenantIds(): string[] {
    const all = this.store.getAll();
    const ids = new Set(all.map((r) => r.covenant_id));
    return Array.from(ids);
  }
}
