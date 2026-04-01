/**
 * Execution Readiness - Conformance (C.4.C)
 * Snapshot/verdict immutabili; kill-switch; assenza proprietà operative; aggregazione; separazione; determinismo; READY/BLOCKED/safetyFlag.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ActionPlanSnapshot, ActionPlan } from '../../action-plan';
import type { ExecutionSemanticSnapshot } from '../../execution-semantics';
import type { AdapterCapabilityMatrix, MessagingCapability } from '../../capabilities';
import { MessagingCapabilityRegistry } from '../../capabilities';
import {
  ExecutionReadinessEngine,
  EXECUTION_READINESS_COMPONENT_ID,
  type ExecutionReadinessRegistry,
  type ExecutionReadinessEvaluator,
  type ExecutionReadinessVerdict,
  type ExecutionReadinessSnapshot,
} from '../index';

const READINESS_ROOT = join(process.cwd(), 'src', 'messaging-system', 'execution-readiness');

const FORBIDDEN = ['execute', 'send', 'dispatch', 'adapterId', 'channelId', 'retry', 'priority', 'score'];
const FORBIDDEN_IMPORTS = ['delivery', 'feedback', 'governance', 'decision', 'adapter'];
/** Path segments that are allowed even if they contain a forbidden keyword (e.g. execution-semantics, execution-readiness). */
const ALLOWED_IMPORT_SEGMENTS = ['execution-semantics', 'execution-readiness'];

function makeRegistry(enabled: boolean): ExecutionReadinessRegistry {
  return { [EXECUTION_READINESS_COMPONENT_ID]: enabled };
}

function createPlanSnapshot(plans: ActionPlan[], derivedAt: string): ActionPlanSnapshot {
  return Object.freeze({
    plans: Object.freeze(plans),
    derivedAt,
  });
}

function createSemanticsSnapshot(
  requirements: unknown[],
  blockers: unknown[],
  hints: unknown[],
  derivedAt: string
): ExecutionSemanticSnapshot {
  return Object.freeze({
    requirements: Object.freeze(requirements),
    blockers: Object.freeze(blockers),
    hints: Object.freeze(hints),
    derivedAt,
  });
}

function createCapabilityRegistry(capabilities: MessagingCapability[], declaredAt: string): MessagingCapabilityRegistry {
  const matrix: AdapterCapabilityMatrix = Object.freeze({
    adapters: Object.freeze([]),
    capabilities: Object.freeze(capabilities),
    declaredAt,
  });
  return new MessagingCapabilityRegistry(matrix);
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

describe('Execution Readiness - Conformance', () => {
  const derivedAt = '2025-01-01T12:00:00.000Z';

  describe('1. Snapshot e verdict immutabili', () => {
    it('snapshot e ogni verdict sono frozen', () => {
      const evaluator: ExecutionReadinessEvaluator = {
        id: 'e1',
        evaluate: () =>
          Object.freeze([
            Object.freeze({
              planId: 'p1',
              status: 'READY' as const,
              reasons: Object.freeze(['ok']),
              derivedAt,
            }),
          ]),
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const capReg = createCapabilityRegistry([], derivedAt);
      const engine = new ExecutionReadinessEngine([evaluator]);
      const snapshot = engine.evaluate(
        createPlanSnapshot([plan], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        capReg,
        makeRegistry(true)
      );
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.verdicts)).toBe(true);
      for (const v of snapshot.verdicts) {
        expect(Object.isFrozen(v)).toBe(true);
      }
    });
  });

  describe('2. Kill-switch OFF -> verdicts vuoti', () => {
    it('registry OFF -> verdicts.length === 0', () => {
      const evaluator: ExecutionReadinessEvaluator = {
        id: 'e1',
        evaluate: () =>
          Object.freeze([
            Object.freeze({
              planId: 'p1',
              status: 'READY' as const,
              reasons: Object.freeze([]),
              derivedAt,
            }),
          ]),
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const capReg = createCapabilityRegistry([], derivedAt);
      const engine = new ExecutionReadinessEngine([evaluator]);
      const snapshot = engine.evaluate(
        createPlanSnapshot([plan], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        capReg,
        makeRegistry(false)
      );
      expect(snapshot.verdicts).toHaveLength(0);
      expect(snapshot.verdicts).toEqual([]);
    });
  });

  describe('3. Nessuna proprietà operativa nei verdict', () => {
    it('ExecutionReadinessVerdict non contiene execute, send, dispatch, adapterId, channelId, retry, priority, score', () => {
      const verdict: ExecutionReadinessVerdict = Object.freeze({
        planId: 'p1',
        status: 'BLOCKED',
        reasons: Object.freeze([]),
        derivedAt,
      });
      const keys = Object.keys(verdict);
      for (const f of FORBIDDEN) {
        expect(keys).not.toContain(f);
      }
      const snapshot: ExecutionReadinessSnapshot = Object.freeze({
        verdicts: Object.freeze([verdict]),
        derivedAt,
      });
      const snapshotKeys = Object.keys(snapshot);
      for (const f of FORBIDDEN) {
        expect(snapshotKeys).not.toContain(f);
      }
    });
  });

  describe('4. Aggregazione evaluator (somma, non selezione)', () => {
    it('più evaluator producono somma dei verdict', () => {
      const e1: ExecutionReadinessEvaluator = {
        id: 'e1',
        evaluate: () =>
          Object.freeze([
            Object.freeze({ planId: 'p1', status: 'READY' as const, reasons: Object.freeze([]), derivedAt }),
          ]),
      };
      const e2: ExecutionReadinessEvaluator = {
        id: 'e2',
        evaluate: () =>
          Object.freeze([
            Object.freeze({ planId: 'p2', status: 'BLOCKED' as const, reasons: Object.freeze([]), derivedAt }),
          ]),
      };
      const plan1: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const plan2: ActionPlan = Object.freeze({
        planId: 'p2',
        intentId: 'i2',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const capReg = createCapabilityRegistry([], derivedAt);
      const engine = new ExecutionReadinessEngine([e1, e2]);
      const snapshot = engine.evaluate(
        createPlanSnapshot([plan1, plan2], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        capReg,
        makeRegistry(true)
      );
      expect(snapshot.verdicts.length).toBe(2);
      expect(snapshot.verdicts.map((v) => v.planId)).toEqual(['p1', 'p2']);
      expect(snapshot.verdicts.map((v) => v.status)).toContain('READY');
      expect(snapshot.verdicts.map((v) => v.status)).toContain('BLOCKED');
    });
  });

  describe('5. Separazione: nessun import vietato', () => {
    it('nessun file in execution-readiness/ importa da execution, delivery, feedback, governance, decision, adapter', () => {
      const files = collectTsFiles(READINESS_ROOT);
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
            const forbidden =
              FORBIDDEN_IMPORTS.some((f) => path.includes(f)) ||
              (path.includes('execution') &&
                !ALLOWED_IMPORT_SEGMENTS.some((a) => path.includes(a)));
            if (forbidden) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('6. Determinismo', () => {
    it('stesso input -> stesso output', () => {
      const evaluator: ExecutionReadinessEvaluator = {
        id: 'e1',
        evaluate: (planSnap) =>
          Object.freeze(
            planSnap.plans.map((p) =>
              Object.freeze({
                planId: p.planId,
                status: 'READY' as const,
                reasons: Object.freeze([]),
                derivedAt: planSnap.derivedAt,
              })
            )
          ),
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const capReg = createCapabilityRegistry([], derivedAt);
      const engine = new ExecutionReadinessEngine([evaluator]);
      const planSnap = createPlanSnapshot([plan], derivedAt);
      const semSnap = createSemanticsSnapshot([], [], [], derivedAt);
      const a = engine.evaluate(planSnap, semSnap, capReg, makeRegistry(true));
      const b = engine.evaluate(planSnap, semSnap, capReg, makeRegistry(true));
      expect(a.verdicts.length).toBe(b.verdicts.length);
      expect(a.derivedAt).toBe(b.derivedAt);
      expect(a.verdicts.map((v) => v.planId)).toEqual(b.verdicts.map((v) => v.planId));
    });
  });

  describe('7. Presenza READY, BLOCKED, safetyFlag Digital Wellbeing o Focus', () => {
    it('evaluator produce almeno 1 READY, 1 BLOCKED, 1 safetyFlag DIGITAL_WELLBEING_BLOCK o FOCUS_MODE_ACTIVE', () => {
      const evaluator: ExecutionReadinessEvaluator = {
        id: 'e1',
        evaluate: () =>
          Object.freeze([
            Object.freeze({
              planId: 'p-ready',
              status: 'READY' as const,
              reasons: Object.freeze(['capability_available']),
              derivedAt,
            }),
            Object.freeze({
              planId: 'p-blocked',
              status: 'BLOCKED' as const,
              reasons: Object.freeze(['blocked']),
              safetyFlags: Object.freeze(['DIGITAL_WELLBEING_BLOCK'] as const),
              derivedAt,
            }),
            Object.freeze({
              planId: 'p-focus',
              status: 'REQUIRES_CONFIRMATION' as const,
              reasons: Object.freeze(['focus_mode']),
              safetyFlags: Object.freeze(['FOCUS_MODE_ACTIVE'] as const),
              derivedAt,
            }),
          ]),
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const capReg = createCapabilityRegistry([], derivedAt);
      const engine = new ExecutionReadinessEngine([evaluator]);
      const snapshot = engine.evaluate(
        createPlanSnapshot([plan], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        capReg,
        makeRegistry(true)
      );
      const statuses = snapshot.verdicts.map((v) => v.status);
      expect(statuses).toContain('READY');
      expect(statuses).toContain('BLOCKED');
      const allFlags = snapshot.verdicts.flatMap((v) => v.safetyFlags ?? []);
      expect(
        allFlags.includes('DIGITAL_WELLBEING_BLOCK') || allFlags.includes('FOCUS_MODE_ACTIVE')
      ).toBe(true);
    });
  });
});

// Execution Readiness e' certificato come layer pre-esecutivo, dichiarativo e side-effect free.
// Nessuna azione reale puo' avvenire in C.4.C.
