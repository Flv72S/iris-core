import fs from 'node:fs';
import path from 'node:path';
import type { MetricsRegistry } from '../metrics/metrics_registry.js';
import type { Tracer } from '../tracing/tracer.js';

export type ObservabilityIntegrityResult = {
  valid: boolean;
  issues: string[];
};

export function validateObservabilityState(input?: {
  cwd?: string;
  metrics?: MetricsRegistry | null;
  tracer?: Tracer | null;
}): ObservabilityIntegrityResult {
  const cwd = input?.cwd ?? process.cwd();
  const issues: string[] = [];

  if (input?.metrics) {
    const snap = input.metrics.exportJson();
    for (const [k, v] of Object.entries(snap.metrics)) {
      if (!Number.isFinite(v)) issues.push(`Metric ${k} is not finite`);
      if (v < 0) issues.push(`Metric ${k} is negative`);
    }
  }

  const logFile = path.join(cwd, '.iris', 'iris.log');
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        JSON.parse(line);
      } catch {
        issues.push('Log file contains non-JSON line');
        break;
      }
    }
  }

  if (input?.tracer) {
    if (input.tracer.getOpenSpanCount() > 0) issues.push('Tracer has open spans');
    for (const s of input.tracer.exportSpans()) {
      if (s.endTime == null) issues.push(`Span not closed: ${s.name}`);
      else if (s.endTime < s.startTime) issues.push(`Span has negative duration: ${s.name}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

