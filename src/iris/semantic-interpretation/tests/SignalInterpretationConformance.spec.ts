/**
 * Semantic Interpretation — Conformance.
 * Determinism, focus/waiting/overload/wellbeing/idle detection, no forbidden fields, kill-switch, immutability, import boundary.
 */

// Semantic Interpretation translates temporal patterns into meaning.
// It does not decide, act, or prioritize.
// Meaning exists here, action does not.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { QualifiedSignalEvent } from '../../../infra/signal-quality/QualifiedSignalEvent';
import type { SignalWindow } from '../../../infra/signal-windowing/SignalWindow';
import type { SemanticSignal } from '../SemanticSignal';
import {
  SemanticInterpretationEngine,
  focusContextRule,
  waitingContextRule,
  overloadContextRule,
  wellbeingRiskRule,
  idleContextRule,
  SEMANTIC_INTERPRETATION_COMPONENT_ID,
  isSemanticInterpretationEnabled,
} from '../index';

const BASE = 1704110400000;

function qe(
  id: string,
  source: QualifiedSignalEvent['source'],
  type: string,
  occurredAt: number,
  quality: QualifiedSignalEvent['quality'] = 'STABLE'
): QualifiedSignalEvent {
  return Object.freeze({
    id,
    source,
    type,
    occurredAt,
    payload: Object.freeze({}),
    receivedAt: occurredAt + 100,
    quality,
  });
}

function win(
  windowId: string,
  startAt: number,
  endAt: number,
  events: QualifiedSignalEvent[],
  now: number
): SignalWindow {
  return Object.freeze({
    windowId,
    startAt,
    endAt,
    events: Object.freeze(events),
    createdAt: now,
  });
}

describe('Semantic Interpretation — Conformance', () => {
  const engine = new SemanticInterpretationEngine([
    focusContextRule,
    waitingContextRule,
    overloadContextRule,
    wellbeingRiskRule,
    idleContextRule,
  ]);

  describe('1. Determinismo', () => {
    it('stesso windows e now produce stesso output', () => {
      const windows = [
        win('w1', BASE, BASE + 60000, [qe('e1', 'calendar', 'MEETING_STARTED', BASE)], BASE + 60000),
      ];
      const a = engine.interpret(windows, BASE + 60000);
      const b = engine.interpret(windows, BASE + 60000);
      expect(a).toEqual(b);
    });
  });

  describe('2. Focus context detection', () => {
    it('calendar MEETING_STARTED senza inbox/tasks produce FOCUS_CONTEXT', () => {
      const windows = [
        win('w1', BASE, BASE + 300000, [qe('c1', 'calendar', 'MEETING_STARTED', BASE)], BASE + 60000),
      ];
      const out = engine.interpret(windows, BASE + 60000);
      const focus = out.find((s: SemanticSignal) => s.type === 'FOCUS_CONTEXT');
      expect(focus).toBeDefined();
      expect(focus!.evidence).toContain('calendar:MEETING_STARTED');
    });
  });

  describe('3. Waiting context detection', () => {
    it('TASK_DUE e EMAIL_RECEIVED producono WAITING_CONTEXT', () => {
      const windows = [
        win('w1', BASE, BASE + 60000, [
          qe('t1', 'tasks', 'TASK_DUE', BASE),
          qe('i1', 'inbox', 'EMAIL_RECEIVED', BASE + 1000),
        ], BASE + 60000),
      ];
      const out = engine.interpret(windows, BASE + 60000);
      const waiting = out.find((s: SemanticSignal) => s.type === 'WAITING_CONTEXT');
      expect(waiting).toBeDefined();
    });
  });

  describe('4. Overload detection', () => {
    it('>= 3 finestre e >= 5 STABLE producono OVERLOAD_CONTEXT', () => {
      const evts = Array.from({ length: 2 }, (_, i) =>
        qe(`e${i}`, 'calendar', 'X', BASE + i * 1000)
      );
      const windows = [
        win('w1', BASE, BASE + 60000, evts, BASE + 60000),
        win('w2', BASE + 60000, BASE + 120000, evts, BASE + 60000),
        win('w3', BASE + 120000, BASE + 180000, [qe('e5', 'inbox', 'Y', BASE + 120000)], BASE + 60000),
      ];
      const out = engine.interpret(windows, BASE + 60000);
      const overload = out.find((s: SemanticSignal) => s.type === 'OVERLOAD_CONTEXT');
      expect(overload).toBeDefined();
    });
  });

  describe('5. Wellbeing risk detection', () => {
    it('SESSION_ACTIVE oltre 90 min senza TIME_TICK produce WELLBEING_RISK', () => {
      const ninetyMin = 90 * 60 * 1000;
      const windows = [
        win('w1', BASE, BASE + ninetyMin, [
          qe('a1', 'activity', 'SESSION_ACTIVE', BASE),
          qe('a2', 'activity', 'SESSION_ACTIVE', BASE + 3000000),
        ], BASE + ninetyMin),
      ];
      const out = engine.interpret(windows, BASE + ninetyMin);
      const risk = out.find((s: SemanticSignal) => s.type === 'WELLBEING_RISK');
      expect(risk).toBeDefined();
    });
  });

  describe('6. Idle context fallback', () => {
    it('nessuna finestra produce IDLE_CONTEXT', () => {
      const out = engine.interpret([], BASE);
      const idle = out.find((s: SemanticSignal) => s.type === 'IDLE_CONTEXT');
      expect(idle).toBeDefined();
      expect(idle!.evidence).toContain('no windows');
    });

    it('solo finestre RAW produce IDLE_CONTEXT', () => {
      const windows = [
        win('w1', BASE, BASE + 60000, [qe('r1', 'time', 'TICK', BASE, 'RAW')], BASE + 60000),
      ];
      const out = engine.interpret(windows, BASE + 60000);
      const idle = out.find((s: SemanticSignal) => s.type === 'IDLE_CONTEXT');
      expect(idle).toBeDefined();
    });
  });

  describe('7. No forbidden fields', () => {
    it('SemanticSignal non ha action, recommendation, priority, score, UX', () => {
      const windows = [
        win('w1', BASE, BASE + 60000, [qe('e1', 'calendar', 'MEETING_STARTED', BASE)], BASE + 60000),
      ];
      const out = engine.interpret(windows, BASE + 60000);
      const forbidden = ['action', 'recommendation', 'priority', 'score'];
      for (const s of out) {
        const obj = s as unknown as Record<string, unknown>;
        for (const key of forbidden) {
          expect(key in obj).toBe(false);
        }
      }
    });
  });

  describe('8. Kill-switch OFF', () => {
    it('registry OFF restituisce []', () => {
      const windows = [
        win('w1', BASE, BASE + 60000, [qe('e1', 'calendar', 'MEETING_STARTED', BASE)], BASE + 60000),
      ];
      const registry = { [SEMANTIC_INTERPRETATION_COMPONENT_ID]: false };
      const out = engine.interpret(windows, BASE + 60000, registry);
      expect(out.length).toBe(0);
    });
    it('isSemanticInterpretationEnabled rispetta registry', () => {
      expect(isSemanticInterpretationEnabled({ [SEMANTIC_INTERPRETATION_COMPONENT_ID]: true })).toBe(true);
      expect(isSemanticInterpretationEnabled({ [SEMANTIC_INTERPRETATION_COMPONENT_ID]: false })).toBe(false);
    });
  });

  describe('9. Immutabilità output', () => {
    it('output interpret() è frozen', () => {
      const windows = [
        win('w1', BASE, BASE + 60000, [qe('e1', 'calendar', 'MEETING_STARTED', BASE)], BASE + 60000),
      ];
      const out = engine.interpret(windows, BASE + 60000);
      expect(Object.isFrozen(out)).toBe(true);
      for (const s of out) {
        expect(Object.isFrozen(s)).toBe(true);
      }
    });
  });

  describe('10. Import boundary', () => {
    it('semantic-interpretation non importa da messaging-system, product, ux, execution', () => {
      const root = join(process.cwd(), 'src', 'iris', 'semantic-interpretation');
      const forbidden = ['messaging-system', 'product/', 'ux-experience', 'orchestration', 'execution'];
      const scan = (dir: string): string[] => {
        const entries = readdirSync(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory() && e.name !== 'tests') files.push(...scan(full));
          else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) files.push(full);
        }
        return files;
      };
      const files = scan(root);
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().startsWith('import'));
        for (const line of lines) {
          for (const path of forbidden) {
            expect(line, `File ${file} must not import ${path}`).not.toMatch(
              new RegExp(path.replace(/\//g, '\\/'), 'i')
            );
          }
        }
      }
    });
  });
});
