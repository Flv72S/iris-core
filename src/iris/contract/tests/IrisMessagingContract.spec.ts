/**
 * IRIS 12.2 — Messaging Contract conformance
 * Intent → contract mapping; kill-switch; assenza execution; separazione da delivery.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IrisActionIntentSnapshot, IrisActionIntent } from '../../action-bridge';
import {
  IrisMessagingContractEngine,
  IRIS_MESSAGING_CONTRACT_COMPONENT_ID,
  type MessagingContractRegistry,
  type IrisMessagingContract,
  type IrisMessagingContractSnapshot,
  type IrisMessagingContractProvider,
} from '../index';

const CONTRACT_ROOT = join(process.cwd(), 'src', 'iris', 'contract');

const FORBIDDEN = ['send', 'deliver', 'channelId', 'adapterId'];

function makeRegistry(enabled: boolean): MessagingContractRegistry {
  return { isEnabled: (id: string) => id === IRIS_MESSAGING_CONTRACT_COMPONENT_ID && enabled };
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'tests') {
      collectTsFiles(full, acc);
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function createIntentSnapshot(intents: IrisActionIntent[]): IrisActionIntentSnapshot {
  return Object.freeze({
    intents: Object.freeze(intents),
    derivedAt: new Date().toISOString(),
  });
}

describe('IRIS 12.2 — Messaging Contract', () => {
  describe('1. Intent → contract mapping', () => {
    it('engine deriva contratti da intent snapshot tramite provider', () => {
      const provider: IrisMessagingContractProvider = {
        id: 'p1',
        derive: (snapshot) => {
          return Object.freeze(
            snapshot.intents.map((intent) =>
              Object.freeze({
                contractId: `c-${intent.intentId}`,
                intentId: intent.intentId,
                intentType: intent.intentType,
                messagePurpose: 'notify_user',
                derivedAt: new Date().toISOString(),
              })
            )
          );
        },
      };
      const engine = new IrisMessagingContractEngine([provider]);
      const intentSnapshot = createIntentSnapshot([
        Object.freeze({
          intentId: 'i1',
          selectionId: 's1',
          intentType: 'notify',
          description: 'd',
          derivedAt: new Date().toISOString(),
        }),
      ]);
      const result = engine.derive(intentSnapshot, makeRegistry(true));
      expect(result.contracts).toHaveLength(1);
      expect(result.contracts[0].contractId).toBe('c-i1');
      expect(result.contracts[0].intentId).toBe('i1');
      expect(result.contracts[0].intentType).toBe('notify');
      expect(result.contracts[0].messagePurpose).toBe('notify_user');
    });

    it('accumula contratti di più provider (non selezione)', () => {
      const p1: IrisMessagingContractProvider = {
        id: 'p1',
        derive: () =>
          Object.freeze([
            Object.freeze({
              contractId: 'c1',
              intentId: 'i1',
              intentType: 'notify',
              messagePurpose: 'p1',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const p2: IrisMessagingContractProvider = {
        id: 'p2',
        derive: () =>
          Object.freeze([
            Object.freeze({
              contractId: 'c2',
              intentId: 'i2',
              intentType: 'request',
              messagePurpose: 'p2',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const engine = new IrisMessagingContractEngine([p1, p2]);
      const intentSnapshot = createIntentSnapshot([]);
      const result = engine.derive(intentSnapshot, makeRegistry(true));
      expect(result.contracts).toHaveLength(2);
      expect(result.contracts.map((c) => c.contractId)).toEqual(['c1', 'c2']);
    });
  });

  describe('2. Kill-switch', () => {
    it('registry OFF → contracts vuoti', () => {
      const provider: IrisMessagingContractProvider = {
        id: 'p1',
        derive: () =>
          Object.freeze([
            Object.freeze({
              contractId: 'c1',
              intentId: 'i1',
              intentType: 'notify',
              messagePurpose: 'p',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const engine = new IrisMessagingContractEngine([provider]);
      const intentSnapshot = createIntentSnapshot([]);
      const result = engine.derive(intentSnapshot, makeRegistry(false));
      expect(result.contracts).toHaveLength(0);
      expect(result.contracts).toEqual([]);
    });
  });

  describe('3. Assenza execution', () => {
    it('IrisMessagingContract non contiene send, deliver, channelId, adapterId', () => {
      const c: IrisMessagingContract = Object.freeze({
        contractId: 'c1',
        intentId: 'i1',
        intentType: 'notify',
        messagePurpose: 'p',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(c);
      for (const f of FORBIDDEN) {
        expect(keys).not.toContain(f);
      }
      const snapshot: IrisMessagingContractSnapshot = Object.freeze({
        contracts: Object.freeze([c]),
        derivedAt: new Date().toISOString(),
      });
      const snapshotKeys = Object.keys(snapshot);
      for (const f of FORBIDDEN) {
        expect(snapshotKeys).not.toContain(f);
      }
    });
  });

  describe('4. Separazione da delivery', () => {
    it('nessun file contract importa da delivery', () => {
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

  describe('5. Output frozen', () => {
    it('snapshot e contratti restituiti da derive sono frozen', () => {
      const provider: IrisMessagingContractProvider = {
        id: 'p1',
        derive: () =>
          Object.freeze([
            Object.freeze({
              contractId: 'c1',
              intentId: 'i1',
              intentType: 'inform',
              messagePurpose: 'p',
              derivedAt: new Date().toISOString(),
            }),
          ]),
      };
      const engine = new IrisMessagingContractEngine([provider]);
      const intentSnapshot = createIntentSnapshot([]);
      const result = engine.derive(intentSnapshot, makeRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.contracts)).toBe(true);
      for (const contract of result.contracts) {
        expect(Object.isFrozen(contract)).toBe(true);
      }
    });
  });
});
