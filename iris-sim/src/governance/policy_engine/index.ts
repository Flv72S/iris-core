/**
 * Step 8B — Governance Policy Engine. Deterministic Policy DSL + Feature Enforcement.
 */

export type {
  PolicyOperator,
  PolicyField,
  PolicyCondition,
  PolicyActionType,
  PolicyAction,
  GovernancePolicy,
} from './types/policy_types.js';
export { POLICY_FIELDS } from './types/policy_types.js';

export { parsePolicyDSL } from './parser/policy_parser.js';

export { evaluatePolicy } from './evaluator/policy_evaluator.js';

export type { PolicyEnforcementResult } from './enforcement/enforcement_engine.js';
export { evaluatePolicies } from './enforcement/enforcement_engine.js';

export { isFeatureAllowed } from './feature_gate/feature_gate_resolver.js';

export { DEFAULT_POLICIES } from './registry/policy_registry.js';
