/**
 * Microstep 15E — Transport Abstraction Layer. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TransportFactory, TransportRouter, TransportError, TransportErrorCode } from '../index.js';
import { InMemoryTransport, InMemoryTransportBus } from '../transport_inmemory.js';
import { HttpTransport } from '../transport_http.js';
import type { TransportMessage } from '../transport_types.js';

function msg(overrides: Partial<TransportMessage> = {}): TransportMessage {
  return {
    raw: { type: 'demo', value: 1 },
    metadata: {
      sender_node_id: 'A',
      recipient_node_id: 'B',
      timestamp: Date.now(),
    },
    ...overrides,
  };
}

describe('Transport Abstraction Layer (15E)', () => {
  it('InMemory: message sent → received', async () => {
    const bus = new InMemoryTransportBus();
    const a = new InMemoryTransport({ node_id: 'A', bus });
    const b = new InMemoryTransport({ node_id: 'B', bus });
    await a.start();
    await b.start();

    let received: TransportMessage | null = null;
    b.onReceive((m) => {
      received = m;
    });

    const m = msg({ metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } });
    await a.send(m);

    assert.ok(received != null);
    assert.deepStrictEqual(received, m);
    await a.stop();
    await b.stop();
  });

  it('InMemory: multiple nodes communicate', async () => {
    const bus = new InMemoryTransportBus();
    const a = new InMemoryTransport({ node_id: 'A', bus });
    const b = new InMemoryTransport({ node_id: 'B', bus });
    const c = new InMemoryTransport({ node_id: 'C', bus });
    await a.start();
    await b.start();
    await c.start();

    const got = new Map<string, number>();
    for (const t of [a, b, c]) {
      t.onReceive((m) => {
        got.set((m.metadata.recipient_node_id ?? 'broadcast') as string, (got.get((m.metadata.recipient_node_id ?? 'broadcast') as string) ?? 0) + 1);
      });
    }

    await a.send(msg({ metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } }));
    await b.send(msg({ metadata: { sender_node_id: 'B', recipient_node_id: 'C', timestamp: 2 } }));
    await c.send(msg({ metadata: { sender_node_id: 'C', recipient_node_id: 'A', timestamp: 3 } }));

    assert.strictEqual(got.get('B'), 1);
    assert.strictEqual(got.get('C'), 1);
    assert.strictEqual(got.get('A'), 1);

    await a.stop();
    await b.stop();
    await c.stop();
  });

  it('HTTP: POST sends message, server receives and dispatches', async () => {
    // pick a high random-ish port range to reduce collisions
    const port = 31_000 + Math.floor(Math.random() * 1_000);
    const server = new HttpTransport({ port, host: '127.0.0.1' });
    await server.start();

    const router = new TransportRouter();
    let dispatched: TransportMessage | null = null;
    router.registerHandler('demo', (m) => {
      dispatched = m;
    });
    server.onReceive((m) => router.dispatch(m));

    const client = new HttpTransport({ port, host: '127.0.0.1' });
    const m = msg({ metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 123 } });
    await client.send(m);

    // allow event loop to run handler
    await Promise.resolve();
    assert.ok(dispatched != null);
    assert.deepStrictEqual(dispatched, m);

    await server.stop();
  });

  it('factory: invalid transport type throws', () => {
    const factory = new TransportFactory();
    assert.throws(
      () => factory.create({ type: 'smtp' as any, options: {} }),
      (e: unknown) => e instanceof TransportError && e.code === TransportErrorCode.UNSUPPORTED_TRANSPORT,
    );
  });

  it('routing: correct handler invoked', () => {
    const router = new TransportRouter();
    let calledA = 0;
    let calledB = 0;
    router.registerHandler('type-a', () => {
      calledA++;
    });
    router.registerHandler('type-b', () => {
      calledB++;
    });

    router.dispatch({ raw: { type: 'type-a' }, metadata: { sender_node_id: 'A', timestamp: 1 } });
    router.dispatch({ raw: { type: 'type-b' }, metadata: { sender_node_id: 'A', timestamp: 1 } });
    router.dispatch({ raw: { type: 'type-b' }, metadata: { sender_node_id: 'A', timestamp: 1 } });

    assert.strictEqual(calledA, 1);
    assert.strictEqual(calledB, 2);
  });

  it('multi-node simulation: A → B → C chain', async () => {
    const bus = new InMemoryTransportBus();
    const a = new InMemoryTransport({ node_id: 'A', bus });
    const b = new InMemoryTransport({ node_id: 'B', bus });
    const c = new InMemoryTransport({ node_id: 'C', bus });
    await a.start();
    await b.start();
    await c.start();

    let seenByC = 0;
    b.onReceive(async (m) => {
      // forward to C
      const next: TransportMessage = {
        raw: m.raw,
        metadata: { sender_node_id: 'B', recipient_node_id: 'C', timestamp: m.metadata.timestamp + 1 },
      };
      await b.send(next);
    });
    c.onReceive(() => {
      seenByC++;
    });

    await a.send({ raw: { type: 'demo' }, metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } });
    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(seenByC, 1);

    await a.stop();
    await b.stop();
    await c.stop();
  });
});

