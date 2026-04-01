/**
 * Microstep 14Q — Identity & Governance Layer. Governed service (wrapper).
 * All mutations go through authorization and enriched metadata.
 */

import type { CovenantDefinition } from '../covenant_dsl/index.js';
import type { CovenantPersistenceRecord, CovenantPersistenceRecordMetadata } from '../covenant_persistence/index.js';
import type { CovenantPersistenceEngine } from '../covenant_persistence/index.js';
import type { CovenantRollbackEngine } from '../covenant_versioning/index.js';
import type { Actor } from './governance_types.js';
import type { GovernanceEngine } from './governance_engine.js';
import { enrichMetadata } from './governance_audit.js';

export class GovernedCovenantService {
  constructor(
    private readonly governance: GovernanceEngine,
    private readonly persistence: CovenantPersistenceEngine,
    private readonly rollback: CovenantRollbackEngine,
  ) {}

  create(
    actor: Actor,
    def: CovenantDefinition,
    metadata?: Readonly<Record<string, unknown>>,
  ): CovenantPersistenceRecord {
    this.governance.authorize(actor, 'CREATE');
    const enriched = enrichMetadata(metadata, actor, 'CREATE') as CovenantPersistenceRecordMetadata;
    return this.persistence.create(def, enriched);
  }

  update(
    actor: Actor,
    def: CovenantDefinition,
    metadata?: Readonly<Record<string, unknown>>,
  ): CovenantPersistenceRecord {
    this.governance.authorize(actor, 'UPDATE');
    const enriched = enrichMetadata(metadata, actor, 'UPDATE') as CovenantPersistenceRecordMetadata;
    return this.persistence.update(def, enriched);
  }

  disable(
    actor: Actor,
    covenant_id: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): CovenantPersistenceRecord {
    this.governance.authorize(actor, 'DISABLE');
    const enriched = enrichMetadata(metadata, actor, 'DISABLE') as CovenantPersistenceRecordMetadata;
    return this.persistence.disable(covenant_id, enriched);
  }

  rollbackToVersion(
    actor: Actor,
    covenant_id: string,
    version: number,
    metadata?: Readonly<Record<string, unknown>>,
  ): CovenantPersistenceRecord {
    this.governance.authorize(actor, 'ROLLBACK');
    const enriched = enrichMetadata(metadata, actor, 'ROLLBACK') as CovenantPersistenceRecordMetadata;
    return this.rollback.rollbackToVersion(covenant_id, version, enriched);
  }

  /** Read is authorized; returns current definitions. */
  getCurrentDefinitions(actor: Actor): CovenantDefinition[] {
    this.governance.authorize(actor, 'READ');
    return this.persistence.getCurrentDefinitions();
  }
}
