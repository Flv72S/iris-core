/**
 * User Preferences — Fase 6 (product layer).
 * Restrict execution only. Never enable, prioritize, or override system decisions.
 */

export type { UserPreferenceState } from './UserPreferenceState';
export type { UserPreferenceDecision } from './UserPreferenceDecision';
export { evaluatePreference } from './UserPreferenceEvaluator';
export {
  isUserPreferenceEnabled,
  USER_PREFERENCE_COMPONENT_ID,
  type UserPreferenceKillSwitchRegistry,
} from './UserPreferenceKillSwitch';
export type { UserPreferenceAuditEntry } from './audit/UserPreferenceAudit';
export { appendUserPreferenceAudit, readUserPreferenceAudit, _resetUserPreferenceAuditForTest } from './audit/UserPreferenceAudit';
