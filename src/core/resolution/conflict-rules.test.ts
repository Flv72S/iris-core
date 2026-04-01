/**
 * Conflict Resolution Rules — Golden tests (Microstep 6.5.3).
 * Determinismo certificabile: stesso input → stesso winning decision e rule_id.
 */

import { describe, it, expect } from 'vitest';
import {
  getWinningDecision,
  getConflictRuleId,
  orderDecisionsByPrecedence,
  RULE_WELLBEING_OVER_USER_ALLOW,
  RULE_USER_HARD_BLOCK_ABSOLUTE,
  RULE_FOCUS_BLOCKS_DISTRACTIONS,
  RULE_ALL_ALLOWED,
  CONFLICT_RULES_VERSION,
} from './conflict-rules';
import type { AuthorityDecision } from './resolution-context';

function decision(
  authorityId: AuthorityDecision['authorityId'],
  status: AuthorityDecision['status'],
  ruleId: string | null = null,
  reason: string | null = null
): AuthorityDecision {
  return Object.freeze({ authorityId, status, ruleId, reason });
}

describe('Conflict Resolution Rules — Golden cases', () => {
  describe('1. Wellbeing > user allow', () => {
    it('wellbeing BLOCKED vince su feature policy ALLOWED', () => {
      const decisions: readonly AuthorityDecision[] = Object.freeze([
        decision('WELLBEING_PROTECTION', 'BLOCKED', 'wellbeing-protection', 'Wellbeing protection active'),
        decision('FEATURE_POLICY', 'ALLOWED', null, null),
      ]);
      const winning = getWinningDecision(decisions);
      expect(winning).not.toBeNull();
      expect(winning!.authorityId).toBe('WELLBEING_PROTECTION');
      expect(winning!.status).toBe('BLOCKED');
      expect(getConflictRuleId(winning)).toBe(RULE_WELLBEING_OVER_USER_ALLOW);
    });

    it('stesso input produce stesso risultato (determinismo)', () => {
      const decisions = Object.freeze([
        decision('WELLBEING_PROTECTION', 'BLOCKED', 'wellbeing-protection', 'Wellbeing protection active'),
        decision('FEATURE_POLICY', 'ALLOWED', null, null),
      ]);
      const a = getWinningDecision(decisions);
      const b = getWinningDecision(decisions);
      expect(a).toEqual(b);
      expect(getConflictRuleId(a)).toBe(getConflictRuleId(b));
    });
  });

  describe('2. User hard block assoluto', () => {
    it('USER_HARD_BLOCK BLOCKED vince su tutte le altre authority', () => {
      const decisions: readonly AuthorityDecision[] = Object.freeze([
        decision('USER_HARD_BLOCK', 'BLOCKED', 'feature-opt-out', 'User disabled this feature'),
        decision('WELLBEING_PROTECTION', 'ALLOWED', null, null),
        decision('FEATURE_POLICY', 'ALLOWED', null, null),
      ]);
      const winning = getWinningDecision(decisions);
      expect(winning).not.toBeNull();
      expect(winning!.authorityId).toBe('USER_HARD_BLOCK');
      expect(winning!.status).toBe('BLOCKED');
      expect(getConflictRuleId(winning)).toBe(RULE_USER_HARD_BLOCK_ABSOLUTE);
    });

    it('ordine input non influisce: USER_HARD_BLOCK vince comunque', () => {
      const decisionsShuffled = Object.freeze([
        decision('FEATURE_POLICY', 'ALLOWED', null, null),
        decision('USER_HARD_BLOCK', 'BLOCKED', 'feature-opt-out', 'User disabled this feature'),
        decision('WELLBEING_PROTECTION', 'ALLOWED', null, null),
      ]);
      const winning = getWinningDecision(decisionsShuffled);
      expect(winning!.authorityId).toBe('USER_HARD_BLOCK');
    });
  });

  describe('3. Focus blocca distrazioni', () => {
    it('PRODUCT_MODE BLOCKED (focus) vince su FEATURE_POLICY ALLOWED', () => {
      const decisions: readonly AuthorityDecision[] = Object.freeze([
        decision('USER_HARD_BLOCK', 'ALLOWED', null, null),
        decision('WELLBEING_PROTECTION', 'ALLOWED', null, null),
        decision('PRODUCT_MODE', 'BLOCKED', 'focus-mode-restriction', 'Focus mode: only whitelisted features'),
        decision('FEATURE_POLICY', 'ALLOWED', null, null),
      ]);
      const winning = getWinningDecision(decisions);
      expect(winning).not.toBeNull();
      expect(winning!.authorityId).toBe('PRODUCT_MODE');
      expect(winning!.status).toBe('BLOCKED');
      expect(getConflictRuleId(winning)).toBe(RULE_FOCUS_BLOCKS_DISTRACTIONS);
    });
  });

  describe('4. Tutte ALLOWED', () => {
    it('nessuna decisione restrittiva → winning null, rule_id ALL_ALLOWED', () => {
      const decisions = Object.freeze([
        decision('USER_HARD_BLOCK', 'ALLOWED', null, null),
        decision('WELLBEING_PROTECTION', 'ALLOWED', null, null),
        decision('FEATURE_POLICY', 'ALLOWED', null, null),
      ]);
      const winning = getWinningDecision(decisions);
      expect(winning).toBeNull();
      expect(getConflictRuleId(winning)).toBe(RULE_ALL_ALLOWED);
    });
  });

  describe('5. orderDecisionsByPrecedence', () => {
    it('ordina per AUTHORITY_SOURCE_ORDER', () => {
      const shuffled = [
        decision('FEATURE_POLICY', 'ALLOWED', null, null),
        decision('USER_HARD_BLOCK', 'ALLOWED', null, null),
        decision('WELLBEING_PROTECTION', 'ALLOWED', null, null),
      ];
      const ordered = orderDecisionsByPrecedence(shuffled);
      expect(ordered[0].authorityId).toBe('USER_HARD_BLOCK');
      expect(ordered[1].authorityId).toBe('WELLBEING_PROTECTION');
      expect(ordered[2].authorityId).toBe('FEATURE_POLICY');
    });
  });

  describe('6. Versione regole', () => {
    it('CONFLICT_RULES_VERSION è definita e stabile', () => {
      expect(CONFLICT_RULES_VERSION).toBe('1.0');
    });
  });
});
