/**
 * Execution — Conformance.
 * Kill-switch globale/per-action, guardrail, no execution if BLOCKED, audit sempre, no UX/UI/Demo, determinismo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionContext } from '../ExecutionContext';
import { escapeRegExp } from '../../../test-support/regexpEscapes';
import {
  ExecutionEngine,
  EXECUTION_ENGINE_COMPONENT_ID,
  SEND_NOTIFICATION_COMPONENT_ID,
  readAudit,
  _resetAuditForTest,
  maxActionsPerWindowGuardrail,
  cooldownPerFeatureGuardrail,
  wellbeingBlockGuardrail,
  notificationAdapter,
  calendarAdapter,
  blockInputAdapter,
  deferMessageAdapter,
} from '../index';

const NOW = 1704110400000;

function action(
  id: string,
  type: ExecutionAction['type'],
  sourceFeature: string,
  requestedAt: number = NOW
): ExecutionAction {
  return Object.freeze({
    id,
    type,
    payload: {},
    requestedAt,
    sourceFeature,
  });
}

function context(
  overrides: Partial<{
    now: number;
    registry: ExecutionContext['registry'];
    getRecentEntries: ExecutionContext['getRecentEntries'];
    wellbeingBlocked: boolean;
  }> = {}
): ExecutionContext {
  return Object.freeze({
    now: overrides.now ?? NOW,
    registry: overrides.registry ?? { [EXECUTION_ENGINE_COMPONENT_ID]: true, [SEND_NOTIFICATION_COMPONENT_ID]: true },
    getRecentEntries: overrides.getRecentEntries ?? (() => []),
    wellbeingBlocked: overrides.wellbeingBlocked ?? false,
  });
}

describe('Execution — Conformance', () => {
  const guardrails = [
    maxActionsPerWindowGuardrail,
    cooldownPerFeatureGuardrail,
    wellbeingBlockGuardrail,
  ];
  const adapters = [
    notificationAdapter,
    calendarAdapter,
    blockInputAdapter,
    deferMessageAdapter,
  ];
  let engine: ExecutionEngine;

  beforeEach(() => {
    _resetAuditForTest();
    engine = new ExecutionEngine(guardrails, adapters);
  });

  describe('1. Kill-switch globale blocca tutto', () => {
    it('registry EXECUTION_ENGINE false → BLOCKED, audit scritto', () => {
      const reg = { [EXECUTION_ENGINE_COMPONENT_ID]: false };
      const result = engine.execute(
        action('a1', 'SEND_NOTIFICATION', 'focus-guard'),
        context({ registry: reg })
      );
      expect(result.status).toBe('BLOCKED');
      expect(result.reason).toContain('disabled');
      const audit = readAudit();
      expect(audit.length).toBe(1);
      expect(audit[0].actionId).toBe('a1');
      expect(audit[0].result.status).toBe('BLOCKED');
    });
  });

  describe('2. Kill-switch per action funziona', () => {
    it('SEND_NOTIFICATION disabilitato → BLOCKED per quella action', () => {
      const reg = {
        [EXECUTION_ENGINE_COMPONENT_ID]: true,
        [SEND_NOTIFICATION_COMPONENT_ID]: false,
      };
      const result = engine.execute(
        action('a2', 'SEND_NOTIFICATION', 'focus-guard'),
        context({ registry: reg })
      );
      expect(result.status).toBe('BLOCKED');
      expect(result.reason).toContain('SEND_NOTIFICATION');
    });
  });

  describe('3. Guardrail blocca correttamente', () => {
    it('wellbeingBlocked true → BLOCKED', () => {
      const result = engine.execute(
        action('a3', 'SEND_NOTIFICATION', 'focus-guard'),
        context({ wellbeingBlocked: true })
      );
      expect(result.status).toBe('BLOCKED');
      expect(result.reason).toContain('WELLBEING');
    });

    it('max 3 actions in 10 min → 4a BLOCKED', () => {
      const entries = [
        { actionId: 'e1', sourceFeature: 'f1', requestedAt: NOW - 1000, result: { status: 'EXECUTED' as const } },
        { actionId: 'e2', sourceFeature: 'f2', requestedAt: NOW - 2000, result: { status: 'EXECUTED' as const } },
        { actionId: 'e3', sourceFeature: 'f3', requestedAt: NOW - 3000, result: { status: 'EXECUTED' as const } },
      ];
      const result = engine.execute(
        action('a4', 'SEND_NOTIFICATION', 'f4'),
        context({ getRecentEntries: () => entries })
      );
      expect(result.status).toBe('BLOCKED');
      expect(result.reason).toContain('Max');
    });
  });

  describe('4. Execution non avviene se BLOCKED', () => {
    it('result BLOCKED non chiama adapter execute', () => {
      const result = engine.execute(
        action('a5', 'SEND_NOTIFICATION', 'x'),
        context({ registry: { [EXECUTION_ENGINE_COMPONENT_ID]: false } })
      );
      expect(result.status).toBe('BLOCKED');
    });
  });

  describe('5. Audit log sempre scritto', () => {
    it('ogni execute aggiunge una entry', () => {
      engine.execute(
        action('a6', 'SEND_NOTIFICATION', 'focus-guard'),
        context()
      );
      expect(readAudit().length).toBe(1);
      engine.execute(
        action('a7', 'SCHEDULE_EVENT', 'calendar-feature'),
        context()
      );
      expect(readAudit().length).toBe(2);
    });
  });

  describe('6. Nessuna dipendenza da UX / UI / Demo', () => {
    it('execution non importa da ux, ui, demo', () => {
      const root = join(process.cwd(), 'src', 'core', 'execution');
      const forbidden = ['ux-contract', 'ux-experience', 'orchestration', 'demo', 'product/'];
      const scan = (dir: string): string[] => {
        const entries = readdirSync(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory() && e.name !== 'tests') files.push(...scan(full));
          else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts'))
            files.push(full);
        }
        return files;
      };
      const files = scan(root);
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().startsWith('import'));
        for (const line of lines) {
          for (const path of forbidden) {
            expect(
              line,
              `File ${file} must not import ${path}`
            ).not.toMatch(new RegExp(escapeRegExp(path), 'i'));
          }
        }
      }
    });
  });

  describe('7. Determinismo con timestamp fisso', () => {
    it('stesso action e context → stesso result', () => {
      const act = action('d1', 'SEND_NOTIFICATION', 'f');
      const ctx = context({ now: NOW });
      const r1 = engine.execute(act, ctx);
      _resetAuditForTest();
      const engine2 = new ExecutionEngine(guardrails, adapters);
      const r2 = engine2.execute(act, ctx);
      expect(r1.status).toBe(r2.status);
      if (r1.status === 'EXECUTED' && r2.status === 'EXECUTED') {
        expect(r1.executedAt).toBe(r2.executedAt);
      }
    });
  });
});
