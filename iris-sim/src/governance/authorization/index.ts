/**
 * Phase 12C — Action Authorization Layer.
 * Policy enforcement gate before Governance Execution Engine (12B).
 */

export type {
  GovernanceRole,
  AuthorizationStatus,
  GovernanceAuthorizationResult,
} from './action_authorization_types.js';
export { authorizeAction, validateScope, isActionAuthorized } from './action_authorization_engine.js';
export { evaluatePolicy } from './policy_evaluator.js';
