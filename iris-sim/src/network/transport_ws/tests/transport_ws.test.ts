/**
 * Microstep 15E.2 — WebSocket/P2P Transport. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import WebSocket from 'ws';
import { WsTransport } from '../transport_ws.js';
import { WsTransportError, WsTransportErrorCode } from '../transport_ws_errors.js';
import type { TransportMessage } from '../../transport/transport_types.js';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomPort(): number {
  return 35000 + Math.floor(Math.random() * 2000);
}

function message(overrides: Partial<TransportMessage> = {}): TransportMessage {
  return {
    raw: { kind: 'demo' },
    metadata: {
      sender_node_id: 'A',
      recipient_node_id: 'B',
      timestamp: Date.now(),
    },
    ...overrides,
  };
}

describe('WebSocket/P2P Transport (15E.2)', () => {
  it('send → receive: A -> B', async () => {
    const portB = randomPort();
    const b = new WsTransport({ node_id: 'B', port: portB });
    let received: TransportMessage | null = null;
    b.onReceive((m) => {
      received = m;
    });
    await b.start();

    const a = new WsTransport({
      node_id: 'A',
      port: randomPort(),
      peers: [{ node_id: 'B', url: `ws://127.0.0.1:${portB}` }],
    });
    await a.start();
    await wait(120);

    const msg = message({ metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } });
    await a.send(msg);
    await wait(80);

    assert.ok(received !== null);
    const r = received as TransportMessage;
    assert.strictEqual(r.metadata.sender_node_id, 'A');
    assert.strictEqual(r.metadata.recipient_node_id, 'B');
    assert.deepStrictEqual(r.raw, msg.raw);

    await a.stop();
    await b.stop();
  });

  it('bidirectional: A <-> B', async () => {
    const portA = randomPort();
    const portB = randomPort();
    const a = new WsTransport({ node_id: 'A', port: portA, peers: [{ node_id: 'B', url: `ws://127.0.0.1:${portB}` }] });
    const b = new WsTransport({ node_id: 'B', port: portB, peers: [{ node_id: 'A', url: `ws://127.0.0.1:${portA}` }] });
    const seenByA: TransportMessage[] = [];
    const seenByB: TransportMessage[] = [];
    a.onReceive((m) => seenByA.push(m));
    b.onReceive((m) => seenByB.push(m));

    try {
      await a.start();
      await b.start();
      await wait(200);

      await a.send({ raw: { from: 'A' }, metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } });
      await b.send({ raw: { from: 'B' }, metadata: { sender_node_id: 'B', recipient_node_id: 'A', timestamp: 2 } });
      await wait(120);

      assert.ok(seenByA.some((m) => (m.raw as { from?: string }).from === 'B'));
      assert.ok(seenByB.some((m) => (m.raw as { from?: string }).from === 'A'));
    } finally {
      await a.stop();
      await b.stop();
    }
  });

  it('multi-node mesh: A -> B -> C and B -> C -> A', async () => {
    const portA = randomPort();
    const portB = randomPort();
    const portC = randomPort();
    const a = new WsTransport({ node_id: 'A', port: portA, peers: [{ node_id: 'B', url: `ws://127.0.0.1:${portB}` }, { node_id: 'C', url: `ws://127.0.0.1:${portC}` }] });
    const b = new WsTransport({ node_id: 'B', port: portB, peers: [{ node_id: 'A', url: `ws://127.0.0.1:${portA}` }, { node_id: 'C', url: `ws://127.0.0.1:${portC}` }] });
    const c = new WsTransport({ node_id: 'C', port: portC, peers: [{ node_id: 'A', url: `ws://127.0.0.1:${portA}` }, { node_id: 'B', url: `ws://127.0.0.1:${portB}` }] });
    const seenByA: TransportMessage[] = [];
    const seenByC: TransportMessage[] = [];
    c.onReceive(async (m) => {
      seenByC.push(m);
      if ((m.raw as { relay?: string }).relay === 'to-c') {
        await c.send({ raw: { relay: 'to-a' }, metadata: { sender_node_id: 'C', recipient_node_id: 'A', timestamp: 3 } });
      }
    });
    b.onReceive(async (m) => {
      if ((m.raw as { relay?: string }).relay === 'to-c') {
        await b.send({ raw: { relay: 'to-c' }, metadata: { sender_node_id: 'B', recipient_node_id: 'C', timestamp: 2 } });
      }
      if ((m.raw as { relay?: string }).relay === 'to-a') {
        await b.send({ raw: { relay: 'to-a' }, metadata: { sender_node_id: 'B', recipient_node_id: 'A', timestamp: 4 } });
      }
    });
    a.onReceive((m) => {
      seenByA.push(m);
    });

    try {
      await a.start();
      await b.start();
      await c.start();
      await wait(250);

      await a.send({ raw: { relay: 'to-c' }, metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } });
      await wait(250);

      assert.ok(seenByC.some((m) => (m.raw as { relay?: string }).relay === 'to-c'));
      assert.ok(seenByA.some((m) => (m.raw as { relay?: string }).relay === 'to-a'));
    } finally {
      await a.stop();
      await b.stop();
      await c.stop();
    }
  });

  it('peer reconnect: disconnect then reconnect', async () => {
    const portA = randomPort();
    const portB = randomPort();
    const a = new WsTransport({ node_id: 'A', port: portA, peers: [{ node_id: 'B', url: `ws://127.0.0.1:${portB}` }] });
    let b = new WsTransport({ node_id: 'B', port: portB });
    let bReceives = 0;
    b.onReceive(() => bReceives++);
    await a.start();
    await b.start();
    await wait(200);

    await a.send({ raw: { seq: 1 }, metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } });
    await wait(80);
    await b.stop();
    await wait(220);

    b = new WsTransport({ node_id: 'B', port: portB });
    b.onReceive(() => bReceives++);
    await b.start();
    await wait(500);
    await a.send({ raw: { seq: 2 }, metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 2 } });
    await wait(120);

    assert.ok(bReceives >= 2);
    await a.stop();
    await b.stop();
  });

  it('peer not found', async () => {
    const a = new WsTransport({ node_id: 'A', port: randomPort() });
    await a.start();
    await assert.rejects(
      () => a.send({ raw: { no: 'peer' }, metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } }),
      (e: unknown) => e instanceof WsTransportError && e.code === WsTransportErrorCode.PEER_NOT_FOUND,
    );
    await a.stop();
  });

  it('invalid message', async () => {
    const portB = randomPort();
    const b = new WsTransport({ node_id: 'B', port: portB });
    let count = 0;
    b.onReceive(() => count++);
    await b.start();

    const socket = new WebSocket(`ws://127.0.0.1:${portB}`);
    await new Promise<void>((resolve) => socket.on('open', () => resolve()));
    socket.send('{ not-valid-json');
    await wait(80);
    assert.strictEqual(count, 0);
    socket.close();
    await b.stop();
  });

  it('concurrency: parallel messages', async () => {
    const portB = randomPort();
    const b = new WsTransport({ node_id: 'B', port: portB });
    let count = 0;
    b.onReceive(() => count++);
    await b.start();
    const a = new WsTransport({
      node_id: 'A',
      port: randomPort(),
      peers: [{ node_id: 'B', url: `ws://127.0.0.1:${portB}` }],
    });
    await a.start();
    await wait(200);

    await Promise.all(
      Array.from({ length: 10 }).map((_, i) =>
        a.send({ raw: { i }, metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: i } }),
      ),
    );
    await wait(150);
    assert.strictEqual(count, 10);
    await a.stop();
    await b.stop();
  });
});

