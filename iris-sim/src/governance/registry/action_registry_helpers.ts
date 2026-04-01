/**
 * Phase 12D — Governance Action Registry. Helpers.
 * Integrity verification and deterministic sorting.
 */

import type { GovernanceActionRecord } from './action_registry_types.js';
import { computeGovernanceActionHash } from '../action_model/index.js';

/**
 * Recompute action hash and compare with stored action_hash.
 * Returns true iff they match.
 */
export function verifyRecordIntegrity(record: GovernanceActionRecord): boolean {
  const computed = computeGovernanceActionHash(record.action);
  return computed === record.action_hash;
}

/**
 * Sort records by recorded_timestamp ascending, then by action_hash (localeCompare).
 * Deterministic.
 */
export function sortRegistryRecords(
  records: readonly GovernanceActionRecord[]
): GovernanceActionRecord[] {
  return [...records].sort((a, b) => {
    if (a.recorded_timestamp !== b.recorded_timestamp) {
      return a.recorded_timestamp - b.recorded_timestamp;
    }
    return a.action_hash.localeCompare(b.action_hash);
  });
}
