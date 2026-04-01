/**
 * Capability Governance - unit test
 * Microstep 5.4.1
 */

import { describe, it, expect } from 'vitest';
import type { ReadPlugin } from '../../index';
import {
  CapabilityGovernance,
  hasCapability,
  requireCapability,
  capabilityDenied,
  isCapabilityAllowed,
} from '../index';
import { createActivationContext } from '../../governance/PluginActivationContext';
import { PluginRuntime } from '../../runtime';

const devContext = () =>
  createActivationContext({ apiVersion: 'v1', environment: 'dev' });

describe('CapabilityGovernance', () => {
  describe('Test 1 — Default deny', () => {
    it('plugin senza capability dichiarata → denied', () => {
      const governance = new CapabilityGovernance();
      governance.registerPolicy({
        name: 'allow-all',
        evaluate: () => ({ allowed: true }),
      });

      const plugin: ReadPlugin = {
        metadata: {
          id: 'no-cap',
          version: '1.0.0',
          kind: 'read',
          capabilities: [],
        },
      };
      const decision = governance.canUseCapability(
        plugin,
        'runtime:logger',
        devContext()
      );
      expect(isCapabilityAllowed(decision)).toBe(false);
      expect(decision.reason).toContain('not declared');
    });

    it('nessuna policy → denied (fail-safe)', () => {
      const governance = new CapabilityGovernance();
      const plugin: ReadPlugin = {
        metadata: {
          id: 'with-cap',
          version: '1.0.0',
          kind: 'read',
          capabilities: ['runtime:logger'],
        },
      };
      const decision = governance.canUseCapability(
        plugin,
        'runtime:logger',
        devContext()
      );
      expect(isCapabilityAllowed(decision)).toBe(false);
      expect(decision.reason).toContain('No capability policy');
    });
  });

  describe('Test 2 — Capability dichiarata ma policy nega', () => {
    it('deny con reason', () => {
      const governance = new CapabilityGovernance();
      governance.registerPolicy({
        name: 'deny-logger-in-dev',
        evaluate: (_, capability, ctx) =>
          capability === 'runtime:logger' && ctx.environment === 'dev'
            ? capabilityDenied('logger disabled in dev for audit')
            : { allowed: true },
      });

      const plugin: ReadPlugin = {
        metadata: {
          id: 'p',
          version: '1.0.0',
          kind: 'read',
          capabilities: ['runtime:logger'],
        },
      };
      const decision = governance.canUseCapability(
        plugin,
        'runtime:logger',
        devContext()
      );
      expect(isCapabilityAllowed(decision)).toBe(false);
      expect(decision.reason).toContain('logger disabled in dev');
    });
  });

  describe('Test 3 — Capability dichiarata e policy allow', () => {
    it('allow', () => {
      const governance = new CapabilityGovernance();
      governance.registerPolicy({
        name: 'allow-declared',
        evaluate: (plugin, capability) =>
          hasCapability(plugin.metadata.capabilities, capability)
            ? { allowed: true }
            : capabilityDenied(`capability ${capability} not declared`),
      });

      const plugin: ReadPlugin = {
        metadata: {
          id: 'p',
          version: '1.0.0',
          kind: 'read',
          capabilities: ['runtime:clock', 'runtime:logger'],
        },
      };
      expect(
        governance.canUseCapability(plugin, 'runtime:clock', devContext())
      ).toEqual({ allowed: true });
      expect(
        governance.canUseCapability(plugin, 'runtime:logger', devContext())
      ).toEqual({ allowed: true });
    });
  });

  describe('Test 4 — Policy che lancia', () => {
    it('deny fail-safe con reason', () => {
      const governance = new CapabilityGovernance();
      governance.registerPolicy({
        name: 'throws',
        evaluate: () => {
          throw new Error('policy error');
        },
      });

      const plugin: ReadPlugin = {
        metadata: {
          id: 'p',
          version: '1.0.0',
          kind: 'read',
          capabilities: ['runtime:logger'],
        },
      };
      const decision = governance.canUseCapability(
        plugin,
        'runtime:logger',
        devContext()
      );
      expect(isCapabilityAllowed(decision)).toBe(false);
      expect(decision.reason).toContain('Policy "throws" threw');
    });
  });

  describe('Test 5 — Determinismo', () => {
    it('stesso input → stessa decisione', () => {
      const governance = new CapabilityGovernance();
      governance.registerPolicy({
        name: 'allow-all',
        evaluate: () => ({ allowed: true }),
      });

      const plugin: ReadPlugin = {
        metadata: {
          id: 'p',
          version: '1.0.0',
          kind: 'read',
          capabilities: ['runtime:clock'],
        },
      };
      const ctx = devContext();
      const d1 = governance.canUseCapability(plugin, 'runtime:clock', ctx);
      const d2 = governance.canUseCapability(plugin, 'runtime:clock', ctx);
      expect(d1).toEqual(d2);
    });
  });

  describe('Test 6 — Integrazione runtime', () => {
    it('plugin senza runtime:clock non riceve clock', async () => {
      const governance = new CapabilityGovernance();
      governance.registerPolicy({
        name: 'allow-declared',
        evaluate: (plugin, cap) =>
          hasCapability(plugin.metadata.capabilities, cap)
            ? { allowed: true }
            : capabilityDenied('not declared'),
      });

      const clockValues: number[] = [];
      const pluginNoClock: ReadPlugin = {
        metadata: {
          id: 'no-clock',
          version: '1.0.0',
          kind: 'read',
          capabilities: ['runtime:logger'],
        },
        onStart: (ctx) => {
          clockValues.push(ctx.clock.now());
        },
      };

      const runtime = new PluginRuntime({
        capabilityGovernance: governance,
        getActivationContext: devContext,
      });
      await runtime.register(pluginNoClock);
      await runtime.start();

      expect(clockValues).toHaveLength(1);
      expect(clockValues[0]).toBe(0);
    });

    it('plugin con capability riceve logger/clock', async () => {
      const governance = new CapabilityGovernance();
      governance.registerPolicy({
        name: 'allow-declared',
        evaluate: (plugin, cap) =>
          hasCapability(plugin.metadata.capabilities, cap)
            ? { allowed: true }
            : capabilityDenied('not declared'),
      });

      let logCalled = false;
      let clockValue: number | null = null;
      const pluginWithCaps: ReadPlugin = {
        metadata: {
          id: 'with-caps',
          version: '1.0.0',
          kind: 'read',
          capabilities: ['runtime:logger', 'runtime:clock'],
        },
        onStart: (ctx) => {
          ctx.logger.info('started');
          logCalled = true;
          clockValue = ctx.clock.now();
        },
      };

      const runtime = new PluginRuntime({
        capabilityGovernance: governance,
        getActivationContext: devContext,
        logger: {
          info: () => {},
          warn: () => {},
          error: (msg) => {
            if (msg) logCalled = true;
          },
        },
        clock: { now: () => 42 },
      });
      await runtime.register(pluginWithCaps);
      await runtime.start();

      expect(logCalled).toBe(true);
      expect(clockValue).toBe(42);
    });
  });
});

describe('requireCapability / hasCapability', () => {
  it('hasCapability ritorna true se capability in set', () => {
    expect(hasCapability(['runtime:logger'], 'runtime:logger')).toBe(true);
    expect(hasCapability(['runtime:clock', 'runtime:logger'], 'runtime:clock')).toBe(true);
    expect(hasCapability([], 'runtime:logger')).toBe(false);
    expect(hasCapability(undefined, 'runtime:logger')).toBe(false);
  });

  it('requireCapability ritorna allowed se in set, denied altrimenti', () => {
    const set = ['runtime:logger'] as const;
    expect(requireCapability(set, 'runtime:logger').allowed).toBe(true);
    expect(requireCapability(set, 'runtime:clock').allowed).toBe(false);
    expect(requireCapability(set, 'runtime:clock').reason).toContain('not declared');
  });
});
