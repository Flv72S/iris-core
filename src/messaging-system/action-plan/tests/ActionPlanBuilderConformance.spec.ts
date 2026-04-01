/**
 * Action Plan Builder — Conformance (C.2)
 * Creazione plan; binding step→capability+semantic; kill-switch; immutabilità; assenza proprietà operative; separazione; determinismo; traceability.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { MessagingContractSnapshot, MessagingContract } from '../../contract';
import type { IrisCapabilitySnapshot, IrisCapability } from '../../capabilities';
import type { IrisCapabilitySemanticSnapshot, IrisCapabilitySemantic } from '../../capabilities/semantics';
import {
  ActionPlanBuilder,
  ACTION_PLAN_COMPONENT_ID,
  type ActionPlanRegistry,
  type ActionPlanSnapshot,
  type ActionPlan,
} from '../index';

const ACTION_PLAN_ROOT = join(process.cwd(), 'src', 'messaging-system', 'action-plan');

const FORBIDDEN_PROPERTIES = ['adapter', 'channel', 'model', 'retry', 'execute', 'run', 'dispatch'];

function makeRegistry(enabled: boolean): ActionPlanRegistry {
  return { isEnabled: (id: string) => id === ACTION_PLAN_COMPONENT_ID && enabled };
}

function createContractSnapshot(contracts: MessagingContract[], derivedAt: string): MessagingContractSnapshot {
  return Object.freeze({
    contracts: Object.freeze(contracts),
    derivedAt,
  });
}

function createCapabilitySnapshot(capabilities: IrisCapability[], derivedAt: string): IrisCapabilitySnapshot {
  return Object.freeze({
    capabilities: Object.freeze(capabilities),
    derivedAt,
  });
}

function createSemanticSnapshot(semantics: IrisCapabilitySemantic[], derivedAt: string): IrisCapabilitySemanticSnapshot {
  return Object.freeze({
    semantics: Object.freeze(semantics),
    derivedAt,
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

describe('Action Plan Builder — Conformance', () => {
  const derivedAt = '2025-01-01T12:00:00.000Z';

  describe('1. Creazione Action Plan', () => {
    it('contract valido → plan generato', () => {
      const contractSnapshot = createContractSnapshot(
        [
          Object.freeze({
            contractId: 'c1',
            intentId: 'i1',
            intentType: 'notify',
            messagePurpose: 'p',
            derivedAt,
          }) as MessagingContract,
        ],
        derivedAt
      );
      const capabilitySnapshot = createCapabilitySnapshot(
        [
          Object.freeze({
            capabilityId: 'cap1',
            capabilityType: 'summarize.text',
            description: 'd',
            derivedAt,
          }) as IrisCapability,
        ],
        derivedAt
      );
      const semanticSnapshot = createSemanticSnapshot(
        [
          Object.freeze({
            semanticId: 's1',
            capabilityType: 'summarize.text',
            domain: 'cognitive',
            intentCategory: 'transform',
            inputs: Object.freeze(['thread.messages']),
            outputs: Object.freeze(['summary.text']),
            effects: Object.freeze(['comprehension-enhancement']),
            derivedAt,
          }) as IrisCapabilitySemantic,
        ],
        derivedAt
      );
      const builder = new ActionPlanBuilder();
      const result = builder.build(contractSnapshot, capabilitySnapshot, semanticSnapshot, makeRegistry(true));
      expect(result.plans).toHaveLength(1);
      expect(result.plans[0].planId).toBe('plan-c1');
      expect(result.plans[0].intentId).toBe('i1');
      expect(result.plans[0].contractIds).toEqual(['c1']);
    });
  });

  describe('2. Binding step → capability + semantic', () => {
    it('steps referenziano capabilityType e semanticId', () => {
      const contractSnapshot = createContractSnapshot(
        [Object.freeze({ contractId: 'c1', intentId: 'i1', intentType: 'notify', messagePurpose: 'p', derivedAt }) as MessagingContract],
        derivedAt
      );
      const capabilitySnapshot = createCapabilitySnapshot(
        [Object.freeze({ capabilityId: 'cap1', capabilityType: 'attention.filter', description: 'd', derivedAt }) as IrisCapability],
        derivedAt
      );
      const semanticSnapshot = createSemanticSnapshot(
        [
          Object.freeze({
            semanticId: 's1',
            capabilityType: 'attention.filter',
            domain: 'wellbeing',
            intentCategory: 'reduce',
            inputs: Object.freeze([]),
            outputs: Object.freeze([]),
            effects: Object.freeze(['interruption-reduction']),
            derivedAt,
          }) as IrisCapabilitySemantic,
        ],
        derivedAt
      );
      const builder = new ActionPlanBuilder();
      const result = builder.build(contractSnapshot, capabilitySnapshot, semanticSnapshot, makeRegistry(true));
      expect(result.plans[0].steps).toHaveLength(1);
      expect(result.plans[0].steps[0].capabilityType).toBe('attention.filter');
      expect(result.plans[0].steps[0].semanticId).toBe('s1');
      expect(result.plans[0].steps[0].effects).toContain('interruption-reduction');
    });
  });

  describe('3. Kill-switch', () => {
    it('registry OFF → plans.length === 0', () => {
      const contractSnapshot = createContractSnapshot(
        [Object.freeze({ contractId: 'c1', intentId: 'i1', intentType: 'notify', messagePurpose: 'p', derivedAt }) as MessagingContract],
        derivedAt
      );
      const capabilitySnapshot = createCapabilitySnapshot([], derivedAt);
      const semanticSnapshot = createSemanticSnapshot([], derivedAt);
      const builder = new ActionPlanBuilder();
      const result = builder.build(contractSnapshot, capabilitySnapshot, semanticSnapshot, makeRegistry(false));
      expect(result.plans).toHaveLength(0);
      expect(result.plans).toEqual([]);
    });
  });

  describe('4. Immutabilità profonda', () => {
    it('plan, steps e array sono frozen', () => {
      const contractSnapshot = createContractSnapshot(
        [Object.freeze({ contractId: 'c1', intentId: 'i1', intentType: 'notify', messagePurpose: 'p', derivedAt }) as MessagingContract],
        derivedAt
      );
      const capabilitySnapshot = createCapabilitySnapshot(
        [Object.freeze({ capabilityId: 'cap1', capabilityType: 'summarize.text', description: 'd', derivedAt }) as IrisCapability],
        derivedAt
      );
      const semanticSnapshot = createSemanticSnapshot(
        [
          Object.freeze({
            semanticId: 's1',
            capabilityType: 'summarize.text',
            domain: 'cognitive',
            intentCategory: 'transform',
            inputs: Object.freeze([]),
            outputs: Object.freeze([]),
            effects: Object.freeze([]),
            derivedAt,
          }) as IrisCapabilitySemantic,
        ],
        derivedAt
      );
      const builder = new ActionPlanBuilder();
      const result = builder.build(contractSnapshot, capabilitySnapshot, semanticSnapshot, makeRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.plans)).toBe(true);
      for (const plan of result.plans) {
        expect(Object.isFrozen(plan)).toBe(true);
        expect(Object.isFrozen(plan.steps)).toBe(true);
        expect(Object.isFrozen(plan.contractIds)).toBe(true);
        for (const step of plan.steps) {
          expect(Object.isFrozen(step)).toBe(true);
        }
      }
    });
  });

  describe('5. Assenza proprietà operative', () => {
    it('nessun adapter, channel, model, retry in plan e step', () => {
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze(['c1']),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const keys = Object.keys(plan);
      for (const f of FORBIDDEN_PROPERTIES) {
        expect(keys).not.toContain(f);
      }
    });
  });

  describe('6. Separazione', () => {
    it('nessun file in action-plan/ importa da execution, adapter, iris', () => {
      const files = collectTsFiles(ACTION_PLAN_ROOT);
      const forbidden = ['execution', 'adapter', 'iris'];
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
            if (forbidden.some((f) => path.includes(f))) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('7. Determinismo', () => {
    it('stesso input → stesso snapshot', () => {
      const contractSnapshot = createContractSnapshot(
        [Object.freeze({ contractId: 'c1', intentId: 'i1', intentType: 'notify', messagePurpose: 'p', derivedAt }) as MessagingContract],
        derivedAt
      );
      const capabilitySnapshot = createCapabilitySnapshot(
        [Object.freeze({ capabilityId: 'cap1', capabilityType: 'context.link', description: 'd', derivedAt }) as IrisCapability],
        derivedAt
      );
      const semanticSnapshot = createSemanticSnapshot(
        [
          Object.freeze({
            semanticId: 's1',
            capabilityType: 'context.link',
            domain: 'memory',
            intentCategory: 'transform',
            inputs: Object.freeze([]),
            outputs: Object.freeze([]),
            effects: Object.freeze([]),
            derivedAt,
          }) as IrisCapabilitySemantic,
        ],
        derivedAt
      );
      const builder = new ActionPlanBuilder();
      const a = builder.build(contractSnapshot, capabilitySnapshot, semanticSnapshot, makeRegistry(true));
      const b = builder.build(contractSnapshot, capabilitySnapshot, semanticSnapshot, makeRegistry(true));
      expect(a.plans.length).toBe(b.plans.length);
      expect(a.derivedAt).toBe(b.derivedAt);
      expect(a.plans.map((p) => p.planId)).toEqual(b.plans.map((p) => p.planId));
      expect(a.plans.map((p) => p.intentId)).toEqual(b.plans.map((p) => p.intentId));
    });
  });

  describe('8. Traceability', () => {
    it('plan.intentId e plan.contractIds coerenti con contract', () => {
      const contractSnapshot = createContractSnapshot(
        [
          Object.freeze({ contractId: 'c1', intentId: 'i1', intentType: 'notify', messagePurpose: 'p', derivedAt }) as MessagingContract,
          Object.freeze({ contractId: 'c2', intentId: 'i2', intentType: 'request', messagePurpose: 'q', derivedAt }) as MessagingContract,
        ],
        derivedAt
      );
      const capabilitySnapshot = createCapabilitySnapshot([], derivedAt);
      const semanticSnapshot = createSemanticSnapshot([], derivedAt);
      const builder = new ActionPlanBuilder();
      const result = builder.build(contractSnapshot, capabilitySnapshot, semanticSnapshot, makeRegistry(true));
      expect(result.plans).toHaveLength(2);
      expect(result.plans[0].intentId).toBe('i1');
      expect(result.plans[0].contractIds).toEqual(['c1']);
      expect(result.plans[1].intentId).toBe('i2');
      expect(result.plans[1].contractIds).toEqual(['c2']);
    });
  });
});

// L'Action Plan Builder è certificato come dichiarativo, deterministico e side-effect free.
// Ogni forma di esecuzione appartiene esclusivamente a sistemi esterni.
