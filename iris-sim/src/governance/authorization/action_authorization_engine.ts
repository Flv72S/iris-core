/**
 * Phase 12C — Action Authorization Engine. Policy enforcement gate before execution.
 */

import type { GovernanceAction } from '../action_model/index.js';
import type {
  GovernanceAuthorizationResult,
  GovernanceRole,
} from './action_authorization_types.js';
import { evaluatePolicy } from './policy_evaluator.js';

const NODE_SCOPES = Object.freeze(['NODE', 'GLOBAL']);
const NODE_ACTION_PREFIX = 'NODE_';

/**
 * Validates that the action's scope is allowed for its type.
 * NODE_* actions require scope NODE or GLOBAL. Other actions accept any scope.
 * Pure and deterministic.
 */
export function validateScope(action: GovernanceAction, scope: string): boolean {
  const actionType = action.action_type;
  if (actionType.startsWith(NODE_ACTION_PREFIX)) {
    return NODE_SCOPES.includes(scope);
  }
  return true;
}

/**
 * Authorizes a governance action: verifies role permission and scope, returns deterministic result.
 * Evaluation order: 1) role via evaluatePolicy, 2) scope via validateScope.
 */
export function authorizeAction(
  action: GovernanceAction,
  initiator_role: GovernanceRole,
  scope: string,
  evaluated_timestamp: number
): GovernanceAuthorizationResult {
  if (!evaluatePolicy(action.action_type, initiator_role)) {
    return Object.freeze({
      action_id: action.action_id,
      initiator_id: action.initiator_id,
      status: 'ROLE_VIOLATION',
      evaluated_timestamp,
      metadata: Object.freeze({ reason: 'Initiator role not allowed for this action type' }),
    });
  }
  if (!validateScope(action, scope)) {
    return Object.freeze({
      action_id: action.action_id,
      initiator_id: action.initiator_id,
      status: 'SCOPE_VIOLATION',
      evaluated_timestamp,
      metadata: Object.freeze({ reason: 'Action scope not valid for this action type' }),
    });
  }
  return Object.freeze({
    action_id: action.action_id,
    initiator_id: action.initiator_id,
    status: 'AUTHORIZED',
    evaluated_timestamp,
    metadata: Object.freeze({}),
  });
}

/**
 * Returns true iff the authorization result status is AUTHORIZED.
 */
export function isActionAuthorized(result: GovernanceAuthorizationResult): boolean {
  return result.status === 'AUTHORIZED';
}
