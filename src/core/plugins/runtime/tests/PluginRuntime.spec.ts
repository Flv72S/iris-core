/**
 * Plugin Runtime - unit test
 * Microstep 5.3.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ReadPlugin, WritePlugin, PluginContext } from '../../index';
import {
  PluginRuntime,
  PluginRegistry,
  PluginSandbox,
  PluginExecutionError,
  DuplicatePluginIdError,
  InvalidPluginError,
} from '../index';

const minimalContext: PluginContext = {
  logger: { info: () => {}, warn: () => {}, error: () => {} },
  clock: { now: () => Date.now() },
  pluginId: 'test',
  pluginVersion: '1.0.0',
};

describe('PluginRuntime', () => {
  describe('Test 1 — Registrazione valida', () => {
    it('plugin read e write registrati correttamente', async () => {
      const registry = new PluginRegistry();
      const readPlugin: ReadPlugin = {
        metadata: { id: 'read-a', version: '1.0.0', kind: 'read' },
      };
      const writePlugin: WritePlugin = {
        metadata: { id: 'write-a', version: '1.0.0', kind: 'write' },
      };

      registry.register(readPlugin);
      registry.register(writePlugin);

      expect(registry.getReadPlugins()).toHaveLength(1);
      expect(registry.getReadPlugins()[0].metadata.id).toBe('read-a');
      expect(registry.getWritePlugins()).toHaveLength(1);
      expect(registry.getWritePlugins()[0].metadata.id).toBe('write-a');
      expect(registry.getAll()).toHaveLength(2);
    });

    it('rifiuta id duplicato', () => {
      const registry = new PluginRegistry();
      const p: ReadPlugin = {
        metadata: { id: 'same', version: '1.0.0', kind: 'read' },
      };
      registry.register(p);
      expect(() => registry.register(p)).toThrow(DuplicatePluginIdError);
      expect(() => registry.register(p)).toThrow(/already registered/);
    });

    it('rifiuta metadata invalido', () => {
      const registry = new PluginRegistry();
      expect(() =>
        registry.register({
          metadata: { id: '', version: '1.0.0', kind: 'read' },
        } as ReadPlugin)
      ).toThrow(InvalidPluginError);
      expect(() =>
        registry.register({
          metadata: { id: 'x', version: '', kind: 'read' },
        } as ReadPlugin)
      ).toThrow(InvalidPluginError);
    });
  });

  describe('Test 2 — Lifecycle completo', () => {
    it('onRegister → onStart → onStop invocati in ordine', async () => {
      const order: string[] = [];
      const readPlugin: ReadPlugin = {
        metadata: { id: 'lifecycle-read', version: '1.0.0', kind: 'read' },
        onRegister: () => order.push('onRegister'),
        onStart: () => order.push('onStart'),
        onStop: () => order.push('onStop'),
      };

      const runtime = new PluginRuntime();
      await runtime.register(readPlugin);
      expect(order).toEqual(['onRegister']);

      await runtime.start();
      expect(order).toEqual(['onRegister', 'onStart']);

      await runtime.stop();
      expect(order).toEqual(['onRegister', 'onStart', 'onStop']);
    });
  });

  describe('Test 3 — Isolamento errori', () => {
    it('un plugin che throwa non blocca gli altri', async () => {
      const goodCalls: string[] = [];
      const readGood: ReadPlugin = {
        metadata: { id: 'good', version: '1.0.0', kind: 'read' },
        onStart: () => goodCalls.push('good'),
      };
      const readBad: ReadPlugin = {
        metadata: { id: 'bad', version: '1.0.0', kind: 'read' },
        onStart: () => {
          throw new Error('plugin failed');
        },
      };

      const runtime = new PluginRuntime();
      await runtime.register(readGood);
      await runtime.register(readBad);
      await runtime.start();

      expect(goodCalls).toContain('good');
      const errors = runtime.getExecutionErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(PluginExecutionError);
      expect(errors[0].pluginId).toBe('bad');
      expect(errors[0].hook).toBe('onStart');
    });

    it('promise reject normalizzata e non propagata', async () => {
      const readBad: ReadPlugin = {
        metadata: { id: 'reject', version: '1.0.0', kind: 'read' },
        onStart: () => Promise.reject(new Error('async fail')),
      };
      const runtime = new PluginRuntime();
      await runtime.register(readBad);
      await runtime.start();

      const errors = runtime.getExecutionErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].originalError).toBeInstanceOf(Error);
      expect((errors[0].originalError as Error).message).toBe('async fail');
    });
  });

  describe('Test 4 — Ordine deterministico', () => {
    it('hook invocati sempre nello stesso ordine (per pluginId)', async () => {
      const order: string[] = [];
      const makePlugin = (id: string): ReadPlugin => ({
        metadata: { id, version: '1.0.0', kind: 'read' },
        onEventApplied: () => order.push(id),
      });

      const runtime = new PluginRuntime();
      await runtime.register(makePlugin('zebra'));
      await runtime.register(makePlugin('alpha'));
      await runtime.register(makePlugin('beta'));
      await runtime.start();

      await runtime.dispatchReadHook('onEventApplied', [
        { id: 'e1', type: 'T', payload: {} },
        'v1',
      ]);

      expect(order).toEqual(['alpha', 'beta', 'zebra']);
    });
  });

  describe('Test 5 — Sandbox', () => {
    it('plugin non può mutare context', async () => {
      const sandbox = new PluginSandbox();
      const readPlugin: ReadPlugin = {
        metadata: { id: 'mutate', version: '1.0.0', kind: 'read' },
        onRegister: (ctx) => {
          try {
            (ctx as Record<string, unknown>).pluginId = 'hacked';
          } catch {
            // freeze previene mutazione
          }
        },
      };
      const context: PluginContext = {
        ...minimalContext,
        pluginId: 'mutate',
        pluginVersion: '1.0.0',
      };
      const err = await sandbox.execute(readPlugin, 'onRegister', [], context);
      expect(err).toBeNull();
      expect(context.pluginId).toBe('mutate');
    });

    it('errori normalizzati in PluginExecutionError', async () => {
      const sandbox = new PluginSandbox();
      const readPlugin: ReadPlugin = {
        metadata: { id: 'thrower', version: '1.0.0', kind: 'read' },
        onStart: () => {
          throw new Error('original message');
        },
      };
      const context = createContext(readPlugin);
      const err = await sandbox.execute(readPlugin, 'onStart', [], context);
      expect(err).not.toBeNull();
      expect(err).toBeInstanceOf(PluginExecutionError);
      expect(err!.pluginId).toBe('thrower');
      expect(err!.hook).toBe('onStart');
      expect(err!.originalError).toBeInstanceOf(Error);
      expect(err!.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Test 6 — Separazione read / write', () => {
    it('dispatchReadHook invoca solo plugin read', async () => {
      const readCalls: string[] = [];
      const writeCalls: string[] = [];
      const readPlugin: ReadPlugin = {
        metadata: { id: 'r', version: '1.0.0', kind: 'read' },
        onEventApplied: () => readCalls.push('read'),
      };
      const writePlugin: WritePlugin = {
        metadata: { id: 'w', version: '1.0.0', kind: 'write' },
        beforeCommand: () => writeCalls.push('write'),
      };

      const runtime = new PluginRuntime();
      await runtime.register(readPlugin);
      await runtime.register(writePlugin);
      await runtime.start();

      await runtime.dispatchReadHook('onEventApplied', [
        { id: 'e1', type: 'T', payload: {} },
        'v1',
      ]);
      expect(readCalls).toEqual(['read']);
      expect(writeCalls).toHaveLength(0);

      await runtime.dispatchWriteHook('beforeCommand', [
        { type: 'CreateThread', payload: {} },
      ]);
      expect(writeCalls).toEqual(['write']);
      expect(readCalls).toEqual(['read']);
    });

    it('dispatchWriteHook invoca solo plugin write', async () => {
      const readPlugins = new PluginRuntime().getReadPlugins();
      const writePlugins = new PluginRuntime().getWritePlugins();
      expect(readPlugins).toEqual([]);
      expect(writePlugins).toEqual([]);

      const runtime = new PluginRuntime();
      const readPlugin: ReadPlugin = {
        metadata: { id: 'only-read', version: '1.0.0', kind: 'read' },
        beforeCommand: () => {
          throw new Error('read plugin should not have beforeCommand');
        },
      };
      await runtime.register(readPlugin);
      await runtime.start();

      const errors = await runtime.dispatchWriteHook('beforeCommand', [
        { type: 'X', payload: {} },
      ]);
      expect(errors).toHaveLength(0);
      expect(runtime.getWritePlugins()).toHaveLength(0);
    });
  });
});

function createContext(plugin: ReadPlugin): PluginContext {
  return {
    logger: minimalContext.logger,
    clock: minimalContext.clock,
    pluginId: plugin.metadata.id,
    pluginVersion: plugin.metadata.version,
  };
}
