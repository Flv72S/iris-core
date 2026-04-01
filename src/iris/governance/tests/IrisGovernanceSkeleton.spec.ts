/**
 * IRIS 10.0 — Governance skeleton conformance
 * Assenza decisione, separazione da semantic-layer/engine, read-only, skeleton only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisGovernanceEngine,
  type IrisGovernanceModel,
  type IrisGovernanceSnapshot,
  type IrisGovernanceRegistry,
} from '../index';

const FORBIDDEN_DECISION = ['decision', 'final', 'best', 'chosen', 'recommended'];
const FORBIDDEN_ANTI_PATTERN = [
  'intelligentGovernance',
  'optimalConfig',
  'systemChooses',
  'decisionPolicy',
  'autoTuning',
  'adaptiveConfiguration',
];

const GOVERNANCE_ROOT = join(process.cwd(), 'src', 'iris', 'governance');

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

describe('IRIS 10.0 — Governance skeleton conformance', () => {
  describe('1. Assenza decisione', () => {
    it('IrisGovernanceModel e IrisGovernanceSnapshot non espongono proprietà decisionali', () => {
      const model: IrisGovernanceModel = Object.freeze({
        version: '1.0',
        components: Object.freeze([Object.freeze({ componentId: 'iris-orchestration', enabled: true })]),
      });
      const snapshot: IrisGovernanceSnapshot = Object.freeze({
        version: '1.0',
        components: model.components,
        derivedAt: new Date().toISOString(),
      });
      const modelKeys = Object.keys(model);
      const snapshotKeys = Object.keys(snapshot);
      for (const key of FORBIDDEN_DECISION) {
        expect(modelKeys).not.toContain(key);
        expect(snapshotKeys).not.toContain(key);
      }
    });

    it('nessun anti-pattern: Governance intelligente, Configurazione ottimale, Sistema sceglie, Decision policy, Auto-tuning, Adaptive configuration', () => {
      const model: IrisGovernanceModel = Object.freeze({
        components: Object.freeze([]),
      });
      const snapshot: IrisGovernanceSnapshot = Object.freeze({
        components: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const allKeys = [...Object.keys(model), ...Object.keys(snapshot)];
      for (const key of FORBIDDEN_ANTI_PATTERN) {
        expect(allKeys).not.toContain(key);
      }
    });
  });

  describe('2. Separazione', () => {
    it('nessun file governance importa direttamente da semantic-layer/engine', () => {
      const tsFiles = collectTsFiles(GOVERNANCE_ROOT);
      const engineImportLinePattern = /(?:^import\s|^\s*from\s+['\"])[^'\n]*semantic-layer[/\\]engine/;
      const violations: string[] = [];

      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDirect = lines.some((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return engineImportLinePattern.test(line);
        });
        if (hasDirect) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('3. Read-only', () => {
    it('governance non modifica oggetti IRIS 9.x passati come input', () => {
      const model: IrisGovernanceModel = Object.freeze({
        components: Object.freeze([Object.freeze({ componentId: 'iris-rendering', enabled: false })]),
      });
      const engine = new IrisGovernanceEngine(model);
      const snapshot = engine.getSnapshot();
      expect(model.components).toHaveLength(1);
      expect(Object.isFrozen(model)).toBe(true);
      expect(snapshot.components[0].enabled).toBe(false);
    });
  });

  describe('4. Skeleton only', () => {
    it('engine getSnapshot restituisce output frozen senza logica decisionale', () => {
      const model: IrisGovernanceModel = Object.freeze({
        version: '10.0',
        components: Object.freeze([
          Object.freeze({ componentId: 'a', enabled: true }),
          Object.freeze({ componentId: 'b', enabled: false }),
        ]),
      });
      const engine = new IrisGovernanceEngine(model);
      const snapshot = engine.getSnapshot();

      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.components)).toBe(true);
      expect(snapshot.components).toHaveLength(2);
      expect(snapshot.version).toBe('10.0');
      expect(snapshot.derivedAt).toBeDefined();
      expect(typeof snapshot.derivedAt).toBe('string');
    });

    it('IrisGovernanceRegistry è solo interfaccia read-only (isEnabled)', () => {
      const registry: IrisGovernanceRegistry = {
        isEnabled: (id: string) => id === 'iris-orchestration',
      };
      expect(registry.isEnabled('iris-orchestration')).toBe(true);
      expect(registry.isEnabled('other')).toBe(false);
    });
  });
});
