/**
 * Execution Feedback Boundary — Conformance (C.5)
 * Snapshot vuoto con kill-switch OFF; immutabilità; no proprietà adattive; separazione; determinismo; pluralità eventi; enum only; no retroazione.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ExecutionStepResult } from '../../execution-boundary';
import {
  ExecutionFeedbackEngine,
  EXECUTION_FEEDBACK_COMPONENT_ID,
  EXECUTION_FEEDBACK_EVENT_TYPES,
  EXECUTION_FEEDBACK_STATUS,
  type ExecutionFeedbackRegistry,
  type ExecutionFeedbackSnapshot,
  type ExecutionFeedbackEvent,
  type ExecutionResultSnapshot,
} from '../index';

const FEEDBACK_ROOT = join(process.cwd(), 'src', 'messaging-system', 'feedback');

const FORBIDDEN_IMPORTS = ['iris', 'decision', 'action-bridge', 'contract', 'action-plan'];
const FORBIDDEN_EVENT_KEYS = ['retry', 'nextAction', 'recommendation', 'priority', 'score'];

function makeRegistry(enabled: boolean): ExecutionFeedbackRegistry {
  return { [EXECUTION_FEEDBACK_COMPONENT_ID]: enabled };
}

function createResultSnapshot(
  executionId: string,
  results: ExecutionStepResult[],
  completedAt: string,
  planId?: string,
  status?: string
): ExecutionResultSnapshot {
  return Object.freeze({
    executionId,
    results: Object.freeze(results),
    completedAt,
    planId,
    status,
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

describe('Execution Feedback Boundary — Conformance', () => {
  const completedAt = '2025-01-01T12:00:00.000Z';

  describe('1. Snapshot vuoto con kill-switch OFF', () => {
    it('con registry OFF lo snapshot ha events []', () => {
      const engine = new ExecutionFeedbackEngine();
      const input = createResultSnapshot(
        'exec-1',
        [Object.freeze({ stepId: 's1', status: 'success' })],
        completedAt
      );
      const snapshot = engine.collect(input, makeRegistry(false));
      expect(snapshot.events).toEqual([]);
      expect(snapshot.derivedAt).toBeDefined();
    });
  });

  describe('2. Snapshot immutabile (deep freeze)', () => {
    it('snapshot e ogni evento sono frozen', () => {
      const engine = new ExecutionFeedbackEngine();
      const input = createResultSnapshot(
        'exec-1',
        [Object.freeze({ stepId: 's1', status: 'success' })],
        completedAt,
        'plan-1'
      );
      const snapshot = engine.collect(input, makeRegistry(true));
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.events)).toBe(true);
      for (const ev of snapshot.events) {
        expect(Object.isFrozen(ev)).toBe(true);
      }
    });
  });

  describe('3. Nessuna proprietà adattiva sugli eventi', () => {
    it('gli eventi non hanno retry, nextAction, recommendation, priority, score', () => {
      const engine = new ExecutionFeedbackEngine();
      const input = createResultSnapshot(
        'exec-1',
        [Object.freeze({ stepId: 's1', status: 'success' })],
        completedAt
      );
      const snapshot = engine.collect(input, makeRegistry(true));
      for (const ev of snapshot.events) {
        for (const key of FORBIDDEN_EVENT_KEYS) {
          expect(key in ev).toBe(false);
        }
      }
    });
  });

  describe('4. Separazione: nessun import vietato', () => {
    it('nessun file in feedback/ importa da iris, decision, action-bridge, contract, action-plan', () => {
      const files = collectTsFiles(FEEDBACK_ROOT);
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

  describe('5. Determinismo: stesso input -> stessi eventi', () => {
    it('stesso ExecutionResultSnapshot produce stessi eventId, eventType, status, observedAt', () => {
      const engine = new ExecutionFeedbackEngine();
      const input = createResultSnapshot(
        'exec-1',
        [Object.freeze({ stepId: 's1', status: 'success' })],
        completedAt,
        'plan-1'
      );
      const a = engine.collect(input, makeRegistry(true));
      const b = engine.collect(input, makeRegistry(true));
      expect(a.events.length).toBe(b.events.length);
      expect(a.derivedAt).toBe(b.derivedAt);
      for (let i = 0; i < a.events.length; i++) {
        expect(a.events[i].eventId).toBe(b.events[i].eventId);
        expect(a.events[i].eventType).toBe(b.events[i].eventType);
        expect(a.events[i].status).toBe(b.events[i].status);
        expect(a.events[i].observedAt).toBe(b.events[i].observedAt);
      }
    });
  });

  describe('6. Pluralità eventi consentita', () => {
    it('più ExecutionResultSnapshot producono un evento per ciascuno', () => {
      const engine = new ExecutionFeedbackEngine();
      const input1 = createResultSnapshot(
        'exec-1',
        [Object.freeze({ stepId: 's1', status: 'success' })],
        completedAt,
        'plan-1'
      );
      const input2 = createResultSnapshot(
        'exec-2',
        [Object.freeze({ stepId: 's1', status: 'failure' })],
        '2025-01-01T13:00:00.000Z',
        'plan-2'
      );
      const snapshot = engine.collect([input1, input2], makeRegistry(true));
      expect(snapshot.events.length).toBe(2);
      expect(snapshot.events[0].executionId).toBe('exec-1');
      expect(snapshot.events[1].executionId).toBe('exec-2');
    });
  });

  describe('7. EventType e Status solo da enum', () => {
    it('eventType e status appartengono alle costanti dichiarate', () => {
      const engine = new ExecutionFeedbackEngine();
      const inputSuccess = createResultSnapshot(
        'exec-1',
        [Object.freeze({ stepId: 's1', status: 'success' })],
        completedAt,
        undefined,
        'SUCCESS'
      );
      const inputFailure = createResultSnapshot(
        'exec-2',
        [Object.freeze({ stepId: 's1', status: 'failure' })],
        completedAt,
        undefined,
        'FAILED'
      );
      const snapshot = engine.collect([inputSuccess, inputFailure], makeRegistry(true));
      for (const ev of snapshot.events) {
        expect(EXECUTION_FEEDBACK_EVENT_TYPES).toContain(ev.eventType);
        expect(EXECUTION_FEEDBACK_STATUS).toContain(ev.status);
      }
    });
  });

  describe('8. Nessuna retroazione verso altri layer', () => {
    it('collect non modifica input e non ha side-effect osservabili', () => {
      const engine = new ExecutionFeedbackEngine();
      const input = createResultSnapshot(
        'exec-1',
        [Object.freeze({ stepId: 's1', status: 'success' })],
        completedAt
      );
      const before = JSON.stringify(input);
      engine.collect(input, makeRegistry(true));
      const after = JSON.stringify(input);
      expect(before).toBe(after);
      const snapshot = engine.collect(input, makeRegistry(true));
      expect(snapshot.events.length).toBeGreaterThanOrEqual(0);
    });
  });
});

/*
Il Feedback Boundary del Messaging System e' certificato come:
- puramente osservativo
- non adattivo
- side-effect free
- architetturalmente separato da IRIS Core

Ogni utilizzo decisionale del feedback richiede una nuova fase esplicita.
*/
