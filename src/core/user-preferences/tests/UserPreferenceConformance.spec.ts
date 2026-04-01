/**
 * User Preferences — Conformance Fase 6
 * Preferenze deterministiche; feature/mode disabilitati → BLOCKED; notification consent; kill-switch;
 * Nessuna preferenza produce execution; nessuna dipendenza da UX/UI; pipeline non produce action se preferenze BLOCKED.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ProductMode } from '../../../product/orchestration/ProductMode';
import {
  evaluate,
  UserPreferenceEngine,
  BUILTIN_PREFERENCE_RULES,
  FeatureOptOutRule,
  ModeSpecificOptOutRule,
  NotificationConsentRule,
  FEATURE_OPT_OUT_RULE_ID,
  MODE_SPECIFIC_OPT_OUT_RULE_ID,
  NOTIFICATION_CONSENT_RULE_ID,
  isPreferenceRuleEnabled,
  readPreferenceAudit,
  _resetPreferenceAuditForTest,
  InMemoryUserPreferenceStore,
  type UserPreference,
  type UserPreferenceContext,
  type UserPreferenceKillSwitchRegistry,
} from '../index';
import { FeaturePipelineEngine } from '../../../product/feature-pipelines/FeaturePipelineEngine';
import { createSmartInboxPipeline, createFocusWellbeingPipeline } from '../../../product/feature-pipelines';
import { FEATURE_PIPELINE_COMPONENT_ID } from '../../../product/feature-pipelines/FeaturePipelineKillSwitch';

const NOW = 1704110400000;

function makePreference(id: string, value: boolean | string, type: 'BOOLEAN' | 'ENUM' = 'BOOLEAN'): UserPreference {
  return Object.freeze({
    id,
    value: type === 'BOOLEAN' ? { type: 'BOOLEAN', value: value as boolean } : { type: 'ENUM', value: value as string },
    updatedAt: NOW,
  });
}

function makeContext(
  featureId: string,
  productMode: ProductMode,
  maySendNotification?: boolean
): UserPreferenceContext {
  return Object.freeze({ featureId, productMode, maySendNotification });
}

describe('User Preferences — Conformance', () => {
  beforeEach(() => {
    _resetPreferenceAuditForTest();
  });

  describe('1. Preferenze deterministiche', () => {
    it('stesso store e context producono stesso risultato', () => {
      const store = new InMemoryUserPreferenceStore([]);
      const context = makeContext('smart-inbox', 'DEFAULT');
      const killSwitch: UserPreferenceKillSwitchRegistry = {};
      const a = evaluate(BUILTIN_PREFERENCE_RULES, store, context, killSwitch);
      const b = evaluate(BUILTIN_PREFERENCE_RULES, store, context, killSwitch);
      expect(a).toEqual(b);
      expect(a.status).toBe('ALLOWED');
    });
  });

  describe('2. Feature disabilitata → BLOCKED', () => {
    it('feature.<id>.enabled === false blocca la feature', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('feature.smart-inbox.enabled', false),
      ]);
      const context = makeContext('smart-inbox', 'DEFAULT');
      const decision = FeatureOptOutRule.evaluate(store, context);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toBe('User disabled this feature');
    });

    it('feature.<id>.enabled === true o assente → ALLOWED', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('feature.smart-inbox.enabled', true),
      ]);
      const context = makeContext('smart-inbox', 'DEFAULT');
      expect(FeatureOptOutRule.evaluate(store, context).status).toBe('ALLOWED');

      const storeEmpty = new InMemoryUserPreferenceStore([]);
      expect(FeatureOptOutRule.evaluate(storeEmpty, context).status).toBe('ALLOWED');
    });
  });

  describe('3. Mode disabilitato → BLOCKED', () => {
    it('mode.<mode>.enabled === false blocca tutte le feature in quel mode', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('mode.FOCUS.enabled', false),
      ]);
      const context = makeContext('daily-focus', 'FOCUS');
      const decision = ModeSpecificOptOutRule.evaluate(store, context);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toBe('User disabled this mode');
    });

    it('mode.<mode>.enabled === true o assente → ALLOWED', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('mode.FOCUS.enabled', true),
      ]);
      const context = makeContext('daily-focus', 'FOCUS');
      expect(ModeSpecificOptOutRule.evaluate(store, context).status).toBe('ALLOWED');

      const storeEmpty = new InMemoryUserPreferenceStore([]);
      expect(ModeSpecificOptOutRule.evaluate(storeEmpty, context).status).toBe('ALLOWED');
    });
  });

  describe('4. Notification consent respected', () => {
    it('maySendNotification true e notifications.enabled false → BLOCKED', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('notifications.enabled', false),
      ]);
      const context = makeContext('notify-feature', 'DEFAULT', true);
      const decision = NotificationConsentRule.evaluate(store, context);
      expect(decision.status).toBe('BLOCKED');
      expect(decision.reason).toBe('User disabled notifications');
    });

    it('maySendNotification non true → ALLOWED anche se notifications.enabled false', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('notifications.enabled', false),
      ]);
      const context = makeContext('other-feature', 'DEFAULT');
      expect(NotificationConsentRule.evaluate(store, context).status).toBe('ALLOWED');
    });

    it('notifications.enabled true → ALLOWED', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('notifications.enabled', true),
      ]);
      const context = makeContext('notify-feature', 'DEFAULT', true);
      expect(NotificationConsentRule.evaluate(store, context).status).toBe('ALLOWED');
    });
  });

  describe('5. Kill-switch disabilita rule', () => {
    it('rule disabilitata viene ignorata', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('feature.smart-inbox.enabled', false),
      ]);
      const context = makeContext('smart-inbox', 'DEFAULT');
      const killSwitchAllOn: UserPreferenceKillSwitchRegistry = {};
      const killSwitchFeatureOptOutOff: UserPreferenceKillSwitchRegistry = {
        [FEATURE_OPT_OUT_RULE_ID]: false,
      };

      const whenOn = evaluate(BUILTIN_PREFERENCE_RULES, store, context, killSwitchAllOn);
      const whenOff = evaluate(BUILTIN_PREFERENCE_RULES, store, context, killSwitchFeatureOptOutOff);

      expect(whenOn.status).toBe('BLOCKED');
      expect(whenOff.status).toBe('ALLOWED');
    });

    it('isPreferenceRuleEnabled ritorna false quando registry[id] === false', () => {
      const reg: UserPreferenceKillSwitchRegistry = { [MODE_SPECIFIC_OPT_OUT_RULE_ID]: false };
      expect(isPreferenceRuleEnabled(reg, MODE_SPECIFIC_OPT_OUT_RULE_ID)).toBe(false);
    });
  });

  describe('6. Nessuna preferenza produce execution', () => {
    it('evaluate restituisce solo ALLOWED o BLOCKED', () => {
      const store = new InMemoryUserPreferenceStore([]);
      const context = makeContext('f', 'DEFAULT');
      const decision = evaluate(BUILTIN_PREFERENCE_RULES, store, context, {});
      expect(decision.status === 'ALLOWED' || decision.status === 'BLOCKED').toBe(true);
    });

    it('rules non mutano store né context', () => {
      const prefs = [makePreference('feature.x.enabled', true)];
      const store = new InMemoryUserPreferenceStore(prefs);
      const context = makeContext('x', 'DEFAULT');
      FeatureOptOutRule.evaluate(store, context);
      expect(store.getAll().length).toBe(1);
      expect(context.featureId).toBe('x');
    });
  });

  describe('7. Nessuna dipendenza da UX / UI', () => {
    it('UserPreferenceContext non contiene action, command, recommendation, score, automation, learning', () => {
      const context = makeContext('f', 'DEFAULT');
      const keys = Object.keys(context) as (keyof UserPreferenceContext)[];
      const forbidden = ['action', 'command', 'recommendation', 'score', 'automation', 'learning'];
      for (const k of forbidden) {
        expect(keys).not.toContain(k);
      }
    });
  });

  describe('8. Pipeline non produce action se preferenze BLOCKED', () => {
    it('con preferenceContext e feature disabilitata la pipeline non restituisce quell\'output', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('feature.smart-inbox.enabled', false),
      ]);
      const prefEngine = new UserPreferenceEngine(BUILTIN_PREFERENCE_RULES, {});
      const preferenceContext = Object.freeze({
        engine: prefEngine,
        store,
        killSwitch: {} as UserPreferenceKillSwitchRegistry,
        productMode: 'DEFAULT' as ProductMode,
      });

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

      const withoutPref = engine.run(pipelineInput, registry);
      const withPref = engine.run(pipelineInput, registry, undefined, preferenceContext);

      expect(withoutPref.length).toBeGreaterThan(0);
      const smartInboxWithout = withoutPref.find((o) => o.featureId === 'smart-inbox');
      expect(smartInboxWithout).toBeDefined();

      const smartInboxWith = withPref.find((o) => o.featureId === 'smart-inbox');
      expect(smartInboxWith).toBeUndefined();
      expect(withPref.length).toBeLessThan(withoutPref.length);
    });
  });

  describe('Store', () => {
    it('get ritorna null per id assente', () => {
      const store = new InMemoryUserPreferenceStore([]);
      expect(store.get('any')).toBeNull();
    });

    it('getAll ritorna array congelato', () => {
      const store = new InMemoryUserPreferenceStore([
        makePreference('a', true),
      ]);
      const all = store.getAll();
      expect(all.length).toBe(1);
      expect(Object.isFrozen(all)).toBe(true);
    });
  });

  describe('Audit', () => {
    it('ogni evaluate aggiunge voci in audit', () => {
      const store = new InMemoryUserPreferenceStore([]);
      const context = makeContext('f', 'DEFAULT');
      evaluate(BUILTIN_PREFERENCE_RULES, store, context, {});
      const audit = readPreferenceAudit();
      expect(audit.length).toBeGreaterThan(0);
      expect(audit.every((e) => e.decision && typeof e.evaluatedAt === 'number')).toBe(true);
    });
  });
});
