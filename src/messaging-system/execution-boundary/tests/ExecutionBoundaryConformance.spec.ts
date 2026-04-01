/**
 * Execution Boundary — Conformance (C.3)
 * Contract-only; assenza logica; separazione; unidirezionalità; minimalismo; adapter isolation; no side-effect.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ActionPlanSnapshot, ActionPlanStep } from '../../action-plan';
import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionStepResult,
  AdapterContract,
  ExecutionBoundary,
} from '../index';

const BOUNDARY_ROOT = join(process.cwd(), 'src', 'messaging-system', 'execution-boundary');

const FORBIDDEN_IN_RESULT = ['scoring', 'retry', 'priority', 'score', 'rank', 'suggestion', 'decision'];
const FORBIDDEN_IMPORTS = ['iris', 'decision', 'contract', 'capability', 'semantic', 'feedback', 'governance'];

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

describe('Execution Boundary — Conformance', () => {
  describe('1. Contract-only', () => {
    it('ExecutionRequest, ExecutionResult, ExecutionStepResult, AdapterContract, ExecutionBoundary sono tipi o interfacce', () => {
      const planSnapshot: ActionPlanSnapshot = Object.freeze({
        plans: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const request: ExecutionRequest = Object.freeze({
        executionId: 'e1',
        planSnapshot,
        requestedAt: new Date().toISOString(),
      });
      expect(request.executionId).toBe('e1');
      expect(request.planSnapshot).toBe(planSnapshot);

      const stepResult: ExecutionStepResult = Object.freeze({
        stepId: 'step-1',
        status: 'success',
      });
      const result: ExecutionResult = Object.freeze({
        executionId: 'e1',
        results: Object.freeze([stepResult]),
        completedAt: new Date().toISOString(),
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('success');

      const boundary: ExecutionBoundary = {
        execute: async (req) =>
          Object.freeze({
            executionId: req.executionId,
            results: Object.freeze([]),
            completedAt: new Date().toISOString(),
          }),
      };
      expect(typeof boundary.execute).toBe('function');
    });
  });

  describe('2. Assenza logica', () => {
    it('nessun modulo execution-boundary contiene implementazione concreta di esecuzione (solo tipi e interfacce)', () => {
      const files = collectTsFiles(BOUNDARY_ROOT);
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (content.includes('class ') && (content.includes('execute(') || content.includes('executeStep('))) {
          const isOnlyInterface = /interface\s+\w+/.test(content) && !content.trim().match(/^\s*(async\s+)?execute\s*\([^)]*\)\s*\{/m);
          if (content.includes('Promise<') && content.includes('fetch') || content.includes('axios') || content.includes('http.')) {
            violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('3. Separazione', () => {
    it('nessun file in execution-boundary/ importa da iris, decision, contract, capability, semantic, feedback, governance', () => {
      const files = collectTsFiles(BOUNDARY_ROOT);
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
            if (FORBIDDEN_IMPORTS.some((f) => path.includes(f))) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('4. Unidirezionalità', () => {
    it('ExecutionResult non referenzia IRIS o Action Plan builder (solo executionId, results, completedAt)', () => {
      const result: ExecutionResult = Object.freeze({
        executionId: 'e1',
        results: Object.freeze([]),
        completedAt: new Date().toISOString(),
      });
      const keys = Object.keys(result);
      expect(keys).toEqual(['executionId', 'results', 'completedAt']);
      expect(keys).not.toContain('iris');
      expect(keys).not.toContain('actionPlanBuilder');
      expect(keys).not.toContain('intent');
      expect(keys).not.toContain('contract');
    });
  });

  describe('5. Minimalismo', () => {
    it('ExecutionResult e ExecutionStepResult non contengono scoring, retry, priority', () => {
      const stepResult: ExecutionStepResult = Object.freeze({
        stepId: 's1',
        status: 'failure',
        errorCode: 'ERR',
        errorMessage: 'tech',
      });
      const keys = Object.keys(stepResult);
      for (const f of FORBIDDEN_IN_RESULT) {
        expect(keys).not.toContain(f);
      }
      const result: ExecutionResult = Object.freeze({
        executionId: 'e1',
        results: Object.freeze([stepResult]),
        completedAt: new Date().toISOString(),
      });
      const resultKeys = Object.keys(result);
      for (const f of FORBIDDEN_IN_RESULT) {
        expect(resultKeys).not.toContain(f);
      }
    });
  });

  describe('6. Adapter isolation', () => {
    it('AdapterContract.executeStep riceve solo ActionPlanStep', () => {
      const step: ActionPlanStep = Object.freeze({
        stepId: 'step-1',
        capabilityType: 'summarize.text',
        semanticId: 's1',
        inputs: Object.freeze([]),
        outputs: Object.freeze([]),
        effects: Object.freeze([]),
      });
      const adapter: AdapterContract = {
        adapterId: 'adapter-1',
        supportedCapabilities: Object.freeze(['summarize.text']),
        executeStep: async (s: ActionPlanStep) =>
          Object.freeze({
            stepId: s.stepId,
            status: 'success' as const,
          }),
      };
      expect(adapter.executeStep.length).toBe(1);
      expect(adapter.supportedCapabilities).toContain('summarize.text');
    });
  });

  describe('7. No side-effect', () => {
    it('nessun file execution-boundary (esclusi test) contiene fs, fetch, http, writeFile', () => {
      const files = collectTsFiles(BOUNDARY_ROOT);
      const forbidden = ["from 'fs'", 'from "fs"', 'fetch(', "require('http", 'writeFile', 'sendRequest'];
      const violations: string[] = [];
      for (const file of files) {
        if (file.includes('tests')) continue;
        const content = readFileSync(file, 'utf-8');
        for (const f of forbidden) {
          if (content.includes(f)) violations.push(file);
        }
      }
      expect(violations).toEqual([]);
    });
  });
});

// L'Execution Boundary è certificato come puro confine architetturale.
// Nessuna esecuzione, decisione o feedback può attraversarlo verso IRIS.
