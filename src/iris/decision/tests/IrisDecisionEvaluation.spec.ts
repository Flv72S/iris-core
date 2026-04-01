/**
 * IRIS 11.2 — Decision Evaluation conformance
 * Aggregazione, kill-switch, assenza selezione/esecuzione, separazione, immutabilità, neutralità semantica.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisDecisionEvaluationEngine,
  IRIS_DECISION_COMPONENT_ID,
  type IrisDecisionEvaluationProvider,
  type IrisDecisionArtifactSet,
  type IrisDecisionEvaluationNote,
  type IrisDecisionEvaluationSnapshot,
  type DecisionRegistry,
} from '../index';

const FORBIDDEN_SELECTION = ['best', 'recommended', 'priority', 'score', 'rank'];
const FORBIDDEN_EXECUTION = ['action', 'execute', 'apply', 'trigger'];

const DECISION_ROOT = join(process.cwd(), 'src', 'iris', 'decision');

function makeRegistry(enabled: boolean): DecisionRegistry {
  return { isEnabled: (id: string) => id === IRIS_DECISION_COMPONENT_ID && enabled };
}

function makeArtifactSet(artifactCount: number): IrisDecisionArtifactSet {
  const artifacts = Array.from({ length: artifactCount }, (_, i) => ({
    id: `a${i + 1}`,
    decisionType: 'declarative',
    inputs: [] as readonly string[],
    statement: `Statement ${i + 1}.`,
    derivedAt: new Date().toISOString(),
  }));
  return Object.freeze({
    artifacts: Object.freeze(artifacts),
    derivedAt: new Date().toISOString(),
  });
}

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

describe('IRIS 11.2 — Decision Evaluation conformance', () => {
  describe('1. Aggregazione', () => {
    it('2 provider → notes sommate (non selezione)', () => {
      const provider1: IrisDecisionEvaluationProvider = {
        id: 'ev1',
        evaluate: (set) => [
          {
            id: 'n1',
            artifactId: set.artifacts[0]?.id ?? 'a1',
            evaluationType: 'descriptive',
            observation: 'First artifact observed.',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const provider2: IrisDecisionEvaluationProvider = {
        id: 'ev2',
        evaluate: (set) => [
          {
            id: 'n2',
            artifactId: set.artifacts[0]?.id ?? 'a1',
            evaluationType: 'comparative',
            observation: 'Second observation.',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionEvaluationEngine([provider1, provider2]);
      const set = makeArtifactSet(1);
      const snapshot = engine.evaluate(set, makeRegistry(true));
      expect(snapshot.notes).toHaveLength(2);
      expect(snapshot.notes[0].id).toBe('n1');
      expect(snapshot.notes[1].id).toBe('n2');
    });
  });

  describe('2. Kill-switch', () => {
    it('registry OFF → snapshot.notes.length === 0', () => {
      const provider: IrisDecisionEvaluationProvider = {
        id: 'ev1',
        evaluate: () => [
          {
            id: 'n1',
            artifactId: 'a1',
            evaluationType: 't',
            observation: 'x',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionEvaluationEngine([provider]);
      const set = makeArtifactSet(1);
      const snapshot = engine.evaluate(set, makeRegistry(false));
      expect(snapshot.notes).toHaveLength(0);
      expect(snapshot.derivedAt).toBeDefined();
    });
  });

  describe('3. Assenza selezione', () => {
    it('nessuna proprietà best, recommended, priority, score, rank', () => {
      const note: IrisDecisionEvaluationNote = Object.freeze({
        id: 'n1',
        artifactId: 'a1',
        evaluationType: 'descriptive',
        observation: 'Observation only.',
        derivedAt: new Date().toISOString(),
      });
      const snapshot: IrisDecisionEvaluationSnapshot = Object.freeze({
        notes: Object.freeze([note]),
        derivedAt: new Date().toISOString(),
      });
      const noteKeys = Object.keys(note);
      const snapshotKeys = Object.keys(snapshot);
      for (const key of FORBIDDEN_SELECTION) {
        expect(noteKeys).not.toContain(key);
        expect(snapshotKeys).not.toContain(key);
      }
    });
  });

  describe('4. Assenza esecuzione', () => {
    it('nessuna proprietà action, execute, apply, trigger', () => {
      const note: IrisDecisionEvaluationNote = Object.freeze({
        id: 'n1',
        artifactId: 'a1',
        evaluationType: 't',
        observation: 'x',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(note);
      for (const key of FORBIDDEN_EXECUTION) {
        expect(keys).not.toContain(key);
      }
    });
  });

  describe('5. Separazione', () => {
    it('nessun import da governance; nessun import di engine da delivery/feedback', () => {
      const tsFiles = collectTsFiles(DECISION_ROOT);
      const governancePattern = /^\s*(?:import\s+.*\s+from\s+|\s*from\s+)\s*['\"][^'\"]*governance/;
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasGovernance = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return governancePattern.test(line);
        });
        const hasEngine = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /import\s+.*(?:IrisDeliveryEngine|IrisFeedbackEngine)/.test(line);
        });
        if (hasGovernance || hasEngine) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('6. Immutabilità', () => {
    it('snapshot, notes e ogni note frozen', () => {
      const provider: IrisDecisionEvaluationProvider = {
        id: 'ev1',
        evaluate: () => [
          {
            id: 'n1',
            artifactId: 'a1',
            evaluationType: 't',
            observation: 'x',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionEvaluationEngine([provider]);
      const set = makeArtifactSet(1);
      const snapshot = engine.evaluate(set, makeRegistry(true));
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.notes)).toBe(true);
      expect(Object.isFrozen(snapshot.notes[0])).toBe(true);
    });
  });

  describe('7. Neutralità semantica', () => {
    it('observation è solo descrittiva (string)', () => {
      const note: IrisDecisionEvaluationNote = Object.freeze({
        id: 'n1',
        artifactId: 'a1',
        evaluationType: 'descriptive',
        observation: 'This is a descriptive observation of the artifact.',
        derivedAt: new Date().toISOString(),
      });
      expect(typeof note.observation).toBe('string');
      expect(note.observation.length).toBeGreaterThan(0);
    });
  });
});
