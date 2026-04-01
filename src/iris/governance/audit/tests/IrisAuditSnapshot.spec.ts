/**
 * IRIS 10.0.2 — Audit Snapshot conformance
 * Presenza audit, assenza contenuto/decisione, determinismo, immutabilità, separazione.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IrisGovernanceSnapshot } from '../../IrisGovernanceSnapshot';
import type { IrisKillSwitchSnapshot } from '../../binding/IrisKillSwitchSnapshot';
import {
  IrisAuditCollector,
  type IrisAuditEntry,
  type IrisAuditSnapshot,
} from '../index';

const FORBIDDEN_CONTENT = ['text', 'payload', 'content', 'data'];
const FORBIDDEN_DECISION = ['decision', 'severity', 'importance', 'score'];
const FORBIDDEN_ANTI_PATTERN = [
  'auditScore',
  'criticality',
  'importanceLevel',
  'smartAudit',
  'relevance',
  'recommendation',
];

const AUDIT_ROOT = join(process.cwd(), 'src', 'iris', 'governance', 'audit');

function makeGovernanceSnapshot(overrides?: Partial<IrisGovernanceSnapshot>): IrisGovernanceSnapshot {
  return Object.freeze({
    version: '10.0',
    components: Object.freeze([]),
    derivedAt: new Date().toISOString(),
    ...overrides,
  });
}

function makeKillSwitchSnapshot(overrides?: Partial<IrisKillSwitchSnapshot>): IrisKillSwitchSnapshot {
  return Object.freeze({
    entries: Object.freeze([]),
    derivedAt: new Date().toISOString(),
    ...overrides,
  });
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

describe('IRIS 10.0.2 — Audit Snapshot conformance', () => {
  describe('1. Presenza audit', () => {
    it('governance e kill-switch sono sempre presenti nello snapshot', () => {
      const collector = new IrisAuditCollector();
      const snapshot = collector.collect({
        governanceSnapshot: makeGovernanceSnapshot(),
        killSwitchSnapshot: makeKillSwitchSnapshot(),
      });

      const types = snapshot.entries.map((e) => e.type);
      expect(types).toContain('governance');
      expect(types).toContain('kill-switch');
      const gov = snapshot.entries.find((e) => e.type === 'governance');
      const kill = snapshot.entries.find((e) => e.type === 'kill-switch');
      expect(gov?.present).toBe(true);
      expect(kill?.present).toBe(true);
    });
  });

  describe('2. Assenza contenuto', () => {
    it('nessun campo text, payload, content, data in entry o snapshot', () => {
      const entry: IrisAuditEntry = Object.freeze({
        id: 'e1',
        type: 'interpretation',
        present: true,
        derivedAt: new Date().toISOString(),
      });
      const snapshot: IrisAuditSnapshot = Object.freeze({
        entries: Object.freeze([entry]),
        derivedAt: new Date().toISOString(),
      });
      const entryKeys = Object.keys(entry);
      const snapshotKeys = Object.keys(snapshot);
      for (const key of FORBIDDEN_CONTENT) {
        expect(entryKeys).not.toContain(key);
        expect(snapshotKeys).not.toContain(key);
      }
    });
  });

  describe('3. Assenza decisione', () => {
    it('nessuna proprietà decision, severity, importance, score', () => {
      const entry: IrisAuditEntry = Object.freeze({
        id: 'e1',
        type: 'orchestration',
        present: false,
        derivedAt: new Date().toISOString(),
      });
      const snapshot: IrisAuditSnapshot = Object.freeze({
        entries: Object.freeze([entry]),
        derivedAt: new Date().toISOString(),
      });
      const allKeys = [...Object.keys(entry), ...Object.keys(snapshot)];
      for (const key of FORBIDDEN_DECISION) {
        expect(allKeys).not.toContain(key);
      }
    });

    it('nessun anti-pattern: auditScore, criticality, importanceLevel, smartAudit, relevance, recommendation', () => {
      const snapshot: IrisAuditSnapshot = Object.freeze({
        entries: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
      const allKeys = [...Object.keys(snapshot), ...snapshot.entries.flatMap((e) => Object.keys(e))];
      for (const key of FORBIDDEN_ANTI_PATTERN) {
        expect(allKeys).not.toContain(key);
      }
    });
  });

  describe('4. Determinismo', () => {
    it('stessi input → stesso snapshot (stesso hash se computeHash: true)', () => {
      const input = {
        governanceSnapshot: makeGovernanceSnapshot(),
        killSwitchSnapshot: makeKillSwitchSnapshot(),
      };
      const collector = new IrisAuditCollector();
      const a = collector.collect(input, { computeHash: true });
      const b = collector.collect(input, { computeHash: true });
      expect(a.entries.length).toBe(b.entries.length);
      for (let i = 0; i < a.entries.length; i++) {
        expect(a.entries[i].type).toBe(b.entries[i].type);
        expect(a.entries[i].present).toBe(b.entries[i].present);
      }
      expect(a.snapshotHash).toBeDefined();
      expect(b.snapshotHash).toBeDefined();
      expect(a.snapshotHash).toBe(b.snapshotHash);
    });
  });

  describe('5. Immutabilità', () => {
    it('snapshot e entries sono frozen', () => {
      const collector = new IrisAuditCollector();
      const snapshot = collector.collect({
        governanceSnapshot: makeGovernanceSnapshot(),
        killSwitchSnapshot: makeKillSwitchSnapshot(),
      });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.entries)).toBe(true);
      for (const entry of snapshot.entries) {
        expect(Object.isFrozen(entry)).toBe(true);
      }
    });
  });

  describe('6. Separazione', () => {
    it('nessun file audit importa direttamente da engine o layer interni', () => {
      const tsFiles = collectTsFiles(AUDIT_ROOT);
      const engineOrLayerPattern = /(?:^import\s|^\s*from\s+['\"])[^'\n]*(?:semantic-layer[/\\]engine|[/\\]IrisInterpretationEngine|[/\\]IrisOrchestrationEngine|[/\\]IrisMessagingEngine|[/\\]IrisRenderingEngine)/;
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
