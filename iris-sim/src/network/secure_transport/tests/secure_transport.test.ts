/**
 * Microstep 16F.X5 — Secure Network Transport Layer (Enterprise). Tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';

import { buildTlsContext } from '../tls_context.js';
import { deriveNodeIdFromTlsContext } from '../transport_identity.js';
import { TtlNonceReplayGuard } from '../replay_protection.js';
import { SecureTransportServerImpl } from '../secure_server.js';
import { SecureTransportClientImpl } from '../secure_client.js';
import type { TransportTrustEngineLike, TransportTrustLevel } from '../transport_trust_enforcement.js';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeTlsAndNode(domainId: string) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const tlsContext = buildTlsContext({ publicKeyPem, privateKeyPem, certificatePem: 'dummy-cert' });
  const nodeId = deriveNodeIdFromTlsContext(tlsContext);
  return { tlsContext, nodeId, domainId };
}

class FakeTrustEngine implements TransportTrustEngineLike {
  constructor(
    private readonly trustedNodes: Set<string>,
    private readonly trustedDomains: Set<string>,
    private readonly levels: Map<string, TransportTrustLevel>,
  ) {}

  isNodeTrusted(nodeId: string): boolean {
    return this.trustedNodes.has(nodeId);
  }

  isDomainTrusted(domainId: string | undefined): boolean {
    return domainId !== undefined && this.trustedDomains.has(domainId);
  }

  getTrustLevel(nodeId: string): TransportTrustLevel {
    return this.levels.get(nodeId) ?? 'FULL';
  }
}

describe('Secure Transport (16F.X5)', () => {
  it('1. Successful mTLS connection → authenticated', async () => {
    const fixedNow = Date.now();
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId]), new Set([B.domainId]), new Map([[B.nodeId, 'FULL']]));
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId]), new Set([A.domainId]), new Map([[A.nodeId, 'FULL']]));

    const endpoint = 'endpoint-B';
    const server = new SecureTransportServerImpl({
      endpoint,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      replayGuard: new TtlNonceReplayGuard({ ttlMs: 60_000, maxEntries: 1000, now: () => fixedNow }),
      idleTimeoutMs: 5000,
      now: () => fixedNow,
    } as any);

    let serverReceived: Uint8Array | null = null;
    server.onConnection((conn) => {
      conn.onReceive?.((d) => {
        serverReceived = d;
      });
    });

    await server.start();

    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      now: () => fixedNow,
      replayGuard: new TtlNonceReplayGuard({ ttlMs: 60_000, maxEntries: 1000, now: () => fixedNow }),
    } as any);

    const conn = await client.connect(endpoint);
    assert.ok(conn.isAuthenticated());

    const msg = new TextEncoder().encode('hello-secure-transport');
    await conn.send(msg);
    await wait(20);

    assert.ok(serverReceived !== null);
    assert.deepStrictEqual([...serverReceived!], [...msg]);

    await server.stop();
  });

  it('2. Invalid nodeId ↔ key mismatch → rejected', async () => {
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId]), new Set([B.domainId]), new Map());
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId]), new Set([A.domainId]), new Map());

    const endpoint = 'endpoint-B2';
    const fixedNow = Date.now();
    const server = new SecureTransportServerImpl({
      endpoint,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      now: () => fixedNow,
    } as any);
    await server.start();

    const client = new SecureTransportClientImpl({
      nodeId: 'wrong-node-id',
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      now: () => fixedNow,
    } as any);

    await assert.rejects(
      () => client.connect(endpoint),
      (e: unknown) => (e as any).code === 'TRANSPORT_IDENTITY_MISMATCH',
    );

    await server.stop();
  });

  it('3. Replay attack (same nonce) → rejected', async () => {
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId]), new Set([B.domainId]), new Map());
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId]), new Set([A.domainId]), new Map());

    const endpoint = 'endpoint-B3';
    const fixedNow = Date.now();
    const server = new SecureTransportServerImpl({
      endpoint,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      now: () => fixedNow,
      replayGuard: new TtlNonceReplayGuard({ ttlMs: 60_000, maxEntries: 1000, now: () => fixedNow }),
    } as any);
    await server.start();

    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      now: () => fixedNow,
      replayGuard: new TtlNonceReplayGuard({ ttlMs: 60_000, maxEntries: 1000, now: () => fixedNow }),
    } as any);

    const nonce = 'replay-nonce-1';
    await client.connect(endpoint, { nonceOverride: nonce } as any);
    await assert.rejects(
      () => client.connect(endpoint, { nonceOverride: nonce } as any),
      (e: unknown) => (e as any).code === 'TRANSPORT_REPLAY_DETECTED',
    );

    await server.stop();
  });

  it('4. Timestamp outside window → rejected', async () => {
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId]), new Set([B.domainId]), new Map());
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId]), new Set([A.domainId]), new Map());

    const endpoint = 'endpoint-B4';
    const fixedNow = Date.now();
    const server = new SecureTransportServerImpl({
      endpoint,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      now: () => fixedNow,
    } as any);
    await server.start();

    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      now: () => fixedNow,
    } as any);

    await assert.rejects(
      () => client.connect(endpoint, { timestampOverride: fixedNow - 90_000 } as any),
      (e: unknown) => (e as any).code === 'TRANSPORT_TIMESTAMP_INVALID',
    );

    await server.stop();
  });

  it('5. Untrusted node → connection refused', async () => {
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId]), new Set([B.domainId]), new Map());
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set(), new Set([A.domainId]), new Map());

    const endpoint = 'endpoint-B5';
    const fixedNow = Date.now();
    const server = new SecureTransportServerImpl({
      endpoint,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      now: () => fixedNow,
    } as any);
    await server.start();

    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      now: () => fixedNow,
    } as any);

    await assert.rejects(
      () => client.connect(endpoint),
      (e: unknown) => (e as any).code === 'UNTRUSTED_NODE',
    );

    await server.stop();
  });

  it('6. Untrusted domain → rejected', async () => {
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId]), new Set([B.domainId]), new Map());
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId]), new Set(), new Map());

    const endpoint = 'endpoint-B6';
    const fixedNow = Date.now();
    const server = new SecureTransportServerImpl({
      endpoint,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      now: () => fixedNow,
    } as any);
    await server.start();

    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      now: () => fixedNow,
    } as any);

    await assert.rejects(
      () => client.connect(endpoint),
      (e: unknown) => (e as any).code === 'UNTRUSTED_DOMAIN',
    );

    await server.stop();
  });

  it('7. MITM attempt (altered handshake signature) → detected', async () => {
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId]), new Set([B.domainId]), new Map());
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId]), new Set([A.domainId]), new Map());

    const endpoint = 'endpoint-B7';
    const fixedNow = Date.now();
    const server = new SecureTransportServerImpl({
      endpoint,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      now: () => fixedNow,
    } as any);
    await server.start();

    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      now: () => fixedNow,
    } as any);

    await assert.rejects(
      () => client.connect(endpoint, { tamperSignature: true } as any),
      (e: unknown) => (e as any).code === 'TRANSPORT_HANDSHAKE_SIGNATURE_INVALID' || (e as any).code === 'TRANSPORT_HANDSHAKE_SIGNATURE_INVALID',
    );

    await server.stop();
  });

  it('8. Session timeout → closed', async () => {
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId]), new Set([B.domainId]), new Map());
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId]), new Set([A.domainId]), new Map());

    const endpoint = 'endpoint-B8';
    const fixedNow = Date.now();
    const server = new SecureTransportServerImpl({
      endpoint,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      now: () => fixedNow,
      idleTimeoutMs: 60,
    } as any);
    await server.start();

    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      now: () => fixedNow,
    } as any);

    const conn = await client.connect(endpoint);
    await wait(120);
    await assert.rejects(() => conn.send(new Uint8Array([1, 2, 3])), (e: unknown) => (e as any).code === 'TRANSPORT_CLOSED' || (e as any).message === 'TRANSPORT_CLOSED');

    await server.stop();
  });

  it('9. Multi-node secure communication → stable', async () => {
    const A = makeTlsAndNode('domain-A');
    const B = makeTlsAndNode('domain-B');
    const C = makeTlsAndNode('domain-C');

    const endpointB = 'endpoint-B9';
    const endpointC = 'endpoint-C9';

    const trustA: TransportTrustEngineLike = new FakeTrustEngine(new Set([B.nodeId, C.nodeId]), new Set([B.domainId, C.domainId]), new Map());
    const trustB: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId, C.nodeId]), new Set([A.domainId, C.domainId]), new Map());
    const trustC: TransportTrustEngineLike = new FakeTrustEngine(new Set([A.nodeId, B.nodeId]), new Set([A.domainId, B.domainId]), new Map());

    const serverB = new SecureTransportServerImpl({
      endpoint: endpointB,
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    } as any);
    const serverC = new SecureTransportServerImpl({
      endpoint: endpointC,
      nodeId: C.nodeId,
      domainId: C.domainId,
      tlsContext: C.tlsContext,
      trustEngine: trustC,
    } as any);

    const gotB: Uint8Array[] = [];
    const gotC: Uint8Array[] = [];

    serverB.onConnection((conn) => {
      conn.onReceive?.((d) => gotB.push(d));
    });
    serverC.onConnection((conn) => {
      conn.onReceive?.((d) => gotC.push(d));
    });

    await serverB.start();
    await serverC.start();

    const clientAtoB = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const clientAtoC = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const clientBtoC = new SecureTransportClientImpl({
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    } as any);

    const connAB = await clientAtoB.connect(endpointB);
    const connAC = await clientAtoC.connect(endpointC);
    const connBC = await clientBtoC.connect(endpointC);

    await connAB.send(new TextEncoder().encode('A->B'));
    await connAC.send(new TextEncoder().encode('A->C'));
    await connBC.send(new TextEncoder().encode('B->C'));
    await wait(40);

    assert.ok(gotB.some((x) => new TextDecoder().decode(x) === 'A->B'));
    assert.ok(gotC.some((x) => new TextDecoder().decode(x) === 'A->C'));
    assert.ok(gotC.some((x) => new TextDecoder().decode(x) === 'B->C'));

    await connAB.close();
    await connAC.close();
    await connBC.close();
    await serverB.stop();
    await serverC.stop();
  });
});

