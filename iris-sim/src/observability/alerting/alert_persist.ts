/**
 * Phase 16E.X4 — Persist alert rules and active snapshot under `.iris/`.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { AlertInstance, AlertRule } from './alert_types.js';

export function alertRulesPath(cwd: string): string {
  return path.join(cwd, '.iris', 'alert_rules.json');
}

export function alertsActivePath(cwd: string): string {
  return path.join(cwd, '.iris', 'alerts_active.json');
}

const OBSERVABILITY_SNAPSHOT = 'observability.snapshot.json';

export function loadAlertRules(cwd: string): AlertRule[] {
  const p = alertRulesPath(cwd);
  if (!fs.existsSync(p)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8')) as { rules?: AlertRule[] };
    const rules = data.rules ?? [];
    return rules.filter((r) => typeof r?.id === 'string' && r.id.length > 0);
  } catch {
    return [];
  }
}

export function saveAlertRules(cwd: string, rules: AlertRule[]): void {
  const p = alertRulesPath(cwd);
  const tmp = `${p}.tmp`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const ordered = [...rules].sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(tmp, JSON.stringify({ rules: ordered }, null, 2), 'utf8');
  fs.renameSync(tmp, p);
}

export function writeActiveAlertsSnapshot(cwd: string, active: AlertInstance[]): void {
  const p = alertsActivePath(cwd);
  const tmp = `${p}.tmp`;
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const payload = {
      updatedAt: new Date().toISOString(),
      active: [...active].sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
    };
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, p);
  } catch {
    // ignore
  }
}

export function readActiveAlertsSnapshot(cwd: string): AlertInstance[] {
  const unified = path.join(cwd, '.iris', OBSERVABILITY_SNAPSHOT);
  if (fs.existsSync(unified)) {
    try {
      const data = JSON.parse(fs.readFileSync(unified, 'utf8')) as { alerts?: { active?: AlertInstance[] } };
      if (data.alerts && Array.isArray(data.alerts.active)) {
        return data.alerts.active;
      }
      return [];
    } catch {
      // fall through to legacy
    }
  }
  const p = alertsActivePath(cwd);
  if (!fs.existsSync(p)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8')) as { active?: AlertInstance[] };
    return Array.isArray(data.active) ? data.active : [];
  } catch {
    return [];
  }
}
