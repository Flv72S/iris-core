/**
 * User Preferences — Conformance Fase 6 (product layer).
 * Preferenze deterministiche; solo restringono; nessuna dipendenza da core o ux.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluatePreference,
  isUserPreferenceEnabled,
  USER_PREFERENCE_COMPONENT_ID,
  readUserPreferenceAudit,
  _resetUserPreferenceAuditForTest,
  type UserPreferenceState,
} from '../index';
import { FeaturePipelineEngine } from '../../feature-pipelines/FeaturePipelineEngine';
import { createSmartInboxPipeline, createFocusWellbeingPipeline } from '../../feature-pipelines';
import { FEATURE_PIPELINE_COMPONENT_ID } from '../../feature-pipelines/FeaturePipelineKillSwitch';
import { FeaturePolicyEngine } from '../../../core/policies/FeaturePolicyEngine';
import { BUILTIN_POLICIES } from '../../../core/policies/builtin';

const NOW = 1704110400000;

function freezeState(s: UserPreferenceState): UserPreferenceState {
  return Object.freeze({
    ...s,
    disabledFeatures: s.disabledFeatures != null ? Object.freeze([...s.disabledFeatures]) : undefined,
    disabledCategories: s.disabledCategories != null ? Object.freeze([...s.disabledCategories]) : undefined,
  });
}

describe('User Preferences — Conformance (product)', () => {
  beforeEach(() => {
    _resetUserPreferenceAuditForTest();
  });

  describe('1. Preferenze deterministiche', () => {
    it('stesso input produce stesso risultato', () => {
      const prefs = freezeState({ disabledFeatures: ['a'] });
      const a = evaluatePreference('a', undefined, prefs);
      const b = evaluatePreference('a', undefined, prefs);
      expect(a).toEqual(b);
      expect(a.status).toBe('BLOCKED');
    });
  });

  describe('2. Nessuna preferenza → ALLOWED', () => {
    it('preferences undefined → ALLOWED', () => {
      expect(evaluatePreference('any', undefined, undefined).status).toBe('ALLOWED');
    });

    it('preferences con array vuoti → ALLOWED', () => {
      const prefs = freezeState({ disabledFeatures: [], disabledCategories: [] });
      expect(evaluatePreference('f', undefined, prefs).status).toBe('ALLOWED');
    });
  });

  describe('3. Feature disabilitata per ID → BLOCKED', () => {
    it('featureId in disabledFeatures → BLOCKED', () => {
      const prefs = freezeState({ disabledFeatures: ['smart-inbox'] });
      const decision = evaluatePreference('smart-inbox', undefined, prefs);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toBe('User disabled this feature');
    });
  });

  describe('4. Feature disabilitata per categoria → BLOCKED', () => {
    it('featureCategory in disabledCategories → BLOCKED', () => {
      const prefs = freezeState({ disabledCategories: ['inbox'] });
      const decision = evaluatePreference('smart-inbox', 'inbox', prefs);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toBe('User disabled this category');
    });
  });

  describe('5. Kill-switch OFF → preferenze ignorate', () => {
    it('con kill-switch OFF la pipeline non applica preferenze e restituisce output', () => {
      const prefs = freezeState({ disabledFeatures: ['smart-inbox'] });
      const pipelineInput = Object.freeze({
        uxState: Object.freeze({ states: Object.freeze([]), derivedAt: NOW }),
        experience: Object.freeze({
          label: 'NEUTRAL',
          confidenceBand: 'low',
          stability: 'stable',
          dominantSignals: Object.freeze([]),
          secondarySignals: Object.freeze([]),
          suggestedLens: 'neutral',
          explanation: 'Neutral.',
          derivedAt: NOW,
        }),
        now: NOW,
      });
      const registry = Object.freeze({ [FEATURE_PIPELINE_COMPONENT_ID]: true });
      const engine = new FeaturePipelineEngine([
        createSmartInboxPipeline(),
        createFocusWellbeingPipeline(),
      ]);

      const withKillSwitchOn = engine.run(pipelineInput, registry, undefined, undefined, {
        userPreferences: prefs,
        preferenceKillSwitch: { [USER_PREFERENCE_COMPONENT_ID]: true },
      });
      const withKillSwitchOff = engine.run(pipelineInput, registry, undefined, undefined, {
        userPreferences: prefs,
        preferenceKillSwitch: { [USER_PREFERENCE_COMPONENT_ID]: false },
      });

      expect(withKillSwitchOn.find((o) => o.featureId === 'smart-inbox')).toBeUndefined();
      expect(withKillSwitchOff.find((o) => o.featureId === 'smart-inbox')).toBeDefined();
    });

    it('isUserPreferenceEnabled ritorna false quando registry[componentId] === false', () => {
      expect(isUserPreferenceEnabled({ [USER_PREFERENCE_COMPONENT_ID]: false }, USER_PREFERENCE_COMPONENT_ID)).toBe(false);
    });

    it('isUserPreferenceEnabled default ON quando registry undefined', () => {
      expect(isUserPreferenceEnabled(undefined, USER_PREFERENCE_COMPONENT_ID)).toBe(true);
    });
  });

  describe('6. Preferenze non mutano input', () => {
    it('evaluatePreference non muta preferences', () => {
      const prefs = freezeState({ disabledFeatures: ['x'] });
      evaluatePreference('x', undefined, prefs);
      expect(prefs.disabledFeatures).toEqual(['x']);
    });
  });

  describe('7. Nessuna dipendenza da core o ux', () => {
    it('UserPreferenceState non contiene campi core/ux', () => {
      const prefs: UserPreferenceState = freezeState({ disabledFeatures: [] });
      const keys = Object.keys(prefs) as (keyof UserPreferenceState)[];
      const forbidden = ['uxState', 'experience', 'derivedState', 'policy', 'action', 'execute'];
      for (const k of forbidden) {
        expect(keys).not.toContain(k);
      }
    });
  });

  describe('8. Feature già BLOCKED da policy → preferenze non valutate', () => {
    it('con policyContext che blocca, audit preferenze non contiene quella feature', () => {
      const derivedState = Object.freeze({
        uxStates: Object.freeze([]),
        experienceCandidates: Object.freeze([]),
        featureEligibility: Object.freeze([]),
        derivedAt: NOW,
      });
      const experience = Object.freeze({
        label: 'BLOCKED',
        confidenceBand: 'low',
        stability: 'stable',
        dominantSignals: Object.freeze([]),
        secondarySignals: Object.freeze([]),
        suggestedLens: 'neutral',
        explanation: 'Blocked.',
        derivedAt: NOW,
      });
      const policyEngine = new FeaturePolicyEngine(BUILTIN_POLICIES, {});
      const policyContext = Object.freeze({
        engine: policyEngine,
        derivedState,
        productMode: 'DEFAULT',
      });
      const pipelineInput = Object.freeze({
        uxState: Object.freeze({ states: Object.freeze([]), derivedAt: NOW }),
        experience,
        now: NOW,
      });
      const registry = Object.freeze({ [FEATURE_PIPELINE_COMPONENT_ID]: true });
      const engine = new FeaturePipelineEngine([
        createSmartInboxPipeline(),
        createFocusWellbeingPipeline(),
      ]);
      const prefs = freezeState({ disabledFeatures: ['smart-inbox'] });

      _resetUserPreferenceAuditForTest();
      engine.run(pipelineInput, registry, policyContext, undefined, {
        userPreferences: prefs,
      });
      const audit = readUserPreferenceAudit();
      expect(audit.length).toBe(0);
    });
  });

  describe('9. Audit append-only', () => {
    it('pipeline con productPreferenceOptions aggiunge voci in audit', () => {
      const prefs = freezeState({ disabledFeatures: [] });
      const pipelineInput = Object.freeze({
        uxState: Object.freeze({ states: Object.freeze([]), derivedAt: NOW }),
        experience: Object.freeze({
          label: 'NEUTRAL',
          confidenceBand: 'low',
          stability: 'stable',
          dominantSignals: Object.freeze([]),
          secondarySignals: Object.freeze([]),
          suggestedLens: 'neutral',
          explanation: 'Neutral.',
          derivedAt: NOW,
        }),
        now: NOW,
      });
      const registry = Object.freeze({ [FEATURE_PIPELINE_COMPONENT_ID]: true });
      const engine = new FeaturePipelineEngine([
        createSmartInboxPipeline(),
        createFocusWellbeingPipeline(),
      ]);
      engine.run(pipelineInput, registry, undefined, undefined, { userPreferences: prefs });
      const audit = readUserPreferenceAudit();
      expect(audit.length).toBeGreaterThan(0);
      expect(audit.every((e) => e.featureId && (e.decision === 'ALLOWED' || e.decision === 'BLOCKED'))).toBe(true);
    });
  });

  describe('10. Nessuna preferenza può forzare ALLOWED', () => {
    it('con feature disabilitata evaluator non restituisce mai ALLOWED per quella feature', () => {
      const prefs = freezeState({ disabledFeatures: ['disabled-one'] });
      const decision = evaluatePreference('disabled-one', undefined, prefs);
      expect(decision.status).toBe('BLOCKED');
    });

    it('con categoria disabilitata evaluator non restituisce ALLOWED per feature in quella categoria', () => {
      const prefs = freezeState({ disabledCategories: ['cat-a'] });
      const decision = evaluatePreference('feature-in-cat-a', 'cat-a', prefs);
      expect(decision.status).toBe('BLOCKED');
    });
  });
});
