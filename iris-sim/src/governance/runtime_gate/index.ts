/**
 * Step 8D — Governance Runtime Gate. Single verification point before any AI action.
 */

export type { RuntimeActionRequest, RuntimeDecision } from './types/runtime_types.js';
export { isFeatureExecutable } from './guard/runtime_feature_guard.js';
export { resolveRuntimeDecision } from './decision/runtime_decision_resolver.js';
export { evaluateRuntimeAction } from './engine/governance_runtime_gate.js';
