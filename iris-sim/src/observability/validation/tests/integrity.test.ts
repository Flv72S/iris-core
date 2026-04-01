import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MetricsRegistry } from '../../metrics/metrics_registry.js';
import { Tracer } from '../../tracing/tracer.js';
import { validateObservabilityState } from '../integrity_checker.js';

describe('Observability validation / integrity', () => {
  it('valid state passes checks', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-obs-integrity-'));
    const irisDir = path.join(tmp, '.iris');
    fs.mkdirSync(irisDir, { recursive: true });
    fs.writeFileSync(
      path.join(irisDir, 'iris.log'),
      `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: 'x', traceId: 't1' })}\n`,
      'utf8',
    );
    const metrics = new MetricsRegistry();
    metrics.increment('messages_sent');
    const tracer = new Tracer();
    const span = tracer.startSpan('ok');
    tracer.endSpan(span);
    const r = validateObservabilityState({ cwd: tmp, metrics, tracer });
    assert.strictEqual(r.valid, true);
    assert.strictEqual(r.issues.length, 0);
  });
});

