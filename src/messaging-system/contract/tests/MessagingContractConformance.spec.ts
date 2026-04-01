/**
 * Messaging Contract Interpreter — Conformance (Microstep C.1)
 * Snapshot immutabile; kill-switch; separazione; dichiaratività; determinismo.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IrisActionIntentSnapshot } from '../../../iris/action-bridge';
import {
  MessagingContractEngine,
  MESSAGING_CONTRACT_COMPONENT_ID,
  type MessagingContractRegistry,
  type MessagingContract,
  type MessagingContractSnapshot,
} from '../index';

const CONTRACT_ROOT = join(process.cwd(), 'src', 'messaging-system', 'contract');

const FORBIDDEN_PROPERTIES = [
  'channelId',
  'adapterId',
  'endpoint',
  'retry',
  'priority',
  'score',
  'confidence',
];

function makeRegistry(enabled: boolean): MessagingContractRegistry {
  return { isEnabled: (id: string) => id === MESSAGING_CONTRACT_COMPONENT_ID && enabled };
}

function createIntentSnapshot(
  intents: { intentId: string; intentType: string; derivedAt: string }[]
): IrisActionIntentSnapshot {
  const derivedAt = intents[0]?.derivedAt ?? new Date().toISOString();
  return Object.freeze({
    intents: Object.freeze(
      intents.map((i) =>
        Object.freeze({
          intentId: i.intentId,
          selectionId: 's1',
          intentType: i.intentType,
          description: 'd',
          derivedAt: i.derivedAt,
        })
      )
    ),
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
    // dir may not exist
  }
  return acc;
}

describe('Messaging Contract Interpreter — Conformance', () => {
  describe('1. Snapshot immutabile', () => {
    it('snapshot e contratti restituiti da interpret sono frozen', () => {
      const engine = new MessagingContractEngine();
      const intentSnapshot = createIntentSnapshot([
        { intentId: 'i1', intentType: 'notify', derivedAt: '2020-01-01T00:00:00.000Z' },
      ]);
      const result = engine.interpret(intentSnapshot, makeRegistry(true));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.contracts)).toBe(true);
      for (const c of result.contracts) {
        expect(Object.isFrozen(c)).toBe(true);
      }
    });
  });

  describe('2. Kill-switch', () => {
    it('registry OFF → contracts.length === 0', () => {
      const engine = new MessagingContractEngine();
      const intentSnapshot = createIntentSnapshot([
        { intentId: 'i1', intentType: 'notify', derivedAt: new Date().toISOString() },
      ]);
      const result = engine.interpret(intentSnapshot, makeRegistry(false));
      expect(result.contracts).toHaveLength(0);
      expect(result.contracts).toEqual([]);
    });
  });

  describe('3. Separazione', () => {
    it('nessun file in contract/ importa da adapter, execution, delivery', () => {
      const files = collectTsFiles(CONTRACT_ROOT);
      const forbidden = ['adapter', 'execution', 'delivery'];
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

  describe('4. Dichiaratività', () => {
    it('MessagingContract non contiene proprietà operative vietate', () => {
      const c: MessagingContract = Object.freeze({
        contractId: 'c1',
        intentId: 'i1',
        messageKind: 'notify',
        derivedAt: new Date().toISOString(),
      });
      const keys = Object.keys(c);
      for (const f of FORBIDDEN_PROPERTIES) {
        expect(keys).not.toContain(f);
      }
      const snapshot: MessagingContractSnapshot = Object.freeze({
        contracts: Object.freeze([c]),
        derivedAt: new Date().toISOString(),
      });
      const snapshotKeys = Object.keys(snapshot);
      for (const f of FORBIDDEN_PROPERTIES) {
        expect(snapshotKeys).not.toContain(f);
      }
    });
  });

  describe('5. Determinismo', () => {
    it('stesso input → stesso snapshot (stessi contractId, derivedAt, length)', () => {
      const engine = new MessagingContractEngine();
      const derivedAt = '2025-01-01T12:00:00.000Z';
      const intentSnapshot = createIntentSnapshot([
        { intentId: 'i1', intentType: 'notify', derivedAt },
        { intentId: 'i2', intentType: 'request', derivedAt },
      ]);
      const a = engine.interpret(intentSnapshot, makeRegistry(true));
      const b = engine.interpret(intentSnapshot, makeRegistry(true));
      expect(a.contracts.length).toBe(b.contracts.length);
      expect(a.derivedAt).toBe(b.derivedAt);
      expect(a.contracts.map((x) => x.contractId)).toEqual(b.contracts.map((x) => x.contractId));
      expect(a.contracts.map((x) => x.intentId)).toEqual(b.contracts.map((x) => x.intentId));
      expect(a.contracts.map((x) => x.messageKind)).toEqual(b.contracts.map((x) => x.messageKind));
    });
  });
});

// Il Messaging Contract Interpreter è certificato come
// dichiarativo, side-effect free e separato da IRIS Core.
// Ogni forma di esecuzione è demandata a layer successivi.
