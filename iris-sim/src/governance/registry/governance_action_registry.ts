/**
 * Phase 12D — Governance Action Registry.
 * Append-only, immutable records; no randomness.
 */

import { computeGovernanceActionHash } from '../action_model/index.js';
import type { GovernanceAction } from '../action_model/index.js';
import type { GovernanceAuthorizationResult } from '../authorization/index.js';
import type { GovernanceExecutionResult } from '../execution/index.js';
import type { GovernanceActionRecord, GovernanceActionQueryFilter } from './action_registry_types.js';
import { sortRegistryRecords } from './action_registry_helpers.js';

const registry: GovernanceActionRecord[] = [];

function effectiveStatus(record: GovernanceActionRecord): string {
  if (record.execution_result) {
    const s = record.execution_result.status;
    if (s === 'EXECUTION_ACCEPTED') return 'EXECUTED';
    if (s === 'EXECUTION_REJECTED') return 'REJECTED';
    if (s === 'EXECUTION_FAILED') return 'FAILED';
    return s;
  }
  if (record.authorization_result) {
    return record.authorization_result.status === 'AUTHORIZED' ? 'AUTHORIZED' : 'REJECTED';
  }
  return record.action.status;
}

function matchesFilter(record: GovernanceActionRecord, filter: GovernanceActionQueryFilter): boolean {
  if (filter.action_type !== undefined && record.action.action_type !== filter.action_type) return false;
  if (filter.initiator_id !== undefined && record.action.initiator_id !== filter.initiator_id) return false;
  if (filter.status !== undefined && effectiveStatus(record) !== filter.status) return false;
  return true;
}

/**
 * Store an action; compute hash and append record. Rejects if action_hash already exists.
 */
export function storeAction(
  action: GovernanceAction,
  recorded_timestamp: number
): GovernanceActionRecord {
  const action_hash = computeGovernanceActionHash(action);
  const exists = registry.some((r) => r.action_hash === action_hash);
  if (exists) {
    throw new Error(`Governance action already exists: ${action_hash}`);
  }
  const record: GovernanceActionRecord = Object.freeze({
    action,
    action_hash,
    recorded_timestamp,
  });
  registry.push(record);
  return record;
}

/**
 * Attach authorization result to an existing record. Fails if record not found or already has result.
 */
export function attachAuthorizationResult(
  action_hash: string,
  result: GovernanceAuthorizationResult
): GovernanceActionRecord {
  const idx = registry.findIndex((r) => r.action_hash === action_hash);
  if (idx === -1) {
    throw new Error(`Governance action not found: ${action_hash}`);
  }
  const existing = registry[idx];
  if (existing.authorization_result !== undefined) {
    throw new Error(`Authorization result already attached: ${action_hash}`);
  }
  const updated: GovernanceActionRecord = Object.freeze({
    ...existing,
    authorization_result: Object.freeze(result),
  });
  registry[idx] = updated;
  return updated;
}

/**
 * Attach execution result to an existing record. Fails if record not found or already has result.
 */
export function attachExecutionResult(
  action_hash: string,
  result: GovernanceExecutionResult
): GovernanceActionRecord {
  const idx = registry.findIndex((r) => r.action_hash === action_hash);
  if (idx === -1) {
    throw new Error(`Governance action not found: ${action_hash}`);
  }
  const existing = registry[idx];
  if (existing.execution_result !== undefined) {
    throw new Error(`Execution result already attached: ${action_hash}`);
  }
  const updated: GovernanceActionRecord = Object.freeze({
    ...existing,
    execution_result: Object.freeze(result),
  });
  registry[idx] = updated;
  return updated;
}

/**
 * Query records by optional filter. Returns sorted by recorded_timestamp, then action_hash.
 */
export function queryActions(filter?: GovernanceActionQueryFilter): GovernanceActionRecord[] {
  const list = filter
    ? registry.filter((r) => matchesFilter(r, filter))
    : [...registry];
  return sortRegistryRecords(list);
}

/**
 * Get a single record by action_hash, or undefined.
 */
export function getActionByHash(action_hash: string): GovernanceActionRecord | undefined {
  return registry.find((r) => r.action_hash === action_hash);
}

/**
 * Full audit trail for an action (the full record). Same as getActionByHash.
 */
export function getAuditTrail(action_hash: string): GovernanceActionRecord | undefined {
  return getActionByHash(action_hash);
}
