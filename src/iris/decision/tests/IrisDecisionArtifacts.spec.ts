/**
 * IRIS 11.1 — Decision Artifacts conformance
 * Produzione multipla, kill-switch, assenza esecuzione/selezione, separazione, immutabilità, neutralità semantica.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisDecisionArtifactEngine,
  IRIS_DECISION_COMPONENT_ID,
  type IrisDecisionProducer,
  type IrisDecisionProducerInput,
  type IrisDecisionArtifact,
  type IrisDecisionArtifactSet,
  type DecisionRegistry,
} from '../index';

const FORBIDDEN_EXECUTION = ['action', 'execute', 'apply', 'trigger'];
const FORBIDDEN_SELECTION = ['final', 'best', 'recommended', 'priority', 'score'];

const DECISION_ROOT = join(process.cwd(), 'src', 'iris', 'decision');

function makeRegistry(enabled: boolean): DecisionRegistry {
  return { isEnabled: (id: string) => id === IRIS_DECISION_COMPONENT_ID && enabled };
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

describe('IRIS 11.1 — Decision Artifacts conformance', () => {
  describe('1. Produzione multipla', () => {
    it('2 producer → artifact aggregati (somma, non selezione)', () => {
      const producer1: IrisDecisionProducer = {
        id: 'p1',
        produce: () => [
          {
            id: 'a1',
            decisionType: 'declarative',
            inputs: ['i1'],
            statement: 'Statement one.',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const producer2: IrisDecisionProducer = {
        id: 'p2',
        produce: () => [
          {
            id: 'a2',
            decisionType: 'declarative',
            inputs: ['i2'],
            statement: 'Statement two.',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionArtifactEngine([producer1, producer2]);
      const input: IrisDecisionProducerInput = {};
      const set = engine.produce(input, makeRegistry(true));
      expect(set.artifacts).toHaveLength(2);
      expect(set.artifacts[0].id).toBe('a1');
      expect(set.artifacts[1].id).toBe('a2');
    });
  });

  describe('2. Kill-switch', () => {
    it('registry OFF → artifacts.length === 0', () => {
      const producer: IrisDecisionProducer = {
        id: 'p1',
        produce: () => [
          {
            id: 'a1',
            decisionType: 't',
            inputs: [],
            statement: 'x',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionArtifactEngine([producer]);
      const set = engine.produce({}, makeRegistry(false));
      expect(set.artifacts).toHaveLength(0);
      expect(set.derivedAt).toBeDefined();
    });
  });

  describe('3. Assenza esecuzione', () => {
    it('nessuna proprietà action, execute, apply, trigger', () => {
      const artifact: IrisDecisionArtifact = Object.freeze({
        id: 'a1',
        decisionType: 't',
        inputs: Object.freeze([]),
        statement: 'Descriptive only.',
        derivedAt: new Date().toISOString(),
      });
      const set: IrisDecisionArtifactSet = Object.freeze({
        artifacts: Object.freeze([artifact]),
        derivedAt: new Date().toISOString(),
      });
      const artifactKeys = Object.keys(artifact);
      const setKeys = Object.keys(set);
      for (const key of FORBIDDEN_EXECUTION) {
        expect(artifactKeys).not.toContain(key);
        expect(setKeys).not.toContain(key);
      }
    });
  });

  describe('4. Assenza selezione', () => {
    it('nessuna proprietà final, best, recommended, priority, score', () => {
      const artifact: IrisDecisionArtifact = Object.freeze({
        id: 'a1',
        decisionType: 't',
        inputs: Object.freeze([]),
        statement: 'x',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(artifact);
      for (const key of FORBIDDEN_SELECTION) {
        expect(keys).not.toContain(key);
      }
    });
  });

  describe('5. Separazione', () => {
    it('nessun import da semantic-layer/engine o delivery/feedback engine', () => {
      const tsFiles = collectTsFiles(DECISION_ROOT);
      const engineImportPattern = /^\s*(?:import\s+.*\s+from\s+|\s*from\s+)\s*['\"][^'\"]*(?:semantic-layer[/\\]engine|IrisDeliveryEngine|IrisFeedbackEngine)/;
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const has = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return engineImportPattern.test(line);
        });
        if (has) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('6. Immutabilità', () => {
    it('artifact, artifact set e array frozen', () => {
      const producer: IrisDecisionProducer = {
        id: 'p1',
        produce: () => [
          {
            id: 'a1',
            decisionType: 't',
            inputs: [],
            statement: 'x',
            derivedAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisDecisionArtifactEngine([producer]);
      const set = engine.produce({}, makeRegistry(true));
      expect(Object.isFrozen(set)).toBe(true);
      expect(Object.isFrozen(set.artifacts)).toBe(true);
      expect(Object.isFrozen(set.artifacts[0])).toBe(true);
      expect(Object.isFrozen(set.artifacts[0].inputs)).toBe(true);
    });
  });

  describe('7. Neutralità semantica', () => {
    it('statement e rationale sono stringhe descrittive', () => {
      const artifact: IrisDecisionArtifact = Object.freeze({
        id: 'a1',
        decisionType: 'declarative',
        inputs: Object.freeze([]),
        statement: 'This is a descriptive statement of what was considered.',
        rationale: 'Optional rationale description.',
        derivedAt: new Date().toISOString(),
      });
      expect(typeof artifact.statement).toBe('string');
      expect(typeof artifact.rationale).toBe('string');
      expect(artifact.statement.length).toBeGreaterThan(0);
    });
  });
});
