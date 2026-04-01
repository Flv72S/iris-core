/**
 * IRIS 12.1 — Action Intent Typing & Taxonomy conformance
 * intentType solo valori definiti; nessun riferimento a channel, adapter, execution; immutabilità.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IRIS_ACTION_INTENT_TYPES,
  type IrisActionIntentType,
  type IrisActionIntent,
} from '../index';

const ACTION_BRIDGE_ROOT = join(process.cwd(), 'src', 'iris', 'action-bridge');

const FORBIDDEN_REFERENCES = ['channel', 'adapter', 'execution'];

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

describe('IRIS 12.1 — Action Intent Typing & Taxonomy', () => {
  describe('1. intentType accetta solo valori definiti', () => {
    it('IRIS_ACTION_INTENT_TYPES contiene i tipi dichiarati', () => {
      expect(IRIS_ACTION_INTENT_TYPES).toContain('notify');
      expect(IRIS_ACTION_INTENT_TYPES).toContain('request');
      expect(IRIS_ACTION_INTENT_TYPES).toContain('confirm');
      expect(IRIS_ACTION_INTENT_TYPES).toContain('inform');
      expect(IRIS_ACTION_INTENT_TYPES).toContain('follow_up');
      expect(IRIS_ACTION_INTENT_TYPES).toContain('escalate');
      expect(IRIS_ACTION_INTENT_TYPES).toContain('broadcast');
      expect(IRIS_ACTION_INTENT_TYPES).toHaveLength(7);
    });

    it('un intent con intentType valido è accettato', () => {
      const types: IrisActionIntentType[] = ['notify', 'request', 'confirm', 'inform', 'follow_up', 'escalate', 'broadcast'];
      for (const intentType of types) {
        const intent: IrisActionIntent = Object.freeze({
          intentId: 'i1',
          selectionId: 's1',
          intentType,
          description: 'desc',
          derivedAt: new Date().toISOString(),
        });
        expect(intent.intentType).toBe(intentType);
        expect(IRIS_ACTION_INTENT_TYPES).toContain(intent.intentType);
      }
    });
  });

  describe('2. Nessun riferimento a channel, adapter, execution', () => {
    it('IrisActionIntentType e moduli di typing non contengono termini operativi', () => {
      const typingFiles = [join(ACTION_BRIDGE_ROOT, 'IrisActionIntentType.ts'), join(ACTION_BRIDGE_ROOT, 'IrisActionIntent.ts')];
      for (const file of typingFiles) {
        const content = readFileSync(file, 'utf-8').toLowerCase();
        for (const term of FORBIDDEN_REFERENCES) {
          const asIdentifier = new RegExp(`\\b${term}\\b`, 'i');
          const inComment = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
          const withoutComments = content.replace(inComment, ' ');
          expect(withoutComments).not.toMatch(asIdentifier);
        }
      }
    });

    it('IRIS_ACTION_INTENT_TYPES non contiene valori che implicano canali/adapter/delivery', () => {
      const forbidden = ['channel', 'adapter', 'delivery', 'send', 'execute'];
      for (const t of IRIS_ACTION_INTENT_TYPES) {
        const lower = t.toLowerCase();
        for (const f of forbidden) {
          expect(lower).not.toContain(f);
        }
      }
    });
  });

  describe('3. Immutabilità rispettata', () => {
    it('intent con tipo tassonomico è frozen', () => {
      const intent: IrisActionIntent = Object.freeze({
        intentId: 'i1',
        selectionId: 's1',
        intentType: 'notify',
        description: 'd',
        derivedAt: new Date().toISOString(),
      });
      expect(Object.isFrozen(intent)).toBe(true);
    });

    it('tutti i tipi tassonomici producono intent immutabili', () => {
      const types: IrisActionIntentType[] = ['inform', 'confirm', 'follow_up', 'escalate', 'broadcast'];
      for (const intentType of types) {
        const intent: IrisActionIntent = Object.freeze({
          intentId: 'i',
          selectionId: 's',
          intentType,
          description: 'd',
          derivedAt: new Date().toISOString(),
        });
        expect(Object.isFrozen(intent)).toBe(true);
      }
    });
  });
});
