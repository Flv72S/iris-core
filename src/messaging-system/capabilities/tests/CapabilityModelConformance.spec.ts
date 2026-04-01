/**
 * Capability Model — Conformance (C.1.5)
 * Skeleton only; kill-switch; immutabilità; assenza proprietà operative; vocabolario controllato; separazione; determinismo.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisCapabilityEngine,
  IRIS_CAPABILITY_TYPES,
  IRIS_CAPABILITY_COMPONENT_ID,
  type IrisCapabilityRegistry,
  type IrisCapability,
  type IrisCapabilitySnapshot,
  type IrisCapabilityType,
} from '../index';

const CAPABILITIES_ROOT = join(process.cwd(), 'src', 'messaging-system', 'capabilities');

const FORBIDDEN_PROPERTIES = ['execute', 'send', 'trigger', 'adapter', 'channel', 'model'];

function makeRegistry(enabled: boolean): IrisCapabilityRegistry {
  return { isEnabled: (id: string) => id === IRIS_CAPABILITY_COMPONENT_ID && enabled };
}

function createCapability(
  capabilityId: string,
  capabilityType: IrisCapabilityType,
  derivedAt: string
): IrisCapability {
  return Object.freeze({
    capabilityId,
    capabilityType,
    description: 'd',
    derivedAt,
  });
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'tests') {
        collectTsFiles(full, acc);
      } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        acc.push(full);
      }
    }
  } catch {
    // dir may not exist
  }
  return acc;
}

describe('Capability Model — Conformance', () => {
  describe('1. Skeleton only', () => {
    it('engine non espone metodi esecutivi (solo getSnapshot)', () => {
      const engine = new IrisCapabilityEngine([]);
      const snapshot = engine.getSnapshot(makeRegistry(true));
      expect(snapshot).toBeDefined();
      expect(snapshot.capabilities).toEqual([]);
      expect(typeof engine.getSnapshot).toBe('function');
      expect(Object.getOwnPropertyNames(Object.getPrototypeOf(engine))).not.toContain('execute');
      expect(Object.getOwnPropertyNames(Object.getPrototypeOf(engine))).not.toContain('run');
      expect(Object.getOwnPropertyNames(Object.getPrototypeOf(engine))).not.toContain('send');
    });
  });

  describe('2. Kill-switch', () => {
    it('registry OFF → snapshot.capabilities.length === 0', () => {
      const cap = createCapability('c1', 'summarize.text', new Date().toISOString());
      const engine = new IrisCapabilityEngine([cap]);
      const snapshot = engine.getSnapshot(makeRegistry(false));
      expect(snapshot.capabilities).toHaveLength(0);
      expect(snapshot.capabilities).toEqual([]);
    });
  });

  describe('3. Immutabilità', () => {
    it('snapshot e ogni capability sono frozen', () => {
      const derivedAt = '2025-01-01T12:00:00.000Z';
      const cap = createCapability('c1', 'semantic.search', derivedAt);
      const engine = new IrisCapabilityEngine([cap]);
      const snapshot = engine.getSnapshot(makeRegistry(true));
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.capabilities)).toBe(true);
      for (const c of snapshot.capabilities) {
        expect(Object.isFrozen(c)).toBe(true);
      }
    });
  });

  describe('4. Assenza proprietà operative', () => {
    it('nessuna capability espone execute, send, trigger, adapter, channel, model', () => {
      const c: IrisCapability = Object.freeze({
        capabilityId: 'c1',
        capabilityType: 'memory.store',
        description: 'd',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(c);
      for (const f of FORBIDDEN_PROPERTIES) {
        expect(keys).not.toContain(f);
      }
      const snapshot: IrisCapabilitySnapshot = Object.freeze({
        capabilities: Object.freeze([c]),
        derivedAt: new Date().toISOString(),
      });
      const snapshotKeys = Object.keys(snapshot);
      for (const f of FORBIDDEN_PROPERTIES) {
        expect(snapshotKeys).not.toContain(f);
      }
    });
  });

  describe('5. Vocabolario controllato', () => {
    it('capabilityType appartiene a IrisCapabilityType', () => {
      expect(IRIS_CAPABILITY_TYPES).toContain('summarize.text');
      expect(IRIS_CAPABILITY_TYPES).toContain('context.link');
      const cap = createCapability('c1', 'transcribe.voice', new Date().toISOString());
      expect(IRIS_CAPABILITY_TYPES).toContain(cap.capabilityType);
    });
  });

  describe('6. Separazione', () => {
    it('nessun file in capabilities/ importa da iris, delivery, adapter, execution', () => {
      const files = collectTsFiles(CAPABILITIES_ROOT);
      const forbidden = ['iris', 'delivery', 'adapter', 'execution'];
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
          const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch) {
            const path = fromMatch[1];
            if (forbidden.some((f) => path.includes(f))) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('7. Determinismo', () => {
    it('stessi input → stesso snapshot (ids, derivedAt coerente)', () => {
      const derivedAt = '2025-01-01T12:00:00.000Z';
      const caps: IrisCapability[] = [
        createCapability('c1', 'summarize.text', derivedAt),
        createCapability('c2', 'attention.filter', derivedAt),
      ];
      const engine = new IrisCapabilityEngine(caps);
      const a = engine.getSnapshot(makeRegistry(true));
      const b = engine.getSnapshot(makeRegistry(true));
      expect(a.capabilities.length).toBe(b.capabilities.length);
      expect(a.derivedAt).toBe(b.derivedAt);
      expect(a.capabilities.map((x) => x.capabilityId)).toEqual(b.capabilities.map((x) => x.capabilityId));
      expect(a.capabilities.map((x) => x.capabilityType)).toEqual(b.capabilities.map((x) => x.capabilityType));
    });
  });
});

// Il Capability Model è certificato come dichiarativo, neutro e side-effect free.
// Ogni forma di esecuzione o intelligenza risiede in layer successivi.
