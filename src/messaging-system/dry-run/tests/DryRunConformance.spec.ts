/**
 * Dry-Run / Simulation - Conformance (C.4.D)
 * Snapshot/risultati immutabili; kill-switch; no proprietà operative; coerenza readiness; aggregazione; separazione; determinismo; SEND_MESSAGE/BLOCK_ACTION/REQUEST_CONFIRMATION.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ActionPlanSnapshot, ActionPlan } from '../../action-plan';
import type { ExecutionSemanticSnapshot } from '../../execution-semantics';
import type { ExecutionReadinessSnapshot, ExecutionReadinessVerdict } from '../../execution-readiness';
import type { AdapterCapabilityMatrix, MessagingCapability } from '../../capabilities';
import { MessagingCapabilityRegistry } from '../../capabilities';
import {
  DryRunEngine,
  DRY_RUN_COMPONENT_ID,
  type DryRunRegistry,
  type DryRunSimulator,
  type DryRunSnapshot,
  type DryRunResult,
  type DryRunStep,
} from '../index';

const DRY_RUN_ROOT = join(process.cwd(), 'src', 'messaging-system', 'dry-run');

const FORBIDDEN_STEP = [
  'adapterId',
  'channelId',
  'endpoint',
  'retry',
  'execute',
  'dispatch',
];
const FORBIDDEN_IMPORTS = ['delivery', 'feedback', 'governance', 'decision', 'adapter'];
const ALLOWED_IMPORT_SEGMENTS = ['execution-semantics', 'execution-readiness', 'dry-run'];

function makeRegistry(enabled: boolean): DryRunRegistry {
  return { [DRY_RUN_COMPONENT_ID]: enabled };
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

function createReadinessSnapshot(
  verdicts: ExecutionReadinessVerdict[],
  derivedAt: string
): ExecutionReadinessSnapshot {
  return Object.freeze({
    verdicts: Object.freeze(verdicts),
    derivedAt,
  });
}

function createCapabilityRegistry(
  capabilities: MessagingCapability[],
  declaredAt: string
): MessagingCapabilityRegistry {
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

function hasForbiddenStepProperties(step: DryRunStep): boolean {
  return FORBIDDEN_STEP.some((key) => key in step);
}

describe('Dry-Run / Simulation - Conformance', () => {
  const derivedAt = '2025-01-01T12:00:00.000Z';

  describe('1. Snapshot e risultati immutabili', () => {
    it('snapshot e ogni result/step sono frozen', () => {
      const simulator: DryRunSimulator = {
        id: 's1',
        simulate: () =>
          Object.freeze([
            Object.freeze({
              planId: 'p1',
              blocked: false,
              simulatedSteps: Object.freeze([
                Object.freeze({
                  stepId: 'st1',
                  actionType: 'SEND_MESSAGE',
                  description: 'Would send message',
                  relatedPlanId: 'p1',
                }),
              ]),
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
      const readiness = createReadinessSnapshot(
        [
          Object.freeze({
            planId: 'p1',
            status: 'READY' as const,
            reasons: Object.freeze([]),
            derivedAt,
          }),
        ],
        derivedAt
      );
      const engine = new DryRunEngine([simulator]);
      const snapshot = engine.simulate(
        createPlanSnapshot([plan], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        readiness,
        createCapabilityRegistry([], derivedAt),
        makeRegistry(true)
      );
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.results)).toBe(true);
      for (const r of snapshot.results) {
        expect(Object.isFrozen(r)).toBe(true);
        expect(Object.isFrozen(r.simulatedSteps)).toBe(true);
        for (const s of r.simulatedSteps) {
          expect(Object.isFrozen(s)).toBe(true);
        }
      }
    });
  });

  describe('2. Kill-switch OFF -> results vuoti', () => {
    it('con registry OFF lo snapshot ha results []', () => {
      const simulator: DryRunSimulator = {
        id: 's1',
        simulate: () =>
          Object.freeze([
            Object.freeze({
              planId: 'p1',
              blocked: false,
              simulatedSteps: Object.freeze([]),
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
      const readiness = createReadinessSnapshot([], derivedAt);
      const engine = new DryRunEngine([simulator]);
      const snapshot = engine.simulate(
        createPlanSnapshot([plan], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        readiness,
        createCapabilityRegistry([], derivedAt),
        makeRegistry(false)
      );
      expect(snapshot.results).toEqual([]);
    });
  });

  describe('3. Nessuna proprietà operativa nei step', () => {
    it('step e result non espongono adapterId, channelId, endpoint, retry, execute, dispatch', () => {
      const simulator: DryRunSimulator = {
        id: 's1',
        simulate: (_, __, readiness) => {
          const steps: DryRunStep[] = readiness.verdicts.map((v, i) =>
            Object.freeze({
              stepId: `st-${i}`,
              actionType: 'SEND_MESSAGE' as const,
              description: 'Simulated',
              relatedPlanId: v.planId,
            })
          );
          return Object.freeze([
            Object.freeze({
              planId: 'p1',
              blocked: false,
              simulatedSteps: Object.freeze(steps),
            }),
          ]);
        },
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const readiness = createReadinessSnapshot(
        [
          Object.freeze({
            planId: 'p1',
            status: 'READY' as const,
            reasons: Object.freeze([]),
            derivedAt,
          }),
        ],
        derivedAt
      );
      const engine = new DryRunEngine([simulator]);
      const snapshot = engine.simulate(
        createPlanSnapshot([plan], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        readiness,
        createCapabilityRegistry([], derivedAt),
        makeRegistry(true)
      );
      for (const r of snapshot.results) {
        for (const s of r.simulatedSteps) {
          expect(hasForbiddenStepProperties(s)).toBe(false);
        }
      }
    });
  });

  describe('4. Simulazione coerente con readiness (BLOCKED -> blocked)', () => {
    it('verdict BLOCKED produce DryRunResult.blocked true e almeno uno step BLOCK_ACTION', () => {
      const simulator: DryRunSimulator = {
        id: 's1',
        simulate: (planSnap, __, readiness) => {
          return Object.freeze(
            readiness.verdicts.map((v) => {
              const blocked = v.status === 'BLOCKED';
              const steps: DryRunStep[] = blocked
                ? [
                    Object.freeze({
                      stepId: `block-${v.planId}`,
                      actionType: 'BLOCK_ACTION' as const,
                      description: 'Action blocked',
                      relatedPlanId: v.planId,
                      warnings: v.reasons.length ? Object.freeze([...v.reasons]) : undefined,
                    }),
                  ]
                : [];
              return Object.freeze({
                planId: v.planId,
                blocked,
                simulatedSteps: Object.freeze(steps),
                reasons: blocked && v.reasons.length ? Object.freeze([...v.reasons]) : undefined,
              });
            })
          );
        },
      };
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const readiness = createReadinessSnapshot(
        [
          Object.freeze({
            planId: 'p1',
            status: 'BLOCKED' as const,
            reasons: Object.freeze(['digital_wellbeing']),
            derivedAt,
          }),
        ],
        derivedAt
      );
      const engine = new DryRunEngine([simulator]);
      const snapshot = engine.simulate(
        createPlanSnapshot([plan], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        readiness,
        createCapabilityRegistry([], derivedAt),
        makeRegistry(true)
      );
      expect(snapshot.results.length).toBe(1);
      expect(snapshot.results[0].blocked).toBe(true);
      const blockSteps = snapshot.results[0].simulatedSteps.filter(
        (s) => s.actionType === 'BLOCK_ACTION'
      );
      expect(blockSteps.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Aggregazione simulator (non selezione)', () => {
    it('due simulator producono risultati concatenati', () => {
      const s1: DryRunSimulator = {
        id: 's1',
        simulate: (planSnap) =>
          Object.freeze(
            planSnap.plans.map((p) =>
              Object.freeze({
                planId: p.planId,
                blocked: false,
                simulatedSteps: Object.freeze([
                  Object.freeze({
                    stepId: `s1-${p.planId}`,
                    actionType: 'SEND_MESSAGE' as const,
                    description: 'S1',
                    relatedPlanId: p.planId,
                  }),
                ]),
              })
            )
          ),
      };
      const s2: DryRunSimulator = {
        id: 's2',
        simulate: (planSnap) =>
          Object.freeze(
            planSnap.plans.map((p) =>
              Object.freeze({
                planId: p.planId,
                blocked: false,
                simulatedSteps: Object.freeze([
                  Object.freeze({
                    stepId: `s2-${p.planId}`,
                    actionType: 'TRIGGER_AI_PROCESS' as const,
                    description: 'S2',
                    relatedPlanId: p.planId,
                  }),
                ]),
              })
            )
          ),
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
      const readiness = createReadinessSnapshot(
        [
          Object.freeze({ planId: 'p1', status: 'READY' as const, reasons: Object.freeze([]), derivedAt }),
          Object.freeze({ planId: 'p2', status: 'READY' as const, reasons: Object.freeze([]), derivedAt }),
        ],
        derivedAt
      );
      const engine = new DryRunEngine([s1, s2]);
      const snapshot = engine.simulate(
        createPlanSnapshot([plan1, plan2], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        readiness,
        createCapabilityRegistry([], derivedAt),
        makeRegistry(true)
      );
      expect(snapshot.results.length).toBe(4);
      const planIds = snapshot.results.map((r) => r.planId);
      expect(planIds).toContain('p1');
      expect(planIds).toContain('p2');
    });
  });

  describe('6. Separazione: nessun import vietato', () => {
    it('nessun file in dry-run/ importa da execution, delivery, feedback, governance, decision, adapter', () => {
      const files = collectTsFiles(DRY_RUN_ROOT);
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

  describe('7. Determinismo', () => {
    it('stesso input -> stesso output', () => {
      const simulator: DryRunSimulator = {
        id: 's1',
        simulate: (planSnap) =>
          Object.freeze(
            planSnap.plans.map((p) =>
              Object.freeze({
                planId: p.planId,
                blocked: false,
                simulatedSteps: Object.freeze([
                  Object.freeze({
                    stepId: `st-${p.planId}`,
                    actionType: 'SEND_MESSAGE' as const,
                    description: 'Would send',
                    relatedPlanId: p.planId,
                  }),
                ]),
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
      const readiness = createReadinessSnapshot(
        [Object.freeze({ planId: 'p1', status: 'READY' as const, reasons: Object.freeze([]), derivedAt })],
        derivedAt
      );
      const capReg = createCapabilityRegistry([], derivedAt);
      const engine = new DryRunEngine([simulator]);
      const planSnap = createPlanSnapshot([plan], derivedAt);
      const semSnap = createSemanticsSnapshot([], [], [], derivedAt);
      const a = engine.simulate(planSnap, semSnap, readiness, capReg, makeRegistry(true));
      const b = engine.simulate(planSnap, semSnap, readiness, capReg, makeRegistry(true));
      expect(a.results.length).toBe(b.results.length);
      expect(a.derivedAt).toBe(b.derivedAt);
      expect(a.results.map((r) => r.planId)).toEqual(b.results.map((r) => r.planId));
    });
  });

  describe('8. Presenza SEND_MESSAGE/TRIGGER_AI_PROCESS, BLOCK_ACTION, REQUEST_CONFIRMATION', () => {
    it('simulator produce almeno 1 SEND_MESSAGE o TRIGGER_AI_PROCESS, 1 BLOCK_ACTION, 1 REQUEST_CONFIRMATION', () => {
      const simulator: DryRunSimulator = {
        id: 's1',
        simulate: () =>
          Object.freeze([
            Object.freeze({
              planId: 'p-send',
              blocked: false,
              simulatedSteps: Object.freeze([
                Object.freeze({
                  stepId: 'st-send',
                  actionType: 'SEND_MESSAGE' as const,
                  description: 'Would send message',
                  relatedPlanId: 'p-send',
                }),
              ]),
            }),
            Object.freeze({
              planId: 'p-block',
              blocked: true,
              simulatedSteps: Object.freeze([
                Object.freeze({
                  stepId: 'st-block',
                  actionType: 'BLOCK_ACTION' as const,
                  description: 'Blocked',
                  relatedPlanId: 'p-block',
                }),
              ]),
            }),
            Object.freeze({
              planId: 'p-confirm',
              blocked: false,
              simulatedSteps: Object.freeze([
                Object.freeze({
                  stepId: 'st-confirm',
                  actionType: 'REQUEST_CONFIRMATION' as const,
                  description: 'User confirmation required',
                  relatedPlanId: 'p-confirm',
                  requiresConfirmation: true,
                }),
              ]),
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
      const readiness = createReadinessSnapshot([], derivedAt);
      const engine = new DryRunEngine([simulator]);
      const snapshot: DryRunSnapshot = engine.simulate(
        createPlanSnapshot([plan], derivedAt),
        createSemanticsSnapshot([], [], [], derivedAt),
        readiness,
        createCapabilityRegistry([], derivedAt),
        makeRegistry(true)
      );
      const allSteps = snapshot.results.flatMap((r) => r.simulatedSteps);
      const actionTypes = allSteps.map((s) => s.actionType);
      expect(
        actionTypes.includes('SEND_MESSAGE') || actionTypes.includes('TRIGGER_AI_PROCESS')
      ).toBe(true);
      expect(actionTypes.includes('BLOCK_ACTION')).toBe(true);
      expect(actionTypes.includes('REQUEST_CONFIRMATION')).toBe(true);
    });
  });
});

// Il Dry-Run / Simulation Engine e' certificato come
// layer pre-esecutivo, dichiarativo e non operativo.
// Nessuna azione reale puo' avvenire in C.4.D.
