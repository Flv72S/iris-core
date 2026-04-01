/**
 * Feature Toggle Service - unit test
 * Microstep 5.3.4
 */

import { describe, it, expect } from 'vitest';
import {
  FeatureToggleService,
  createFeatureToggle,
  createFeatureEvaluationContext,
  featureDisabled,
  isFeatureEnabled,
  type FeatureDefinition,
} from '../index';

function ctx(overrides: Partial<{
  environment: 'dev' | 'staging' | 'prod';
  apiVersion: string;
  timestamp: number;
  subjectId: string;
}> = {}) {
  return createFeatureEvaluationContext({
    environment: 'dev',
    apiVersion: 'v1',
    timestamp: 1000,
    ...overrides,
  });
}

describe('FeatureToggleService', () => {
  describe('Test 1 — Default OFF', () => {
    it('feature non registrata → disabled', () => {
      const service = new FeatureToggleService();
      const decision = service.isEnabled('unknown-feature', ctx());
      expect(isFeatureEnabled(decision)).toBe(false);
      expect(decision).toEqual({ enabled: false, reason: expect.stringContaining('not registered') });
    });
  });

  describe('Test 2 — Default ON', () => {
    it('feature con defaultEnabled: true → enabled', () => {
      const def: FeatureDefinition = {
        key: 'on-by-default',
        description: 'On by default',
        defaultEnabled: true,
      };
      const service = new FeatureToggleService();
      service.register(createFeatureToggle(def));
      const decision = service.isEnabled('on-by-default', ctx());
      expect(isFeatureEnabled(decision)).toBe(true);
      expect(decision).toEqual({ enabled: true });
    });
  });

  describe('Test 3 — Environment gating', () => {
    it('feature abilitata solo in dev → disabled in prod', () => {
      const def: FeatureDefinition = {
        key: 'dev-only',
        description: 'Dev only',
        defaultEnabled: true,
        environments: ['dev'],
      };
      const service = new FeatureToggleService();
      service.register(createFeatureToggle(def));

      expect(service.isEnabled('dev-only', ctx({ environment: 'dev' }))).toEqual({ enabled: true });
      const prodDecision = service.isEnabled('dev-only', ctx({ environment: 'prod' }));
      expect(isFeatureEnabled(prodDecision)).toBe(false);
      expect(prodDecision.reason).toContain('not enabled for environment');
      expect(prodDecision.reason).toContain('prod');
    });
  });

  describe('Test 4 — API version gating', () => {
    it('minApiVersion = v2 → disabled in v1', () => {
      const def: FeatureDefinition = {
        key: 'v2-feature',
        description: 'Requires v2',
        defaultEnabled: true,
        minApiVersion: 'v2',
      };
      const service = new FeatureToggleService();
      service.register(createFeatureToggle(def));

      const v1Decision = service.isEnabled('v2-feature', ctx({ apiVersion: 'v1' }));
      expect(isFeatureEnabled(v1Decision)).toBe(false);
      expect(v1Decision.reason).toContain('requires apiVersion');
      expect(v1Decision.reason).toContain('v2');

      expect(service.isEnabled('v2-feature', ctx({ apiVersion: 'v2' }))).toEqual({ enabled: true });
      expect(service.isEnabled('v2-feature', ctx({ apiVersion: 'v3' }))).toEqual({ enabled: true });
    });
  });

  describe('Test 5 — Rollout deterministico', () => {
    it('50% rollout → stesso subjectId = stesso risultato', () => {
      const def: FeatureDefinition = {
        key: 'rollout-50',
        description: '50% rollout',
        defaultEnabled: false,
        rolloutPercentage: 50,
      };
      const service = new FeatureToggleService();
      service.register(createFeatureToggle(def));

      const contextA = ctx({ subjectId: 'user-123', timestamp: 2000 });
      const d1 = service.isEnabled('rollout-50', contextA);
      const d2 = service.isEnabled('rollout-50', contextA);
      expect(d1).toEqual(d2);

      const contextB = ctx({ subjectId: 'user-456', timestamp: 2000 });
      const dB = service.isEnabled('rollout-50', contextB);
      expect([d1.enabled, dB.enabled].filter(Boolean).length).toBeGreaterThanOrEqual(0);
      expect([d1.enabled, dB.enabled].filter(Boolean).length).toBeLessThanOrEqual(2);
    });
  });

  describe('Integrazione con PluginActivationContext', () => {
    it('getEnabledFeatureKeys ritorna solo feature abilitate (per features in context)', () => {
      const service = new FeatureToggleService();
      service.register(
        createFeatureToggle({
          key: 'on',
          description: 'On',
          defaultEnabled: true,
        })
      );
      service.register(
        createFeatureToggle({
          key: 'off',
          description: 'Off',
          defaultEnabled: false,
        })
      );
      service.register(
        createFeatureToggle({
          key: 'dev-only',
          description: 'Dev only',
          defaultEnabled: true,
          environments: ['dev'],
        })
      );

      const keys = service.getEnabledFeatureKeys(ctx({ environment: 'dev' }));
      expect(keys).toContain('on');
      expect(keys).toContain('dev-only');
      expect(keys).not.toContain('off');

      const keysProd = service.getEnabledFeatureKeys(ctx({ environment: 'prod' }));
      expect(keysProd).toContain('on');
      expect(keysProd).not.toContain('dev-only');
    });
  });

  describe('Test 6 — Explainability', () => {
    it('decision disabled include reason coerente', () => {
      const service = new FeatureToggleService();
      const decision = service.isEnabled('missing', ctx());
      expect(decision.enabled).toBe(false);
      expect('reason' in decision).toBe(true);
      expect((decision as { reason: string }).reason).toContain('missing');
      expect((decision as { reason: string }).reason).toContain('not registered');

      const def: FeatureDefinition = {
        key: 'off-by-default',
        description: 'Off',
        defaultEnabled: false,
      };
      service.register(createFeatureToggle(def));
      const decision2 = service.isEnabled('off-by-default', ctx());
      expect(decision2.enabled).toBe(false);
      expect(decision2.reason).toContain('off by default');
    });
  });
});
