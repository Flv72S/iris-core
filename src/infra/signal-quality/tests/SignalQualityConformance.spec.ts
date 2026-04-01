/**
 * Signal Quality — Conformance.
 * Determinism, duplicate, time noise, empty payload, no removal, kill-switch, immutability, import boundary, no forbidden fields.
 */

// Signal Quality is a mechanical observation layer.
// It improves signal reliability without interpretation.
// No meaning, no decisions, no product logic live here.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { SignalEvent } from '../../signal-adapters/SignalEvent';
import type { QualifiedSignalEvent } from '../QualifiedSignalEvent';
import {
  SignalQualityEngine,
  duplicateSuppressionRule,
  timeNoiseRule,
  emptyPayloadRule,
  SIGNAL_QUALITY_COMPONENT_ID,
  isSignalQualityEnabled,
} from '../index';

const FORBIDDEN_KEYS = ['priority', 'score', 'severity', 'interpretation', 'recommendation'];

const BASE_TS = 1704110400000;

function evt(
  id: string,
  source: SignalEvent['source'],
  type: string,
  occurredAt: number,
  payload: Record<string, unknown>
): SignalEvent {
  return Object.freeze({
    id,
    source,
    type,
    occurredAt,
    payload: Object.freeze(payload),
    receivedAt: occurredAt + 100,
  });
}

describe('Signal Quality — Conformance', () => {
  const engine = new SignalQualityEngine([
    emptyPayloadRule,
    duplicateSuppressionRule,
    timeNoiseRule,
  ]);

  describe('1. Determinismo', () => {
    it('stesso input → stesso output', () => {
      const events = [
        evt('e1', 'calendar', 'MEETING_STARTED', BASE_TS, { title: 'Sync' }),
      ];
      const a = engine.process(events);
      const b = engine.process(events);
      expect(a).toEqual(b);
    });
  });

  describe('2. Duplicate detection', () => {
    it('stesso source/type/payload entro 5s → primo STABLE, altri DUPLICATE', () => {
      const events = [
        evt('d1', 'inbox', 'EMAIL_RECEIVED', BASE_TS, { from: 'a@b.com' }),
        evt('d2', 'inbox', 'EMAIL_RECEIVED', BASE_TS + 1000, { from: 'a@b.com' }),
      ];
      const out = engine.process(events);
      const q1 = out.find((e) => e.id === 'd1');
      const q2 = out.find((e) => e.id === 'd2');
      expect(q1?.quality).toBe('STABLE');
      expect(q2?.quality).toBe('DUPLICATE');
    });
  });

  describe('3. Time noise suppression', () => {
    it('TIME_TICK a distanza < 1s → primo STABLE, successivi NOISY', () => {
      const events = [
        evt('t1', 'time', 'TIME_TICK', BASE_TS, { epochMs: BASE_TS }),
        evt('t2', 'time', 'TIME_TICK', BASE_TS + 500, { epochMs: BASE_TS + 500 }),
      ];
      const out = engine.process(events);
      const t1 = out.find((e) => e.id === 't1');
      const t2 = out.find((e) => e.id === 't2');
      expect(t1?.quality).toBe('STABLE');
      expect(t2?.quality).toBe('NOISY');
    });
  });

  describe('4. Empty payload ignored', () => {
    it('payload {} → IGNORED', () => {
      const events = [evt('empty1', 'tasks', 'TASK_CREATED', BASE_TS, {})];
      const out = engine.process(events);
      expect(out[0].quality).toBe('IGNORED');
    });
  });

  describe('5. No event removal', () => {
    it('numero eventi in uscita = numero in entrata', () => {
      const events = [
        evt('a', 'calendar', 'X', BASE_TS, { a: 1 }),
        evt('b', 'inbox', 'Y', BASE_TS + 100, { b: 2 }),
      ];
      const out = engine.process(events);
      expect(out.length).toBe(events.length);
    });
  });

  describe('6. Kill-switch OFF → RAW', () => {
    it('con registry OFF tutti gli eventi hanno quality RAW', () => {
      const events = [
        evt('k1', 'calendar', 'MEETING_STARTED', BASE_TS, { title: 'X' }),
      ];
      const registry = { [SIGNAL_QUALITY_COMPONENT_ID]: false };
      const out = engine.process(events, registry);
      expect(out.length).toBe(1);
      expect(out[0].quality).toBe('RAW');
    });

    it('isSignalQualityEnabled rispetta registry', () => {
      expect(
        isSignalQualityEnabled({ [SIGNAL_QUALITY_COMPONENT_ID]: true })
      ).toBe(true);
      expect(
        isSignalQualityEnabled({ [SIGNAL_QUALITY_COMPONENT_ID]: false })
      ).toBe(false);
    });
  });

  describe('7. Immutabilità output', () => {
    it('output process() è frozen', () => {
      const events = [
        evt('m1', 'activity', 'SESSION_ACTIVE', BASE_TS, { id: 's1' }),
      ];
      const out = engine.process(events);
      expect(Object.isFrozen(out)).toBe(true);
      if (out.length > 0) expect(Object.isFrozen(out[0])).toBe(true);
    });
  });

  describe('8. Import boundary', () => {
    it('signal-quality non importa da messaging-system, product, ux', () => {
      const root = join(process.cwd(), 'src', 'infra', 'signal-quality');
      const forbidden = [
        'messaging-system',
        'product/',
        'ux-experience',
        'orchestration',
        'feature-pipelines',
        'ux-contract',
        'demo-scenarios',
      ];
      const scan = (dir: string): string[] => {
        const entries = readdirSync(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory() && e.name !== 'tests') {
            files.push(...scan(full));
          } else if (
            e.isFile() &&
            e.name.endsWith('.ts') &&
            !e.name.endsWith('.spec.ts')
          ) {
            files.push(full);
          }
        }
        return files;
      };
      const files = scan(root);
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const importLines = content
          .split('\n')
          .filter((l) => l.trim().startsWith('import'));
        for (const line of importLines) {
          for (const path of forbidden) {
            expect(
              line,
              `File ${file} must not import ${path}`
            ).not.toMatch(new RegExp(path.replace(/\//g, '\\/'), 'i'));
          }
        }
      }
    });
  });

  describe('9. No forbidden fields', () => {
    it('QualifiedSignalEvent non ha priority, score, severity, interpretation, recommendation', () => {
      const events = [evt('f1', 'calendar', 'EVENT', BASE_TS, { x: 1 })];
      const out = engine.process(events);
      for (const e of out) {
        const obj = e as unknown as Record<string, unknown>;
        for (const key of FORBIDDEN_KEYS) {
          expect(key in obj).toBe(false);
        }
      }
    });
  });
});
