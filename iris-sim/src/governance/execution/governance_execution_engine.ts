/**
 * Phase 12B — Governance Execution Engine.
 * Validates and executes governance actions deterministically; produces execution results.
 */

import type { GovernanceAction } from '../action_model/index.js';
import { validateGovernanceAction } from '../action_model/index.js';
import type { GovernanceExecutionResult } from './execution_result_types.js';

const SUPPORTED_ACTION_TYPES: ReadonlySet<string> = new Set([
  'NODE_TRUST_REVOCATION',
  'NODE_TRUST_RESTORE',
  'NODE_BLACKLIST',
  'NODE_WHITELIST',
  'POLICY_UPDATE',
  'PROTOCOL_PARAMETER_UPDATE',
  'FEDERATION_ALERT',
  'GOVERNANCE_METADATA_UPDATE',
]);

/**
 * Validates action for execution: structure, status AUTHORIZED, and supported action_type.
 * Pure and deterministic.
 */
export function validateAction(action: GovernanceAction): boolean {
  if (!validateGovernanceAction(action)) return false;
  if (action.status !== 'AUTHORIZED') return false;
  if (!SUPPORTED_ACTION_TYPES.has(action.action_type)) return false;
  return true;
}

/**
 * Executes a governance action. Validates first; returns EXECUTION_REJECTED if invalid.
 * Otherwise returns EXECUTION_ACCEPTED with deterministic result_metadata.
 * Deterministic; no side effects on external systems.
 */
export function executeAction(
  action: GovernanceAction,
  executor_id: string,
  execution_timestamp: number
): GovernanceExecutionResult {
  if (!validateAction(action)) {
    return Object.freeze({
      action_id: action.action_id,
      executor_id,
      status: 'EXECUTION_REJECTED',
      execution_timestamp,
      result_metadata: Object.freeze({ validation_failed: true }),
    });
  }
  const result_metadata: Record<string, unknown> = {
    action_type: action.action_type,
    executed: true,
  };
  return Object.freeze({
    action_id: action.action_id,
    executor_id,
    status: 'EXECUTION_ACCEPTED',
    execution_timestamp,
    result_metadata: Object.freeze(result_metadata),
  });
}

/**
 * Produces an execution result with status EXECUTION_REJECTED and the given reason in metadata.
 */
export function rejectAction(
  action: GovernanceAction,
  executor_id: string,
  execution_timestamp: number,
  reason: string
): GovernanceExecutionResult {
  return Object.freeze({
    action_id: action.action_id,
    executor_id,
    status: 'EXECUTION_REJECTED',
    execution_timestamp,
    result_metadata: Object.freeze({ rejection_reason: reason }),
  });
}

/**
 * Sorts actions for deterministic execution order: by timestamp ascending, then by action_id (localeCompare).
 */
export function sortActionsForExecution(actions: readonly GovernanceAction[]): GovernanceAction[] {
  return [...actions].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.action_id.localeCompare(b.action_id);
  });
}
