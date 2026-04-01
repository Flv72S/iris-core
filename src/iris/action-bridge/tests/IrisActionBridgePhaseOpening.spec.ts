/**
 * IRIS 12.0 — Action Bridge Phase Opening conformance
 * Skeleton only; kill-switch; aggregazione provider; assenza proprietà operative; separazione; immutabilità; no dipendenza inversa 11.x.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IrisDecisionSelectionSnapshot } from '../../decision';
import {
  IrisActionIntentEngine,
  IRIS_ACTION_BRIDGE_COMPONENT_ID,
  type ActionBridgeRegistry,
  type IrisActionIntent,
  type IrisActionIntentSnapshot,
  type IrisActionIntentProvider,
} from '../index';

const ACTION_BRIDGE_ROOT = join(process.cwd(), 'src', 'iris', 'action-bridge');
const DECISION_ROOT = join(process.cwd(), 'src', 'iris', 'decision');

const FORBIDDEN_OPERATIONAL = ['execute', 'send', 'trigger', 'command'];

function makeRegistry(enabled: boolean): ActionBridgeRegistry {
  return { isEnabled: (id: string) => id === IRIS_ACTION_BRIDGE_COMPONENT_ID && enabled };
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'tests') {
      collectTsFiles(full, acc);
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function createSelectionSnapshot(selections: { selectionId: string }[]): IrisDecisionSelectionSnapshot {
  return Object.freeze({
    selections: Object.freeze(
      selections.map((s) =>
        Object.freeze({
          selectionId: s.selectionId,
          artifactId: 'a1',
          selectionType: 'type',
          justification: 'j',
          derivedAt: new Date().toISOString(),
        })
      )
    ),
    derivedAt: new Date().toISOString(),
  });
}

describe('IRIS 12.0 — Action Bridge Phase Opening', () => {
  describe('1. Skeleton only (nessuna esecuzione)', () => {
    it('engine esiste e derive restituisce snapshot senza eseguire', () => {
      const engine = new IrisActionIntentEngine([]);
      const selection = createSelectionSnapshot([]);
      const snapshot = engine.derive(selection, makeRegistry(true));
      expect(snapshot).toBeDefined();
      expect(snapshot.intents).toEqual([]);
      expect(typeof snapshot.derivedAt).toBe('string');
    });
  });

  describe('2. Kill-switch OFF → intents.length === 0', () => {
    it('con registry OFF il risultato ha intents vuoti', () => {
      const provider: IrisActionIntentProvider = {
        id: 'p1',
        derive: () =>
          Object.freeze([
            Object.freeze({
              intentId: 'i1',
              selectionId: 's1',
              intentType: 'notify',
              description: 'd1',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const engine = new IrisActionIntentEngine([provider]);
      const selection = createSelectionSnapshot([{ selectionId: 's1' }]);
      const snapshot = engine.derive(selection, makeRegistry(false));
      expect(snapshot.intents).toHaveLength(0);
      expect(snapshot.intents).toEqual([]);
    });
  });

  describe('3. Aggregazione provider (somma, non selezione)', () => {
    it('accumula intent di tutti i provider senza deduplicazione', () => {
      const p1: IrisActionIntentProvider = {
        id: 'p1',
        derive: () =>
          Object.freeze([
            Object.freeze({
              intentId: 'i1',
              selectionId: 's1',
              intentType: 'notify',
              description: 'd1',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const p2: IrisActionIntentProvider = {
        id: 'p2',
        derive: () =>
          Object.freeze([
            Object.freeze({
              intentId: 'i2',
              selectionId: 's1',
              intentType: 'request',
              description: 'd2',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const engine = new IrisActionIntentEngine([p1, p2]);
      const selection = createSelectionSnapshot([{ selectionId: 's1' }]);
      const snapshot = engine.derive(selection, makeRegistry(true));
      expect(snapshot.intents).toHaveLength(2);
      expect(snapshot.intents.map((i) => i.intentId)).toEqual(['i1', 'i2']);
    });
  });

  describe('4. Assenza proprietà operative', () => {
    it('IrisActionIntent e snapshot non espongono execute, send, trigger, command', () => {
      const intent: IrisActionIntent = Object.freeze({
        intentId: 'i1',
        selectionId: 's1',
        intentType: 'notify',
        description: 'd1',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(intent);
      for (const forbidden of FORBIDDEN_OPERATIONAL) {
        expect(keys).not.toContain(forbidden);
      }
      const snapshot: IrisActionIntentSnapshot = Object.freeze({
        intents: Object.freeze([intent]),
        derivedAt: new Date().toISOString(),
      });
      const snapshotKeys = Object.keys(snapshot);
      for (const forbidden of FORBIDDEN_OPERATIONAL) {
        expect(snapshotKeys).not.toContain(forbidden);
      }
    });
  });

  describe('5. Separazione (verifica import path)', () => {
    it('nessun file action-bridge importa da delivery, feedback, governance', () => {
      const tsFiles = collectTsFiles(ACTION_BRIDGE_ROOT);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasGovernance = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /from\s+['\"][^'\"]*governance/.test(line);
        });
        const hasDelivery = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /IrisDeliveryEngine|from\s+['\"][^'\"]*delivery/.test(line);
        });
        const hasFeedback = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /IrisFeedbackEngine|from\s+['\"][^'\"]*feedback/.test(line);
        });
        if (hasGovernance || hasDelivery || hasFeedback) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('6. Immutabilità snapshot e intent', () => {
    it('output di derive è frozen; ogni intent è frozen', () => {
      const provider: IrisActionIntentProvider = {
        id: 'p1',
        derive: () =>
          Object.freeze([
            Object.freeze({
              intentId: 'i1',
              selectionId: 's1',
              intentType: 'notify',
              description: 'd1',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const engine = new IrisActionIntentEngine([provider]);
      const selection = createSelectionSnapshot([{ selectionId: 's1' }]);
      const snapshot = engine.derive(selection, makeRegistry(true));
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.intents)).toBe(true);
      for (const intent of snapshot.intents) {
        expect(Object.isFrozen(intent)).toBe(true);
      }
    });
  });

  describe('7. Nessuna dipendenza inversa verso 11.x', () => {
    it('nessun file decision importa da action-bridge', () => {
      const tsFiles = collectTsFiles(DECISION_ROOT);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        if (/from\s+['\"][^'\"]*action-bridge|action-bridge['\"]/.test(content)) {
          violations.push(file);
        }
      }
      expect(violations).toEqual([]);
    });
  });
});
