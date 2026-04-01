/**
 * Security Audit - unit test
 * Microstep 5.4.3
 */

import { describe, it, expect } from 'vitest';
import type { ReadPlugin } from '../../index';
import {
  SecurityAuditDispatcher,
  InMemoryAuditSink,
  createSecurityAuditEvent,
  createActivationContext,
  PluginGovernance,
  deny,
  CapabilityGovernance,
  TenantGovernance,
  createTenantContext,
  tenantDenied,
  PluginRuntime,
} from '../../index';

const devContext = () =>
  createActivationContext({ apiVersion: 'v1', environment: 'dev' });

describe('SecurityAudit', () => {
  describe('Test 1 — Audit deny plugin governance', () => {
    it('policy plugin nega → evento DENY, layer PLUGIN', async () => {
      const sink = new InMemoryAuditSink();
      const dispatcher = new SecurityAuditDispatcher();
      dispatcher.registerSink(sink);

      const governance = new PluginGovernance();
      governance.registerPolicy({
        name: 'deny-p',
        evaluate: () => deny('plugin disabled'),
      });

      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
      };

      const runtime = new PluginRuntime({
        governance,
        getActivationContext: devContext,
        auditDispatcher: dispatcher,
      });
      await runtime.register(plugin);

      const events = sink.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].decision).toBe('DENY');
      expect(events[0].layer).toBe('PLUGIN');
      expect(events[0].pluginId).toBe('p');
      expect(events[0].reason).toContain('plugin disabled');
    });
  });

  describe('Test 2 — Audit deny capability', () => {
    it('capability mancante → evento DENY, layer CAPABILITY', async () => {
      const sink = new InMemoryAuditSink();
      const dispatcher = new SecurityAuditDispatcher();
      dispatcher.registerSink(sink);

      const capabilityGov = new CapabilityGovernance();
      capabilityGov.registerPolicy({
        name: 'allow-declared',
        evaluate: (plugin, cap) =>
          (plugin.metadata.capabilities ?? []).includes(cap)
            ? { allowed: true }
            : { allowed: false, reason: 'not declared' },
      });

      const plugin: ReadPlugin = {
        metadata: {
          id: 'no-logger',
          version: '1.0.0',
          kind: 'read',
          capabilities: [],
        },
      };

      const runtime = new PluginRuntime({
        capabilityGovernance: capabilityGov,
        getActivationContext: devContext,
        auditDispatcher: dispatcher,
      });
      await runtime.register(plugin);

      const events = sink.getEvents();
      const capabilityDenies = events.filter(
        (e) => e.layer === 'CAPABILITY' && e.decision === 'DENY'
      );
      expect(capabilityDenies.length).toBeGreaterThanOrEqual(1);
      expect(capabilityDenies.some((e) => e.capability === 'runtime:logger')).toBe(true);
    });
  });

  describe('Test 3 — Audit deny tenant', () => {
    it('tenant policy nega → evento DENY, layer TENANT', async () => {
      const sink = new InMemoryAuditSink();
      const dispatcher = new SecurityAuditDispatcher();
      dispatcher.registerSink(sink);

      const tenantGov = new TenantGovernance();
      tenantGov.registerPolicy({
        name: 'deny-us',
        evaluate: (_, tenant) =>
          tenant.region === 'us'
            ? tenantDenied('tenant not allowed in us')
            : { allow: true },
      });

      const tenant = createTenantContext({
        tenantId: 't-us',
        region: 'us',
        compliance: [],
      });
      const activationContext = () =>
        createActivationContext({
          apiVersion: 'v1',
          environment: 'dev',
          tenant,
        });

      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
      };

      const runtime = new PluginRuntime({
        tenantGovernance: tenantGov,
        getActivationContext: activationContext,
        auditDispatcher: dispatcher,
      });
      await runtime.register(plugin);
      await runtime.start();

      const events = sink.getEvents();
      const tenantDenies = events.filter(
        (e) => e.layer === 'TENANT' && e.decision === 'DENY'
      );
      expect(tenantDenies.length).toBeGreaterThanOrEqual(1);
      expect(tenantDenies[0].tenantId).toBe('t-us');
      expect(tenantDenies[0].reason).toContain('tenant not allowed');
    });
  });

  describe('Test 4 — Audit allow opzionale', () => {
    it('auditAllowDecisions = true → evento ALLOW', async () => {
      const sink = new InMemoryAuditSink();
      const dispatcher = new SecurityAuditDispatcher();
      dispatcher.registerSink(sink);

      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
      };

      const runtime = new PluginRuntime({
        getActivationContext: devContext,
        auditDispatcher: dispatcher,
        auditAllowDecisions: true,
      });
      await runtime.register(plugin);
      await runtime.start();

      const events = sink.getEvents();
      const allows = events.filter((e) => e.decision === 'ALLOW');
      expect(allows.length).toBeGreaterThanOrEqual(1);
      expect(allows.some((e) => e.layer === 'PLUGIN')).toBe(true);
    });
  });

  describe('Test 5 — Sink isolation', () => {
    it('sink che lancia → altri sink ricevono evento', () => {
      const goodSink = new InMemoryAuditSink();
      const throwingSink: { record: (e: unknown) => void } = {
        record: () => {
          throw new Error('sink error');
        },
      };
      const dispatcher = new SecurityAuditDispatcher();
      dispatcher.registerSink(throwingSink);
      dispatcher.registerSink(goodSink);

      const event = createSecurityAuditEvent({
        timestamp: 1000,
        pluginId: 'p',
        decision: 'DENY',
        layer: 'PLUGIN',
        reason: 'test',
        environment: 'dev',
        apiVersion: 'v1',
      });
      dispatcher.dispatch(event);

      expect(goodSink.getEvents()).toHaveLength(1);
      expect(goodSink.getEvents()[0]).toEqual(event);
    });
  });

  describe('Test 6 — No runtime side-effects', () => {
    it('audit non blocca esecuzione core', async () => {
      const sink = new InMemoryAuditSink();
      const dispatcher = new SecurityAuditDispatcher();
      dispatcher.registerSink(sink);

      const governance = new PluginGovernance();
      governance.registerPolicy({
        name: 'deny-half',
        evaluate: (plugin) =>
          plugin.metadata.id === 'denied' ? deny('no') : { allow: true },
      });

      const runtime = new PluginRuntime({
        governance,
        getActivationContext: devContext,
        auditDispatcher: dispatcher,
      });
      await runtime.register({
        metadata: { id: 'allowed', version: '1.0.0', kind: 'read' },
      });
      await runtime.register({
        metadata: { id: 'denied', version: '1.0.0', kind: 'read' },
      });
      await runtime.start();

      expect(runtime.getAll()).toHaveLength(2);
      expect(sink.getEvents().filter((e) => e.decision === 'DENY').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Test 7 — Determinismo', () => {
    it('stesso input → stesso evento', async () => {
      const sink = new InMemoryAuditSink();
      const dispatcher = new SecurityAuditDispatcher();
      dispatcher.registerSink(sink);

      const governance = new PluginGovernance();
      governance.registerPolicy({
        name: 'deny-p',
        evaluate: (plugin) =>
          plugin.metadata.id === 'p' ? deny('no') : { allow: true },
      });

      const plugin: ReadPlugin = {
        metadata: { id: 'p', version: '1.0.0', kind: 'read' },
      };
      const ctx = devContext();

      const runtime = new PluginRuntime({
        governance,
        getActivationContext: () => ctx,
        auditDispatcher: dispatcher,
      });
      await runtime.register(plugin);
      await runtime.start();

      const events = sink.getEvents();
      const denyEvents = events.filter((e) => e.decision === 'DENY' && e.pluginId === 'p');
      expect(denyEvents.length).toBeGreaterThanOrEqual(1);
      const first = denyEvents[0];
      expect(first.pluginId).toBe('p');
      expect(first.decision).toBe('DENY');
      expect(first.layer).toBe('PLUGIN');
      denyEvents.forEach((e) => {
        expect(e.decision).toBe(first.decision);
        expect(e.layer).toBe(first.layer);
      });
    });
  });
});

describe('SecurityAuditEvent', () => {
  it('è immutabile e serializzabile', () => {
    const event = createSecurityAuditEvent({
      timestamp: 1000,
      pluginId: 'p',
      pluginVersion: '1.0.0',
      decision: 'DENY',
      layer: 'PLUGIN',
      reason: 'test',
      environment: 'dev',
      apiVersion: 'v1',
    });
    expect(Object.isFrozen(event)).toBe(true);
    const json = JSON.stringify(event);
    const parsed = JSON.parse(json);
    expect(parsed.pluginId).toBe('p');
    expect(parsed.decision).toBe('DENY');
    expect(parsed.layer).toBe('PLUGIN');
  });
});
