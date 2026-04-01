/**
 * Feature Activation Policies — Conformance Fase 5
 * Policy deterministiche; kill-switch; Wellbeing blocca; Focus restringe; Overload limita;
 * Nessuna policy esegue azioni; nessuna dipendenza da UX UI; pipeline non produce action se BLOCKED.
 */

import { describe, it, expect } from 'vitest';
import type { DerivedStateSnapshot } from '../../state-derivation/DerivedStateSnapshot';
import type { UxExperienceState } from '../../../product/ux-experience/UxExperienceState';
import type { ProductMode } from '../../../product/orchestration/ProductMode';
import {
  evaluate,
  FeaturePolicyEngine,
  BUILTIN_POLICIES,
  WellbeingProtectionPolicy,
  FocusModeRestrictionPolicy,
  OverloadPreventionPolicy,
  FeatureSelfDisciplinePolicy,
  WELLBEING_PROTECTION_POLICY_ID,
  FOCUS_MODE_RESTRICTION_POLICY_ID,
  FEATURE_SELF_DISCIPLINE_POLICY_ID,
  isPolicyEnabled,
  readPolicyAudit,
  _resetPolicyAuditForTest,
  type FeaturePolicyInput,
  type PolicyKillSwitchRegistry,
} from '../index';
import { FeaturePipelineEngine } from '../../../product/feature-pipelines/FeaturePipelineEngine';
import { createSmartInboxPipeline, createFocusWellbeingPipeline } from '../../../product/feature-pipelines';
import { FEATURE_PIPELINE_COMPONENT_ID } from '../../../product/feature-pipelines/FeaturePipelineKillSwitch';

const NOW = 1704110400000;

function makeDerivedState(overrides: Partial<{
  featureEligibility: DerivedStateSnapshot['featureEligibility'];
  derivedAt: number;
}>): DerivedStateSnapshot {
  return Object.freeze({
    uxStates: Object.freeze([]),
    experienceCandidates: Object.freeze([]),
    featureEligibility: Object.freeze(overrides.featureEligibility ?? []),
    derivedAt: overrides.derivedAt ?? NOW,
  });
}

function makeExperience(overrides: Partial<UxExperienceState>): UxExperienceState {
  return Object.freeze({
    label: 'NEUTRAL',
    confidenceBand: 'low',
    stability: 'stable',
    dominantSignals: Object.freeze([]),
    secondarySignals: Object.freeze([]),
    suggestedLens: 'neutral',
    explanation: 'No clear experience state available.',
    derivedAt: NOW,
    ...overrides,
  });
}

function makePolicyInput(
  featureId: string,
  derivedState: DerivedStateSnapshot,
  uxExperience: UxExperienceState,
  productMode: ProductMode,
  overrides?: Partial<FeaturePolicyInput>
): FeaturePolicyInput {
  return Object.freeze({
    featureId,
    derivedState,
    uxExperience,
    productMode,
    now: NOW,
    ...overrides,
  });
}

describe('Feature Activation Policies — Conformance', () => {
  beforeEach(() => {
    _resetPolicyAuditForTest();
  });

  describe('1. Policy deterministiche', () => {
    it('stesso input produce stesso risultato per ogni policy', () => {
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([
          Object.freeze({ featureId: 'daily-focus', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) }),
        ]),
      });
      const experience = makeExperience({ label: 'NEUTRAL' });
      const input = makePolicyInput('daily-focus', derivedState, experience, 'DEFAULT');
      const killSwitch: PolicyKillSwitchRegistry = {};

      const a = evaluate(BUILTIN_POLICIES, input, killSwitch);
      const b = evaluate(BUILTIN_POLICIES, input, killSwitch);
      expect(a).toEqual(b);
      expect(a.status).toBe('ALLOWED');
    });

    it('WellbeingProtectionPolicy stesso input → stesso output', () => {
      const input = makePolicyInput(
        'any',
        makeDerivedState({}),
        makeExperience({ label: 'BLOCKED' }),
        'DEFAULT'
      );
      expect(WellbeingProtectionPolicy.evaluate(input)).toEqual(
        WellbeingProtectionPolicy.evaluate(input)
      );
    });
  });

  describe('2. Policy OFF via kill-switch', () => {
    it('policy disabilitata viene ignorata', () => {
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([
          Object.freeze({ featureId: 'smart-inbox', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) }),
        ]),
      });
      const experience = makeExperience({ label: 'BLOCKED' });
      const input = makePolicyInput('smart-inbox', derivedState, experience, 'DEFAULT');

      const killSwitchAllOn: PolicyKillSwitchRegistry = {};
      const killSwitchWellbeingOff: PolicyKillSwitchRegistry = { [WELLBEING_PROTECTION_POLICY_ID]: false };

      const whenWellbeingOn = evaluate(BUILTIN_POLICIES, input, killSwitchAllOn);
      const whenWellbeingOff = evaluate(BUILTIN_POLICIES, input, killSwitchWellbeingOff);

      expect(whenWellbeingOn.status).toBe('BLOCKED');
      expect(whenWellbeingOff.status).toBe('ALLOWED');
    });

    it('isPolicyEnabled ritorna false quando registry[id] === false', () => {
      const reg: PolicyKillSwitchRegistry = { [FOCUS_MODE_RESTRICTION_POLICY_ID]: false };
      expect(isPolicyEnabled(reg, FOCUS_MODE_RESTRICTION_POLICY_ID)).toBe(false);
    });
  });

  describe('3. Wellbeing blocca execution', () => {
    it('uxExperience.label === BLOCKED → BLOCKED con reason Wellbeing protection active', () => {
      const input = makePolicyInput(
        'any-feature',
        makeDerivedState({}),
        makeExperience({ label: 'BLOCKED' }),
        'DEFAULT'
      );
      const decision = WellbeingProtectionPolicy.evaluate(input);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toBe('Wellbeing protection active');
    });

    it('engine con builtin blocca quando experience BLOCKED', () => {
      const input = makePolicyInput(
        'smart-inbox',
        makeDerivedState({ featureEligibility: Object.freeze([Object.freeze({ featureId: 'smart-inbox', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) })]) }),
        makeExperience({ label: 'BLOCKED' }),
        'DEFAULT'
      );
      const engine = new FeaturePolicyEngine(BUILTIN_POLICIES, {});
      expect(engine.evaluate(input).status).toBe('BLOCKED');
    });
  });

  describe('4. Focus mode restringe feature', () => {
    it('productMode FOCUS e feature non in whitelist → BLOCKED', () => {
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([Object.freeze({ featureId: 'smart-inbox', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) })]),
      });
      const input = makePolicyInput('smart-inbox', derivedState, makeExperience({}), 'FOCUS');
      const decision = FocusModeRestrictionPolicy.evaluate(input);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toContain('Focus mode');
    });

    it('productMode FOCUS e feature daily-focus → ALLOWED', () => {
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([Object.freeze({ featureId: 'daily-focus', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) })]),
      });
      const input = makePolicyInput('daily-focus', derivedState, makeExperience({}), 'FOCUS');
      expect(FocusModeRestrictionPolicy.evaluate(input).status).toBe('ALLOWED');
    });

    it('productMode FOCUS e feature smart-summary → ALLOWED', () => {
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([Object.freeze({ featureId: 'smart-summary', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) })]),
      });
      const input = makePolicyInput('smart-summary', derivedState, makeExperience({}), 'FOCUS');
      expect(FocusModeRestrictionPolicy.evaluate(input).status).toBe('ALLOWED');
    });
  });

  describe('5. Overload limita feature', () => {
    it('uxExperience OVERLOADED e priority non high → BLOCKED', () => {
      const input = makePolicyInput(
        'some-feature',
        makeDerivedState({}),
        makeExperience({ label: 'OVERLOADED' }),
        'DEFAULT',
        { featurePriority: 'normal' }
      );
      const decision = OverloadPreventionPolicy.evaluate(input);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toContain('Overload');
    });

    it('uxExperience OVERLOADED e priority high → ALLOWED', () => {
      const input = makePolicyInput(
        'some-feature',
        makeDerivedState({}),
        makeExperience({ label: 'OVERLOADED' }),
        'DEFAULT',
        { featurePriority: 'high' }
      );
      expect(OverloadPreventionPolicy.evaluate(input).status).toBe('ALLOWED');
    });

    it('uxExperience non OVERLOADED → ALLOWED indipendentemente da priority', () => {
      const input = makePolicyInput(
        'some-feature',
        makeDerivedState({}),
        makeExperience({ label: 'NEUTRAL' }),
        'DEFAULT',
        { featurePriority: 'low' }
      );
      expect(OverloadPreventionPolicy.evaluate(input).status).toBe('ALLOWED');
    });
  });

  describe('6. Nessuna policy esegue azioni', () => {
    it('evaluate restituisce solo ALLOWED o BLOCKED', () => {
      const input = makePolicyInput(
        'x',
        makeDerivedState({}),
        makeExperience({}),
        'DEFAULT'
      );
      const decision = evaluate(BUILTIN_POLICIES, input, {});
      expect(decision.status === 'ALLOWED' || decision.status === 'BLOCKED').toBe(true);
      if (decision.status === 'BLOCKED') {
        expect(typeof decision.reason).toBe('string');
      }
    });

    it('policy non muta input', () => {
      const derivedState = makeDerivedState({});
      const experience = makeExperience({});
      const input = makePolicyInput('f', derivedState, experience, 'DEFAULT');
      WellbeingProtectionPolicy.evaluate(input);
      FocusModeRestrictionPolicy.evaluate(input);
      expect(input.featureId).toBe('f');
      expect(input.derivedState).toBe(derivedState);
      expect(input.uxExperience).toBe(experience);
    });
  });

  describe('7. Nessuna dipendenza da UX UI', () => {
    it('FeaturePolicyInput non contiene action, command, recommendation, score, automation, learning', () => {
      const input = makePolicyInput('f', makeDerivedState({}), makeExperience({}), 'DEFAULT');
      const keys = Object.keys(input) as (keyof FeaturePolicyInput)[];
      const forbidden = ['action', 'command', 'recommendation', 'score', 'automation', 'learning', 'feedbackEmission'];
      for (const k of forbidden) {
        expect(keys).not.toContain(k);
      }
    });
  });

  describe('8. FeatureSelfDisciplinePolicy', () => {
    it('nessuna eligibility per featureId → BLOCKED con reason No supporting system state', () => {
      const derivedState = makeDerivedState({ featureEligibility: Object.freeze([]) });
      const input = makePolicyInput('unknown-feature', derivedState, makeExperience({}), 'DEFAULT');
      const decision = FeatureSelfDisciplinePolicy.evaluate(input);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toBe('No supporting system state');
    });

    it('eligibility.eligible === false → BLOCKED', () => {
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([
          Object.freeze({ featureId: 'f1', eligible: false, reason: 'no state', derivedFromStates: Object.freeze([]) }),
        ]),
      });
      const input = makePolicyInput('f1', derivedState, makeExperience({}), 'DEFAULT');
      expect(FeatureSelfDisciplinePolicy.evaluate(input).status).toBe('BLOCKED');
    });

    it('eligibility.eligible === true → ALLOWED', () => {
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([
          Object.freeze({ featureId: 'f1', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) }),
        ]),
      });
      const input = makePolicyInput('f1', derivedState, makeExperience({}), 'DEFAULT');
      expect(FeatureSelfDisciplinePolicy.evaluate(input).status).toBe('ALLOWED');
    });
  });

  describe('Audit append-only', () => {
    it('ogni evaluate aggiunge voci in audit', () => {
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([Object.freeze({ featureId: 'f1', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) })]),
      });
      const input = makePolicyInput('f1', derivedState, makeExperience({}), 'DEFAULT');
      evaluate(BUILTIN_POLICIES, input, {});
      const audit = readPolicyAudit();
      expect(audit.length).toBeGreaterThan(0);
      expect(audit.every((e) => e.featureId === 'f1' && e.evaluatedAt === NOW)).toBe(true);
    });
  });

  describe('8b. Pipeline non produce action se BLOCKED', () => {
    it('con policyContext e experience BLOCKED la pipeline non restituisce output', () => {
      const engine = new FeaturePipelineEngine([
        createSmartInboxPipeline(),
        createFocusWellbeingPipeline(),
      ]);
      const derivedState = makeDerivedState({
        featureEligibility: Object.freeze([
          Object.freeze({ featureId: 'smart-inbox', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) }),
          Object.freeze({ featureId: 'focus-guard', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) }),
          Object.freeze({ featureId: 'wellbeing-gate', eligible: true, reason: 'ok', derivedFromStates: Object.freeze([]) }),
        ]),
      });
      const experience = makeExperience({ label: 'BLOCKED' });
      const pipelineInput = Object.freeze({
        uxState: Object.freeze({ states: Object.freeze([]), derivedAt: NOW }),
        experience,
        now: NOW,
      });
      const policyEngine = new FeaturePolicyEngine(BUILTIN_POLICIES, {});
      const policyContext = Object.freeze({
        engine: policyEngine,
        derivedState,
        productMode: 'DEFAULT' as ProductMode,
      });
      const registry = Object.freeze({ [FEATURE_PIPELINE_COMPONENT_ID]: true });

      const withPolicy = engine.run(pipelineInput, registry, policyContext);
      const withoutPolicy = engine.run(pipelineInput, registry);

      expect(withoutPolicy.length).toBeGreaterThan(0);
      expect(withPolicy.length).toBe(0);
    });
  });
});
