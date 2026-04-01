/**
 * Microstep 16F.X5.X6 — Perfect Forward Secrecy (ECDHE + HKDF).
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
  validateX25519PublicKeyRaw,
} from '../pfs_keys.js';
import { deriveSessionKey } from '../pfs_kdf.js';
import { parseEphemeralPublicKeyB64 } from '../handshake_protocol.js';

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

describe('Secure Transport PFS (16F.X5.X6)', () => {
  it('1. successful PFS handshake + messaging', async () => {
    const { server, clientConn, serverConn } = await pfsPair('pfs-1');
    try {
      assert.strictEqual(clientConn.pfsEnabled, true);
      assert.strictEqual(clientConn.rekeyMode, 'PFS');
      let got: Uint8Array | null = null;
      serverConn.onReceive?.((d) => {
        got = d;
      });
      await clientConn.send(new Uint8Array([7, 8, 9]));
      assert.ok(got);
      assert.deepStrictEqual(Array.from(got!), [7, 8, 9]);
    } finally {
      await clientConn.close();
      await server.stop();
    }
  });

  it('2. both sides derive the same AES key (cross-check via shared secret)', () => {
    const a = generateEphemeralKeyPair();
    const b = generateEphemeralKeyPair();
    const sa = deriveSharedSecret(a.privateKey, b.publicKey);
    const sb = deriveSharedSecret(b.privateKey, a.publicKey);
    assert.ok(sa.equals(sb));
    const kdfCtx = {
      nodeIdA: 'node-a',
      nodeIdB: 'node-b',
      sessionId: 'sess-1',
      ephemeralPublicKeyA: Buffer.alloc(32, 3).toString('base64'),
      ephemeralPublicKeyB: Buffer.alloc(32, 4).toString('base64'),
    };
    const k1 = deriveSessionKey(sa, kdfCtx);
    const k2 = deriveSessionKey(sb, kdfCtx);
    assert.ok(k1.equals(k2));
    zeroBuffer(sa);
    zeroBuffer(sb);
    zeroBuffer(a.privateKey);
    zeroBuffer(b.privateKey);
  });

  it('3. different sessions → different derived keys (different ECDH + nonces)', () => {
    const ctx = {
      nodeIdA: 'a',
      nodeIdB: 'b',
      sessionId: 'sid',
      ephemeralPublicKeyA: Buffer.alloc(32, 1).toString('base64'),
      ephemeralPublicKeyB: Buffer.alloc(32, 2).toString('base64'),
    };
    const s1 = generateEphemeralKeyPair();
    const s2 = generateEphemeralKeyPair();
    const t1 = generateEphemeralKeyPair();
    const t2 = generateEphemeralKeyPair();
    const sh1 = deriveSharedSecret(s1.privateKey, s2.publicKey);
    const sh2 = deriveSharedSecret(t1.privateKey, t2.publicKey);
    const k1 = deriveSessionKey(sh1, ctx);
    const k2 = deriveSessionKey(sh2, ctx);
    assert.notDeepStrictEqual(k1, k2);
    zeroBuffer(sh1);
    zeroBuffer(sh2);
  });

  it('4. invalid public key → reject', async () => {
    const A = makeNode('da');
    const B = makeNode('db');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'pfs-bad',
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
    const bad = Buffer.alloc(32, 0).toString('base64');
    await assert.rejects(
      client.connect('pfs-bad', {
        nonceOverride: 'fixed-nonce-bad-pfs',
        timestampOverride: Date.now(),
        debugInvalidClientEphemeralB64: bad,
      }),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_INVALID_PUBLIC_KEY',
    );
    await server.stop();
  });

  it('5. fallback to legacy mode works + metrics', async () => {
    const A = makeNode('la');
    const B = makeNode('lb');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const before = getSecureTransportMetricsSnapshot().pfsFallbacks;
    const server = new SecureTransportServerImpl({
      endpoint: 'pfs-legacy',
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
      pfs: false,
    });
    const conn = await client.connect('pfs-legacy');
    try {
      assert.strictEqual(conn.pfsEnabled, false);
      assert.strictEqual(conn.rekeyMode, 'SYMMETRIC');
      assert.ok(getSecureTransportMetricsSnapshot().pfsFallbacks >= before + 1);
    } finally {
      await conn.close();
      await server.stop();
    }
  });

  it('6. ephemeral private material can be destroyed after handshake', () => {
    const e = generateEphemeralKeyPair();
    assert.ok(!e.privateKey.equals(Buffer.alloc(32)));
    zeroBuffer(e.privateKey);
    assert.ok(e.privateKey.equals(Buffer.alloc(32)));
  });

  it('7. rekey with PFS generates a new key (session still usable)', async () => {
    const { server, clientConn, serverConn } = await pfsPair('pfs-rekey');
    try {
      await clientConn.requestRekey?.();
      await new Promise((r) => setTimeout(r, 40));
      let got = 0;
      serverConn.onReceive?.(() => {
        got += 1;
      });
      await clientConn.send(new Uint8Array([1]));
      assert.strictEqual(got, 1);
    } finally {
      await clientConn.close();
      await server.stop();
    }
  });

  it('8. replay of hello nonce still rejected on second connection', async () => {
    const A = makeNode('ra');
    const B = makeNode('rb');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'pfs-replay',
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
    const n = 'same-nonce-twice';
    const c1 = await client.connect('pfs-replay', { nonceOverride: n, timestampOverride: Date.now() });
    await c1.close();
    await assert.rejects(client.connect('pfs-replay', { nonceOverride: n, timestampOverride: Date.now() }), /TRANSPORT_REPLAY_DETECTED/);
    await server.stop();
  });

  it('9. MITM / wrong server ephemeral → PFS_EPHEMERAL_SIGNATURE_INVALID', async () => {
    const A = makeNode('ma');
    const B = makeNode('mb');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'pfs-mitm',
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
    const attacker = generateEphemeralKeyPair();
    const mitmB64 = attacker.publicKey.toString('base64');
    zeroBuffer(attacker.privateKey);
    await assert.rejects(
      client.connect('pfs-mitm', { debugMitmServerEphemeralB64: mitmB64 }),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_EPHEMERAL_SIGNATURE_INVALID',
    );
    await server.stop();
  });

  it('10. transport without PFS still works end-to-end', async () => {
    const A = makeNode('na');
    const B = makeNode('nb');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'pfs-nopfs',
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
    });
    const conn = await client.connect('pfs-nopfs');
    try {
      const sc = [...(server as unknown as { connections: Set<{ onReceive?: (h: (d: Uint8Array) => void) => void }> }).connections][0]! as {
        onReceive?: (h: (d: Uint8Array) => void) => void;
      };
      let ok = false;
      sc.onReceive?.((d) => {
        ok = d.byteLength === 1 && d[0] === 55;
      });
      await conn.send(new Uint8Array([55]));
      assert.strictEqual(ok, true);
      assert.strictEqual(conn.pfsEnabled, false);
    } finally {
      await conn.close();
      await server.stop();
    }
  });

  it('11. server requirePfs rejects legacy client', async () => {
    const A = makeNode('pa');
    const B = makeNode('pb');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'pfs-req-srv',
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
      client.connect('pfs-req-srv'),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_REQUIRED_REJECTED',
    );
    await server.stop();
  });

  it('12. client transportSecurity.requirePfs without pfs flag', async () => {
    const A = makeNode('qa');
    const B = makeNode('qb');
    const trustA = new StaticTrust(new Set([B.nodeId]), new Set([B.domainId]));
    const trustB = new StaticTrust(new Set([A.nodeId]), new Set([A.domainId]));
    const server = new SecureTransportServerImpl({
      endpoint: 'pfs-req-cl',
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
      pfs: false,
      transportSecurity: { requirePfs: true },
    });
    await assert.rejects(
      client.connect('pfs-req-cl'),
      (e: unknown) => (e as NodeJS.ErrnoException).code === 'PFS_REQUIRED',
    );
    await server.stop();
  });

  it('helper: strict public key validation rejects bad buffers', () => {
    assert.throws(() => validateX25519PublicKeyRaw(Buffer.alloc(31)), /PFS_INVALID_PUBLIC_KEY/);
    assert.throws(() => parseEphemeralPublicKeyB64('!!!'), /PFS_INVALID_PUBLIC_KEY/);
  });
});
