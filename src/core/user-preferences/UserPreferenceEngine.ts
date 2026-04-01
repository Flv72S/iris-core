/**
 * User Preferences Engine
 *
 * Applies explicit user-declared preferences.
 * No inference, no learning, no optimization.
 * The system obeys what the user has explicitly stated.
 */

import type { UserPreferenceRule } from './rules/UserPreferenceRule';
import type { UserPreferenceStore } from './store/UserPreferenceStore';
import type { UserPreferenceContext } from './rules/UserPreferenceContext';
import type { FeaturePolicyDecision } from '../policies/FeaturePolicyDecision';
import { isPreferenceRuleEnabled } from './kill-switch/UserPreferenceKillSwitch';
import type { UserPreferenceKillSwitchRegistry } from './kill-switch/UserPreferenceKillSwitch';
import { appendPreferenceAudit } from './audit/UserPreferenceAuditLog';

/**
 * Evaluates preference rules in order. First BLOCKED stops; otherwise ALLOWED.
 * Rules do not execute; they only allow or block.
 */
export function evaluate(
  rules: readonly UserPreferenceRule[],
  store: UserPreferenceStore,
  context: UserPreferenceContext,
  killSwitch: UserPreferenceKillSwitchRegistry
): FeaturePolicyDecision {
  const now = Date.now();

  for (const rule of rules) {
    if (!isPreferenceRuleEnabled(killSwitch, rule.id)) continue;

    const decision = rule.evaluate(store, context);
    appendPreferenceAudit(
      Object.freeze({
        preferenceId: rule.id,
        decision,
        evaluatedAt: now,
      })
    );

    if (decision.status === 'BLOCKED') return decision;
  }

  return { status: 'ALLOWED' };
}

export class UserPreferenceEngine {
  constructor(
    private readonly rules: readonly UserPreferenceRule[],
    private readonly killSwitch: UserPreferenceKillSwitchRegistry
  ) {}

  evaluate(store: UserPreferenceStore, context: UserPreferenceContext): FeaturePolicyDecision {
    return evaluate(this.rules, store, context, this.killSwitch);
  }
}
