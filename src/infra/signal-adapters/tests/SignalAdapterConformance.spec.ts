/**
 * Signal Adapters — Conformance.
 * Read-only, determinismo, registry aggregation, kill-switch, no forbidden fields, import boundary, immutability.
 */

// Signal Adapters are read-only observation layers.
// They do not interpret, decide, prioritize, or act.
// They only expose what already happened in the external world.

import { describe, it, expect } from 'vitest';
import { escapeRegExp } from '../../../test-support/regexpEscapes';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { SignalEvent } from '../SignalEvent';
import {
  SignalAdapterRegistry,
  calendarSignalAdapter,
  taskSignalAdapter,
  inboxSignalAdapter,
  timeSignalAdapter,
  activitySignalAdapter,
  CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID,
  isSignalAdapterEnabled,
} from '../index';

const FORBIDDEN_KEYS = ['priority', 'score', 'severity', 'recommendation', 'interpretation'];

const ALL_ADAPTERS = [
  calendarSignalAdapter,
  taskSignalAdapter,
  inboxSignalAdapter,
  timeSignalAdapter,
  activitySignalAdapter,
];

function hasForbiddenKeys(obj: Record<string, unknown>): string[] {
  const found: string[] = [];
  for (const key of FORBIDDEN_KEYS) {
    if (key in obj) found.push(key);
  }
  return found;
}

describe('Signal Adapters — Conformance', () => {
  describe('1. Read-only', () => {
    it('adapter read() non muta stato osservabile', async () => {
      const a = calendarSignalAdapter;
      const out1 = await a.read();
      const out2 = await a.read();
      expect(out1).toEqual(out2);
    });
  });

  describe('2. Determinismo', () => {
    it('stesso adapter → stessi eventi', async () => {
      for (const adapter of ALL_ADAPTERS) {
        const first = await adapter.read();
        const second = await adapter.read();
        expect(first).toEqual(second);
      }
    });
  });

  describe('3. Registry aggregation', () => {
    it('readAll concatena senza ordinare', async () => {
      const registry = new SignalAdapterRegistry(ALL_ADAPTERS);
      const events = await registry.readAll();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(1);
      const sources = events.map((e: SignalEvent) => e.source);
      expect(sources).toContain('calendar');
    });
  });

  describe('4. Kill-switch', () => {
    it('adapter OFF → zero eventi da quell\'adapter', async () => {
      const killSwitch: Record<string, boolean> = {
        [CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID]: false,
      };
      const registry = new SignalAdapterRegistry(ALL_ADAPTERS, killSwitch);
      const events = await registry.readAll();
      const fromCalendar = events.filter((e: SignalEvent) => e.source === 'calendar');
      expect(fromCalendar.length).toBe(0);
    });

    it('isSignalAdapterEnabled rispetta registry', () => {
      expect(isSignalAdapterEnabled({ [CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID]: true }, CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID)).toBe(true);
      expect(isSignalAdapterEnabled({ [CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID]: false }, CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID)).toBe(false);
    });
  });

  describe('5. No forbidden fields', () => {
    it('nessun priority, score, severity in SignalEvent', async () => {
      const registry = new SignalAdapterRegistry(ALL_ADAPTERS);
      const events = await registry.readAll();
      for (const evt of events) {
        const inPayload = hasForbiddenKeys(evt.payload as Record<string, unknown>);
        expect(inPayload).toEqual([]);
        const inEvent = hasForbiddenKeys(evt as unknown as Record<string, unknown>);
        expect(inEvent).toEqual([]);
      }
    });
  });

  describe('6. Import boundary', () => {
    it('nessun import da IRIS Core, messaging-system, product, ux', () => {
      const root = join(process.cwd(), 'src', 'infra', 'signal-adapters');
      const forbidden = ['messaging-system', 'product/', 'ux-experience', 'orchestration', 'feature-pipelines', 'ux-contract', 'demo-scenarios'];
      const scan = (dir: string): string[] => {
        const entries = readdirSync(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory() && e.name !== 'tests') {
            files.push(...scan(full));
          } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) {
            files.push(full);
          }
        }
        return files;
      };
      const files = scan(root);
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const importLines = content.split('\n').filter((l) => l.trim().startsWith('import'));
        for (const line of importLines) {
          for (const path of forbidden) {
            expect(line, `File ${file} must not import ${path}`).not.toMatch(
              new RegExp(escapeRegExp(path), 'i')
            );
          }
        }
      }
    });
  });

  describe('7. Event immutabilità', () => {
    it('output read() è frozen', async () => {
      const events = await calendarSignalAdapter.read();
      expect(Object.isFrozen(events)).toBe(true);
      if (events.length > 0) {
        expect(Object.isFrozen(events[0])).toBe(true);
        expect(Object.isFrozen(events[0].payload)).toBe(true);
      }
    });

    it('output readAll() è frozen', async () => {
      const registry = new SignalAdapterRegistry(ALL_ADAPTERS);
      const events = await registry.readAll();
      expect(Object.isFrozen(events)).toBe(true);
    });
  });
});
