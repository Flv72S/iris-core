/**
 * User Preference Kill Switch — Rule OFF → ignorata dall'engine.
 */

export type UserPreferenceKillSwitchRegistry = Record<string, boolean>;

export function isPreferenceRuleEnabled(
  registry: UserPreferenceKillSwitchRegistry,
  ruleId: string
): boolean {
  return registry[ruleId] !== false;
}
