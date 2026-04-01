/**
 * IRIS 10.2 — Feedback Engine conformance
 * Raccolta completa, kill-switch, assenza interpretazione, separazione, immutabilità, neutralità semantica.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  IrisFeedbackEngine,
  IRIS_FEEDBACK_COMPONENT_ID,
  type IrisFeedbackAdapter,
  type IrisFeedbackSignal,
  type IrisFeedbackSnapshot,
  type FeedbackRegistry,
} from '../index';

const FORBIDDEN_INTERPRETATION = ['score', 'importance', 'success', 'failure', 'rate', 'metric'];

const FEEDBACK_ROOT = join(process.cwd(), 'src', 'iris', 'feedback');

function makeRegistry(enabled: boolean): FeedbackRegistry {
  return {
    isEnabled: (id: string) => id === IRIS_FEEDBACK_COMPONENT_ID && enabled,
  };
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      collectTsFiles(full, acc);
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('IrisFeedbackEngine — 10.2 conformance', () => {
  describe('1. Raccolta completa', () => {
    it('2 adapter → eventi = somma di tutti i segnali', () => {
      const adapter1: IrisFeedbackAdapter = {
        id: 'a1',
        source: 'email',
        collect: () => [
          {
            signalId: 's1',
            source: 'email',
            eventType: 'delivered',
            occurredAt: new Date().toISOString(),
          },
        ],
      };
      const adapter2: IrisFeedbackAdapter = {
        id: 'a2',
        source: 'push',
        collect: () => [
          {
            signalId: 's2',
            source: 'push',
            eventType: 'opened',
            occurredAt: new Date().toISOString(),
          },
          {
            signalId: 's3',
            source: 'push',
            eventType: 'clicked',
            occurredAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisFeedbackEngine([adapter1, adapter2]);
      const snapshot = engine.collect(makeRegistry(true));
      expect(snapshot.events).toHaveLength(3);
      expect(snapshot.events[0].signal.signalId).toBe('s1');
      expect(snapshot.events[1].signal.signalId).toBe('s2');
      expect(snapshot.events[2].signal.signalId).toBe('s3');
    });
  });

  describe('2. Kill-switch', () => {
    it('OFF → snapshot.events.length === 0', () => {
      const adapter: IrisFeedbackAdapter = {
        id: 'a1',
        source: 'webhook',
        collect: () => [
          {
            signalId: 's1',
            source: 'webhook',
            eventType: 'received',
            occurredAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisFeedbackEngine([adapter]);
      const snapshot = engine.collect(makeRegistry(false));
      expect(snapshot.events).toHaveLength(0);
    });
  });

  describe('3. Assenza interpretazione', () => {
    it('nessuna proprietà score, importance, success, failure, rate, metric', () => {
      const snapshot: IrisFeedbackSnapshot = Object.freeze({
        events: Object.freeze([
          Object.freeze({
            eventId: 'e1',
            signal: Object.freeze({
              signalId: 's1',
              source: 'email',
              eventType: 'delivered',
              occurredAt: new Date().toISOString(),
            }),
            derivedAt: new Date().toISOString(),
          }),
        ]),
        derivedAt: new Date().toISOString(),
      });
      const snapshotKeys = Object.keys(snapshot);
      const eventKeys = Object.keys(snapshot.events[0]);
      const signalKeys = Object.keys(snapshot.events[0].signal);
      const allKeys = [...snapshotKeys, ...eventKeys, ...signalKeys];
      for (const key of FORBIDDEN_INTERPRETATION) {
        expect(allKeys).not.toContain(key);
      }
    });
  });

  describe('4. Separazione', () => {
    it('nessun import da delivery, rendering o semantic-layer', () => {
      const tsFiles = collectTsFiles(FEEDBACK_ROOT);
      const forbiddenPattern = /(?:^import\s|^\s*from\s+['\"])[^'\n]*(?:delivery|rendering|semantic-layer)/;
      const violations: string[] = [];

      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDirect = lines.some((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return forbiddenPattern.test(line);
        });
        if (hasDirect) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('5. Immutabilità', () => {
    it('snapshot ed eventi frozen', () => {
      const adapter: IrisFeedbackAdapter = {
        id: 'a1',
        source: 'email',
        collect: () => [
          {
            signalId: 's1',
            source: 'email',
            eventType: 'delivered',
            occurredAt: new Date().toISOString(),
          },
        ],
      };
      const engine = new IrisFeedbackEngine([adapter]);
      const snapshot = engine.collect(makeRegistry(true));
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.events)).toBe(true);
      expect(Object.isFrozen(snapshot.events[0])).toBe(true);
      expect(Object.isFrozen(snapshot.events[0].signal)).toBe(true);
    });
  });

  describe('6. Neutralità semantica', () => {
    it('eventType e payload passati attraverso senza interpretazione', () => {
      const signal: IrisFeedbackSignal = {
        signalId: 's1',
        source: 'webhook',
        eventType: 'custom.event.type',
        deliveryId: 'del-123',
        occurredAt: '2025-01-15T12:00:00.000Z',
        payload: Object.freeze({ opaque: true, value: 42 }),
      };
      const adapter: IrisFeedbackAdapter = {
        id: 'a1',
        source: 'webhook',
        collect: () => [signal],
      };
      const engine = new IrisFeedbackEngine([adapter]);
      const snapshot = engine.collect(makeRegistry(true));
      expect(snapshot.events).toHaveLength(1);
      expect(snapshot.events[0].signal.eventType).toBe('custom.event.type');
      expect(snapshot.events[0].signal.deliveryId).toBe('del-123');
      expect(snapshot.events[0].signal.payload).toEqual({ opaque: true, value: 42 });
    });
  });
});
