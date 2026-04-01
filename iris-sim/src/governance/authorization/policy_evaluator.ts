/**
 * Phase 12C — Policy Evaluator. Deterministic role-to-action-type mapping.
 */

import type { ActionType } from '../action_model/index.js';
import type { GovernanceRole } from './action_authorization_types.js';

/** Allowed roles per action type. Deterministic mapping table. */
const POLICY_RULES: Readonly<Record<ActionType, readonly GovernanceRole[]>> = Object.freeze({
  NODE_BLACKLIST: Object.freeze<GovernanceRole[]>(['ADMIN']),
  NODE_WHITELIST: Object.freeze<GovernanceRole[]>(['ADMIN']),
  NODE_TRUST_REVOCATION: Object.freeze<GovernanceRole[]>(['ADMIN', 'GOVERNOR']),
  NODE_TRUST_RESTORE: Object.freeze<GovernanceRole[]>(['ADMIN', 'GOVERNOR']),
  POLICY_UPDATE: Object.freeze<GovernanceRole[]>(['ADMIN']),
  PROTOCOL_PARAMETER_UPDATE: Object.freeze<GovernanceRole[]>(['ADMIN']),
  FEDERATION_ALERT: Object.freeze<GovernanceRole[]>(['ADMIN', 'GOVERNOR']),
  GOVERNANCE_METADATA_UPDATE: Object.freeze<GovernanceRole[]>(['ADMIN']),
});

/**
 * Evaluates whether the given role is allowed to perform the action type.
 * Pure and deterministic.
 */
export function evaluatePolicy(actionType: ActionType, role: GovernanceRole): boolean {
  const allowed = POLICY_RULES[actionType];
  if (allowed == null) return false;
  return allowed.includes(role);
}
