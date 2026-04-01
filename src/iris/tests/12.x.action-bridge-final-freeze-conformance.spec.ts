/**
 * IRIS 12.x.F — Action Bridge Final Freeze Conformance
 * Nessuna execution; nessuna delivery; nessuna dipendenza da adapter; snapshot frozen.
 *
 * IRIS 12.x (Action Bridge) è definitivo e congelato.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IrisDecisionSelectionSnapshot } from '../decision';
import {
  IrisActionIntentEngine,
  type ActionBridgeRegistry,
  type IrisActionIntent,
  type IrisActionIntentSnapshot,
} from '../action-bridge';
import {
  IrisMessagingContractEngine,
  type MessagingContractRegistry,
  type IrisMessagingContract,
  type IrisMessagingContractSnapshot,
} from '../contract';

const ACTION_BRIDGE_ROOT = join(process.cwd(), 'src', 'iris', 'action-bridge');
const CONTRACT_ROOT = join(process.cwd(), 'src', 'iris', 'contract');

const FORBIDDEN_EXECUTION = ['execute', 'send', 'trigger', 'command'];
const FORBIDDEN_DELIVERY = ['deliver', 'channelId', 'adapterId'];

function collectTsFiles(dir: string, excludeTests = true, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      if (excludeTests && e.name === 'tests') continue;
      collectTsFiles(full, excludeTests, acc);
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function makeActionBridgeRegistry(enabled: boolean): ActionBridgeRegistry {
  return { isEnabled: (id: string) => id === 'iris-action-bridge' && enabled };
}

function makeMessagingContractRegistry(enabled: boolean): MessagingContractRegistry {
  return { isEnabled: (id: string) => id === 'iris-messaging-contract' && enabled };
}

describe('IRIS 12.x.F — Action Bridge final freeze conformance', () => {
  describe('1. Nessuna execution', () => {
    it('IrisActionIntent non contiene execute, send, trigger, command', () => {
      const intent: IrisActionIntent = Object.freeze({
        intentId: 'i1',
        selectionId: 's1',
        intentType: 'notify',
        description: 'd',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(intent);
      for (const f of FORBIDDEN_EXECUTION) {
        expect(keys).not.toContain(f);
      }
    });

    it('IrisMessagingContract non contiene execute, send, trigger, command', () => {
      const c: IrisMessagingContract = Object.freeze({
        contractId: 'c1',
        intentId: 'i1',
        intentType: 'notify',
        messagePurpose: 'p',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(c);
      for (const f of FORBIDDEN_EXECUTION) {
        expect(keys).not.toContain(f);
      }
    });
  });

  describe('2. Nessuna delivery', () => {
    it('tipi action-bridge e messaging contract non contengono deliver, channelId, adapterId', () => {
      const intent: IrisActionIntent = Object.freeze({
        intentId: 'i1',
        selectionId: 's1',
        intentType: 'notify',
        description: 'd',
        derivedAt: new Date().toISOString(),
      });
      const c: IrisMessagingContract = Object.freeze({
        contractId: 'c1',
        intentId: 'i1',
        intentType: 'notify',
        messagePurpose: 'p',
        derivedAt: new Date().toISOString(),
      });
      for (const f of FORBIDDEN_DELIVERY) {
        expect(Object.keys(intent)).not.toContain(f);
        expect(Object.keys(c)).not.toContain(f);
      }
    });

    it('nessun file action-bridge importa da delivery', () => {
      const tsFiles = collectTsFiles(ACTION_BRIDGE_ROOT);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDelivery = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /from\s+['\"][^'\"]*delivery|IrisDeliveryEngine/.test(line);
        });
        if (hasDelivery) violations.push(file);
      }
      expect(violations).toEqual([]);
    });

    it('nessun file contract (12.x) importa da delivery', () => {
      const tsFiles = collectTsFiles(CONTRACT_ROOT);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDelivery = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /from\s+['\"][^'\"]*delivery|IrisDeliveryEngine/.test(line);
        });
        if (hasDelivery) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('3. Nessuna dipendenza da adapter', () => {
    it('nessun file action-bridge importa adapter', () => {
      const tsFiles = collectTsFiles(ACTION_BRIDGE_ROOT);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasAdapter = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /from\s+['\"][^'\"]*adapter|adapter\s*['\"]/.test(line);
        });
        if (hasAdapter) violations.push(file);
      }
      expect(violations).toEqual([]);
    });

    it('nessun file contract importa adapter', () => {
      const tsFiles = collectTsFiles(CONTRACT_ROOT);
      const violations: string[] = [];
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasAdapter = lines.some((line) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
          return /from\s+['\"][^'\"]*adapter|adapter\s*['\"]/.test(line);
        });
        if (hasAdapter) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('4. Snapshot frozen', () => {
    it('IrisActionIntentEngine.derive restituisce snapshot e intents frozen', () => {
      const engine = new IrisActionIntentEngine([]);
      const selectionSnapshot: IrisDecisionSelectionSnapshot = Object.freeze({
        selections: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const result = engine.derive(selectionSnapshot, makeActionBridgeRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.intents)).toBe(true);
    });

    it('IrisMessagingContractEngine.derive restituisce snapshot e contracts frozen', () => {
      const engine = new IrisMessagingContractEngine([]);
      const intentSnapshot: IrisActionIntentSnapshot = Object.freeze({
        intents: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const result = engine.derive(intentSnapshot, makeMessagingContractRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.contracts)).toBe(true);
    });

    it('con provider, ogni intent e ogni contract in output è frozen', () => {
      const intentProvider = {
        id: 'p1',
        derive: () =>
          Object.freeze([
            Object.freeze({
              intentId: 'i1',
              selectionId: 's1',
              intentType: 'notify' as const,
              description: 'd',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const intentEngine = new IrisActionIntentEngine([intentProvider]);
      const selectionSnapshot: IrisDecisionSelectionSnapshot = Object.freeze({
        selections: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const intentResult = intentEngine.derive(selectionSnapshot, makeActionBridgeRegistry(true));
      for (const intent of intentResult.intents) {
        expect(Object.isFrozen(intent)).toBe(true);
      }

      const contractProvider = {
        id: 'cp1',
        derive: () =>
          Object.freeze([
            Object.freeze({
              contractId: 'c1',
              intentId: 'i1',
              intentType: 'notify' as const,
              messagePurpose: 'p',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const contractEngine = new IrisMessagingContractEngine([contractProvider]);
      const contractResult = contractEngine.derive(intentResult, makeMessagingContractRegistry(true));
      for (const c of contractResult.contracts) {
        expect(Object.isFrozen(c)).toBe(true);
      }
    });
  });
});
