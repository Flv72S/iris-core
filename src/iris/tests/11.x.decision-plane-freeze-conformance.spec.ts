/**
 * IRIS 11.x.F — Decision Plane Freeze Conformance
 * Struttura, assenza azione/raccomandazione, separazione, read-only, kill-switch, non retroazione.
 *
 * IRIS 11.x (Decision Plane) è definitivo e congelato.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisDecisionArtifactEngine,
  IrisDecisionEvaluationEngine,
  IrisDecisionSelectionEngine,
  IRIS_DECISION_COMPONENT_ID,
  type IrisDecisionArtifactSet,
  type IrisDecisionEvaluationSnapshot,
  type IrisDecisionSelectionSnapshot,
  type DecisionRegistry,
} from '../decision';

const DECISION_ROOT = join(process.cwd(), 'src', 'iris', 'decision');

const FORBIDDEN_DIRS = ['execution', 'delivery', 'action', 'trigger', 'bridge'];
const FORBIDDEN_ACTION = ['action', 'execute', 'apply', 'trigger', 'send', 'command'];
const FORBIDDEN_RECOMMENDATION = ['recommendedAction', 'priority', 'score', 'rank', 'confidence'];

function makeRegistry(enabled: boolean): DecisionRegistry {
  return { isEnabled: (id: string) => id === IRIS_DECISION_COMPONENT_ID && enabled };
}

function makeArtifactSet(): IrisDecisionArtifactSet {
  return Object.freeze({
    artifacts: Object.freeze([]),
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

describe('IRIS 11.x.F — Decision Plane freeze conformance', () => {
  describe('1. Struttura', () => {
    it('sotto src/iris/decision/ non esistono directory execution, delivery, action, trigger, bridge', () => {
      const dirs = readdirSync(DECISION_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const forbidden of FORBIDDEN_DIRS) {
        expect(dirs).not.toContain(forbidden);
      }
    });
  });

  describe('2. Assenza azione', () => {
    it('nessuna proprietà action, execute, apply, trigger, send, command nei tipi decision', () => {
      const artifact = Object.freeze({
        id: 'a1',
        decisionType: 't',
        inputs: Object.freeze([]),
        statement: 'x',
        derivedAt: new Date().toISOString(),
      });
      const evaluationNote = Object.freeze({
        id: 'n1',
        artifactId: 'a1',
        evaluationType: 't',
        observation: 'x',
        derivedAt: new Date().toISOString(),
      });
      const selection = Object.freeze({
        selectionId: 's1',
        artifactId: 'a1',
        selectionType: 't',
        justification: 'x',
        derivedAt: new Date().toISOString(),
      });
      const allKeys = [
        ...Object.keys(artifact),
        ...Object.keys(evaluationNote),
        ...Object.keys(selection),
      ];
      for (const key of FORBIDDEN_ACTION) {
        expect(allKeys).not.toContain(key);
      }
    });
  });

  describe('3. Assenza raccomandazione operativa', () => {
    it('nessuna proprietà recommendedAction, priority, score, rank, confidence', () => {
      const selection = Object.freeze({
        selectionId: 's1',
        artifactId: 'a1',
        selectionType: 't',
        justification: 'x',
        derivedAt: new Date().toISOString(),
      });
      const snapshot = Object.freeze({
        selections: Object.freeze([selection]),
        derivedAt: new Date().toISOString(),
      });
      const allKeys = [...Object.keys(selection), ...Object.keys(snapshot)];
      for (const key of FORBIDDEN_RECOMMENDATION) {
        expect(allKeys).not.toContain(key);
      }
    });
  });

  describe('4. Separazione', () => {
    it('nessun import da governance; nessun import di IrisDeliveryEngine o IrisFeedbackEngine', () => {
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

  describe('5. Read-only', () => {
    it('tutti gli snapshot 11.x sono frozen', () => {
      const artifactEngine = new IrisDecisionArtifactEngine([]);
      const artifactSet = makeArtifactSet();
      const artifactResult = artifactEngine.produce({}, makeRegistry(true));
      expect(Object.isFrozen(artifactResult)).toBe(true);
      expect(Object.isFrozen(artifactResult.artifacts)).toBe(true);

      const evaluationEngine = new IrisDecisionEvaluationEngine([]);
      const evaluationSnapshot: IrisDecisionEvaluationSnapshot = Object.freeze({
        notes: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const evalResult = evaluationEngine.evaluate(
        artifactSet,
        makeRegistry(true)
      );
      expect(Object.isFrozen(evalResult)).toBe(true);
      expect(Object.isFrozen(evalResult.notes)).toBe(true);

      const selectionEngine = new IrisDecisionSelectionEngine([]);
      const selectionResult = selectionEngine.select(
        artifactSet,
        undefined,
        makeRegistry(true)
      );
      expect(Object.isFrozen(selectionResult)).toBe(true);
      expect(Object.isFrozen(selectionResult.selections)).toBe(true);
    });
  });

  describe('6. Kill-switch', () => {
    it('registry OFF: artifacts = [], evaluations = [], selections = []', () => {
      const registryOff = makeRegistry(false);
      const artifactEngine = new IrisDecisionArtifactEngine([]);
      const artifactSet = makeArtifactSet();
      const artifactResult = artifactEngine.produce({}, registryOff);
      expect(artifactResult.artifacts).toHaveLength(0);

      const evaluationEngine = new IrisDecisionEvaluationEngine([]);
      const evalSnapshot = Object.freeze({
        notes: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const evalResult = evaluationEngine.evaluate(artifactSet, registryOff);
      expect(evalResult.notes).toHaveLength(0);

      const selectionEngine = new IrisDecisionSelectionEngine([]);
      const selectionResult = selectionEngine.select(
        artifactSet,
        undefined,
        registryOff
      );
      expect(selectionResult.selections).toHaveLength(0);
    });
  });

  describe('7. Non retroazione', () => {
    it('nessun file decision importa engine delivery, feedback o governance', () => {
      const tsFiles = collectTsFiles(DECISION_ROOT);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const has = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /import\s+.*(?:IrisDeliveryEngine|IrisFeedbackEngine)/.test(line) ||
            /from\s+['\"][^'\"]*governance/.test(line);
        });
        if (has) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });
});
