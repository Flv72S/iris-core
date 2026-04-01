/**
 * Phase 16E.X4 — Pluggable alert actions (async, non-blocking fire-and-forget from engine).
 */

import fs from 'node:fs';
import path from 'node:path';

import type { AlertInstance } from './alert_types.js';

export type AlertAction = (alert: AlertInstance) => Promise<void>;

export function createConsoleAlertAction(): AlertAction {
  return async (alert: AlertInstance) => {
    const line = `[ALERT] ruleId=${alert.ruleId} value=${alert.value} triggeredAt=${alert.triggeredAt}${alert.resolvedAt != null ? ` resolvedAt=${alert.resolvedAt}` : ''}`;
    console.log(line);
  };
}

/** Append JSON lines to `.iris/alerts.log` under cwd. */
export function createFileAlertAction(cwd: string): AlertAction {
  const p = path.join(cwd, '.iris', 'alerts.log');
  return async (alert: AlertInstance) => {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      const line = `${JSON.stringify({ ...alert, at: new Date().toISOString() })}\n`;
      fs.appendFileSync(p, line, 'utf8');
    } catch {
      // ignore IO errors
    }
  };
}

export class AlertActionPipeline {
  private readonly actions: AlertAction[] = [];

  register(...actions: AlertAction[]): void {
    for (const a of actions) {
      this.actions.push(a);
    }
  }

  get size(): number {
    return this.actions.length;
  }

  /** Run all actions in parallel; errors in one action do not block others. */
  async dispatch(alert: AlertInstance): Promise<void> {
    await Promise.all(
      this.actions.map(async (fn) => {
        try {
          await fn(alert);
        } catch {
          // swallow action errors
        }
      }),
    );
  }
}
