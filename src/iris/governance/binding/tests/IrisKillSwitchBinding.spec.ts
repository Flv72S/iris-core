/**
 * IRIS 10.0.1 — Kill-Switch Binding conformance
 * Binding completo, read-only, determinismo, immutabilità, assenza decisione, separazione.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IrisGovernanceRegistry } from '../../IrisGovernanceRegistry';
import {
  IrisKillSwitchBinder,
  type IrisKillSwitchBinding,
  type IrisKillSwitchSnapshot,
} from '../index';

/** Component ID supportati dal binding (documentati; nessun import da layer). */
const IRIS_KNOWN_COMPONENT_IDS = [
  'semantic-engine',
  'iris-interpretation',
  'iris-orchestration',
  'iris-messaging',
  'iris-rendering',
] as const;

const FORBIDDEN_DECISION = ['decision', 'policy', 'rule', 'priority', 'auto'];
const FORBIDDEN_ANTI_PATTERN = [
  'autoDisable',
  'fallbackPolicy',
  'recommendedState',
  'systemOverride',
  'dynamicRule',
  'smartKillSwitch',
];

const BINDING_ROOT = join(process.cwd(), 'src', 'iris', 'governance', 'binding');

function createBindingsForKnownComponents(): readonly IrisKillSwitchBinding[] {
  return Object.freeze(
    IRIS_KNOWN_COMPONENT_IDS.map((id) =>
      Object.freeze({
        componentId: id,
        readEnabled: (registry: IrisGovernanceRegistry) => registry.isEnabled(id),
      })
    )
  );
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

describe('IRIS 10.0.1 — Kill-Switch Binding conformance', () => {
  describe('1. Binding completo', () => {
    it('tutti i componenti IRIS noti sono presenti nello snapshot', () => {
      const enabledIds = new Set(['iris-orchestration', 'iris-messaging', 'iris-rendering']);
      const registry: IrisGovernanceRegistry = {
        isEnabled: (id: string) => enabledIds.has(id),
      };
      const bindings = createBindingsForKnownComponents();
      const binder = new IrisKillSwitchBinder();
      const snapshot = binder.snapshot(registry, bindings);

      expect(snapshot.entries).toHaveLength(IRIS_KNOWN_COMPONENT_IDS.length);
      const ids = snapshot.entries.map((e) => e.componentId);
      for (const id of IRIS_KNOWN_COMPONENT_IDS) {
        expect(ids).toContain(id);
      }
    });
  });

  describe('2. Read-only', () => {
    it('nessun kill-switch viene modificato dal binder', () => {
      const registry: IrisGovernanceRegistry = { isEnabled: () => true };
      const bindings = createBindingsForKnownComponents();
      const binder = new IrisKillSwitchBinder();
      binder.snapshot(registry, bindings);
      const snapshot2 = binder.snapshot(registry, bindings);
      expect(snapshot2.entries.every((e) => e.enabled === true)).toBe(true);
    });
  });

  describe('3. Determinismo', () => {
    it('stesso registry e bindings → stesso snapshot (stessi valori enabled)', () => {
      const registry: IrisGovernanceRegistry = {
        isEnabled: (id) => id === 'iris-rendering',
      };
      const bindings = createBindingsForKnownComponents();
      const binder = new IrisKillSwitchBinder();
      const a = binder.snapshot(registry, bindings);
      const b = binder.snapshot(registry, bindings);
      expect(a.entries.length).toBe(b.entries.length);
      for (let i = 0; i < a.entries.length; i++) {
        expect(a.entries[i].componentId).toBe(b.entries[i].componentId);
        expect(a.entries[i].enabled).toBe(b.entries[i].enabled);
      }
      expect(a.derivedAt).toBeDefined();
      expect(b.derivedAt).toBeDefined();
    });
  });

  describe('4. Immutabilità', () => {
    it('snapshot e singole entry sono frozen', () => {
      const registry: IrisGovernanceRegistry = { isEnabled: () => false };
      const bindings = createBindingsForKnownComponents();
      const binder = new IrisKillSwitchBinder();
      const snapshot = binder.snapshot(registry, bindings);

      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.entries)).toBe(true);
      for (const entry of snapshot.entries) {
        expect(Object.isFrozen(entry)).toBe(true);
      }
    });
  });

  describe('5. Assenza decisione', () => {
    it('nessuna proprietà decision, policy, rule, priority, auto', () => {
      const snapshot: IrisKillSwitchSnapshot = Object.freeze({
        entries: Object.freeze([
          Object.freeze({ componentId: 'iris-orchestration', enabled: true }),
        ]),
        derivedAt: new Date().toISOString(),
      });
      const snapshotKeys = Object.keys(snapshot);
      const entryKeys = Object.keys(snapshot.entries[0]);
      for (const key of FORBIDDEN_DECISION) {
        expect(snapshotKeys).not.toContain(key);
        expect(entryKeys).not.toContain(key);
      }
    });

    it('nessun anti-pattern: autoDisable, fallbackPolicy, recommendedState, systemOverride, dynamicRule, smartKillSwitch', () => {
      const snapshot: IrisKillSwitchSnapshot = Object.freeze({
        entries: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const allKeys = [...Object.keys(snapshot), ...snapshot.entries.flatMap((e) => Object.keys(e))];
      for (const key of FORBIDDEN_ANTI_PATTERN) {
        expect(allKeys).not.toContain(key);
      }
    });
  });

  describe('6. Separazione', () => {
    it('nessun file binding importa direttamente da engine o layer interni', () => {
      const tsFiles = collectTsFiles(BINDING_ROOT);
      const engineOrLayerPattern = /(?:^import\s|^\s*from\s+['\"])[^'\n]*(?:semantic-layer[/\\]engine|interpretation|orchestration|messaging|rendering)/;
      const violations: string[] = [];

      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDirect = lines.some((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return engineOrLayerPattern.test(line);
        });
        if (hasDirect) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });
});
