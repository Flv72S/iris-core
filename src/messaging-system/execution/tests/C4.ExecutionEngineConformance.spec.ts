/**
 * C.4 Execution Engine — Conformance
 * Kill-switch; readiness; no execution without adapter; order; immutability; no forbidden imports; no decision logic; side-effect only here.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ActionPlan, ActionPlanStep } from '../../action-plan';
import type { AdapterContract } from '../../execution-boundary';
import {
  ExecutionEngine,
  EXECUTION_ENGINE_COMPONENT_ID,
  type ExecutionRegistry,
  type ExecutionAdapterRegistry,
  type ExecutableActionPlanSnapshot,
} from '../index';

const EXECUTION_ROOT = join(process.cwd(), 'src', 'messaging-system', 'execution');

const FORBIDDEN_IMPORTS = ['iris', 'decision', 'action-bridge', 'contract', 'feedback', 'governance'];
const FORBIDDEN_DECISION_TERMS = [
  'priority',
  'retry',
  'fallback',
  'score',
  'scoring',
  'learning',
  'closed-loop',
  'scheduling',
];

function makeRegistry(enabled: boolean): ExecutionRegistry {
  return { [EXECUTION_ENGINE_COMPONENT_ID]: enabled };
}

function createExecutablePlan(plan: ActionPlan): ExecutableActionPlanSnapshot {
  return Object.freeze({
    plan: Object.freeze(plan),
    readinessStatus: 'READY',
  });
}

function createStep(stepId: string, capabilityType: string): ActionPlanStep {
  return Object.freeze({
    stepId,
    capabilityType: capabilityType as ActionPlanStep['capabilityType'],
    semanticId: 'sem-1',
    inputs: Object.freeze([]),
    outputs: Object.freeze([]),
    effects: Object.freeze([]),
  });
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

describe('C.4 Execution Engine — Conformance', () => {
  const derivedAt = '2025-01-01T12:00:00.000Z';

  describe('1. Kill-switch', () => {
    it('OFF -> status SKIPPED', async () => {
      const noAdapterRegistry: ExecutionAdapterRegistry = {
        findAdapterForStep: () => null,
        getAdapters: () => [],
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([createStep('s1', 'summarize.text')]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const engine = new ExecutionEngine(noAdapterRegistry);
      const result = await engine.execute(createExecutablePlan(plan), makeRegistry(false));
      expect(result.status).toBe('SKIPPED');
      expect(result.steps).toEqual([]);
      expect(result.planId).toBe('p1');
    });
  });

  describe('2. Readiness enforcement', () => {
    it('readiness != READY -> throw', async () => {
      const noAdapterRegistry: ExecutionAdapterRegistry = {
        findAdapterForStep: () => null,
        getAdapters: () => [],
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const engine = new ExecutionEngine(noAdapterRegistry);
      const notReady = Object.freeze({
        plan: Object.freeze(plan),
        readinessStatus: 'BLOCKED',
      }) as ExecutableActionPlanSnapshot;
      await expect(engine.execute(notReady, makeRegistry(true))).rejects.toThrow(
        /ExecutionReadiness must be READY/
      );
    });
  });

  describe('3. No execution without adapter', () => {
    it('step senza adapter non viene eseguito, risultato step in failure', async () => {
      const emptyRegistry: ExecutionAdapterRegistry = {
        findAdapterForStep: () => null,
        getAdapters: () => [],
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([
          createStep('s1', 'summarize.text'),
          createStep('s2', 'transcribe.voice'),
        ]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const engine = new ExecutionEngine(emptyRegistry);
      const result = await engine.execute(createExecutablePlan(plan), makeRegistry(true));
      expect(result.status).toBe('FAILED');
      expect(result.steps.length).toBe(2);
      expect(result.steps[0].status).toBe('failure');
      expect(result.steps[0].errorMessage).toMatch(/no adapter/i);
      expect(result.steps[1].status).toBe('failure');
    });
  });

  describe('4. Execution order preserved', () => {
    it('gli step sono eseguiti e restituiti nell’ordine del piano', async () => {
      const callOrder: string[] = [];
      const mockAdapter: AdapterContract = {
        adapterId: 'mock',
        supportedCapabilities: ['summarize.text', 'transcribe.voice'],
        executeStep: async (step) => {
          callOrder.push(step.stepId);
          return Object.freeze({
            stepId: step.stepId,
            status: 'success',
          });
        },
      };
      const registry: ExecutionAdapterRegistry = {
        findAdapterForStep: () => mockAdapter,
        getAdapters: () => [mockAdapter],
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([
          createStep('first', 'summarize.text'),
          createStep('second', 'transcribe.voice'),
          createStep('third', 'summarize.text'),
        ]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const engine = new ExecutionEngine(registry);
      const result = await engine.execute(createExecutablePlan(plan), makeRegistry(true));
      expect(result.steps.map((s) => s.stepId)).toEqual(['first', 'second', 'third']);
      expect(callOrder).toEqual(['first', 'second', 'third']);
    });
  });

  describe('5. Result immutability', () => {
    it('ExecutionResult e step sono frozen', async () => {
      const mockAdapter: AdapterContract = {
        adapterId: 'mock',
        supportedCapabilities: ['summarize.text'],
        executeStep: async (step) =>
          Object.freeze({ stepId: step.stepId, status: 'success' }),
      };
      const registry: ExecutionAdapterRegistry = {
        findAdapterForStep: () => mockAdapter,
        getAdapters: () => [mockAdapter],
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([createStep('s1', 'summarize.text')]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const engine = new ExecutionEngine(registry);
      const result = await engine.execute(createExecutablePlan(plan), makeRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.steps)).toBe(true);
      for (const s of result.steps) {
        expect(Object.isFrozen(s)).toBe(true);
      }
    });
  });

  describe('6. No forbidden imports', () => {
    it('nessun file in execution/ importa da iris, decision, action-bridge, contract, feedback, governance', () => {
      const files = collectTsFiles(EXECUTION_ROOT);
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

  describe('7. No decision logic present', () => {
    it('nessun file in execution/ (esclusi test) contiene priority, retry, fallback, score, learning, closed-loop, scheduling nel codice', () => {
      const files = collectTsFiles(EXECUTION_ROOT);
      const violations: string[] = [];
      for (const file of files) {
        let content = readFileSync(file, 'utf-8');
        content = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
        content = content.toLowerCase();
        for (const term of FORBIDDEN_DECISION_TERMS) {
          if (content.includes(term)) violations.push(`${file}: ${term}`);
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('8. Side-effect only here', () => {
    it('invocando execute, l’adapter executeStep viene chiamato (side-effect nel layer execution)', async () => {
      let executed = false;
      const mockAdapter: AdapterContract = {
        adapterId: 'mock',
        supportedCapabilities: ['summarize.text'],
        executeStep: async (step) => {
          executed = true;
          return Object.freeze({ stepId: step.stepId, status: 'success' });
        },
      };
      const registry: ExecutionAdapterRegistry = {
        findAdapterForStep: () => mockAdapter,
        getAdapters: () => [mockAdapter],
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([createStep('s1', 'summarize.text')]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const engine = new ExecutionEngine(registry);
      await engine.execute(createExecutablePlan(plan), makeRegistry(true));
      expect(executed).toBe(true);
    });
  });
});

// Il Execution Engine e' l'unico punto del Messaging System
// autorizzato a produrre side-effect reali.
// Ogni decisione e' esterna e precedente.
// Ogni estensione richiede un nuovo microstep.
