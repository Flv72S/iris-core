/**
 * Phase 16E.X1 — /metrics HTTP server smoke test.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

import { startMetricsServer } from '../http_server.js';

function httpGet(url: string): Promise<{ status: number; body: string; ct: string | undefined }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c as Buffer));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
            ct: res.headers['content-type'],
          });
        });
      })
      .on('error', reject);
  });
}

describe('Observability / Prometheus http_server', () => {
  it('GET /metrics returns text/plain and body from getMetrics', async () => {
    const port = 31000 + Math.floor(Math.random() * 2000);
    const handle = startMetricsServer(() => '# HELP iris_x x\n# TYPE iris_x gauge\niris_x 1\n', port);
    try {
      const r = await httpGet(`http://127.0.0.1:${port}/metrics`);
      assert.strictEqual(r.status, 200);
      assert.ok(r.ct?.includes('text/plain'));
      assert.ok(r.ct?.includes('version=0.0.4'));
      assert.ok(r.body.includes('iris_x'));
    } finally {
      await handle.close();
    }
  });

  it('other paths return 404', async () => {
    const port = 33000 + Math.floor(Math.random() * 2000);
    const handle = startMetricsServer(() => 'x', port);
    try {
      const r = await httpGet(`http://127.0.0.1:${port}/`);
      assert.strictEqual(r.status, 404);
    } finally {
      await handle.close();
    }
  });

  it('GET /metrics returns 500 when getMetrics throws', async () => {
    const port = 34000 + Math.floor(Math.random() * 2000);
    const handle = startMetricsServer(() => {
      throw new Error('boom');
    }, port);
    try {
      const r = await httpGet(`http://127.0.0.1:${port}/metrics`);
      assert.strictEqual(r.status, 500);
      assert.ok(r.body.includes('boom'));
    } finally {
      await handle.close();
    }
  });
});
