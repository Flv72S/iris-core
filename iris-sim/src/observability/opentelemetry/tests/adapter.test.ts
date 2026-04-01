import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

import { Tracer } from '../../tracing/tracer.js';
import { createTracerSpanSource } from '../../span_source.js';
import { DEFAULT_OTEL_EVENTS_CONFIG } from '../otel_types.js';
import { OpenTelemetryAdapter } from '../otel_adapter.js';

describe('OpenTelemetryAdapter', () => {
  it('batches drain on exportNow and POSTs OTLP JSON', async () => {
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
    const port = addr.port;
    const endpoint = `http://127.0.0.1:${port}/v1/traces`;

    const tracer = new Tracer();
    const s = tracer.startSpan('message_send', { traceId: 'trace-adapter-1' });
    tracer.endSpan(s);

    const adapter = new OpenTelemetryAdapter({
      spanSource: createTracerSpanSource(tracer),
      endpoint,
      serviceName: 'test-svc',
      flushIntervalMs: 60_000,
      nodeId: 'n1',
      events: DEFAULT_OTEL_EVENTS_CONFIG,
    });

    assert.strictEqual(tracer.exportSpans().length, 1);
    await adapter.exportNow();
    assert.strictEqual(tracer.exportSpans().length, 0);
    assert.strictEqual(received.length, 1);
    const payload = JSON.parse(received[0]!) as { resourceSpans: unknown[] };
    assert.strictEqual(Array.isArray(payload.resourceSpans), true);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('flush interval triggers export (batching)', async () => {
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

    const tracer = new Tracer();
    const s = tracer.startSpan('x', { traceId: 't-timer' });
    tracer.endSpan(s);

    const adapter = new OpenTelemetryAdapter({
      spanSource: createTracerSpanSource(tracer),
      endpoint,
      serviceName: 'svc',
      flushIntervalMs: 50,
      nodeId: 'n',
      events: DEFAULT_OTEL_EVENTS_CONFIG,
    });

    adapter.start();
    await new Promise((r) => setTimeout(r, 120));
    adapter.stop();

    assert.ok(received.length >= 1);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('shutdown exportNow drains remaining spans', async () => {
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

    const tracer = new Tracer();
    const s = tracer.startSpan('shutdown', { traceId: 'trace-shut' });
    tracer.endSpan(s);

    const adapter = new OpenTelemetryAdapter({
      spanSource: createTracerSpanSource(tracer),
      endpoint,
      serviceName: 'svc',
      flushIntervalMs: 60000,
      nodeId: 'n',
      events: DEFAULT_OTEL_EVENTS_CONFIG,
    });

    await adapter.exportNow();
    assert.strictEqual(tracer.exportSpans().length, 0);
    assert.strictEqual(received.length, 1);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
