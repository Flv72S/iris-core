/**
 * Microstep 15E.1 — gRPC Transport Plugin. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GrpcTransport, GrpcTransportError, GrpcTransportErrorCode } from '../index.js';
import type { TransportMessage } from '../../transport/transport_types.js';

function freePort(): number {
  return 32_000 + Math.floor(Math.random() * 2_000);
}

function msg(overrides: Partial<TransportMessage> = {}): TransportMessage {
  return {
    raw: { type: 'test', value: 1 },
    metadata: {
      sender_node_id: 'A',
      recipient_node_id: 'B',
      timestamp: Date.now(),
    },
    ...overrides,
  };
}

describe('gRPC Transport Plugin (15E.1)', () => {
  it('send → receive: node A sends, node B receives', async () => {
    const portB = freePort();
    const transportB = new GrpcTransport({
      node_id: 'B',
      host: '127.0.0.1',
      port: portB,
    });
    let received: TransportMessage | null = null;
    transportB.onReceive((m) => {
      received = m;
    });
    await transportB.start();

    const portA = freePort();
    const transportA = new GrpcTransport({
      node_id: 'A',
      host: '127.0.0.1',
      port: portA,
      peers: [{ node_id: 'B', address: `127.0.0.1:${portB}` }],
    });
    await transportA.start();

    const m = msg({ metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 100 } });
    await transportA.send(m);

    await new Promise((r) => setTimeout(r, 50));
    assert.ok(received !== null);
    const r = received as TransportMessage;
    assert.strictEqual(r.metadata.sender_node_id, 'A');
    assert.strictEqual(r.metadata.recipient_node_id, 'B');
    assert.strictEqual(r.metadata.timestamp, 100);
    assert.deepStrictEqual(r.raw, m.raw);

    await transportA.stop();
    await transportB.stop();
  });

  it('multi-node: A → B → C', async () => {
    const portB = freePort();
    const portC = freePort();

    const transportC = new GrpcTransport({
      node_id: 'C',
      host: '127.0.0.1',
      port: portC,
    });
    let receivedByC: TransportMessage | null = null;
    transportC.onReceive((m) => {
      receivedByC = m;
    });
    await transportC.start();

    const transportB = new GrpcTransport({
      node_id: 'B',
      host: '127.0.0.1',
      port: portB,
      peers: [{ node_id: 'C', address: `127.0.0.1:${portC}` }],
    });
    transportB.onReceive(async (m) => {
      await transportB.send({
        raw: m.raw,
        metadata: {
          sender_node_id: 'B',
          recipient_node_id: 'C',
          timestamp: m.metadata.timestamp + 1,
        },
      });
    });
    await transportB.start();

    const transportA = new GrpcTransport({
      node_id: 'A',
      host: '127.0.0.1',
      port: freePort(),
      peers: [{ node_id: 'B', address: `127.0.0.1:${portB}` }],
    });
    await transportA.start();

    await transportA.send(
      msg({
        raw: { chain: true },
        metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 },
      }),
    );

    await new Promise((r) => setTimeout(r, 150));
    assert.ok(receivedByC !== null);
    const rc = receivedByC as TransportMessage;
    assert.strictEqual(rc.metadata.sender_node_id, 'B');
    assert.strictEqual(rc.metadata.recipient_node_id, 'C');
    assert.deepStrictEqual(rc.raw, { chain: true });

    await transportA.stop();
    await transportB.stop();
    await transportC.stop();
  });

  it('invalid message: malformed payload → error', async () => {
    const portB = freePort();
    const transportB = new GrpcTransport({
      node_id: 'B',
      host: '127.0.0.1',
      port: portB,
    });
    transportB.onReceive(() => {});
    await transportB.start();

    const grpcMod = await import('@grpc/grpc-js');
    const protoLoader = await import('@grpc/proto-loader');
    const pathMod = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = pathMod.dirname(fileURLToPath(import.meta.url));
    const packageDefinition = protoLoader.loadSync(
      pathMod.join(__dirname, '..', 'transport_grpc_proto.proto'),
      { keepCase: true, longs: String, defaults: true },
    );
    const pkg = grpcMod.loadPackageDefinition(packageDefinition) as Record<string, unknown>;
    const iris = pkg?.iris as Record<string, unknown> | undefined;
    const transport = iris?.transport as { IrisTransportService: new (addr: string, cred: unknown) => Record<string, (req: unknown, opts: object, cb: (err: unknown) => void) => void> } | undefined;
    const Client = transport?.IrisTransportService;
    assert.ok(Client);
    const client = new Client(`127.0.0.1:${portB}`, grpcMod.credentials.createInsecure()) as any;

    const unary = client.SendMessage ?? client.sendMessage;
    assert.ok(unary);

    const err = await new Promise<unknown>((resolve) => {
      unary.call(
        client,
        { sender: 'A', recipient: 'B', type: '', payload: 'not valid json {{{', timestamp: 1 },
        {},
        (e: unknown) => {
          client.close();
          resolve(e);
        },
      );
    });
    assert.ok(err != null, 'Expected error for malformed payload');
    assert.ok(
      (err as Error).message?.includes('Invalid') || (err as Error).message?.includes('payload') || (err as Error).message?.includes('JSON'),
      `Expected error message about invalid payload, got: ${(err as Error).message}`,
    );

    await transportB.stop();
  });

  it('connection failure: peer unavailable', async () => {
    const transport = new GrpcTransport({
      node_id: 'A',
      host: '127.0.0.1',
      port: freePort(),
      peers: [{ node_id: 'B', address: '127.0.0.1:31999' }],
    });
    await transport.start();

    await assert.rejects(
      () =>
        transport.send(
          msg({ metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 1 } }),
        ),
      (e: unknown) =>
        e instanceof GrpcTransportError &&
        (e.code === GrpcTransportErrorCode.CONNECTION_FAILED || e.code === GrpcTransportErrorCode.SEND_FAILED),
    );

    await transport.stop();
  });

  it('determinism: same input → same output', async () => {
    const portB = freePort();
    const transportB = new GrpcTransport({
      node_id: 'B',
      host: '127.0.0.1',
      port: portB,
    });
    const received: TransportMessage[] = [];
    transportB.onReceive((m) => received.push(m));
    await transportB.start();

    const transportA = new GrpcTransport({
      node_id: 'A',
      host: '127.0.0.1',
      port: freePort(),
      peers: [{ node_id: 'B', address: `127.0.0.1:${portB}` }],
    });
    await transportA.start();

    const same = msg({
      raw: { id: 42, label: 'deterministic' },
      metadata: { sender_node_id: 'A', recipient_node_id: 'B', timestamp: 999 },
    });
    await transportA.send(same);
    await transportA.send(same);
    await new Promise((r) => setTimeout(r, 80));

    assert.strictEqual(received.length, 2);
    assert.deepStrictEqual(received[0], received[1]);
    assert.deepStrictEqual(received[0].raw, { id: 42, label: 'deterministic' });
    assert.strictEqual(received[0].metadata.timestamp, 999);

    await transportA.stop();
    await transportB.stop();
  });
});
