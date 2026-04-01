/**
 * Microstep 14O — Covenant Persistence Layer. Append-only store.
 */

import type { CovenantPersistenceRecord } from './covenant_persistence_types.js';

export class CovenantPersistenceStore {
  private readonly records: CovenantPersistenceRecord[] = [];

  append(record: CovenantPersistenceRecord): void {
    this.records.push(record);
  }

  getAll(): CovenantPersistenceRecord[] {
    return [...this.records];
  }

  getByCovenantId(covenant_id: string): CovenantPersistenceRecord[] {
    return this.records.filter((r) => r.covenant_id === covenant_id);
  }
}
