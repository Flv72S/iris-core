import fs from 'node:fs';

import { readObservabilitySnapshot } from '../../observability/observability_persist.js';
import { mapMetricsToPrometheus } from '../../observability/prometheus/registry_adapter.js';
import { renderPrometheusMetrics } from '../../observability/prometheus/exporter.js';
import type { CliCommandResult } from '../cli_types.js';
import { metricsPath } from './state_store.js';

type StandardMetrics = { metrics: Record<string, number>; timestamp: string; nodeId: string };

function asStandard(input: any): StandardMetrics {
  if (input && typeof input === 'object' && 'timestamp' in input && 'metrics' in input && 'nodeId' in input) {
    return input as StandardMetrics;
  }
  return {
    metrics: (input?.metrics ?? {}) as Record<string, number>,
    timestamp: String(input?.generatedAt ?? new Date().toISOString()),
    nodeId: String(input?.nodeId ?? 'unknown'),
  };
}

function printTable(snapshot: StandardMetrics): void {
  console.log('📊 IRIS Metrics\n');
  console.log(`timestamp: ${snapshot.timestamp}`);
  console.log(`nodeId: ${snapshot.nodeId}\n`);
  for (const [k, v] of Object.entries(snapshot.metrics)) {
    console.log(`${k.padEnd(28)} ${String(v)}`);
  }
}

function loadMetricsSnapshot(cwd: string): StandardMetrics | null {
  const unified = readObservabilitySnapshot(cwd);
  if (unified) {
    return asStandard(unified.metrics);
  }
  const p = metricsPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return asStandard(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function runMetrics(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const pretty = argv.includes('--pretty') || argv.includes('-p');
  const jsonMode = argv.includes('--json');
  const prometheusMode = argv.includes('--prometheus');
  const snap = loadMetricsSnapshot(cwd);
  if (!snap) {
    if (jsonMode) {
      console.log(JSON.stringify({ metrics: {}, timestamp: new Date().toISOString(), nodeId: 'unknown' }));
    } else if (prometheusMode) {
      console.log('');
    } else {
      console.log('⚠️ No metrics snapshot yet (start a node with `iris start` to populate `.iris/observability.snapshot.json`).');
    }
    return { exitCode: 0 };
  }
  try {
    if (prometheusMode) {
      const prom = mapMetricsToPrometheus(snap);
      process.stdout.write(renderPrometheusMetrics(prom));
    } else if (jsonMode) console.log(JSON.stringify(snap));
    else if (pretty) printTable(snap);
    else console.log(JSON.stringify(snap, null, 2));
    return { exitCode: 0 };
  } catch (e) {
    console.error('Failed to read metrics:', (e as Error).message);
    return { exitCode: 1 };
  }
}
