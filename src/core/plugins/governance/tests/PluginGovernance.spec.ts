/**
 * Plugin Governance - unit test
 * Microstep 5.3.3
 */

import { describe, it, expect } from 'vitest';
import type { ReadPlugin } from '../../index';
import {
  PluginGovernance,
  createActivationContext,
  allow,
  deny,
  isAllowed,
  type PluginPolicy,
  type PluginActivationContext,
  type PluginDecision,
} from '../index';
import { PluginRuntime } from '../../runtime';

const pluginRead: ReadPlugin = {
  metadata: { id: 'read-a', version: '1.0.0', kind: 'read' },
};

const devContext = (): PluginActivationContext =>
  createActivationContext({ apiVersion: '1', environment: 'dev' });
const prodContext = (): PluginActivationContext =>
  createActivationContext({ apiVersion: '1', environment: 'prod' });

describe('PluginGovernance', () => {
  describe('Test 1 — Default allow', () => {
    it('nessuna policy → plugin eseguibile', () => {
      const governance = new PluginGovernance();
      const decision = governance.canExecute(pluginRead, devContext());
      expect(isAllowed(decision)).toBe(true);
      expect(decision).toEqual({ allow: true });
    });
  });

  describe('Test 2 — Policy di blocco', () => {
    it('policy nega → hook non invocato (decisione deny)', () => {
      const blockInProd: PluginPolicy = {
        name: 'block-in-prod',
        evaluate: (plugin, ctx) =>
          ctx.environment === 'prod' ? deny('disabled in prod') : allow(),
      };
      const governance = new PluginGovernance();
      governance.registerPolicy(blockInProd);

      expect(governance.canExecute(pluginRead, devContext())).toEqual({
        allow: true,
      });
      const decision = governance.canExecute(pluginRead, prodContext());
      expect(isAllowed(decision)).toBe(false);
      expect(decision).toEqual({ allow: false, reason: 'disabled in prod' });
    });
  });

  describe('Test 3 — Multiple policy', () => {
    it('una nega → deny', () => {
      const allowAll: PluginPolicy = {
        name: 'allow-all',
        evaluate: () => allow(),
      };
      const blockReadA: PluginPolicy = {
        name: 'block-read-a',
        evaluate: (plugin) =>
          plugin.metadata.id === 'read-a' ? deny('read-a disabled') : allow(),
      };
      const governance = new PluginGovernance();
      governance.registerPolicy(allowAll);
      governance.registerPolicy(blockReadA);

      const decision = governance.canExecute(pluginRead, devContext());
      expect(isAllowed(decision)).toBe(false);
      expect(decision).toEqual({ allow: false, reason: 'read-a disabled' });
    });

    it('tutte allow → allow', () => {
      const allowAll: PluginPolicy = {
        name: 'allow-all',
        evaluate: () => allow(),
      };
      const requireDev: PluginPolicy = {
        name: 'require-dev',
        evaluate: (_, ctx) =>
          ctx.environment === 'dev' ? allow() : deny('only dev'),
      };
      const governance = new PluginGovernance();
      governance.registerPolicy(allowAll);
      governance.registerPolicy(requireDev);

      const decision = governance.canExecute(pluginRead, devContext());
      expect(isAllowed(decision)).toBe(true);
    });
  });

  describe('Test 4 — Determinismo', () => {
    it('stesso plugin + stesso contesto → stessa decisione', () => {
      const denyOddMinute: PluginPolicy = {
        name: 'deny-odd',
        evaluate: (_, ctx) =>
          ctx.timestamp % 2 === 1 ? deny('odd minute') : allow(),
      };
      const governance = new PluginGovernance();
      governance.registerPolicy(denyOddMinute);

      const ctx = createActivationContext({
        apiVersion: '1',
        environment: 'dev',
        timestamp: 1000,
      });
      const d1 = governance.canExecute(pluginRead, ctx);
      const d2 = governance.canExecute(pluginRead, ctx);
      expect(d1).toEqual(d2);
    });
  });

  describe('Fail-safe', () => {
    it('policy che lancia → deny con reason', () => {
      const governance = new PluginGovernance();
      governance.registerPolicy({
        name: 'throws',
        evaluate: () => {
          throw new Error('policy error');
        },
      });
      const decision = governance.canExecute(pluginRead, devContext());
      expect(isAllowed(decision)).toBe(false);
      expect((decision as { reason: string }).reason).toContain('Policy "throws" threw');
    });
  });

  describe('Test 5 — Explainability', () => {
    it('reason valorizzata correttamente', () => {
      const governance = new PluginGovernance();
      governance.registerPolicy({
        name: 'explain',
        evaluate: (plugin) =>
          deny(`Plugin ${plugin.metadata.id}@${plugin.metadata.version} not allowed in this environment`),
      });

      const decision = governance.canExecute(pluginRead, devContext());
      expect(decision.allow).toBe(false);
      expect('reason' in decision).toBe(true);
      expect((decision as { reason: string }).reason).toContain('read-a');
      expect((decision as { reason: string }).reason).toContain('1.0.0');
    });
  });

  describe('Test 6 — Integrazione runtime (mock)', () => {
    it('PluginRuntime non esegue hook se governance nega', async () => {
      const governance = new PluginGovernance();
      governance.registerPolicy({
        name: 'block-all',
        evaluate: () => deny('blocked by policy'),
      });

      const hookCalls: string[] = [];
      const readPlugin: ReadPlugin = {
        metadata: { id: 'tracked', version: '1.0.0', kind: 'read' },
        onStart: () => hookCalls.push('onStart'),
        onEventApplied: () => hookCalls.push('onEventApplied'),
      };

      const runtime = new PluginRuntime({
        governance,
        getActivationContext: devContext,
      });
      await runtime.register(readPlugin);
      await runtime.start();

      expect(hookCalls).toHaveLength(0);

      await runtime.dispatchReadHook('onEventApplied', [
        { id: 'e1', type: 'T', payload: {} },
        'v1',
      ]);
      expect(hookCalls).toHaveLength(0);
    });

    it('PluginRuntime esegue hook se governance allow', async () => {
      const governance = new PluginGovernance();

      const hookCalls: string[] = [];
      const readPlugin: ReadPlugin = {
        metadata: { id: 'allowed', version: '1.0.0', kind: 'read' },
        onStart: () => hookCalls.push('onStart'),
      };

      const runtime = new PluginRuntime({
        governance,
        getActivationContext: devContext,
      });
      await runtime.register(readPlugin);
      await runtime.start();

      expect(hookCalls).toContain('onStart');
    });
  });
});
