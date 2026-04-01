/**
 * Phase 16E.X1 / 16E.X1.FIX — Prometheus text exposition format (0.0.4 compatible, labeled series).
 */

import type { MetricLabels, PromMetric } from './registry_adapter.js';

function escapeHelp(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

function formatSampleValue(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toString();
}

/**
 * Escape a label value per Prometheus exposition (backslash and double-quote).
 */
export function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

/**
 * Render sorted `{k="v",...}` or empty string if no labels.
 */
export function renderLabels(labels: MetricLabels): string {
  const keys = Object.keys(labels).sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) return '';
  const inner = keys.map((k) => `${k}="${escapeLabelValue(labels[k] ?? '')}"`).join(',');
  return `{${inner}}`;
}

/**
 * Render Prometheus text format. Deterministic: metrics pre-sorted; HELP/TYPE once per metric name.
 */
export function renderPrometheusMetrics(metrics: PromMetric[]): string {
  const sorted = [...metrics].sort((a, b) => {
    const n = a.name.localeCompare(b.name);
    if (n !== 0) return n;
    const la = Object.keys(a.labels)
      .sort()
      .map((k) => `${k}=${a.labels[k]}`)
      .join('|');
    const lb = Object.keys(b.labels)
      .sort()
      .map((k) => `${k}=${b.labels[k]}`)
      .join('|');
    return la.localeCompare(lb);
  });

  const lines: string[] = [];
  let lastHelpTypeName = '';

  for (const m of sorted) {
    if (typeof m.value !== 'number' || !Number.isFinite(m.value)) continue;

    if (m.name !== lastHelpTypeName) {
      lines.push(`# HELP ${m.name} ${escapeHelp(m.help)}`);
      lines.push(`# TYPE ${m.name} ${m.type}`);
      lastHelpTypeName = m.name;
    }

    const labelPart = renderLabels(m.labels);
    lines.push(`${m.name}${labelPart} ${formatSampleValue(m.value)}`);
  }

  return lines.join('\n') + (lines.length > 0 ? '\n' : '');
}
