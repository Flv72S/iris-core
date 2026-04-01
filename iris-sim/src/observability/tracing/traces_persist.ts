/**
 * Phase 16E.X2 — Persist recent IRIS spans to `.iris/traces.json` for CLI inspection.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { SpanModel } from './span.js';

function compareSpans(a: SpanModel, b: SpanModel): number {
  const ta = a.traceId ?? '';
  const tb = b.traceId ?? '';
  if (ta !== tb) return ta < tb ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return a.startTime - b.startTime;
}

export function writeTracerSpansSnapshot(cwd: string, nodeId: string, spans: SpanModel[]): void {
  const p = path.join(cwd, '.iris', 'traces.json');
  const tmp = `${p}.tmp`;
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const ordered = [...spans].sort(compareSpans);
    const payload = {
      nodeId,
      timestamp: new Date().toISOString(),
      spans: ordered,
    };
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, p);
  } catch {
    // ignore IO errors
  }
}
