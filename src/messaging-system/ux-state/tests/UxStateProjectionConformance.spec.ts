/**
 * UX State Projection — Conformance (C.6)
 * Snapshot immutabile; kill-switch; aggregazione provider; no proprietà operative; separazione; determinismo; title non vuoto.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  UxStateProjectionEngine,
  UX_STATE_COMPONENT_ID,
  type UxStateRegistry,
  type UxStateProjectionProvider,
  type UxStateSnapshot,
  type UxState,
  type UxProjectionInput,
} from '../index';

const UX_STATE_ROOT = join(process.cwd(), 'src', 'messaging-system', 'ux-state');

const FORBIDDEN_STATE_KEYS = [
  'action',
  'command',
  'execute',
  'trigger',
  'retry',
  'priority',
  'score',
  'recommendation',
];
const FORBIDDEN_IMPORTS = ['governance', 'adapter'];

function makeRegistry(enabled: boolean): UxStateRegistry {
  return { [UX_STATE_COMPONENT_ID]: enabled };
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

describe('UX State Projection — Conformance', () => {
  const derivedAt = 1704110400000;

  describe('1. Snapshot immutabile', () => {
    it('snapshot e ogni state sono frozen', () => {
      const provider: UxStateProjectionProvider = {
        id: 'p1',
        project: () =>
          Object.freeze([
            Object.freeze({
              stateId: 's1',
              stateType: 'INFO',
              title: 'Test state',
              derivedAt,
            }),
          ]),
      };
      const engine = new UxStateProjectionEngine([provider]);
      const snapshot = engine.project({}, makeRegistry(true));
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.states)).toBe(true);
      for (const s of snapshot.states) {
        expect(Object.isFrozen(s)).toBe(true);
      }
    });
  });

  describe('2. Kill-switch OFF -> states.length === 0', () => {
    it('con registry OFF lo snapshot ha states []', () => {
      const provider: UxStateProjectionProvider = {
        id: 'p1',
        project: () =>
          Object.freeze([
            Object.freeze({
              stateId: 's1',
              stateType: 'INFO',
              title: 'Visible',
              derivedAt,
            }),
          ]),
      };
      const engine = new UxStateProjectionEngine([provider]);
      const snapshot = engine.project({}, makeRegistry(false));
      expect(snapshot.states.length).toBe(0);
    });
  });

  describe('3. Aggregazione provider', () => {
    it('più provider producono states concatenati', () => {
      const p1: UxStateProjectionProvider = {
        id: 'p1',
        project: () =>
          Object.freeze([
            Object.freeze({ stateId: 'a', stateType: 'INFO', title: 'A', derivedAt }),
          ]),
      };
      const p2: UxStateProjectionProvider = {
        id: 'p2',
        project: () =>
          Object.freeze([
            Object.freeze({ stateId: 'b', stateType: 'SUMMARY_AVAILABLE', title: 'B', derivedAt }),
          ]),
      };
      const engine = new UxStateProjectionEngine([p1, p2]);
      const snapshot = engine.project({}, makeRegistry(true));
      expect(snapshot.states.length).toBe(2);
      expect(snapshot.states[0].stateId).toBe('a');
      expect(snapshot.states[1].stateId).toBe('b');
    });
  });

  describe('4. Assenza proprietà operative', () => {
    it('UxState non ha action, command, execute, trigger, retry, priority, score, recommendation', () => {
      const provider: UxStateProjectionProvider = {
        id: 'p1',
        project: () =>
          Object.freeze([
            Object.freeze({
              stateId: 's1',
              stateType: 'ACTION_PENDING',
              title: 'Pending',
              derivedAt,
            }),
          ]),
      };
      const engine = new UxStateProjectionEngine([provider]);
      const snapshot = engine.project({}, makeRegistry(true));
      for (const s of snapshot.states) {
        for (const key of FORBIDDEN_STATE_KEYS) {
          expect(key in s).toBe(false);
        }
      }
    });
  });

  describe('5. Separazione import', () => {
    it('nessun file in ux-state/ importa da execution engine, governance, adapter', () => {
      const files = collectTsFiles(UX_STATE_ROOT);
      const violations: string[] = [];
      const normalized = (p: string) => p.replace(/\\/g, '/');
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
          const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch) {
            const path = normalized(fromMatch[1]);
            if (FORBIDDEN_IMPORTS.some((f) => path.includes(f))) violations.push(file);
            if (path.includes('/execution/') || path.includes('../execution')) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('6. Determinismo', () => {
    it('stesso input -> stesso numero e stateId di states', () => {
      const provider: UxStateProjectionProvider = {
        id: 'p1',
        project: () =>
          Object.freeze([
            Object.freeze({ stateId: 's1', stateType: 'INFO', title: 'Same', derivedAt }),
          ]),
      };
      const engine = new UxStateProjectionEngine([provider]);
      const input: UxProjectionInput = {};
      const a = engine.project(input, makeRegistry(true));
      const b = engine.project(input, makeRegistry(true));
      expect(a.states.length).toBe(b.states.length);
      expect(a.states.map((s) => s.stateId)).toEqual(b.states.map((s) => s.stateId));
    });
  });

  describe('7. UX State leggibile (title non vuoto)', () => {
    it('ogni state ha title non vuoto', () => {
      const provider: UxStateProjectionProvider = {
        id: 'p1',
        project: () =>
          Object.freeze([
            Object.freeze({
              stateId: 's1',
              stateType: 'DELIVERY_SUCCESS',
              title: 'Message delivered',
              derivedAt,
            }),
          ]),
      };
      const engine = new UxStateProjectionEngine([provider]);
      const snapshot = engine.project({}, makeRegistry(true));
      for (const s of snapshot.states) {
        expect(typeof s.title).toBe('string');
        expect(s.title.length).toBeGreaterThan(0);
      }
    });
  });
});

// UX State Projection e' certificato come layer di sola lettura.
// Traduce lo stato del sistema in informazione per l'utente.
// Non decide, non agisce, non modifica il comportamento del sistema.
