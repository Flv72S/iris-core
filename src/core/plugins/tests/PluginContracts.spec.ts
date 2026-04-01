/**
 * Plugin Contracts - unit test
 * Microstep 5.3.1
 */

import { describe, it, expect } from 'vitest';
import type {
  ReadPlugin,
  WritePlugin,
  PluginContext,
  PluginMetadata,
} from '../index';

const minimalContext: PluginContext = {
  logger: { info: () => {}, warn: () => {}, error: () => {} },
  clock: { now: () => Date.now() },
  pluginId: 'test',
  pluginVersion: '1.0.0',
};

describe('PluginContracts', () => {
  describe('Test 1 - Contratti puri', () => {
    it('i plugin sono solo tipi / interfacce', () => {
      const readPlugin: ReadPlugin = {
        metadata: {
          id: 'read-a',
          version: '1.0.0',
          kind: 'read',
        },
      };
      const writePlugin: WritePlugin = {
        metadata: {
          id: 'write-a',
          version: '1.0.0',
          kind: 'write',
        },
      };
      expect(readPlugin.metadata.kind).toBe('read');
      expect(writePlugin.metadata.kind).toBe('write');
    });
  });

  describe('Test 2 - Hook opzionali', () => {
    it('un plugin minimale e valido', () => {
      const minimal: ReadPlugin = {
        metadata: {
          id: 'minimal',
          version: '0.1.0',
          kind: 'read',
          description: 'minimal plugin',
        },
      };
      expect(minimal.metadata.id).toBe('minimal');
      expect(minimal.onRegister).toBeUndefined();
      expect(minimal.onEventApplied).toBeUndefined();
    });
  });

  describe('Test 3 - Separazione read / write', () => {
    it('ReadPlugin ha onEventApplied, WritePlugin ha beforeCommand', () => {
      const read: ReadPlugin = {
        metadata: { id: 'r', version: '1.0.0', kind: 'read' },
        onEventApplied: () => {},
      };
      const write: WritePlugin = {
        metadata: { id: 'w', version: '1.0.0', kind: 'write' },
        beforeCommand: () => {},
      };
      expect('onEventApplied' in read).toBe(true);
      expect('beforeCommand' in write).toBe(true);
      expect('onEventApplied' in write).toBe(false);
      expect('beforeCommand' in read).toBe(false);
    });
  });

  describe('Test 4 - Forward compatibility', () => {
    it('plugin senza nuovo hook continua a funzionare', () => {
      const legacy: ReadPlugin = {
        metadata: { id: 'legacy', version: '1.0.0', kind: 'read' },
      };
      if (legacy.onReplayStart) {
        legacy.onReplayStart(minimalContext);
      }
      expect(legacy.metadata.id).toBe('legacy');
    });
  });

  describe('Test 5 - Sandbox logico', () => {
    it('context espone solo logger, clock, pluginId, pluginVersion', () => {
      const ctx: PluginContext = minimalContext;
      expect(ctx.logger).toBeDefined();
      expect(ctx.clock).toBeDefined();
      expect(ctx.pluginId).toBeDefined();
      expect(ctx.pluginVersion).toBeDefined();
      expect('database' in ctx).toBe(false);
      expect('http' in ctx).toBe(false);
      expect('fs' in ctx).toBe(false);
    });

    it('nessun hook riceve riferimenti pericolosi', () => {
      const safeRead: ReadPlugin = {
        metadata: { id: 'safe', version: '1.0.0', kind: 'read' },
        onEventApplied: (event, version, context) => {
          expect(event).toBeDefined();
          expect(typeof version).toBe('string');
          expect(context.logger).toBeDefined();
        },
      };
      safeRead.onEventApplied?.(
        { id: 'e1', type: 'T', payload: {} },
        'v1',
        minimalContext
      );
    });
  });
});
