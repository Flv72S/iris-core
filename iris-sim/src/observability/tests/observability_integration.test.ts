/**
 * Microstep 16E.FINAL — Cross-layer observability integration tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import { IrisNode } from '../../sdk/index.js';
import { saveAlertRules } from '../alerting/alert_persist.js';
import type { AlertRule } from '../alerting/alert_types.js';
import { validateObservabilitySnapshot } from '../observability_invariants.js';
import { readObservabilitySnapshot, observabilitySnapshotPath } from '../observability_persist.js';
import { runMetrics } from '../../cli/commands/metrics.js';
import { runTraces } from '../../cli/commands/traces.js';
import { runObservability } from '../../cli/commands/observability.js';

function randomPort(): number {
  return 41000 + Math.floor(Math.random() * 2000);
}

describe('Observability integration (16E.FINAL)', () => {
  it('full snapshot: start → message → valid snapshot + unified file', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-obs-int-'));
    const port = randomPort();
    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      observability: { logging: true, metrics: true, tracing: true, cwd: tmp },
    });
    await node.start();
    await node.send({ type: 'PING', payload: { n: 1 } });
    await new Promise((r) => setTimeout(r, 50));

    const snap = node.getObservabilitySnapshot();
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, true, v.ok ? '' : (v as { errors: string[] }).errors.join('; '));
    assert.strictEqual(snap.node.id, node.getStatus().node_id);
    assert.ok(snap.metrics.metrics.messages_sent != null && snap.metrics.metrics.messages_sent >= 1);
    assert.ok(snap.traces?.spans && snap.traces.spans.length >= 1);

    const p = observabilitySnapshotPath(tmp);
    assert.ok(fs.existsSync(p));
    const disk = readObservabilitySnapshot(tmp);
    assert.ok(disk);
    assert.strictEqual(disk!.node.id, snap.node.id);

    await node.stop();
  });

  it('alert flow: rule fires while session active, resolves after stop', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-alert-'));
    const port = randomPort();
    const rule: AlertRule = {
      id: 'rule-sess',
      name: 'active_sessions_gt_0',
      level: 'WARNING',
      condition: { metric: 'active_sessions', operator: '>', threshold: 0 },
    };
    saveAlertRules(tmp, [rule]);

    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      observability: { logging: false, metrics: true, tracing: false, alerting: true, cwd: tmp },
    });
    await node.start();
    const whileUp = node.getObservabilitySnapshot();
    assert.ok(whileUp.alerts?.active && whileUp.alerts.active.length >= 1);
    assert.ok(whileUp.alerts.active.some((a) => a.ruleId === 'rule-sess'));

    await node.stop();
    const afterStop = node.getObservabilitySnapshot();
    assert.ok(!afterStop.alerts?.active?.length);
  });

  it('trace flow: span in snapshot + OTLP export valid JSON', async () => {
    const received: string[] = [];
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/v1/traces') {
        let body = '';
        req.on('data', (c) => {
          body += c;
        });
        req.on('end', () => {
          received.push(body);
          res.writeHead(200);
          res.end();
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    if (addr == null || typeof addr === 'string') throw new Error('no addr');
    const endpoint = `http://127.0.0.1:${addr.port}/v1/traces`;

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-otel-'));
    const port = randomPort();
    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      observability: {
        logging: false,
        metrics: true,
        tracing: true,
        cwd: tmp,
        otel: { enabled: true, endpoint, flushIntervalMs: 60_000 },
      },
    });
    await node.start();
    await node.send({ type: 'TRACE', payload: { x: 1 } });
    await new Promise((r) => setTimeout(r, 40));

    const snap = node.getObservabilitySnapshot();
    assert.ok(snap.traces?.spans?.length && snap.traces.spans.length >= 1);
    const sp0 = snap.traces!.spans[0]!;
    assert.ok(sp0.traceId && sp0.id);

    await node.stop();
    assert.ok(received.length >= 1);
    const payload = JSON.parse(received[0]!) as { resourceSpans: unknown[] };
    assert.strictEqual(Array.isArray(payload.resourceSpans), true);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('CLI consistency: metrics/traces/observability match snapshot on disk', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cli-obs-'));
    const port = randomPort();
    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      observability: { logging: false, metrics: true, tracing: true, cwd: tmp },
    });
    await node.start();
    await node.send({ type: 'CLI', payload: {} });
    await new Promise((r) => setTimeout(r, 50));
    node.getMetricsSnapshot();
    await node.stop();

    const disk = readObservabilitySnapshot(tmp);
    assert.ok(disk);

    let metricsOut = '';
    const logM = console.log;
    console.log = (...args: unknown[]) => {
      metricsOut += args.map(String).join(' ') + '\n';
    };
    await runMetrics(tmp, ['', '', 'metrics', '--json']);
    console.log = logM;
    const metricsJson = JSON.parse(metricsOut.trim()) as { nodeId: string; metrics: Record<string, number> };
    assert.strictEqual(metricsJson.nodeId, disk!.metrics.nodeId);
    assert.deepStrictEqual(metricsJson.metrics, disk!.metrics.metrics);

    let tracesOut = '';
    console.log = (...args: unknown[]) => {
      tracesOut += args.map(String).join(' ') + '\n';
    };
    await runTraces(tmp, ['', '', 'traces', '--json']);
    console.log = logM;
    const tracesJson = JSON.parse(tracesOut.trim()) as { spans: unknown[]; nodeId: string };
    assert.strictEqual(tracesJson.nodeId, disk!.node.id);
    assert.strictEqual(tracesJson.spans.length, disk!.traces?.spans?.length ?? 0);

    let obsOut = '';
    console.log = (...args: unknown[]) => {
      obsOut += args.map(String).join(' ') + '\n';
    };
    await runObservability(tmp, ['', '', 'observability', '--json']);
    console.log = logM;
    const obsJson = JSON.parse(obsOut.trim()) as { node: { id: string }; metrics: unknown };
    assert.strictEqual(obsJson.node.id, disk!.node.id);
  });

  it('feature flags: no traces when tracing off; no alerts when alerting off', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-ff-'));
    const port = randomPort();

    const nodeTr = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      observability: { metrics: true, tracing: false, cwd: tmp },
    });
    await nodeTr.start();
    await nodeTr.send({ type: 'X', payload: {} });
    const s1 = nodeTr.getObservabilitySnapshot();
    assert.strictEqual(s1.traces, undefined);
    await nodeTr.stop();

    const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-ff2-'));
    const nodeAl = new IrisNode({
      transport: { type: 'ws', options: { port: randomPort(), host: '127.0.0.1' } },
      observability: { metrics: true, tracing: false, alerting: false, cwd: tmp2 },
    });
    await nodeAl.start();
    const s2 = nodeAl.getObservabilitySnapshot();
    assert.strictEqual(s2.alerts, undefined);
    await nodeAl.stop();
  });
});
