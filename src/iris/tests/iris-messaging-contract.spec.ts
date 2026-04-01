/**
 * IRIS 11.C — Messaging System Contract conformance
 * Contract espone solo snapshot decisionali; nessuna azione; separazione; immutabilità; kill-switch; nessuna logica decisionale.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisDecisionArtifactEngine,
  IrisDecisionEvaluationEngine,
  IrisDecisionSelectionEngine,
  IRIS_DECISION_COMPONENT_ID,
  type DecisionRegistry,
} from '../decision';
import type { IrisDecisionContract, IrisDecisionContractSnapshot } from '../contract';

const CONTRACT_ROOT = join(process.cwd(), 'src', 'iris', 'contract');

const FORBIDDEN_PROPERTIES = ['action', 'execute', 'send', 'command', 'trigger', 'delivery', 'channel', 'timing', 'retry', 'priority'];

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

describe('IRIS 11.C — Messaging System Contract conformance', () => {
  describe('1. Contract espone solo snapshot decisionali', () => {
    it('il contract contiene solo artifactSet, evaluationSnapshot, selectionSnapshot, derivedAt', () => {
      const contract: IrisDecisionContract = {
        derivedAt: new Date().toISOString(),
      };
      const keys = Object.keys(contract);
      expect(keys).toContain('derivedAt');
      expect(keys.every((k) => ['artifactSet', 'evaluationSnapshot', 'selectionSnapshot', 'derivedAt'].includes(k))).toBe(true);
    });
  });

  describe('2. Nessuna proprietà action, execute, send', () => {
    it('contract e snapshot non contengono action, execute, send, command, trigger', () => {
      const snapshot: IrisDecisionContractSnapshot = Object.freeze({
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(snapshot);
      for (const forbidden of ['action', 'execute', 'send', 'command', 'trigger']) {
        expect(keys).not.toContain(forbidden);
      }
    });
  });

  describe('3. Nessun import da delivery engine o governance', () => {
    it('nessun file contract importa da delivery engine o governance', () => {
      const tsFiles = collectTsFiles(CONTRACT_ROOT);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasGovernance = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /from\s+['\"][^'\"]*governance/.test(line);
        });
        const hasDeliveryEngine = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /import\s+.*IrisDeliveryEngine/.test(line);
        });
        if (hasGovernance || hasDeliveryEngine) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('4. Tutti gli oggetti sono frozen', () => {
    it('contract snapshot e snapshot decisionali embedded sono frozen', () => {
      const artifactEngine = new IrisDecisionArtifactEngine([]);
      const evaluationEngine = new IrisDecisionEvaluationEngine([]);
      const selectionEngine = new IrisDecisionSelectionEngine([]);
      const artifactSet = artifactEngine.produce({}, makeRegistry(true));
      const evaluationSnapshot = evaluationEngine.evaluate(
        Object.freeze({ artifacts: Object.freeze([]), derivedAt: new Date().toISOString() }),
        makeRegistry(true)
      );
      const selectionSnapshot = selectionEngine.select(
        Object.freeze({ artifacts: Object.freeze([]), derivedAt: new Date().toISOString() }),
        undefined,
        makeRegistry(true)
      );
      const contractSnapshot: IrisDecisionContractSnapshot = Object.freeze({
        artifactSet,
        evaluationSnapshot,
        selectionSnapshot,
        derivedAt: new Date().toISOString(),
      });
      expect(Object.isFrozen(contractSnapshot)).toBe(true);
      if (contractSnapshot.artifactSet) expect(Object.isFrozen(contractSnapshot.artifactSet)).toBe(true);
      if (contractSnapshot.evaluationSnapshot) expect(Object.isFrozen(contractSnapshot.evaluationSnapshot)).toBe(true);
      if (contractSnapshot.selectionSnapshot) expect(Object.isFrozen(contractSnapshot.selectionSnapshot)).toBe(true);
    });
  });

  describe('5. Kill-switch OFF → snapshot vuoti', () => {
    it('con registry OFF gli snapshot decisionali sono vuoti e il contract può rifletterli', () => {
      const registryOff = makeRegistry(false);
      const artifactEngine = new IrisDecisionArtifactEngine([]);
      const evaluationEngine = new IrisDecisionEvaluationEngine([]);
      const selectionEngine = new IrisDecisionSelectionEngine([]);
      const emptyArtifactSet = Object.freeze({ artifacts: Object.freeze([]), derivedAt: new Date().toISOString() });
      const artifactResult = artifactEngine.produce({}, registryOff);
      const evaluationResult = evaluationEngine.evaluate(emptyArtifactSet, registryOff);
      const selectionResult = selectionEngine.select(emptyArtifactSet, undefined, registryOff);
      expect(artifactResult.artifacts).toHaveLength(0);
      expect(evaluationResult.notes).toHaveLength(0);
      expect(selectionResult.selections).toHaveLength(0);
      const contractSnapshot: IrisDecisionContractSnapshot = Object.freeze({
        artifactSet: artifactResult,
        evaluationSnapshot: evaluationResult,
        selectionSnapshot: selectionResult,
        derivedAt: new Date().toISOString(),
      });
      expect(contractSnapshot.artifactSet?.artifacts).toHaveLength(0);
      expect(contractSnapshot.evaluationSnapshot?.notes).toHaveLength(0);
      expect(contractSnapshot.selectionSnapshot?.selections).toHaveLength(0);
    });
  });

  describe('6. Messaging System non può inferire azioni dirette', () => {
    it('il contract non espone proprietà che permettano di inferire action, send, trigger', () => {
      const snapshot: IrisDecisionContractSnapshot = Object.freeze({
        artifactSet: Object.freeze({
          artifacts: Object.freeze([
            Object.freeze({
              id: 'a1',
              decisionType: 'declarative',
              inputs: Object.freeze([]),
              statement: 'A declarative statement.',
              derivedAt: new Date().toISOString(),
            }),
          ]),
          derivedAt: new Date().toISOString(),
        }),
        derivedAt: new Date().toISOString(),
      });
      const allKeys = Object.keys(snapshot);
      if (snapshot.artifactSet) {
        for (const a of snapshot.artifactSet.artifacts) {
          for (const key of FORBIDDEN_PROPERTIES) {
            expect(Object.keys(a)).not.toContain(key);
          }
        }
      }
      for (const key of FORBIDDEN_PROPERTIES) {
        expect(allKeys).not.toContain(key);
      }
    });
  });

  describe('7. Il contract non introduce logica decisionale', () => {
    it('il contract è solo aggregazione di snapshot; nessun metodo o funzione operativa', () => {
      const contractModule = join(CONTRACT_ROOT, 'IrisDecisionContract.ts');
      const content = readFileSync(contractModule, 'utf-8');
      expect(content).not.toMatch(/\b(execute|apply|send|trigger|command|deliver)\s*\(/);
      expect(content).not.toMatch(/\b(action|priority|score|rank|recommended)\s*:/);
    });
  });
});
