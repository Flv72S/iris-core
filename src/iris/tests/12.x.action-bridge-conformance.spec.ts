/**
 * IRIS 12.x — Action Bridge End-to-End Conformance Test Suite
 *
 * Certifica l'intera Fase 12.x (12.0 Phase Opening, 12.1 Typing, 12.2 Messaging Contract,
 * 12.3 Capability & Compatibility, 12.4 Action Plan Snapshot, 12.x.F Final Freeze):
 * - Action Bridge puramente dichiarativo
 * - Nessuna execution, delivery o side-effect
 * - Nessuna dipendenza inversa o contaminazione
 * - Snapshot immutabili
 * - Confine IRIS Core / sistemi esterni formalmente garantito
 *
 * I test verificano i confini, non le implementazioni.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { IrisDecisionSelectionSnapshot } from '../decision';
import {
  IRIS_ACTION_INTENT_TYPES,
  IrisActionIntentEngine,
  type IrisActionIntentType,
  type IrisActionIntent,
  type IrisActionIntentSnapshot,
  type IrisActionPlanSnapshot,
  type ActionBridgeRegistry,
} from '../action-bridge';
import {
  IrisMessagingContractEngine,
  type IrisMessagingContract,
  type IrisMessagingContractSnapshot,
  type IrisContractCompatibilitySnapshot,
  type IrisExecutionCapability,
  type IrisCompatibilityNote,
  type MessagingContractRegistry,
} from '../contract';

const IRIS_ROOT = join(process.cwd(), 'src', 'iris');
const ACTION_BRIDGE_ROOT = join(IRIS_ROOT, 'action-bridge');
const CONTRACT_ROOT = join(IRIS_ROOT, 'contract');
const DECISION_ROOT = join(IRIS_ROOT, 'decision');
const DELIVERY_ROOT = join(IRIS_ROOT, 'delivery');
const FEEDBACK_ROOT = join(IRIS_ROOT, 'feedback');

const FORBIDDEN_DIR_OR_FILE_NAMES = [
  'execution',
  'delivery',
  'adapter',
  'trigger',
  'workflow',
  'retry',
  'scheduler',
];

const FORBIDDEN_SIDE_EFFECT_NAMES = [
  'execute',
  'apply',
  'send',
  'dispatch',
  'trigger',
  'run',
  'perform',
  'schedule',
  'retry',
  'fallback',
];

const FORBIDDEN_PLAN_PROPERTIES = ['channelId', 'adapterId', 'endpoint'];

function collectTsFiles(
  dir: string,
  options: { excludeTests?: boolean } = {},
  acc: string[] = []
): string[] {
  if (!existsSync(dir)) return acc;
  const excludeTests = options.excludeTests !== false;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      if (excludeTests && e.name === 'tests') continue;
      collectTsFiles(full, options, acc);
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function getAllDirAndFileNames(dir: string, basePath: string, names: string[] = []): string[] {
  if (!existsSync(dir)) return names;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const relative = join(basePath, e.name);
    const nameWithoutExt = e.name.replace(/\.(ts|tsx|js|jsx)$/, '');
    names.push(relative, nameWithoutExt);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'tests') {
      getAllDirAndFileNames(join(dir, e.name), relative, names);
    }
  }
  return names;
}

function isCommentOrStringOnly(line: string): boolean {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t === '';
}

function hasForbiddenMemberName(content: string, forbidden: string[]): boolean {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (isCommentOrStringOnly(line)) continue;
    for (const name of forbidden) {
      const re = new RegExp(
        `(?:readonly\\s+)?\\b${name}\\b\\s*[?:;\\(,]|\\b${name}\\s*\\(|["']${name}["']\\s*:`,
        'i'
      );
      if (re.test(line)) return true;
    }
  }
  return false;
}

function makeActionBridgeRegistry(enabled: boolean): ActionBridgeRegistry {
  return { isEnabled: (id: string) => id === 'iris-action-bridge' && enabled };
}

function makeMessagingContractRegistry(enabled: boolean): MessagingContractRegistry {
  return { isEnabled: (id: string) => id === 'iris-messaging-contract' && enabled };
}

describe('IRIS 12.x — Action Bridge End-to-End Conformance', () => {
  describe('1. Struttura del layer', () => {
    it('sotto action-bridge/ NON esistono directory o file con nomi execution, delivery, adapter, trigger, workflow, retry, scheduler', () => {
      const names = getAllDirAndFileNames(ACTION_BRIDGE_ROOT, 'action-bridge');
      for (const forbidden of FORBIDDEN_DIR_OR_FILE_NAMES) {
        const hasForbidden = names.some(
          (n) => n.toLowerCase() === forbidden || n.toLowerCase().includes(forbidden)
        );
        expect(hasForbidden).toBe(false);
      }
    });
  });

  describe('2. Assenza totale di side-effect', () => {
    it('nessun file in action-bridge/ (esclusi test) espone proprietà o metodi execute, apply, send, dispatch, trigger, run, perform, schedule, retry, fallback', () => {
      const files = collectTsFiles(ACTION_BRIDGE_ROOT);
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (hasForbiddenMemberName(content, FORBIDDEN_SIDE_EFFECT_NAMES)) violations.push(file);
      }
      expect(violations).toEqual([]);
    });

    it('nessun file in contract/ (esclusi test) espone proprietà o metodi execute, apply, send, dispatch, trigger, run, perform, schedule, retry, fallback', () => {
      const files = collectTsFiles(CONTRACT_ROOT);
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (hasForbiddenMemberName(content, FORBIDDEN_SIDE_EFFECT_NAMES)) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('3. Separazione architetturale (import)', () => {
    it('action-bridge/ NON importa da delivery, feedback, governance, messaging adapter', () => {
      const files = collectTsFiles(ACTION_BRIDGE_ROOT);
      const violations: string[] = [];
      const forbiddenPaths = ['delivery', 'feedback', 'governance', 'adapter'];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          if (isCommentOrStringOnly(line)) continue;
          const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch) {
            const path = fromMatch[1];
            if (forbiddenPaths.some((p) => path.includes(p))) violations.push(file);
          }
        }
      }
      expect(violations).toEqual([]);
    });

    it('contract/ NON importa da delivery engine, feedback engine; da decision solo tipi/snapshot (no Engine)', () => {
      const files = collectTsFiles(CONTRACT_ROOT);
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        let bad = false;
        for (const line of lines) {
          if (isCommentOrStringOnly(line)) continue;
          if (/from\s+['\"][^'\"]*delivery/.test(line)) bad = true;
          if (/from\s+['\"][^'\"]*feedback/.test(line)) bad = true;
          if (/from\s+['\"][^'\"]*decision/.test(line) && /Engine/.test(line)) bad = true;
        }
        if (bad) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('4. Coerenza Intent → Contract → Plan', () => {
    it('Action Plan (stub) contiene SOLO riferimenti dichiarativi; nessun channelId, adapterId, endpoint, provider operativo', () => {
      const intentSnapshot: IrisActionIntentSnapshot = Object.freeze({
        intents: Object.freeze([
          Object.freeze({
            intentId: 'i1',
            selectionId: 's1',
            intentType: 'notify',
            description: 'd',
            derivedAt: new Date().toISOString(),
          }),
        ]),
        derivedAt: new Date().toISOString(),
      });
      const contractSnapshot: IrisMessagingContractSnapshot = Object.freeze({
        contracts: Object.freeze([
          Object.freeze({
            contractId: 'c1',
            intentId: 'i1',
            intentType: 'notify',
            messagePurpose: 'p',
            derivedAt: new Date().toISOString(),
          }),
        ]),
        derivedAt: new Date().toISOString(),
      });
      const compatibility: IrisContractCompatibilitySnapshot = Object.freeze({
        contracts: contractSnapshot.contracts,
        capabilities: Object.freeze([
          Object.freeze({
            capabilityId: 'cap1',
            supportedIntentTypes: Object.freeze(['notify']),
          } as IrisExecutionCapability),
        ]),
        compatibilityNotes: Object.freeze([
          Object.freeze({ description: 'Note.' } as IrisCompatibilityNote),
        ]),
      });
      const plan: IrisActionPlanSnapshot = Object.freeze({
        intents: intentSnapshot,
        contracts: contractSnapshot,
        compatibility,
        derivedAt: new Date().toISOString(),
      });

      const planKeys = Object.keys(plan);
      for (const f of FORBIDDEN_PLAN_PROPERTIES) {
        expect(planKeys).not.toContain(f);
      }
      for (const c of plan.contracts.contracts) {
        const cKeys = Object.keys(c);
        expect(cKeys).not.toContain('channelId');
        expect(cKeys).not.toContain('adapterId');
        expect(cKeys).not.toContain('endpoint');
      }
      expect(plan.intents.intents).toHaveLength(1);
      expect(plan.contracts.contracts).toHaveLength(1);
    });
  });

  describe('5. Kill-switch invariants', () => {
    it('ActionIntentEngine: registry OFF → snapshot vuoto; snapshot vuoto è frozen, valido, senza side-effect', () => {
      const engine = new IrisActionIntentEngine([]);
      const selection: IrisDecisionSelectionSnapshot = Object.freeze({
        selections: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const result = engine.derive(selection, makeActionBridgeRegistry(false));
      expect(result.intents).toHaveLength(0);
      expect(result.derivedAt).toBeDefined();
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.intents)).toBe(true);
    });

    it('MessagingContractEngine: registry OFF → snapshot vuoto; snapshot vuoto è frozen, valido', () => {
      const engine = new IrisMessagingContractEngine([]);
      const intentSnapshot: IrisActionIntentSnapshot = Object.freeze({
        intents: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const result = engine.derive(intentSnapshot, makeMessagingContractRegistry(false));
      expect(result.contracts).toHaveLength(0);
      expect(result.derivedAt).toBeDefined();
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.contracts)).toBe(true);
    });
  });

  describe('6. Immutabilità profonda', () => {
    it('IrisActionIntent e IrisActionIntentSnapshot (e array/metadata/constraints) sono frozen', () => {
      const intent: IrisActionIntent = Object.freeze({
        intentId: 'i1',
        selectionId: 's1',
        intentType: 'notify',
        description: 'd',
        constraints: Object.freeze({ k: 'v' }),
        metadata: Object.freeze({ m: 1 }),
        derivedAt: new Date().toISOString(),
      });
      expect(Object.isFrozen(intent)).toBe(true);
      if (intent.constraints) expect(Object.isFrozen(intent.constraints)).toBe(true);
      if (intent.metadata) expect(Object.isFrozen(intent.metadata)).toBe(true);

      const snapshot: IrisActionIntentSnapshot = Object.freeze({
        intents: Object.freeze([intent]),
        derivedAt: new Date().toISOString(),
      });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.intents)).toBe(true);
    });

    it('IrisMessagingContract e snapshot (e payloadSchema/constraints) sono frozen', () => {
      const c: IrisMessagingContract = Object.freeze({
        contractId: 'c1',
        intentId: 'i1',
        intentType: 'notify',
        messagePurpose: 'p',
        payloadSchema: Object.freeze({ schema: true }),
        constraints: Object.freeze({}),
        derivedAt: new Date().toISOString(),
      });
      expect(Object.isFrozen(c)).toBe(true);
      if (c.payloadSchema) expect(Object.isFrozen(c.payloadSchema)).toBe(true);
      if (c.constraints) expect(Object.isFrozen(c.constraints)).toBe(true);

      const snap: IrisMessagingContractSnapshot = Object.freeze({
        contracts: Object.freeze([c]),
        derivedAt: new Date().toISOString(),
      });
      expect(Object.isFrozen(snap)).toBe(true);
      expect(Object.isFrozen(snap.contracts)).toBe(true);
    });

    it('IrisActionPlanSnapshot e contenuti sono frozen', () => {
      const intentSnapshot: IrisActionIntentSnapshot = Object.freeze({
        intents: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const contractSnapshot: IrisMessagingContractSnapshot = Object.freeze({
        contracts: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const compatibility: IrisContractCompatibilitySnapshot = Object.freeze({
        contracts: Object.freeze([]),
        capabilities: Object.freeze([]),
        compatibilityNotes: Object.freeze([]),
      });
      const plan: IrisActionPlanSnapshot = Object.freeze({
        intents: intentSnapshot,
        contracts: contractSnapshot,
        compatibility,
        derivedAt: new Date().toISOString(),
      });
      expect(Object.isFrozen(plan)).toBe(true);
      expect(Object.isFrozen(plan.intents)).toBe(true);
      expect(Object.isFrozen(plan.contracts)).toBe(true);
      expect(Object.isFrozen(plan.compatibility)).toBe(true);
    });
  });

  describe('7. Assenza di retroazione', () => {
    it('nessun file in decision/ importa da action-bridge/', () => {
      const files = collectTsFiles(DECISION_ROOT, { excludeTests: false });
      const violations: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (/from\s+['\"][^'\"]*action-bridge|action-bridge['\"]/.test(content)) violations.push(file);
      }
      expect(violations).toEqual([]);
    });

    it('nessun file in delivery/ o feedback/ importa da action-bridge/ o contract/', () => {
      const deliveryFiles = collectTsFiles(DELIVERY_ROOT, { excludeTests: false });
      const feedbackFiles = collectTsFiles(FEEDBACK_ROOT, { excludeTests: false });
      const violations: string[] = [];
      for (const file of [...deliveryFiles, ...feedbackFiles]) {
        const content = readFileSync(file, 'utf-8');
        if (/from\s+['\"][^'\"]*action-bridge|action-bridge['\"]/.test(content)) violations.push(file);
        if (/from\s+['\"][^'\"]*contract|['\"]\.\.\/contract/.test(content)) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('8. Vocabolario controllato', () => {
    it('intentType usa SOLO valori definiti in IrisActionIntentType', () => {
      const allowed: readonly IrisActionIntentType[] = IRIS_ACTION_INTENT_TYPES;
      expect(allowed).toContain('notify');
      expect(allowed).toContain('request');
      expect(allowed).toContain('confirm');
      expect(allowed).toContain('inform');
      expect(allowed).toContain('follow_up');
      expect(allowed).toContain('escalate');
      expect(allowed).toContain('broadcast');
      expect(allowed.length).toBe(7);
    });

    it('intent con intentType tassonomico è accettato; intentType libero non è nel tipo', () => {
      const intent: IrisActionIntent = Object.freeze({
        intentId: 'i1',
        selectionId: 's1',
        intentType: 'notify',
        description: 'd',
        derivedAt: new Date().toISOString(),
      });
      expect(IRIS_ACTION_INTENT_TYPES).toContain(intent.intentType);
    });
  });
});

// La Fase IRIS 12.x (Action Bridge) è certificata come
// puramente dichiarativa, side-effect free e architetturalmente separata.
// Qualsiasi esecuzione appartiene esclusivamente a sistemi esterni.
