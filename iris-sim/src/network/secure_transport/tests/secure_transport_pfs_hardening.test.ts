/**
 * Microstep 16F.X5.X6.HARDENING — PFS final security layer tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';

import { buildTlsContext } from '../tls_context.js';
import { deriveNodeIdFromTlsContext } from '../transport_identity.js';
import { SecureTransportServerImpl } from '../secure_server.js';
import { SecureTransportClientImpl } from '../secure_client.js';
import type { SecureConnection } from '../secure_connection.js';
import type { TransportTrustEngineLike, TransportTrustLevel } from '../transport_trust_enforcement.js';
import { getSecureTransportMetricsSnapshot } from '../transport_metrics.js';
import {
  generateEphemeralKeyPair,
  deriveSharedSecret,
  zeroBuffer,
} from '../pfs_keys.js';
import { deriveSessionKey } from '../pfs_kdf.js';
import { secureZero } from '../pfs_zero.js';
import type { TransportAuditEvent } from '../audit_hooks.js';
import { validateObservabilitySnapshot } from '../../../observability/observability_invariants.js';
import type { IrisObservabilitySnapshot } from '../../../observability/observability_contract.js';

function makeNode(domainId: string) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const tlsContext = buildTlsContext({ publicKeyPem, privateKeyPem, certificatePem: 'dummy-cert' });
  const nodeId = deriveNodeIdFromTlsContext(tlsContext);
  return { tlsContext, nodeId, domainId };
}

class StaticTrust implements TransportTrustEngineLike {
  constructor(private readonly nodes: Set<string>, private readonly domains: Set<string>) {}
  isNodeTrusted(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }
  isDomainTrusted(domainId: string | undefined): boolean {
    return domainId !== undefined && this.domains.has(domainId);
  }
  getTrustLevel(_nodeId: string): TransportTrustLevel {
    return 'FULL';
  }
}

async function pfsPair(endpoint: string) {
  const A = makeNode('dom-a');
  const B = makeNode('dom-b');
  const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
  const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
  const server = new SecureTransportServerImpl({
    endpoint,
    nodeId: B.nodeId,
    domainId: B.domainId,
    tlsContext: B.tlsContext,
    trustEngine: trustB,
  });
  await server.start();
  const client = new SecureTransportClientImpl({
    nodeId: A.nodeId,
    domainId: A.domainId,
    tlsContext: A.tlsContext,
    trustEngine: trustA,
    pfs: true,
  });
  const clientConn = await client.connect(endpoint);
  const serverConn = [...(server as unknown as { connections: Set<SecureConnection> }).connections][0]!;
  return { server, clientConn, serverConn, A, B };
}

describe('Secure Transport PFS hardening (16F.X5.X6.HARDENING)', () => {
  it('1. valid ephemeral signatures → handshake PASS', async () => {
    const { server, clientConn, serverConn } = await pfsPair('harden-1');
    try {
      assert.strictEqual(clientConn.pfsEnabled, true);
      let got = false;
      serverConn.onReceive?.(() => {
        got = true;
      });
      await clientConn.send(new Uint8Array([1]));
      assert.strictEqual(got, true);
    } finally {
      await clientConn.close();
      await server.stop();
    }
  });

  it('2. invalid client ephemeral signature → FAIL', async () => {
    const A = makeNode('h2-a');
    const B = makeNode('h2-b');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'harden-2',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    });
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      pfs: true,
    });
    await assert.rejects(
      client.connect('harden-2', { debugTamperEphemeralSignature: true }),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_EPHEMERAL_SIGNATURE_INVALID',
    );
    await server.stop();
  });

  it('3. missing client ephemeral signature with STRICT server policy → FAIL', async () => {
    const A = makeNode('h3-a');
    const B = makeNode('h3-b');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'harden-3',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      transportSecurity: { pfsMode: 'STRICT' },
    });
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      pfs: true,
    });
    await assert.rejects(
      client.connect('harden-3', { debugOmitEphemeralSignature: true }),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_EPHEMERAL_SIGNATURE_MISSING',
    );
    await server.stop();
  });

  it('4. downgrade attempt blocked when policy requires PFS', async () => {
    const A = makeNode('h4-a');
    const B = makeNode('h4-b');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const aud: TransportAuditEvent[] = [];
    const before = getSecureTransportMetricsSnapshot().pfsDowngradeAttempts;
    const server = new SecureTransportServerImpl({
      endpoint: 'harden-4',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      transportSecurity: { debugForceLegacyHandshake: true },
    });
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      pfs: true,
      transportSecurity: { requirePfs: true },
      auditHook: (e) => aud.push(e),
    });
    await assert.rejects(
      client.connect('harden-4'),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_REQUIRED',
    );
    assert.ok(getSecureTransportMetricsSnapshot().pfsDowngradeAttempts >= before + 1);
    assert.ok(aud.some((e) => e.type === 'PFS_DOWNGRADE_BLOCKED'));
    await server.stop();
  });

  it('5. requirePfs=true server rejects legacy client', async () => {
    const A = makeNode('h5-a');
    const B = makeNode('h5-b');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const beforeRej = getSecureTransportMetricsSnapshot().pfsRejected;
    const server = new SecureTransportServerImpl({
      endpoint: 'harden-5',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      transportSecurity: { requirePfs: true },
    });
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      pfs: false,
    });
    await assert.rejects(
      client.connect('harden-5'),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_REQUIRED_REJECTED',
    );
    assert.ok(getSecureTransportMetricsSnapshot().pfsRejected >= beforeRej + 1);
    await server.stop();
  });

  it('6. KDF / context mismatch on finalize → FAIL', async () => {
    const A = makeNode('h6-a');
    const B = makeNode('h6-b');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'harden-6',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    });
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      pfs: true,
    });
    await assert.rejects(
      client.connect('harden-6', { debugWrongFinalizeChannelKeyHex: '00'.repeat(32) }),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_CONTEXT_MISMATCH',
    );
    await server.stop();
  });

  it('7. secureZero clears buffer (success path)', () => {
    const b = Buffer.from('sensitive-data');
    secureZero(b);
    assert.ok(b.equals(Buffer.alloc(b.length, 0)));
  });

  it('8. secureZero on nullable is no-op', () => {
    assert.doesNotThrow(() => secureZero(undefined));
    assert.doesNotThrow(() => secureZero(null));
  });

  it('9. deterministic KDF: both peers derive identical key', () => {
    const a = generateEphemeralKeyPair();
    const b = generateEphemeralKeyPair();
    const sa = deriveSharedSecret(a.privateKey, b.publicKey);
    const sb = deriveSharedSecret(b.privateKey, a.publicKey);
    assert.ok(sa.equals(sb));
    const ctx = {
      nodeIdA: 'n-a',
      nodeIdB: 'n-b',
      sessionId: 'sess-deterministic',
      ephemeralPublicKeyA: Buffer.alloc(32, 9).toString('base64'),
      ephemeralPublicKeyB: Buffer.alloc(32, 10).toString('base64'),
    };
    const k1 = deriveSessionKey(sa, ctx);
    const k2 = deriveSessionKey(sb, ctx);
    assert.ok(k1.equals(k2));
    zeroBuffer(sa);
    zeroBuffer(sb);
    zeroBuffer(k1);
    zeroBuffer(k2);
    zeroBuffer(a.privateKey);
    zeroBuffer(b.privateKey);
  });

  it('10. STRICT server rejects non-PFS client (no legacy fallback)', async () => {
    const A = makeNode('h10-a');
    const B = makeNode('h10-b');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'harden-10',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      transportSecurity: { pfsMode: 'STRICT' },
    });
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      pfs: false,
    });
    await assert.rejects(
      client.connect('harden-10'),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_REQUIRED_REJECTED',
    );
    await server.stop();
  });

  it('11. audit events: ephemeral auth, context bound, strict mode', async () => {
    const A = makeNode('h11-a');
    const B = makeNode('h11-b');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const beforeStrict = getSecureTransportMetricsSnapshot().pfsStrictSessions;
    const events: TransportAuditEvent[] = [];
    const auditHook = (ev: TransportAuditEvent) => events.push(ev);
    const server = new SecureTransportServerImpl({
      endpoint: 'harden-11',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
      transportSecurity: { pfsMode: 'STRICT' },
      auditHook,
    });
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      pfs: true,
      transportSecurity: { pfsMode: 'STRICT' },
      auditHook,
    });
    const conn = await client.connect('harden-11');
    try {
      assert.ok(events.some((e) => e.type === 'PFS_EPHEMERAL_AUTH'));
      assert.ok(events.some((e) => e.type === 'PFS_CONTEXT_BOUND'));
      assert.ok(events.filter((e) => e.type === 'PFS_STRICT_MODE').length >= 1);
      assert.ok(getSecureTransportMetricsSnapshot().pfsStrictSessions >= beforeStrict + 1);
    } finally {
      await conn.close();
      await server.stop();
    }
  });

  it('12. observability transport metrics shape (strict / rejected / downgrade counters)', () => {
    const m = getSecureTransportMetricsSnapshot();
    const snap = {
      node: { id: 't', timestamp: 1, uptime_seconds: 0 },
      metrics: { metrics: {}, timestamp: new Date().toISOString(), nodeId: 't' },
      transport: { ...m },
    } as IrisObservabilitySnapshot;
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, true, !v.ok ? (v as { errors: string[] }).errors.join('; ') : '');
    assert.ok(Number.isFinite(m.pfsStrictSessions));
    assert.ok(Number.isFinite(m.pfsRejected));
    assert.ok(Number.isFinite(m.pfsDowngradeAttempts));
  });

  it('13. failed handshake still zeroizes server pending key (client bad ephemeral sig)', async () => {
    const A = makeNode('h13-a');
    const B = makeNode('h13-b');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'harden-13',
      nodeId: B.nodeId,
      domainId: B.domainId,
      tlsContext: B.tlsContext,
      trustEngine: trustB,
    });
    await server.start();
    const client = new SecureTransportClientImpl({
      nodeId: A.nodeId,
      domainId: A.domainId,
      tlsContext: A.tlsContext,
      trustEngine: trustA,
      pfs: true,
    });
    await assert.rejects(client.connect('harden-13', { debugTamperEphemeralSignature: true }));
    const pending = (server as unknown as { pendingPfsBySession: Map<string, unknown> }).pendingPfsBySession;
    assert.strictEqual(pending.size, 0);
    await server.stop();
  });
});
