/**
 * IRIS 10.0.F — Governance Freeze Conformance
 * Struttura, assenza decisione, separazione, read-only, kill-switch semantics, audit invariants.
 *
 * IRIS 10.0.x è definitivo e congelato. Pronto per 10.1 Delivery e 10.2 Feedback.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { IrisGovernanceEngine } from '../IrisGovernanceEngine';
import type { IrisGovernanceModel } from '../IrisGovernanceModel';
import type { IrisGovernanceSnapshot } from '../IrisGovernanceSnapshot';
import { IrisKillSwitchBinder } from '../binding';
import type { IrisKillSwitchBinding } from '../binding';
import { IrisAuditCollector } from '../audit';
import type { IrisAuditSnapshot } from '../audit';

const GOVERNANCE_ROOT = join(process.cwd(), 'src', 'iris', 'governance');

/** Sotto governance/ sono ammessi solo: binding, audit, tests (e file root model/registry/snapshot/engine/index). */
const ALLOWED_DIRS = ['binding', 'audit', 'tests'];
const FORBIDDEN_DIRS = ['delivery', 'feedback', 'policy', 'rules', 'optimization', 'adaptation'];

const FORBIDDEN_DECISION = ['decision', 'policy', 'rule', 'severity', 'score', 'importance'];
const FORBIDDEN_AUDIT_CONTENT = ['text', 'payload', 'content', 'data'];

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

describe('IRIS 10.0.F — Governance freeze conformance', () => {
  describe('1. Struttura', () => {
    it('sotto src/iris/governance/ esistono solo model, registry, binding, audit (e tests)', () => {
      const dirs = readdirSync(GOVERNANCE_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const allowed of ALLOWED_DIRS) {
        expect(dirs).toContain(allowed);
      }
      for (const forbidden of FORBIDDEN_DIRS) {
        expect(dirs).not.toContain(forbidden);
      }
    });
  });

  describe('2. Assenza decisione', () => {
    it('nessuna proprietà decision, policy, rule, severity, score, importance nei modelli governance', () => {
      const model: IrisGovernanceModel = Object.freeze({
        version: '10.0',
        components: Object.freeze([Object.freeze({ componentId: 'x', enabled: true })]),
      });
      const snapshot: IrisGovernanceSnapshot = Object.freeze({
        version: '10.0',
        components: model.components,
        derivedAt: new Date().toISOString(),
      });
      const modelKeys = [...Object.keys(model), ...Object.keys(model.components[0])];
      const snapshotKeys = Object.keys(snapshot);
      for (const key of FORBIDDEN_DECISION) {
        expect(modelKeys).not.toContain(key);
        expect(snapshotKeys).not.toContain(key);
      }
    });
  });

  describe('3. Separazione', () => {
    it('nessun file governance importa da semantic-layer/engine o engine interni dei layer', () => {
      const tsFiles = collectTsFiles(GOVERNANCE_ROOT);
      const engineImportLinePattern = /(?:^import\s|^\s*from\s+['\"])[^'\n]*(?:semantic-layer[/\\]engine|[/\\]IrisInterpretationEngine|[/\\]IrisOrchestrationEngine|[/\\]IrisMessagingEngine|[/\\]IrisRenderingEngine)/;
      const violations: string[] = [];

      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split(/\r?\n/);
        const hasDirect = lines.some((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return engineImportLinePattern.test(line);
        });
        if (hasDirect) violations.push(file);
      }
      expect(violations).toEqual([]);
    });
  });

  describe('4. Read-only', () => {
    it('Governance Engine getSnapshot restituisce snapshot frozen', () => {
      const model: IrisGovernanceModel = Object.freeze({
        components: Object.freeze([]),
      });
      const engine = new IrisGovernanceEngine(model);
      const snapshot = engine.getSnapshot();
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.components)).toBe(true);
    });

    it('Kill-switch Binder snapshot restituisce snapshot frozen', () => {
      const registry = { isEnabled: () => true };
      const bindings: readonly IrisKillSwitchBinding[] = Object.freeze([
        Object.freeze({ componentId: 'iris-rendering', readEnabled: () => true }),
      ]);
      const binder = new IrisKillSwitchBinder();
      const snapshot = binder.snapshot(registry, bindings);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.entries)).toBe(true);
    });

    it('Audit Collector collect restituisce snapshot frozen', () => {
      const collector = new IrisAuditCollector();
      const snapshot = collector.collect({
        governanceSnapshot: Object.freeze({
          version: '10.0',
          components: Object.freeze([]),
          derivedAt: new Date().toISOString(),
        }),
        killSwitchSnapshot: Object.freeze({
          entries: Object.freeze([]),
          derivedAt: new Date().toISOString(),
        }),
      });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.entries)).toBe(true);
    });
  });

  describe('5. Kill-switch semantics', () => {
    it('Kill-switch binder solo lettura: stesso registry produce stesso stato snapshot', () => {
      const registry = { isEnabled: (id: string) => id === 'iris-messaging' };
      const bindings: readonly IrisKillSwitchBinding[] = Object.freeze([
        Object.freeze({ componentId: 'iris-messaging', readEnabled: (r) => r.isEnabled('iris-messaging') }),
      ]);
      const binder = new IrisKillSwitchBinder();
      const a = binder.snapshot(registry, bindings);
      const b = binder.snapshot(registry, bindings);
      expect(a.entries.length).toBe(b.entries.length);
      expect(a.entries[0].enabled).toBe(b.entries[0].enabled);
      expect(a.entries[0].enabled).toBe(true);
    });
  });

  describe('6. Audit invariants', () => {
    it('Audit snapshot non contiene campi di contenuto semantico (text, payload, content, data)', () => {
      const collector = new IrisAuditCollector();
      const snapshot: IrisAuditSnapshot = collector.collect({
        governanceSnapshot: Object.freeze({
          components: Object.freeze([]),
          derivedAt: new Date().toISOString(),
        }),
        killSwitchSnapshot: Object.freeze({
          entries: Object.freeze([]),
          derivedAt: new Date().toISOString(),
        }),
      });
      const snapshotKeys = Object.keys(snapshot);
      for (const key of FORBIDDEN_AUDIT_CONTENT) {
        expect(snapshotKeys).not.toContain(key);
      }
      for (const entry of snapshot.entries) {
        const entryKeys = Object.keys(entry);
        for (const key of FORBIDDEN_AUDIT_CONTENT) {
          expect(entryKeys).not.toContain(key);
        }
      }
    });
  });
});
