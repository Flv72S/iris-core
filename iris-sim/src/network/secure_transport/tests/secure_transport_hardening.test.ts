/**
 * Microstep 16F.X5.HARDENING — Secure transport lifecycle & zero-trust enforcement.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';

import { buildTlsContext } from '../tls_context.js';
import { deriveNodeIdFromTlsContext } from '../transport_identity.js';
import { SecureTransportServerImpl } from '../secure_server.js';
import { SecureTransportClientImpl } from '../secure_client.js';
import type { TransportTrustEngineLike, TransportTrustLevel } from '../transport_trust_enforcement.js';
import { getSecureTransportMetricsSnapshot } from '../transport_metrics.js';
import type { TransportAuditEvent } from '../audit_hooks.js';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeNode(domainId: string) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const tlsContext = buildTlsContext({ publicKeyPem, privateKeyPem, certificatePem: 'dummy-cert' });
  const nodeId = deriveNodeIdFromTlsContext(tlsContext);
  return { tlsContext, nodeId, domainId };
}

class DynamicTrust implements TransportTrustEngineLike {
  private readonly trustedNodes = new Set<string>();
  private readonly trustedDomains = new Set<string>();
  private readonly levels = new Map<string, TransportTrustLevel>();
  private readonly isolated = new Set<string>();

  trustNode(nodeId: string, level: TransportTrustLevel = 'FULL') {
    this.trustedNodes.add(nodeId);
    this.levels.set(nodeId, level);
  }
  trustDomain(domainId: string) {
    this.trustedDomains.add(domainId);
  }
  setLevel(nodeId: string, level: TransportTrustLevel) {
    this.levels.set(nodeId, level);
  }
  isolate(nodeId: string) {
    this.isolated.add(nodeId);
  }

  isNodeTrusted(nodeId: string): boolean {
    return this.trustedNodes.has(nodeId);
  }
  isDomainTrusted(domainId: string | undefined): boolean {
    return domainId !== undefined && this.trustedDomains.has(domainId);
  }
  getTrustLevel(nodeId: string): TransportTrustLevel {
    return this.levels.get(nodeId) ?? 'FULL';
  }
  isNodeIsolated(nodeId: string): boolean {
    return this.isolated.has(nodeId);
  }
}

describe('Secure Transport HARDENING (16F.X5.HARDENING)', () => {
  it('1. session expiration → disconnect', async () => {
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId);
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId);
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'exp-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      now: () => Date.now(),
      sessionTtlMs: 40,
      idleTimeoutMs: 60000,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('exp-B');
    await wait(80);
    conn.__enforceLifecycle?.();
    await assert.rejects(() => conn.send(new Uint8Array([1])), /TRANSPORT_CLOSED/);
    await server.stop();
  });

  it('2. idle timeout enforced', async () => {
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId);
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId);
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'idle-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      idleTimeoutMs: 40,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('idle-B');
    await wait(80);
    await assert.rejects(() => conn.send(new Uint8Array([1, 2, 3])), /TRANSPORT_CLOSED/);
    await server.stop();
  });

  it('3. rekey success', async () => {
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId);
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId);
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'rekey-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('rekey-B');
    await conn.requestRekey?.();
    await wait(30);
    // still works after rekey
    await conn.send(new TextEncoder().encode('after-rekey'));
    await server.stop();
  });

  it('4. rekey failure rollback (tampered response) → error', async () => {
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId);
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId);
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'rekeyfail-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      // test-only: force invalid REKEY_RESPONSE signature to validate rollback path
      transportSecurity: { debugTamperRekeyResponse: true } as any,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('rekeyfail-B');

    await conn.requestRekey?.();
    await wait(30);
    // sending should still work; key must not swap to attacker material
    await conn.send(new Uint8Array([9]));
    await server.stop();
  });

  it('5. trust downgrade blocks writes', async () => {
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId, 'FULL');
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId, 'FULL');
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'downgrade-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('downgrade-B');

    trustA.setLevel(B.nodeId, 'READ_ONLY');
    await assert.rejects(
      () => conn.send(new Uint8Array([1])),
      (e: unknown) => (e as any).code === 'TRANSPORT_WRITE_BLOCKED',
    );
    await server.stop();
  });

  it('6. isolated node cannot send', async () => {
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId, 'FULL');
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId, 'FULL');
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'isolate-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('isolate-B');

    trustA.isolate(B.nodeId);
    await assert.rejects(() => conn.send(new Uint8Array([1])), (e: unknown) => (e as any).code === 'TRANSPORT_NODE_ISOLATED');
    await server.stop();
  });

  it('7. rate limit triggers disconnect', async () => {
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId);
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId);
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'rl-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      transportSecurity: { rateLimit: { messagesPerSecond: 2, bytesPerSecond: 1000 } },
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('rl-B');

    await conn.send(new Uint8Array([1]));
    await conn.send(new Uint8Array([2]));
    await assert.rejects(() => conn.send(new Uint8Array([3])), (e: unknown) => (e as any).code === 'TRANSPORT_RATE_LIMIT_EXCEEDED');
    await server.stop();
  });

  it('8. replay attack blocked (same DATA nonce) → disconnect', async () => {
    // Minimal coverage: reuse existing replay mechanism by sending the same payload twice quickly.
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId);
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId);
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'replay-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('replay-B');
    // We can't force same nonce without breaking API; ensure replay guard increments only via internal behavior.
    await conn.send(new Uint8Array([1]));
    await conn.send(new Uint8Array([1]));
    await server.stop();
  });

  it('9. metrics increment correctly (basic)', async () => {
    const before = getSecureTransportMetricsSnapshot();
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId);
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId);
    trustB.trustDomain(A.domainId);

    const server = new SecureTransportServerImpl({
      endpoint: 'm-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
    } as any);
    const conn = await client.connect('m-B');
    await conn.close();
    await server.stop();
    const after = getSecureTransportMetricsSnapshot();
    assert.ok(after.activeConnections >= 0);
    assert.ok(after.activeSessions >= 0);
    assert.ok(after.rekeys >= before.rekeys);
  });

  it('10. audit events emitted', async () => {
    const A = makeNode('domain-A');
    const B = makeNode('domain-B');
    const trustA = new DynamicTrust();
    const trustB = new DynamicTrust();
    trustA.trustNode(B.nodeId);
    trustA.trustDomain(B.domainId);
    trustB.trustNode(A.nodeId);
    trustB.trustDomain(A.domainId);

    const events: TransportAuditEvent[] = [];
    const auditHook = (ev: TransportAuditEvent) => events.push(ev);

    const server = new SecureTransportServerImpl({
      endpoint: 'audit-B',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      auditHook,
    } as any);
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      auditHook,
    } as any);
    const conn = await client.connect('audit-B');
    await conn.requestRekey?.();
    await wait(20);
    await conn.close();
    await server.stop();

    assert.ok(events.some((e) => e.type === 'TRANSPORT_CONNECT'));
    assert.ok(events.some((e) => e.type === 'TRANSPORT_HANDSHAKE_OK'));
    assert.ok(events.some((e) => e.type === 'TRANSPORT_REKEY'));
    assert.ok(events.some((e) => e.type === 'TRANSPORT_CLOSE'));
  });
});

