/**
 * Phase 16E — Persist metrics snapshot to `.iris/metrics.json`.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { MetricsRegistry } from './metrics_registry.js';

function toDeterministicMetrics(metrics: Record<string, number>): Record<string, number> {
  const sortedKeys = Object.keys(metrics).sort();
  const out: Record<string, number> = {};
  for (const k of sortedKeys) out[k] = metrics[k];
  return out;
}

export function writeMetricsSnapshot(
  cwd: string,
  nodeId: string,
  registry: MetricsRegistry,
  nodeStartedAt: number | null,
  activeSessions: number,
): void {
  if (nodeStartedAt != null) {
    registry.gauge('node_uptime_seconds', (Date.now() - nodeStartedAt) / 1000);
  }
  registry.gauge('active_sessions', activeSessions);
  const p = path.join(cwd, '.iris', 'metrics.json');
  const tmp = `${p}.tmp`;
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const snap = registry.exportJson();
    const payload = {
      metrics: toDeterministicMetrics(snap.metrics),
      timestamp: snap.generatedAt,
      nodeId,
    };
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, p);
  } catch {
    // ignore IO errors (permissions)
  }
}
