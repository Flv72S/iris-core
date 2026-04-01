/**
 * Phase 11B — Registry audit log (hashable, chainable, verifiable).
 */

import { FEDERATED_REGISTRY_SCHEMA_VERSION, type RegistryAuditEntry, type RegistryAuditAction } from '../types/federated_node_registry_types.js';
import { hashRegistryPayload } from '../hashing/registry_hash.js';

/**
 * Create a registry audit entry. entry_hash = H(previous_hash + new_hash + action + node_id + actor + timestamp).
 */
export function createRegistryAuditEntry(
  action: RegistryAuditAction,
  node_id: string,
  actor: string,
  previous_hash: string,
  new_hash: string,
  timestamp: number = Date.now()
): RegistryAuditEntry {
  const payload = { action, node_id, actor, previous_hash, new_hash, timestamp, version: FEDERATED_REGISTRY_SCHEMA_VERSION };
  const entry_hash = hashRegistryPayload(payload);
  return Object.freeze({
    timestamp,
    action,
    node_id,
    actor,
    previous_hash,
    new_hash,
    entry_hash,
    version: FEDERATED_REGISTRY_SCHEMA_VERSION,
  });
}

/**
 * Verify audit entry: recompute entry_hash and compare.
 */
export function verifyRegistryAuditEntry(entry: RegistryAuditEntry): boolean {
  const payload = {
    action: entry.action,
    node_id: entry.node_id,
    actor: entry.actor,
    previous_hash: entry.previous_hash,
    new_hash: entry.new_hash,
    timestamp: entry.timestamp,
    version: entry.version,
  };
  const expected = hashRegistryPayload(payload);
  return expected === entry.entry_hash;
}
