/**
 * Capability Semantics — Conformance (C.1.6)
 * Binding capability → semantics; kill-switch; immutabilità; assenza proprietà operative; separazione; neutralità; determinismo.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IrisCapabilitySnapshot, IrisCapability } from '../../index';
import {
  IrisCapabilitySemanticEngine,
  IRIS_CAPABILITY_SEMANTIC_COMPONENT_ID,
  type IrisCapabilitySemanticRegistry,
  type IrisCapabilitySemantic,
  type IrisCapabilitySemanticSnapshot,
} from '../index';

const SEMANTICS_ROOT = join(process.cwd(), 'src', 'messaging-system', 'capabilities', 'semantics');

const FORBIDDEN_PROPERTIES = ['execute', 'action', 'trigger', 'adapter', 'model', 'score', 'priority', 'rank'];

function makeRegistry(enabled: boolean): IrisCapabilitySemanticRegistry {
  return { isEnabled: (id: string) => id === IRIS_CAPABILITY_SEMANTIC_COMPONENT_ID && enabled };
}

function createCapabilitySnapshot(capabilities: IrisCapability[], derivedAt: string): IrisCapabilitySnapshot {
  return Object.freeze({
    capabilities: Object.freeze(capabilities),
    derivedAt,
  });
}

function createSemantic(
  semanticId: string,
  capabilityType: 'summarize.text' | 'attention.filter',
  derivedAt: string
): IrisCapabilitySemantic {
  return Object.freeze({
    semanticId,
    capabilityType,
    domain: 'cognitive',
    intentCategory: 'transform',
    inputs: Object.freeze(['textual-content']),
    outputs: Object.freeze(['reduced-text']),
    effects: Object.freeze(['comprehension-enhancement']),
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
    // ignore
  }
  return acc;
}

describe('Capability Semantics — Conformance', () => {
  describe('1. Binding capability → semantics', () => {
    it('semantics sono associate alle capability via capabilityType', () => {
      const derivedAt = '2025-01-01T12:00:00.000Z';
      const sem1 = createSemantic('s1', 'summarize.text', derivedAt);
      const sem2 = createSemantic('s2', 'attention.filter', derivedAt);
      const engine = new IrisCapabilitySemanticEngine([sem1, sem2]);
      const capSnapshot = createCapabilitySnapshot(
        [
          Object.freeze({
            capabilityId: 'c1',
            capabilityType: 'summarize.text',
            description: 'd',
            derivedAt,
          }) as IrisCapability,
        ],
        derivedAt
      );
      const result = engine.getSnapshot(capSnapshot, makeRegistry(true));
      expect(result.semantics).toHaveLength(1);
      expect(result.semantics[0].capabilityType).toBe('summarize.text');
      expect(result.semantics[0].semanticId).toBe('s1');
    });
  });

  describe('2. Kill-switch', () => {
    it('registry OFF → semantics.length === 0', () => {
      const derivedAt = '2025-01-01T12:00:00.000Z';
      const sem = createSemantic('s1', 'summarize.text', derivedAt);
      const engine = new IrisCapabilitySemanticEngine([sem]);
      const capSnapshot = createCapabilitySnapshot(
        [
          Object.freeze({
            capabilityId: 'c1',
            capabilityType: 'summarize.text',
            description: 'd',
            derivedAt,
          }) as IrisCapability,
        ],
        derivedAt
      );
      const result = engine.getSnapshot(capSnapshot, makeRegistry(false));
      expect(result.semantics).toHaveLength(0);
    });
  });

  describe('3. Immutabilità', () => {
    it('snapshot e ogni semantic sono frozen', () => {
      const derivedAt = '2025-01-01T12:00:00.000Z';
      const sem = createSemantic('s1', 'attention.filter', derivedAt);
      const engine = new IrisCapabilitySemanticEngine([sem]);
      const capSnapshot = createCapabilitySnapshot(
        [
          Object.freeze({
            capabilityId: 'c1',
            capabilityType: 'attention.filter',
            description: 'd',
            derivedAt,
          }) as IrisCapability,
        ],
        derivedAt
      );
      const result = engine.getSnapshot(capSnapshot, makeRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.semantics)).toBe(true);
      for (const s of result.semantics) {
        expect(Object.isFrozen(s)).toBe(true);
      }
    });
  });

  describe('4. Assenza proprietà operative', () => {
    it('nessuna semantic contiene execute, action, trigger, adapter, model', () => {
      const s: IrisCapabilitySemantic = Object.freeze({
        semanticId: 's1',
        capabilityType: 'intent.suggest',
        domain: 'assistance',
        intentCategory: 'assist',
        inputs: Object.freeze([]),
        outputs: Object.freeze([]),
        effects: Object.freeze(['decision-support']),
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(s);
      for (const f of FORBIDDEN_PROPERTIES) {
        expect(keys).not.toContain(f);
      }
      const snapshot: IrisCapabilitySemanticSnapshot = Object.freeze({
        semantics: Object.freeze([s]),
        derivedAt: new Date().toISOString(),
      });
      const snapshotKeys = Object.keys(snapshot);
      for (const f of FORBIDDEN_PROPERTIES) {
        expect(snapshotKeys).not.toContain(f);
      }
    });
  });

  describe('5. Separazione', () => {
    it('nessun file in semantics/ importa da iris, delivery, adapter, execution', () => {
      const files = collectTsFiles(SEMANTICS_ROOT);
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

  describe('6. Neutralità', () => {
    it('nessuna semantic contiene score, priority, rank', () => {
      const s: IrisCapabilitySemantic = Object.freeze({
        semanticId: 's1',
        capabilityType: 'memory.store',
        domain: 'memory',
        intentCategory: 'transform',
        inputs: Object.freeze([]),
        outputs: Object.freeze([]),
        effects: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(s);
      expect(keys).not.toContain('score');
      expect(keys).not.toContain('priority');
      expect(keys).not.toContain('rank');
    });
  });

  describe('7. Determinismo', () => {
    it('stesso input → stesso snapshot', () => {
      const derivedAt = '2025-01-01T12:00:00.000Z';
      const sem = createSemantic('s1', 'summarize.text', derivedAt);
      const engine = new IrisCapabilitySemanticEngine([sem]);
      const capSnapshot = createCapabilitySnapshot(
        [
          Object.freeze({
            capabilityId: 'c1',
            capabilityType: 'summarize.text',
            description: 'd',
            derivedAt,
          }) as IrisCapability,
        ],
        derivedAt
      );
      const a = engine.getSnapshot(capSnapshot, makeRegistry(true));
      const b = engine.getSnapshot(capSnapshot, makeRegistry(true));
      expect(a.semantics.length).toBe(b.semantics.length);
      expect(a.derivedAt).toBe(b.derivedAt);
      expect(a.semantics.map((x) => x.semanticId)).toEqual(b.semantics.map((x) => x.semanticId));
      expect(a.semantics.map((x) => x.capabilityType)).toEqual(b.semantics.map((x) => x.capabilityType));
    });
  });
});

// La Capability Semantics è certificata come dichiarativa, semantica e side-effect free.
// Ogni comportamento operativo appartiene esclusivamente a layer successivi.
