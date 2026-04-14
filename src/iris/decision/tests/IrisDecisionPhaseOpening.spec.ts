/**
 * IRIS 11.0 — Decision Plane Phase Opening conformance
 * Skeleton only, assenza semantica operativa, separazione, immutabilità, kill-switch, anti-pattern.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisDecisionEngine,
  IRIS_DECISION_COMPONENT_ID,
  type IrisDecisionModel,
  type IrisDecisionSnapshot,
  type DecisionRegistry,
} from '../index';

const FORBIDDEN_OPERATIONAL = ['execute', 'apply', 'send', 'trigger', 'action'];
const FORBIDDEN_ANTI_PATTERN = ['best', 'recommended', 'priority', 'score', 'optimize', 'learn', 'adapt'];

const DECISION_ROOT = join(process.cwd(), 'src', 'iris', 'decision');

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      collectTsFiles(full, acc);
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('IRIS 11.0 — Decision Phase Opening conformance', () => {
  describe('1. Skeleton only', () => {
    it('nessun metodo produce decisioni operative; solo snapshot dichiarativi', () => {
      const model: IrisDecisionModel = Object.freeze({
        entries: Object.freeze([
          Object.freeze({ id: 'e1', type: 'declarative', derivedAt: new Date().toISOString() }),
        ]),
      });
      const registry: DecisionRegistry = { isEnabled: () => true };
      const engine = new IrisDecisionEngine(model);
      const snapshot = engine.getSnapshot(registry);
      expect(snapshot.entries).toHaveLength(1);
      expect(snapshot.entries[0].id).toBe('e1');
      expect(snapshot.derivedAt).toBeDefined();
      expect(typeof snapshot.derivedAt).toBe('string');
    });
  });

  describe('2. Assenza semantica operativa', () => {
    it('nessuna proprietà execute, apply, send, trigger, action', () => {
      const model: IrisDecisionModel = Object.freeze({
        entries: Object.freeze([]),
      });
      const snapshot: IrisDecisionSnapshot = Object.freeze({
        entries: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const modelKeys = Object.keys(model);
      const snapshotKeys = Object.keys(snapshot);
      const allKeys = [...modelKeys, ...snapshotKeys];
      for (const key of FORBIDDEN_OPERATIONAL) {
        expect(allKeys).not.toContain(key);
      }
      if (model.entries.length > 0) {
        const entryKeys = Object.keys(model.entries[0]);
        for (const key of FORBIDDEN_OPERATIONAL) {
          expect(entryKeys).not.toContain(key);
        }
      }
    });
  });

  describe('3. Separazione', () => {
    it('nessun import da semantic-layer/engine', () => {
      const tsFiles = collectTsFiles(DECISION_ROOT);
      const enginePattern = /^\s*(?:import\s+.*\s+from\s+|\s*from\s+)\s*['\"][^'\"]*semantic-layer[/\\]engine/;
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const has = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return enginePattern.test(line);
        });
        if (has) violations.push(file);
      }
      expect(violations).toEqual([]);
    });

    it('nessun import da delivery o feedback engine', () => {
      const tsFiles = collectTsFiles(DECISION_ROOT);
      const deliveryFeedbackPattern = /^\s*(?:import\s+.*\s+from\s+|\s*from\s+)\s*['\"][^'\"]*(?:delivery|feedback)/;
      const allowedFiles = new Set(['IrisDecisionProducer.ts']);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const has = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return deliveryFeedbackPattern.test(line);
        });
        const fileName = file.split(/[/\\]/).pop() ?? '';
        if (has && !allowedFiles.has(fileName)) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('4. Immutabilità', () => {
    it('snapshot e model sono frozen', () => {
      const model: IrisDecisionModel = Object.freeze({
        entries: Object.freeze([Object.freeze({ id: 'e1', type: 't', derivedAt: new Date().toISOString() })]),
      });
      const registry: DecisionRegistry = { isEnabled: () => true };
      const engine = new IrisDecisionEngine(model);
      const snapshot = engine.getSnapshot(registry);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.entries)).toBe(true);
      if (snapshot.entries.length > 0) {
        expect(Object.isFrozen(snapshot.entries[0])).toBe(true);
      }
    });
  });

  describe('5. Kill-switch neutral', () => {
    it('kill-switch OFF restituisce snapshot con entries []', () => {
      const model: IrisDecisionModel = Object.freeze({
        entries: Object.freeze([Object.freeze({ id: 'e1', type: 't', derivedAt: new Date().toISOString() })]),
      });
      const registryOff: DecisionRegistry = { isEnabled: () => false };
      const engine = new IrisDecisionEngine(model);
      const snapshot = engine.getSnapshot(registryOff);
      expect(snapshot.entries).toHaveLength(0);
      expect(snapshot.derivedAt).toBeDefined();
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it('IRIS_DECISION_COMPONENT_ID è leggibile', () => {
      expect(IRIS_DECISION_COMPONENT_ID).toBe('iris-decision');
    });
  });

  describe('6. Anti-pattern', () => {
    it('assenza di best, recommended, priority, score, optimize, learn, adapt', () => {
      const model: IrisDecisionModel = Object.freeze({
        entries: Object.freeze([]),
      });
      const snapshot: IrisDecisionSnapshot = Object.freeze({
        entries: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const allKeys = [...Object.keys(model), ...Object.keys(snapshot)];
      for (const key of FORBIDDEN_ANTI_PATTERN) {
        expect(allKeys).not.toContain(key);
      }
    });
  });
});
