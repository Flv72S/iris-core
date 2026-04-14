/**
 * IRIS 10.x.F — Execution & Observation Freeze Conformance
 * Struttura, assenza decisione, separazione delivery/feedback, read-only, kill-switch.
 *
 * IRIS 10.1 e 10.2 sono definitivi e congelati.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { IrisDeliveryEngine } from '../delivery';
import type { IrisDeliveryResult } from '../delivery';
import { IrisFeedbackEngine } from '../feedback';
import type { IrisFeedbackSnapshot } from '../feedback';

const IRIS_ROOT = join(process.cwd(), 'src', 'iris');
const DELIVERY_ROOT = join(process.cwd(), 'src', 'iris', 'delivery');
const FEEDBACK_ROOT = join(process.cwd(), 'src', 'iris', 'feedback');

const FORBIDDEN_DIRS = ['optimization', 'learning', 'metrics', 'scoring', 'feedback-loop'];
const FORBIDDEN_DECISION = ['best', 'recommended', 'priority', 'score', 'metric', 'successRate'];

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

describe('IRIS 10.x.F — Execution & Observation freeze conformance', () => {
  describe('1. Struttura', () => {
    it('nessuna directory optimization, learning, metrics, scoring, feedback-loop sotto src/iris', () => {
      const dirs = readdirSync(IRIS_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const forbidden of FORBIDDEN_DIRS) {
        expect(dirs).not.toContain(forbidden);
      }
    });
  });

  describe('2. Assenza decisione', () => {
    it('nessuna proprietà best, recommended, priority, score, metric, successRate in delivery e feedback', () => {
      const deliveryResult: IrisDeliveryResult = Object.freeze({
        results: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const feedbackSnapshot: IrisFeedbackSnapshot = Object.freeze({
        events: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const resultKeys = Object.keys(deliveryResult);
      const snapshotKeys = Object.keys(feedbackSnapshot);
      for (const key of FORBIDDEN_DECISION) {
        expect(resultKeys).not.toContain(key);
        expect(snapshotKeys).not.toContain(key);
      }
      if (deliveryResult.results.length > 0) {
        const outcomeKeys = Object.keys(deliveryResult.results[0]);
        for (const key of FORBIDDEN_DECISION) {
          expect(outcomeKeys).not.toContain(key);
        }
      }
      if (feedbackSnapshot.events.length > 0) {
        const eventKeys = Object.keys(feedbackSnapshot.events[0]);
        const signalKeys = Object.keys(feedbackSnapshot.events[0].signal);
        for (const key of FORBIDDEN_DECISION) {
          expect(eventKeys).not.toContain(key);
          expect(signalKeys).not.toContain(key);
        }
      }
    });
  });

  describe('3. Separazione', () => {
    it('nessun import da feedback in delivery', () => {
      const tsFiles = collectTsFiles(DELIVERY_ROOT);
      const violations: string[] = [];
      const importFeedbackPath = /^\s*(?:import\s+.*\s+from\s+|\s*from\s+)\s*['\"][^'\"]*feedback/;
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasFeedback = lines.some((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return importFeedbackPath.test(line);
        });
        if (hasFeedback) violations.push(file);
      }
      expect(violations).toEqual([]);
    });

    it('nessun import da delivery in feedback', () => {
      const tsFiles = collectTsFiles(FEEDBACK_ROOT);
      const violations: string[] = [];
      const importDeliveryPath = /^\s*(?:import\s+.*\s+from\s+|\s*from\s+)\s*['\"][^'\"]*delivery/;
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDelivery = lines.some((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return importDeliveryPath.test(line);
        });
        if (hasDelivery) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('4. Read-only', () => {
    it('output delivery e feedback frozen', () => {
      const deliveryEngine = new IrisDeliveryEngine([]);
      const deliveryResult = deliveryEngine.deliver([], { isEnabled: () => true });
      expect(Object.isFrozen(deliveryResult)).toBe(true);
      expect(Object.isFrozen(deliveryResult.results)).toBe(true);

      const feedbackEngine = new IrisFeedbackEngine([]);
      const feedbackSnapshot = feedbackEngine.collect({ isEnabled: () => true });
      expect(Object.isFrozen(feedbackSnapshot)).toBe(true);
      expect(Object.isFrozen(feedbackSnapshot.events)).toBe(true);
    });
  });

  describe('5. Kill-switch', () => {
    it('delivery OFF → results [] nessun side-effect', () => {
      const adapter = {
        id: 'a1',
        channelType: 'inbox',
        deliver: () => ({
          adapterId: 'a1',
          channelId: 'ch1',
          status: 'attempted' as const,
          derivedAt: new Date().toISOString(),
        }),
      };
      const engine = new IrisDeliveryEngine([adapter]);
      const renderResult = Object.freeze({
        channelId: 'ch1',
        renderedContents: Object.freeze([
          Object.freeze({ templateId: 't1', channelType: 'inbox', content: 'x' }),
        ]),
        derivedAt: new Date().toISOString(),
      });
      const result = engine.deliver([renderResult], { isEnabled: () => false });
      expect(result.results).toHaveLength(0);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('feedback OFF → events [] nessuna azione', () => {
      const adapter = {
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
      const snapshot = engine.collect({ isEnabled: () => false });
      expect(snapshot.events).toHaveLength(0);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });
});
