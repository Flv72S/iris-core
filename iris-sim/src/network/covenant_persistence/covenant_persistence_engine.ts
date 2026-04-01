/**
 * Microstep 14O — Covenant Persistence Layer. Engine.
 */

import { randomUUID } from 'node:crypto';
import type { CovenantDefinition } from '../covenant_dsl/index.js';
import type { CovenantPersistenceRecord, CovenantPersistenceRecordMetadata } from './covenant_persistence_types.js';
import { CovenantPersistenceError, CovenantPersistenceErrorCode } from './covenant_persistence_errors.js';
import type { CovenantPersistenceStore } from './covenant_persistence_store.js';
import { buildCovenantSnapshot } from './covenant_snapshot.js';

export class CovenantPersistenceEngine {
  constructor(private readonly store: CovenantPersistenceStore) {}

  create(def: CovenantDefinition, metadata?: CovenantPersistenceRecordMetadata): CovenantPersistenceRecord {
    const existing = this.store.getByCovenantId(def.id);
    if (existing.length > 0) {
      throw new CovenantPersistenceError(
        CovenantPersistenceErrorCode.DUPLICATE_CREATE,
        `Covenant already exists: ${def.id}`,
      );
    }
    const record: CovenantPersistenceRecord = Object.freeze({
      record_id: randomUUID(),
      covenant_id: def.id,
      version: 1,
      action: 'CREATE',
      definition: def,
      timestamp: Date.now(),
      ...(metadata != null ? { metadata } : {}),
    });
    this.store.append(record);
    return record;
  }

  update(def: CovenantDefinition, metadata?: CovenantPersistenceRecordMetadata): CovenantPersistenceRecord {
    const existing = this.store.getByCovenantId(def.id);
    if (existing.length === 0) {
      throw new CovenantPersistenceError(
        CovenantPersistenceErrorCode.NOT_FOUND,
        `Covenant not found: ${def.id}`,
      );
    }
    const sorted = [...existing].sort((a, b) => a.version - b.version);
    const latest = sorted[sorted.length - 1]!;
    if (latest.action === 'DISABLE') {
      throw new CovenantPersistenceError(
        CovenantPersistenceErrorCode.INVALID_UPDATE,
        `Cannot update disabled covenant: ${def.id}`,
      );
    }
    const version = latest.version + 1;
    const record: CovenantPersistenceRecord = Object.freeze({
      record_id: randomUUID(),
      covenant_id: def.id,
      version,
      action: 'UPDATE',
      definition: def,
      timestamp: Date.now(),
      ...(metadata != null ? { metadata } : {}),
    });
    this.store.append(record);
    return record;
  }

  disable(covenant_id: string, metadata?: CovenantPersistenceRecordMetadata): CovenantPersistenceRecord {
    const existing = this.store.getByCovenantId(covenant_id);
    if (existing.length === 0) {
      throw new CovenantPersistenceError(
        CovenantPersistenceErrorCode.NOT_FOUND,
        `Covenant not found: ${covenant_id}`,
      );
    }
    const snapshot = buildCovenantSnapshot(this.store.getAll());
    const currentDef = snapshot.get(covenant_id);
    if (!currentDef) {
      throw new CovenantPersistenceError(
        CovenantPersistenceErrorCode.NOT_FOUND,
        `Covenant not in active snapshot: ${covenant_id}`,
      );
    }
    const maxVersion = Math.max(...existing.map((r) => r.version));
    const record: CovenantPersistenceRecord = Object.freeze({
      record_id: randomUUID(),
      covenant_id: covenant_id,
      version: maxVersion + 1,
      action: 'DISABLE',
      definition: { ...currentDef, enabled: false },
      timestamp: Date.now(),
      ...(metadata != null ? { metadata } : {}),
    });
    this.store.append(record);
    return record;
  }

  getCurrentDefinitions(): CovenantDefinition[] {
    const snapshot = buildCovenantSnapshot(this.store.getAll());
    return Array.from(snapshot.values());
  }
}
