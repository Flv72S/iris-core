/**
 * User Preferences — Fase 6
 * Explicit user-declared preferences. No inference, no learning.
 */

export type { UserPreferenceValue } from './UserPreferenceValue';
export type { UserPreference } from './UserPreference';
export type { UserPreferenceStore } from './store/UserPreferenceStore';
export { InMemoryUserPreferenceStore } from './store/InMemoryUserPreferenceStore';
export type { UserPreferenceContext } from './rules/UserPreferenceContext';
export type { UserPreferenceRule } from './rules/UserPreferenceRule';
export { evaluate, UserPreferenceEngine } from './UserPreferenceEngine';
export type { UserPreferenceKillSwitchRegistry } from './kill-switch/UserPreferenceKillSwitch';
export { isPreferenceRuleEnabled } from './kill-switch/UserPreferenceKillSwitch';
export type { UserPreferenceAuditEntry } from './audit/UserPreferenceAuditLog';
export { appendPreferenceAudit, readPreferenceAudit, _resetPreferenceAuditForTest } from './audit/UserPreferenceAuditLog';
export {
  BUILTIN_PREFERENCE_RULES,
  FeatureOptOutRule,
  ModeSpecificOptOutRule,
  NotificationConsentRule,
  FEATURE_OPT_OUT_RULE_ID,
  MODE_SPECIFIC_OPT_OUT_RULE_ID,
  NOTIFICATION_CONSENT_RULE_ID,
} from './rules/builtin';