import { randomUUID } from 'node:crypto';

import type { AlertCondition, AlertLevel, AlertRule } from '../../observability/alerting/index.js';
import {
  loadAlertRules,
  readActiveAlertsSnapshot,
  saveAlertRules,
} from '../../observability/alerting/index.js';
import type { CliCommandResult } from '../cli_types.js';
import { irisDir } from './state_store.js';

function parseAddArgs(argv: string[]): {
  metric?: string;
  operator?: AlertCondition['operator'];
  threshold?: number;
  level?: AlertLevel;
  name?: string;
  cooldownMs?: number;
} {
  const out: ReturnType<typeof parseAddArgs> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--metric' && argv[i + 1]) {
      out.metric = argv[++i];
    } else if (a === '--operator' && argv[i + 1]) {
      out.operator = argv[++i] as AlertCondition['operator'];
    } else if (a === '--threshold' && argv[i + 1]) {
      out.threshold = Number(argv[++i]);
    } else if (a === '--level' && argv[i + 1]) {
      out.level = argv[++i] as AlertLevel;
    } else if (a === '--name' && argv[i + 1]) {
      out.name = argv[++i];
    } else if (a === '--cooldown' && argv[i + 1]) {
      out.cooldownMs = Number(argv[++i]);
    }
  }
  return out;
}

const OPS: AlertCondition['operator'][] = ['>', '<', '>=', '<=', '==', '!='];
const LEVELS: AlertLevel[] = ['INFO', 'WARNING', 'CRITICAL'];

export async function runAlerts(cwd: string, argv: string[]): Promise<CliCommandResult> {
  irisDir(cwd);
  const sub = argv[3];
  const rest = argv.slice(4);

  if (sub === 'list') {
    const rules = loadAlertRules(cwd);
    if (rules.length === 0) {
      console.log('(no alert rules; use `iris alerts add ...`)');
      return { exitCode: 0 };
    }
    console.log(JSON.stringify({ rules }, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'active') {
    const active = readActiveAlertsSnapshot(cwd);
    if (active.length === 0) {
      console.log('(no active alerts)');
      return { exitCode: 0 };
    }
    console.log(JSON.stringify({ active }, null, 2));
    return { exitCode: 0 };
  }

  if (sub === 'add') {
    const p = parseAddArgs(rest);
    if (!p.metric || p.operator === undefined || !Number.isFinite(p.threshold)) {
      console.error('Usage: iris alerts add --metric <name> --operator <op> --threshold <n> [--level INFO|WARNING|CRITICAL] [--name <label>] [--cooldown <ms>]');
      return { exitCode: 1 };
    }
    const threshold = p.threshold as number;
    if (!OPS.includes(p.operator)) {
      console.error(`Invalid --operator (use one of: ${OPS.join(', ')})`);
      return { exitCode: 1 };
    }
    const level = p.level ?? 'WARNING';
    if (!LEVELS.includes(level)) {
      console.error(`Invalid --level (use one of: ${LEVELS.join(', ')})`);
      return { exitCode: 1 };
    }
    const rules = loadAlertRules(cwd);
    const id = `al-${randomUUID()}`;
    const rule: AlertRule = {
      id,
      name: p.name ?? id,
      level,
      condition: { metric: p.metric, operator: p.operator, threshold },
      ...(Number.isFinite(p.cooldownMs) && (p.cooldownMs as number) > 0 ? { cooldownMs: p.cooldownMs } : {}),
    };
    rules.push(rule);
    saveAlertRules(cwd, rules);
    console.log(`Registered alert rule ${id}`);
    return { exitCode: 0 };
  }

  if (sub === 'remove') {
    const id = rest[0];
    if (!id || id.startsWith('-')) {
      console.error('Usage: iris alerts remove <ruleId>');
      return { exitCode: 1 };
    }
    const before = loadAlertRules(cwd);
    const rules = before.filter((r) => r.id !== id);
    if (rules.length === before.length) {
      console.error(`Rule not found: ${id}`);
      return { exitCode: 1 };
    }
    saveAlertRules(cwd, rules);
    console.log(`Removed rule ${id}`);
    return { exitCode: 0 };
  }

  console.error('Usage: iris alerts <list|add|active|remove>');
  return { exitCode: 1 };
}
