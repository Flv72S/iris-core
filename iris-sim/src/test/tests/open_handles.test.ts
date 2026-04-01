import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

import '../setup/open_handle_patch.js';
import { cleanupOpenHandles, getOpenHandles } from '../utils/open_handle_tracker.js';

describe('Open handle tracker', () => {
  it('tracks interval leaks and cleanup removes them', async () => {
    const leaked = setInterval(() => {}, 1000);
    const open = getOpenHandles();
    assert.ok(open.some((h) => h.ref === leaked && h.type === 'interval'));
    await cleanupOpenHandles();
    assert.ok(!getOpenHandles().some((h) => h.ref === leaked));
  });

  it('cleared timeout is not left tracked', () => {
    const t = setTimeout(() => {}, 10);
    clearTimeout(t);
    assert.ok(!getOpenHandles().some((h) => h.ref === t));
  });

  it('tracks HTTP server and cleanup closes it', async () => {
    const server = http.createServer((_req, res) => {
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    assert.ok(getOpenHandles().some((h) => h.ref === server && h.type === 'server'));
    await cleanupOpenHandles();
    assert.ok(!getOpenHandles().some((h) => h.ref === server));
  });

  it('proper HTTP close untracks server', async () => {
    const server = http.createServer((_req, res) => {
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    await new Promise<void>((resolve, reject) =>
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      }),
    );
    assert.ok(!getOpenHandles().some((h) => h.ref === server));
  });
});
