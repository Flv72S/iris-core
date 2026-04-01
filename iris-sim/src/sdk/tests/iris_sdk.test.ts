import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { randomUUID } from 'node:crypto';
import { IrisNode } from '../index.js';
import { IrisErrorCode, IrisError } from '../iris_errors.js';

function randomPort(): number {
  return 41000 + Math.floor(Math.random() * 2000);
}

describe('IRIS SDK (16A)', () => {
  it('start → OK; stop → OK', async () => {
    const node = new IrisNode();
    await node.start();
    assert.ok(node.getStatus().started);
    await node.stop();
    assert.strictEqual(node.getStatus().started, false);
  });

  it('zero-config → message flow OK', async () => {
    const node = new IrisNode();
    const ready = new Promise<void>((resolve) => node.on('node:ready', () => resolve()));

    await node.start();
    await ready;

    const received = new Promise<any>((resolve) => node.on('message', (m: any) => resolve(m)));
    await node.send({ type: 'PING', payload: { x: 1 } });

    const msg = await received;
    assert.strictEqual(msg.type, 'PING');
    assert.deepStrictEqual(msg.payload, { x: 1 });

    await node.stop();
  });

  it('invalid config → handled', async () => {
    const node = new IrisNode({ transport: { type: 'smtp' as any, options: {} } } as any);
    await assert.rejects(
      () => node.start(),
      (e: unknown) => e instanceof IrisError && e.code === IrisErrorCode.INVALID_CONFIG,
    );
  });

  it('health: modules up/down detection', async () => {
    const port = randomPort();
    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      features: { encryption: false, replay_protection: false, covenants: true },
    });
    await node.start();

    const h = node.health();
    assert.strictEqual(h.modules.transport, 'up');
    assert.strictEqual(h.modules.session, 'up');
    assert.strictEqual(h.modules.messaging, 'up');
    assert.strictEqual(h.modules.encryption, 'down');
    assert.strictEqual(h.modules.replay, 'down');
    assert.strictEqual(h.modules.covenants, 'up');

    await node.stop();
  });

  it('encryption ON → encrypted over transport, decrypted to message event', async () => {
    const port = randomPort();
    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      features: { encryption: true, replay_protection: false, covenants: false },
    });
    await node.start();

    const received = new Promise<any>((resolve) => node.on('message', (m: any) => resolve(m)));
    const irisMsg = { type: 'PING', payload: { y: randomUUID() } };
    await node.send(irisMsg as any);

    const msg = await received;
    assert.strictEqual(msg.type, 'PING');
    assert.deepStrictEqual(msg.payload, irisMsg.payload);

    const state = node.getState();
    assert.strictEqual(state.last_sent_is_encrypted, true);

    await node.stop();
  });

  it('observability: metrics snapshot on message + metrics.json', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-obs-'));
    const port = randomPort();
    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      observability: { logging: true, metrics: true, tracing: true, cwd: tmp },
    });
    await node.start();
    await node.send({ type: 'OBS', payload: { n: 1 } });
    await new Promise((r) => setTimeout(r, 80));
    const snap = node.getMetricsSnapshot();
    assert.ok(snap);
    assert.ok((snap.metrics.messages_sent ?? 0) >= 1);
    assert.ok((snap.metrics.messages_received ?? 0) >= 1);
    const mp = path.join(tmp, '.iris', 'metrics.json');
    const op = path.join(tmp, '.iris', 'observability.snapshot.json');
    assert.ok(fs.existsSync(mp));
    assert.ok(fs.existsSync(op));
    await node.stop();
  });

  it('observability: traceId is correlated across send and receive logs', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-obs-trace-'));
    const port = randomPort();
    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      observability: { logging: true, metrics: true, tracing: true, cwd: tmp },
    });
    await node.start();
    await node.send({ type: 'TRACE_TEST', payload: { ok: true } });
    await new Promise((r) => setTimeout(r, 80));

    const logFile = path.join(tmp, '.iris', 'iris.log');
    const lines = fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter(Boolean);
    const sendLine = lines.find((l) => l.includes('"message":"message_send"'));
    const recvLine = lines.find((l) => l.includes('"message":"message_receive"'));
    assert.ok(sendLine);
    assert.ok(recvLine);
    const sendLog = JSON.parse(sendLine as string) as { traceId: string };
    const recvLog = JSON.parse(recvLine as string) as { traceId: string };
    assert.ok(sendLog.traceId.length > 0);
    assert.strictEqual(sendLog.traceId, recvLog.traceId);
    await node.stop();
  });

  it('replay ON → repeated send remains stable', async () => {
    const port = randomPort();
    const node = new IrisNode({
      transport: { type: 'ws', options: { port, host: '127.0.0.1' } },
      features: { encryption: false, replay_protection: true, covenants: false },
    });
    await node.start();
    try {
      let messageCount = 0;
      let errorCount = 0;
      node.on('message', () => messageCount++);
      node.on('error', () => errorCount++);

      const irisMsg = { type: 'CMD', payload: { a: 1 } };
      await node.send(irisMsg as any);
      await node.send(irisMsg as any);

      await new Promise((r) => setTimeout(r, 300));
      // SDK send() regenerates tracing metadata per call; replay remains active but these
      // sends are treated as distinct envelopes. Stability here means no drops/crashes.
      assert.strictEqual(messageCount, 2);
      assert.strictEqual(errorCount, 0);
    } finally {
      await node.stop();
    }
  });
});

