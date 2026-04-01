/**
 * Feature Activation Policies — Fase 5
 * Declarative, product-owned rules. They authorize or deny; they do not execute.
 */

export type { FeaturePolicyDecision } from './FeaturePolicyDecision';
export type { FeatureActivationPolicy } from './FeatureActivationPolicy';
export type { FeaturePolicyInput, FeaturePriorityForPolicy } from './FeaturePolicyInput';
export { evaluate, FeaturePolicyEngine, evaluateFeaturePolicies } from './FeaturePolicyEngine';
export type { PolicyKillSwitchRegistry } from './kill-switch/PolicyKillSwitch';
export { isPolicyEnabled } from './kill-switch/PolicyKillSwitch';
export type { PolicyAuditEntry } from './audit/PolicyAuditLog';
export { appendPolicyAudit, readPolicyAudit, _resetPolicyAuditForTest } from './audit/PolicyAuditLog';
export {
  BUILTIN_POLICIES,
  WellbeingProtectionPolicy,
  FocusModeRestrictionPolicy,
  OverloadPreventionPolicy,
  FeatureSelfDisciplinePolicy,
  WELLBEING_PROTECTION_POLICY_ID,
  FOCUS_MODE_RESTRICTION_POLICY_ID,
  OVERLOAD_PREVENTION_POLICY_ID,
  FEATURE_SELF_DISCIPLINE_POLICY_ID,
} from './builtin';
