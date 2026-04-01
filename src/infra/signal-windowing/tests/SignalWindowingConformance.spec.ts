/**
 * Signal Windowing — Conformance.
 * Determinism, fixed/sliding/source-based, IGNORED excluded, kill-switch, immutability, no interpretation fields, import boundary.
 */

// Signal Windowing is a temporal organization layer.
// It groups events mechanically without interpretation.
// Meaning starts later, not here.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { QualifiedSignalEvent } from '../../signal-quality/QualifiedSignalEvent';
import type { SignalWindow } from '../SignalWindow';
import {
  SignalWindowingEngine,
  fixedTimeWindowStrategy,
  slidingWindowStrategy,
  sourceBasedWindowStrategy,
  SIGNAL_WINDOWING_COMPONENT_ID,
  isSignalWindowingEnabled,
} from '../index';

const BASE_TS = 1704110400000;
const FIVE_MIN_MS = 5 * 60 * 1000;
const TEN_MIN_MS = 10 * 60 * 1000;

function qevt(
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

describe('Signal Windowing — Conformance', () => {
  const engine = new SignalWindowingEngine([
    fixedTimeWindowStrategy,
    slidingWindowStrategy,
    sourceBasedWindowStrategy,
  ]);

  describe('1. Determinismo', () => {
    it('stesso input e now → stesso output', () => {
      const events = [
        qevt('e1', 'calendar', 'X', BASE_TS),
      ];
      const now = BASE_TS + 60000;
      const a = engine.build(events, now);
      const b = engine.build(events, now);
      expect(a).toEqual(b);
    });
  });

  describe('2. Fixed window grouping', () => {
    it('eventi nello stesso bucket 5 min entrano nella stessa finestra', () => {
      const events = [
        qevt('a', 'calendar', 'X', BASE_TS),
        qevt('b', 'inbox', 'Y', BASE_TS + 60000),
      ];
      const now = BASE_TS + TEN_MIN_MS;
      const windows = engine.build(events, now);
      const fixed = windows.filter((w: SignalWindow) => w.windowId.startsWith('fixed-'));
      expect(fixed.length).toBeGreaterThanOrEqual(1);
      const withTwo = fixed.find((w) => w.events.length === 2);
      expect(withTwo).toBeDefined();
      expect(withTwo!.endAt - withTwo!.startAt).toBe(FIVE_MIN_MS);
    });
  });

  describe('3. Sliding window inclusion', () => {
    it('eventi con occurredAt >= now - 10min sono nella sliding window', () => {
      const now = BASE_TS + TEN_MIN_MS;
      const events = [
        qevt('s1', 'time', 'TICK', now - 5 * 60000),
      ];
      const windows = engine.build(events, now);
      const sliding = windows.find((w) => w.windowId.startsWith('sliding-'));
      expect(sliding).toBeDefined();
      expect(sliding!.events.some((e) => e.id === 's1')).toBe(true);
    });
  });

  describe('4. Source-based parallel windows', () => {
    it('produce finestre distinte per source e bucket', () => {
      const events = [
        qevt('c1', 'calendar', 'X', BASE_TS),
        qevt('i1', 'inbox', 'Y', BASE_TS),
      ];
      const now = BASE_TS + 60000;
      const windows = engine.build(events, now);
      const sourceWindows = windows.filter((w) => w.windowId.startsWith('source-'));
      expect(sourceWindows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('5. IGNORED excluded', () => {
    it('eventi IGNORED non entrano in nessuna finestra fixed', () => {
      const events = [
        qevt('ok', 'calendar', 'X', BASE_TS, 'STABLE'),
        qevt('ign', 'inbox', 'Y', BASE_TS + 1000, 'IGNORED'),
      ];
      const now = BASE_TS + 60000;
      const windows = engine.build(events, now);
      for (const w of windows) {
        const hasIgnored = w.events.some((e) => e.quality === 'IGNORED');
        expect(hasIgnored).toBe(false);
      }
    });
  });

  describe('6. Kill-switch OFF', () => {
    it('registry OFF → output vuoto', () => {
      const events = [qevt('k1', 'calendar', 'X', BASE_TS)];
      const registry = { [SIGNAL_WINDOWING_COMPONENT_ID]: false };
      const windows = engine.build(events, BASE_TS + 60000, registry);
      expect(windows.length).toBe(0);
    });

    it('isSignalWindowingEnabled rispetta registry', () => {
      expect(
        isSignalWindowingEnabled({ [SIGNAL_WINDOWING_COMPONENT_ID]: true })
      ).toBe(true);
      expect(
        isSignalWindowingEnabled({ [SIGNAL_WINDOWING_COMPONENT_ID]: false })
      ).toBe(false);
    });
  });

  describe('7. Immutabilità output', () => {
    it('output build() è frozen', () => {
      const events = [qevt('m1', 'activity', 'X', BASE_TS)];
      const windows = engine.build(events, BASE_TS + 60000);
      expect(Object.isFrozen(windows)).toBe(true);
      for (const w of windows) {
        expect(Object.isFrozen(w)).toBe(true);
        expect(Object.isFrozen(w.events)).toBe(true);
      }
    });
  });

  describe('8. No interpretation fields', () => {
    it('SignalWindow non ha summary, interpretation, label, priority, score', () => {
      const events = [qevt('f1', 'calendar', 'X', BASE_TS)];
      const windows = engine.build(events, BASE_TS + 60000);
      const forbidden = ['summary', 'interpretation', 'label', 'priority', 'score'];
      for (const w of windows) {
        const obj = w as unknown as Record<string, unknown>;
        for (const key of forbidden) {
          expect(key in obj).toBe(false);
        }
      }
    });
  });

  describe('9. Import boundary', () => {
    it('signal-windowing non importa da messaging-system, product, ux', () => {
      const root = join(process.cwd(), 'src', 'infra', 'signal-windowing');
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
});
