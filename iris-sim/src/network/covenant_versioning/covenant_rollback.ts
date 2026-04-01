/**
 * Microstep 14P — Versioning & Immutable History. Append-only rollback.
 */

import type { CovenantPersistenceRecord, CovenantPersistenceRecordMetadata } from '../covenant_persistence/index.js';
import { CovenantPersistenceError, CovenantPersistenceErrorCode } from '../covenant_persistence/index.js';
import type { CovenantPersistenceEngine } from '../covenant_persistence/index.js';
import type { CovenantHistoryEngine } from './covenant_history_engine.js';
import type { CovenantDefinition } from '../covenant_dsl/index.js';

/**
 * Rollback creates a NEW record (append-only). Does not delete or overwrite history.
 */
export class CovenantRollbackEngine {
  constructor(
    private readonly persistence: CovenantPersistenceEngine,
    private readonly history: CovenantHistoryEngine,
  ) {}

  /**
   * Append a new version whose definition matches the target version.
   * version = latest + 1.
   */
  rollbackToVersion(
    covenant_id: string,
    version: number,
    metadata?: CovenantPersistenceRecordMetadata,
  ): CovenantPersistenceRecord {
    const target = this.history.getHistory(covenant_id).find((v) => v.version === version);
    if (!target) {
      throw new CovenantPersistenceError(
        CovenantPersistenceErrorCode.NOT_FOUND,
        `Version not found: ${covenant_id}@${version}`,
      );
    }
    const clone: CovenantDefinition = {
      id: target.definition.id,
      name: target.definition.name,
      ...(target.definition.description != null ? { description: target.definition.description } : {}),
      enabled: target.definition.enabled,
      severity: target.definition.severity,
      condition: target.definition.condition,
    };
    return this.persistence.update(clone, metadata);
  }
}
