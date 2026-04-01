/**
 * Tenant Governance - unit test
 * Microstep 5.4.2
 */

import { describe, it, expect } from 'vitest';
import type { ReadPlugin } from '../../index';
import type { TenantContext } from '../TenantContext';
import {
  TenantGovernance,
  createTenantContext,
  tenantDenied,
  isTenantAllowed,
} from '../index';
import { createActivationContext } from '../../governance/PluginActivationContext';
import { PluginRuntime } from '../../runtime';

const euTenant = (): TenantContext =>
  createTenantContext({ tenantId: 't-eu', region: 'eu', compliance: ['gdpr'] });
const usTenant = (): TenantContext =>
  createTenantContext({ tenantId: 't-us', region: 'us', compliance: ['hipaa'] });

function activationContext(getTenant?: () => TenantContext) {
  return createActivationContext({
    apiVersion: 'v1',
    environment: 'dev',
    features: [],
    tenant: getTenant?.() ?? undefined,
  });
}

describe('TenantGovernance', () => {
  describe('Test 1 — Single-tenant legacy', () => {
    it('context senza tenant → allow (nessun check tenant)', async () => {
      const governance = new TenantGovernance();
      governance.registerPolicy({
        name: 'deny-eu',
        evaluate: (_, tenant) =>
          tenant.region === 'eu' ? tenantDenied('no eu') : { allow: true },
      });

      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
      };
      const ctx = activationContext();
      expect(ctx.tenant).toBeUndefined();

      const runtime = new PluginRuntime({
        tenantGovernance: governance,
        getActivationContext: () => ctx,
      });
      const hookCalls: string[] = [];
      const pluginWithHook: ReadPlugin = {
        metadata: { id: 'h', version: '1.0.0', kind: 'read' },
        onStart: () => hookCalls.push('onStart'),
      };
      await runtime.register(pluginWithHook);
      await runtime.start();
      expect(hookCalls).toContain('onStart');
    });
  });

  describe('Test 2 — Tenant allow', () => {
    it('policy allow → plugin eseguito', () => {
      const governance = new TenantGovernance();
      governance.registerPolicy({
        name: 'allow-eu',
        evaluate: (_, tenant) =>
          tenant.region === 'eu' ? { allow: true } : tenantDenied('only eu'),
      });

      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
      };
      const decision = governance.canExecute(
        plugin,
        euTenant(),
        activationContext(euTenant)
      );
      expect(isTenantAllowed(decision)).toBe(true);
    });
  });

  describe('Test 3 — Tenant deny', () => {
    it('policy nega → hook non chiamato', async () => {
      const governance = new TenantGovernance();
      governance.registerPolicy({
        name: 'deny-us',
        evaluate: (_, tenant) =>
          tenant.region === 'us'
            ? tenantDenied('plugin not allowed in us region')
            : { allow: true },
      });

      const hookCalls: string[] = [];
      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
        onStart: () => hookCalls.push('onStart'),
        onEventApplied: () => hookCalls.push('onEventApplied'),
      };

      const runtime = new PluginRuntime({
        tenantGovernance: governance,
        getActivationContext: () => activationContext(usTenant),
      });
      await runtime.register(plugin);
      await runtime.start();
      expect(hookCalls).toHaveLength(0);

      await runtime.dispatchReadHook('onEventApplied', [
        { id: 'e1', type: 'T', payload: {} },
        'v1',
      ]);
      expect(hookCalls).toHaveLength(0);
    });
  });

  describe('Test 4 — Policy che lancia', () => {
    it('deny fail-safe con reason', () => {
      const governance = new TenantGovernance();
      governance.registerPolicy({
        name: 'throws',
        evaluate: () => {
          throw new Error('policy error');
        },
      });

      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
      };
      const decision = governance.canExecute(
        plugin,
        euTenant(),
        activationContext(euTenant)
      );
      expect(isTenantAllowed(decision)).toBe(false);
      expect(decision.reason).toContain('Policy "throws" threw');
    });
  });

  describe('Test 5 — Determinismo', () => {
    it('stesso tenant + stesso plugin → stessa decisione', () => {
      const governance = new TenantGovernance();
      governance.registerPolicy({
        name: 'allow-all',
        evaluate: () => ({ allow: true }),
      });

      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
      };
      const tenant = euTenant();
      const ctx = activationContext(() => tenant);
      const d1 = governance.canExecute(plugin, tenant, ctx);
      const d2 = governance.canExecute(plugin, tenant, ctx);
      expect(d1).toEqual(d2);
    });
  });

  describe('Test 6 — Integrazione runtime', () => {
    it('tenant negato → plugin non riceve logger/clock né hook', async () => {
      const governance = new TenantGovernance();
      governance.registerPolicy({
        name: 'deny-all',
        evaluate: () => tenantDenied('tenant not allowed'),
      });

      const hookCalls: string[] = [];
      let loggerCalled = false;
      const plugin: ReadPlugin = {
        metadata: {
          id: 'p',
          version: '1.0.0',
          kind: 'read',
          capabilities: ['runtime:logger', 'runtime:clock'],
        },
        onStart: (ctx) => {
          hookCalls.push('onStart');
          ctx.logger.info('x');
          loggerCalled = true;
        },
      };

      const runtime = new PluginRuntime({
        tenantGovernance: governance,
        getActivationContext: () => activationContext(euTenant),
        logger: { info: () => {}, warn: () => {}, error: () => {} },
        clock: { now: () => 99 },
      });
      await runtime.register(plugin);
      await runtime.start();

      expect(hookCalls).toHaveLength(0);
      expect(loggerCalled).toBe(false);
    });
  });
});

describe('TenantContext e createActivationContext', () => {
  it('createActivationContext accetta tenant opzionale (backward compatible)', () => {
    const without = createActivationContext({
      apiVersion: 'v1',
      environment: 'dev',
    });
    expect(without.tenant).toBeUndefined();

    const withTenant = createActivationContext({
      apiVersion: 'v1',
      environment: 'prod',
      tenant: createTenantContext({ tenantId: 't1', region: 'eu', compliance: ['gdpr'] }),
    });
    expect(withTenant.tenant).toBeDefined();
    expect(withTenant.tenant!.tenantId).toBe('t1');
    expect(withTenant.tenant!.region).toBe('eu');
    expect(withTenant.tenant!.compliance).toContain('gdpr');
  });
});
