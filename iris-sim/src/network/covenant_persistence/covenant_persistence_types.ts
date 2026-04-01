/**
 * Microstep 14O — Covenant Persistence Layer. Types.
 */

import type { CovenantDefinition } from '../covenant_dsl/index.js';

export type CovenantPersistenceAction = 'CREATE' | 'UPDATE' | 'DISABLE';

export interface CovenantPersistenceRecordMetadata {
  readonly actor_id?: string;
  readonly source?: string;
  readonly note?: string;
}

export interface CovenantPersistenceRecord {
  readonly record_id: string;
  readonly covenant_id: string;
  readonly version: number;
  readonly action: CovenantPersistenceAction;
  readonly definition: CovenantDefinition;
  readonly timestamp: number;
  readonly metadata?: CovenantPersistenceRecordMetadata;
}
