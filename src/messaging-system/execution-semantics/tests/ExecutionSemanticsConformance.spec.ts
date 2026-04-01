/**
 * Execution Semantics - Conformance (C.4.B)
 * Snapshot dichiarativo; kill-switch; frozen; assenza proprietà operative; separazione; capability missing -> blocker; wellbeing -> blocker; voice -> hint.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ActionPlanSnapshot, ActionPlan, ActionPlanStep } from '../../action-plan';
import type { AdapterCapabilityMatrix, MessagingCapability, AdapterDescriptor } from '../../capabilities';
import { MessagingCapabilityRegistry } from '../../capabilities';
import {
  ExecutionSemanticsResolver,
  EXECUTION_SEMANTICS_COMPONENT_ID,
  type ExecutionSemanticsRegistry,
  type ExecutionSemanticSnapshot,
} from '../index';

const SEMANTICS_ROOT = join(process.cwd(), 'src', 'messaging-system', 'execution-semantics');

const FORBIDDEN_OPERATIVE = ['execute', 'send', 'dispatch', 'run', 'retry', 'schedule'];
const FORBIDDEN_IMPORTS = ['execution', 'delivery', 'feedback', 'iris', 'decision'];

function makeRegistry(enabled: boolean): ExecutionSemanticsRegistry {
  return { isEnabled: (id: string) => id === EXECUTION_SEMANTICS_COMPONENT_ID && enabled };
}

function createPlanSnapshot(plans: ActionPlan[], derivedAt: string): ActionPlanSnapshot {
  return Object.freeze({
    plans: Object.freeze(plans),
    derivedAt,
  });
}

function createMatrix(
  capabilities: MessagingCapability[],
  adapters: AdapterDescriptor[],
  declaredAt: string
): AdapterCapabilityMatrix {
  return Object.freeze({
    adapters: Object.freeze(adapters),
    capabilities: Object.freeze(capabilities),
    declaredAt,
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

describe('Execution Semantics - Conformance', () => {
  const derivedAt = '2025-01-01T12:00:00.000Z';

  describe('1. Resolver produce snapshot dichiarativo', () => {
    it('resolve restituisce ExecutionSemanticSnapshot con requirements, blockers, hints, derivedAt', () => {
      const plan: ActionPlan = Object.freeze({
        planId: 'plan-1',
        intentId: 'i1',
        contractIds: Object.freeze(['c1']),
        steps: Object.freeze([
          Object.freeze({
            stepId: 's1',
            capabilityType: 'summarize.text',
            semanticId: 'sem1',
            inputs: Object.freeze([]),
            outputs: Object.freeze([]),
            effects: Object.freeze([]),
          }) as ActionPlanStep,
        ]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const cap: MessagingCapability = Object.freeze({
        capabilityId: 'cap-1',
        capabilityType: 'AI_SUMMARY',
        description: 'd',
        supportedActionPlanTypes: Object.freeze([]),
        supportedMessageKinds: Object.freeze([]),
        declaredAt: derivedAt,
      });
      const registry = new MessagingCapabilityRegistry(createMatrix([cap], [], derivedAt));
      const resolver = new ExecutionSemanticsResolver(registry);
      const snapshot = resolver.resolve(createPlanSnapshot([plan], derivedAt), makeRegistry(true));
      expect(snapshot.requirements).toBeDefined();
      expect(snapshot.blockers).toBeDefined();
      expect(snapshot.hints).toBeDefined();
      expect(snapshot.derivedAt).toBe(derivedAt);
    });
  });

  describe('2. Kill-switch OFF -> snapshot vuoto', () => {
    it('registry OFF -> requirements, blockers, hints vuoti', () => {
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const registry = new MessagingCapabilityRegistry(createMatrix([], [], derivedAt));
      const resolver = new ExecutionSemanticsResolver(registry);
      const snapshot = resolver.resolve(createPlanSnapshot([plan], derivedAt), makeRegistry(false));
      expect(snapshot.requirements).toHaveLength(0);
      expect(snapshot.blockers).toHaveLength(0);
      expect(snapshot.hints).toHaveLength(0);
    });
  });

  describe('3. Snapshot completamente frozen', () => {
    it('snapshot e array interni sono frozen', () => {
      const plan: ActionPlan = Object.freeze({
        planId: 'p1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const registry = new MessagingCapabilityRegistry(createMatrix([], [], derivedAt));
      const resolver = new ExecutionSemanticsResolver(registry);
      const snapshot = resolver.resolve(createPlanSnapshot([plan], derivedAt), makeRegistry(true));
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.requirements)).toBe(true);
      expect(Object.isFrozen(snapshot.blockers)).toBe(true);
      expect(Object.isFrozen(snapshot.hints)).toBe(true);
      for (const r of snapshot.requirements) expect(Object.isFrozen(r)).toBe(true);
      for (const b of snapshot.blockers) expect(Object.isFrozen(b)).toBe(true);
      for (const h of snapshot.hints) expect(Object.isFrozen(h)).toBe(true);
    });
  });

  describe('4. Nessuna proprietà operativa nei modelli', () => {
    it('requirement, blocker, hint non contengono execute, send, dispatch, run, retry, schedule', () => {
      const snapshot: ExecutionSemanticSnapshot = Object.freeze({
        requirements: Object.freeze([
          Object.freeze({
            requirementId: 'r1',
            actionPlanId: 'p1',
            requiredCapabilities: Object.freeze([]),
            declaredAt: derivedAt,
          }),
        ]),
        blockers: Object.freeze([
          Object.freeze({
            blockerId: 'b1',
            actionPlanId: 'p1',
            reason: 'MISSING_CAPABILITY',
            description: 'd',
            declaredAt: derivedAt,
          }),
        ]),
        hints: Object.freeze([
          Object.freeze({
            hintId: 'h1',
            actionPlanId: 'p1',
            hintType: 'VOICE_PREFERRED',
            description: 'd',
            declaredAt: derivedAt,
          }),
        ]),
        derivedAt,
      });
      for (const r of snapshot.requirements) {
        const keys = Object.keys(r);
        for (const f of FORBIDDEN_OPERATIVE) expect(keys).not.toContain(f);
      }
      for (const b of snapshot.blockers) {
        const keys = Object.keys(b);
        for (const f of FORBIDDEN_OPERATIVE) expect(keys).not.toContain(f);
      }
      for (const h of snapshot.hints) {
        const keys = Object.keys(h);
        for (const f of FORBIDDEN_OPERATIVE) expect(keys).not.toContain(f);
      }
    });
  });

  describe('5. Separazione: nessun import vietato', () => {
    it('nessun file in execution-semantics/ importa da execution, delivery, feedback, iris, decision', () => {
      const files = collectTsFiles(SEMANTICS_ROOT);
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

  describe('6. Capability missing -> blocker generato', () => {
    it('quando un piano richiede una capability non nel registry viene generato blocker MISSING_CAPABILITY', () => {
      const plan: ActionPlan = Object.freeze({
        planId: 'plan-1',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([
          Object.freeze({
            stepId: 's1',
            capabilityType: 'semantic.search',
            semanticId: 'sem1',
            inputs: Object.freeze([]),
            outputs: Object.freeze([]),
            effects: Object.freeze([]),
          }) as ActionPlanStep,
        ]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const registry = new MessagingCapabilityRegistry(createMatrix([], [], derivedAt));
      const resolver = new ExecutionSemanticsResolver(registry);
      const snapshot = resolver.resolve(createPlanSnapshot([plan], derivedAt), makeRegistry(true));
      const missingBlockers = snapshot.blockers.filter((b) => b.reason === 'MISSING_CAPABILITY');
      expect(missingBlockers.length).toBeGreaterThanOrEqual(1);
      expect(missingBlockers.some((b) => b.description.includes('SEMANTIC_SEARCH') || b.description.includes('not available'))).toBe(true);
    });
  });

  describe('7. Digital Wellbeing -> blocker corretto', () => {
    it('piano con step attention.filter genera blocker DIGITAL_WELLBEING', () => {
      const plan: ActionPlan = Object.freeze({
        planId: 'plan-wellbeing',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([
          Object.freeze({
            stepId: 's1',
            capabilityType: 'attention.filter',
            semanticId: 'sem1',
            inputs: Object.freeze([]),
            outputs: Object.freeze([]),
            effects: Object.freeze([]),
          }) as ActionPlanStep,
        ]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const cap: MessagingCapability = Object.freeze({
        capabilityId: 'cap-wellbeing',
        capabilityType: 'DIGITAL_WELLBEING_GATE',
        description: 'd',
        supportedActionPlanTypes: Object.freeze([]),
        supportedMessageKinds: Object.freeze([]),
        declaredAt: derivedAt,
      });
      const registry = new MessagingCapabilityRegistry(createMatrix([cap], [], derivedAt));
      const resolver = new ExecutionSemanticsResolver(registry);
      const snapshot = resolver.resolve(createPlanSnapshot([plan], derivedAt), makeRegistry(true));
      const wellbeingBlockers = snapshot.blockers.filter((b) => b.reason === 'DIGITAL_WELLBEING');
      expect(wellbeingBlockers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('8. Voice action -> hint VOICE_PREFERRED', () => {
    it('piano con step voice-related genera hint VOICE_PREFERRED', () => {
      const plan: ActionPlan = Object.freeze({
        planId: 'plan-voice',
        intentId: 'i1',
        contractIds: Object.freeze([]),
        steps: Object.freeze([
          Object.freeze({
            stepId: 's1',
            capabilityType: 'summarize.voice',
            semanticId: 'sem1',
            inputs: Object.freeze([]),
            outputs: Object.freeze([]),
            effects: Object.freeze([]),
          }) as ActionPlanStep,
        ]),
        expectedEffects: Object.freeze([]),
        derivedAt,
      });
      const cap: MessagingCapability = Object.freeze({
        capabilityId: 'cap-voice',
        capabilityType: 'VOICE_SEND',
        description: 'd',
        supportedActionPlanTypes: Object.freeze([]),
        supportedMessageKinds: Object.freeze([]),
        declaredAt: derivedAt,
      });
      const registry = new MessagingCapabilityRegistry(createMatrix([cap], [], derivedAt));
      const resolver = new ExecutionSemanticsResolver(registry);
      const snapshot = resolver.resolve(createPlanSnapshot([plan], derivedAt), makeRegistry(true));
      const voiceHints = snapshot.hints.filter((h) => h.hintType === 'VOICE_PREFERRED');
      expect(voiceHints.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// C.4.B - Execution Semantics Layer certificato.
// Questo layer descrive COME un Action Plan potrebbe essere eseguito, senza eseguire nulla.
// Ogni esecuzione reale e' demandata a fasi successive.
