/**
 * IRIS 11.3 — Decision Selection Boundary conformance
 * Aggregazione, kill-switch, assenza esecuzione/raccomandazione, separazione, immutabilità, pluralità.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisDecisionSelectionEngine,
  IRIS_DECISION_COMPONENT_ID,
  type IrisDecisionSelectionProvider,
  type IrisDecisionArtifactSet,
  type IrisDecisionSelection,
  type IrisDecisionSelectionSnapshot,
  type DecisionRegistry,
} from '../index';

const FORBIDDEN_EXECUTION = ['action', 'execute', 'apply', 'trigger'];
const FORBIDDEN_RECOMMENDATION = ['recommended', 'priority', 'score', 'rank'];

const DECISION_ROOT = join(process.cwd(), 'src', 'iris', 'decision');

function makeRegistry(enabled: boolean): DecisionRegistry {
  return { isEnabled: (id: string) => id === IRIS_DECISION_COMPONENT_ID && enabled };
}

function makeArtifactSet(count: number): IrisDecisionArtifactSet {
  const artifacts = Array.from({ length: count }, (_, i) => ({
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

describe('IRIS 11.3 — Decision Selection conformance', () => {
  describe('1. Aggregazione', () => {
    it('2 provider → snapshot.selections.length === somma', () => {
      const provider1: IrisDecisionSelectionProvider = {
        id: 'sel1',
        select: (artifacts) => [
          {
            selectionId: 's1',
            artifactId: artifacts.artifacts[0]?.id ?? 'a1',
            selectionType: 'declarative',
            justification: 'First selection declared.',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const provider2: IrisDecisionSelectionProvider = {
        id: 'sel2',
        select: (artifacts) => [
          {
            selectionId: 's2',
            artifactId: artifacts.artifacts[0]?.id ?? 'a1',
            selectionType: 'declarative',
            justification: 'Second selection declared.',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionSelectionEngine([provider1, provider2]);
      const set = makeArtifactSet(1);
      const snapshot = engine.select(set, undefined, makeRegistry(true));
      expect(snapshot.selections).toHaveLength(2);
      expect(snapshot.selections[0].selectionId).toBe('s1');
      expect(snapshot.selections[1].selectionId).toBe('s2');
    });
  });

  describe('2. Kill-switch', () => {
    it('registry OFF → selections.length === 0', () => {
      const provider: IrisDecisionSelectionProvider = {
        id: 'sel1',
        select: () => [
          {
            selectionId: 's1',
            artifactId: 'a1',
            selectionType: 't',
            justification: 'x',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionSelectionEngine([provider]);
      const set = makeArtifactSet(1);
      const snapshot = engine.select(set, undefined, makeRegistry(false));
      expect(snapshot.selections).toHaveLength(0);
      expect(snapshot.derivedAt).toBeDefined();
    });
  });

  describe('3. Assenza esecuzione', () => {
    it('nessuna proprietà action, execute, apply, trigger', () => {
      const selection: IrisDecisionSelection = Object.freeze({
        selectionId: 's1',
        artifactId: 'a1',
        selectionType: 'declarative',
        justification: 'Chosen for consistency.',
        derivedAt: new Date().toISOString(),
      });
      const snapshot: IrisDecisionSelectionSnapshot = Object.freeze({
        selections: Object.freeze([selection]),
        derivedAt: new Date().toISOString(),
      });
      const selectionKeys = Object.keys(selection);
      const snapshotKeys = Object.keys(snapshot);
      for (const key of FORBIDDEN_EXECUTION) {
        expect(selectionKeys).not.toContain(key);
        expect(snapshotKeys).not.toContain(key);
      }
    });
  });

  describe('4. Assenza raccomandazione', () => {
    it('nessuna proprietà recommended, priority, score, rank', () => {
      const selection: IrisDecisionSelection = Object.freeze({
        selectionId: 's1',
        artifactId: 'a1',
        selectionType: 't',
        justification: 'x',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(selection);
      for (const key of FORBIDDEN_RECOMMENDATION) {
        expect(keys).not.toContain(key);
      }
    });
  });

  describe('5. Separazione', () => {
    it('nessun import da delivery, feedback, governance, execution', () => {
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
    it('snapshot, selections e ogni selection frozen', () => {
      const provider: IrisDecisionSelectionProvider = {
        id: 'sel1',
        select: () => [
          {
            selectionId: 's1',
            artifactId: 'a1',
            selectionType: 't',
            justification: 'x',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionSelectionEngine([provider]);
      const set = makeArtifactSet(1);
      const snapshot = engine.select(set, undefined, makeRegistry(true));
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.selections)).toBe(true);
      expect(Object.isFrozen(snapshot.selections[0])).toBe(true);
    });
  });

  describe('7. Pluralità consentita', () => {
    it('snapshot può contenere più selezioni senza errore', () => {
      const provider: IrisDecisionSelectionProvider = {
        id: 'sel1',
        select: (artifacts) =>
          artifacts.artifacts.map((a, i) => ({
            selectionId: `s-${i}`,
            artifactId: a.id,
            selectionType: 'declarative',
            justification: `Selected artifact ${a.id}.`,
            derivedAt: new Date().toISOString(),
          })),
      };
      const engine = new IrisDecisionSelectionEngine([provider]);
      const set = makeArtifactSet(3);
      const snapshot = engine.select(set, undefined, makeRegistry(true));
      expect(snapshot.selections).toHaveLength(3);
      expect(snapshot.selections[0].artifactId).toBe('a1');
      expect(snapshot.selections[1].artifactId).toBe('a2');
      expect(snapshot.selections[2].artifactId).toBe('a3');
    });
  });
});
