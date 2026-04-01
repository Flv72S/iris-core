/**
 * Microstep 16F.X5.X7.HARDENING — Session Control Plane (SCP). Tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { randomBytes } from 'node:crypto';

import { createSecureConnection } from '../secure_connection.js';
import type { TransportSession } from '../transport_session.js';
import {
  createSessionControlPlane,
  canTriggerRekey,
  electRekeyLeader,
  resolveRekeyRole,
  resolveRekeyCollision,
  transitionSessionState,
  encodeSessionTicket,
  decodeSessionTicket,
} from '../session_control_plane.js';
import { resolveSessionLifecyclePolicy } from '../transport_policy.js';
import { getSecureTransportMetricsSnapshot, setTransportSessionDebug } from '../transport_metrics.js';
import type { TransportAuditEvent } from '../audit_hooks.js';

function makePair(args: {
  now: () => number;
  localA: string;
  localB: string;
  trafficDuringRekey?: 'BLOCK' | 'ALLOW';
  wire?: boolean;
  rekeyPendingTimeoutMs?: number;
}) {
  const t0 = args.now();
  const sessionId = `scp-${t0}-${Math.random().toString(36).slice(2)}`;
  const keyHex = randomBytes(32).toString('hex');
  const sessionA: TransportSession = { sessionId, peerNodeId: args.localB, createdAt: t0, lastActivity: t0 };
  const sessionB: TransportSession = { sessionId, peerNodeId: args.localA, createdAt: t0, lastActivity: t0 };
  const audits: TransportAuditEvent[] = [];
  const auditHook = (e: TransportAuditEvent) => audits.push(e);

  const lifecycle = resolveSessionLifecyclePolicy(
    {
      rekeyIntervalMs: 60_000,
      maxSessionDurationMs: 600_000,
      maxBytesPerKey: 10_000_000,
      ...(typeof args.rekeyPendingTimeoutMs === 'number' ? { rekeyPendingTimeoutMs: args.rekeyPendingTimeoutMs } : {}),
    },
    'STRICT',
  );

  setTransportSessionDebug({ sessionId, pfsEnabled: true, rekeyMode: 'PFS', pfsMode: 'STRICT' });

  const a = createSecureConnection({
    localNodeId: args.localA,
    peerNodeId: args.localB,
    session: sessionA,
    trustLevel: 'FULL',
    channelKeyHex: keyHex,
    pfsEnabled: true,
    rekeyMode: 'PFS',
    sessionLifecycle: lifecycle,
    pfsMode: 'STRICT',
    ...(args.trafficDuringRekey ? { trafficDuringRekey: args.trafficDuringRekey } : {}),
    auditHook,
    now: args.now,
    expiresAt: t0 + 600_000,
  });
  const b = createSecureConnection({
    localNodeId: args.localB,
    peerNodeId: args.localA,
    session: sessionB,
    trustLevel: 'FULL',
    channelKeyHex: keyHex,
    pfsEnabled: true,
    rekeyMode: 'PFS',
    sessionLifecycle: lifecycle,
    pfsMode: 'STRICT',
    ...(args.trafficDuringRekey ? { trafficDuringRekey: args.trafficDuringRekey } : {}),
    auditHook,
    now: args.now,
    expiresAt: t0 + 600_000,
  });

  if (args.wire !== false) {
    a.__setFrameSink?.((f) => b.handleIncomingEncrypted(f));
    b.__setFrameSink?.((f) => a.handleIncomingEncrypted(f));
  }

  return { a, b, audits, sessionId };
}

describe('Secure Transport SCP (16F.X5.X7.HARDENING)', () => {
  it('1. deterministic leader election', () => {
    assert.strictEqual(electRekeyLeader('a', 'b'), 'a');
    assert.strictEqual(electRekeyLeader('b', 'a'), 'a');
    assert.strictEqual(resolveRekeyRole('a', 'b'), 'LEADER');
    assert.strictEqual(resolveRekeyRole('b', 'a'), 'FOLLOWER');
  });

  it('2. follower cannot trigger rekey (ignored)', async () => {
    let t = 1_000;
    const now = () => t;
    const { a } = makePair({ now, localA: 'b', localB: 'a' }); // localA is follower (b > a)
    const before = getSecureTransportMetricsSnapshot().rekeys;
    await a.requestRekey?.('TIME');
    assert.strictEqual(getSecureTransportMetricsSnapshot().rekeys, before);
  });

  it('3. rekey collision resolved correctly', () => {
    assert.strictEqual(
      resolveRekeyCollision({ localNodeId: 'b', remoteNodeId: 'a', localRekeyInProgress: true, incomingRekey: true }),
      'ABORT_LOCAL_REKEY',
    );
    assert.strictEqual(
      resolveRekeyCollision({ localNodeId: 'a', remoteNodeId: 'b', localRekeyInProgress: true, incomingRekey: true }),
      'IGNORE_INCOMING',
    );
  });

  it('4. cooldown blocks repeated rekey', async () => {
    const scp = createSessionControlPlane({ localNodeId: 'a', remoteNodeId: 'b', now: () => 1000, rekeyCooldownMs: 2000 });
    // simulate a recent successful rekey at t=1400
    scp.lastRekeyAt = 1400;
    const g1 = canTriggerRekey(scp, 1500);
    assert.deepStrictEqual(g1, { ok: false, reason: 'COOLDOWN' });
  });

  it('5. dual-key decrypt works (late packet under previous key)', async () => {
    let t = 10_000;
    const now = () => t;
    const { a, b } = makePair({ now, localA: 'a', localB: 'b' });

    let got: Uint8Array | null = null;
    b.onReceive?.((d) => {
      got = d;
    });

    // Capture a DATA frame under old key (epoch 0), don't deliver yet.
    let held: any = null;
    a.__setFrameSink?.((f) => {
      held = f;
    });
    await a.send(new Uint8Array([1, 2, 3]));
    assert.ok(held);

    // Restore wiring and rotate keys.
    a.__setFrameSink?.((f) => b.handleIncomingEncrypted(f));
    b.__setFrameSink?.((f) => a.handleIncomingEncrypted(f));
    await a.requestRekey?.('MANUAL');

    // Deliver the held frame late: should decrypt via previous key window.
    b.handleIncomingEncrypted(held);
    assert.ok(got);
    assert.deepStrictEqual(Array.from(got!), [1, 2, 3]);
  });

  it('6. previous key expires after TTL', async () => {
    let t = 20_000;
    const now = () => t;
    const { a, b } = makePair({ now, localA: 'a', localB: 'b' });

    let held: any = null;
    a.__setFrameSink?.((f) => {
      held = f;
    });
    await a.send(new Uint8Array([9]));
    assert.ok(held);
    a.__setFrameSink?.((f) => b.handleIncomingEncrypted(f));
    b.__setFrameSink?.((f) => a.handleIncomingEncrypted(f));
    await a.requestRekey?.('MANUAL');

    // advance time beyond previousKeyTTL and enforce
    t += 6000;
    b.__enforceLifecycle?.();
    // Deliver old frame again => should fail decrypt and close
    b.handleIncomingEncrypted(held);
    await new Promise((r) => setTimeout(r, 25));
    assert.strictEqual(b.isAuthenticated(), false);
  });

  it('7. epoch mismatch rejected (too old)', async () => {
    let t = 30_000;
    const now = () => t;
    const { a, b } = makePair({ now, localA: 'a', localB: 'b' });

    let held: any = null;
    a.__setFrameSink?.((f) => {
      held = f;
    });
    await a.send(new Uint8Array([7]));
    assert.ok(held);
    a.__setFrameSink?.((f) => b.handleIncomingEncrypted(f));
    b.__setFrameSink?.((f) => a.handleIncomingEncrypted(f));

    await a.requestRekey?.('MANUAL');
    t += 3000; // pass cooldown to allow second rekey
    await a.requestRekey?.('MANUAL');

    // epoch is now 2, held is epoch 0 => < current-1 => reject/close
    b.handleIncomingEncrypted(held);
    await new Promise((r) => setTimeout(r, 25));
    assert.strictEqual(b.isAuthenticated(), false);
  });

  it('8. replay attack detected (same nonce frame twice)', async () => {
    let t = 40_000;
    const now = () => t;
    const { a, b } = makePair({ now, localA: 'a', localB: 'b' });
    // Rewire audits capture by injecting hook via __setFrameSink is not available; rely on global metrics + audit array from makePair not exposed here.
    // Instead, just duplicate frame delivery and assert connection closes (replay guard triggers close).
    let held: any = null;
    a.__setFrameSink?.((f) => b.handleIncomingEncrypted(f));
    await a.send(new Uint8Array([1]));
    held = a.getLastEncryptedFrame?.();
    assert.ok(held);
    // deliver the same frame again => replay
    b.handleIncomingEncrypted(held);
    assert.strictEqual(b.isAuthenticated(), false);
  });

  it('9. BLOCK mode stops traffic during rekey', async () => {
    const { a } = makePair({
      now: Date.now,
      localA: 'a',
      localB: 'b',
      trafficDuringRekey: 'BLOCK',
      wire: false,
      rekeyPendingTimeoutMs: 40,
    });
    const p = a.requestRekey?.('MANUAL');
    assert.ok(p);
    await assert.rejects(a.send(new Uint8Array([1])), (e: unknown) => (e as any).code === 'TRAFFIC_BLOCKED_DURING_REKEY');
    // cleanup: avoid unhandled
    await assert.rejects(p!, /SESSION_REKEY_TIMEOUT|TRANSPORT_CLOSED/);
  });

  it('10. ALLOW mode continues traffic during rekey', async () => {
    const { a } = makePair({
      now: Date.now,
      localA: 'a',
      localB: 'b',
      trafficDuringRekey: 'ALLOW',
      wire: false,
      rekeyPendingTimeoutMs: 40,
    });
    const p = a.requestRekey?.('MANUAL');
    assert.ok(p);
    await a.send(new Uint8Array([5]));
    await assert.rejects(p!, /SESSION_REKEY_TIMEOUT|TRANSPORT_CLOSED/);
  });

  it('11. state transitions valid', () => {
    const scp = createSessionControlPlane({ localNodeId: 'a', remoteNodeId: 'b', now: () => 1 });
    transitionSessionState(scp, 'REKEYING');
    transitionSessionState(scp, 'SWITCHING');
    transitionSessionState(scp, 'STABLE');
  });

  it('12. invalid transition throws', () => {
    const scp = createSessionControlPlane({ localNodeId: 'a', remoteNodeId: 'b', now: () => 1 });
    assert.throws(() => transitionSessionState(scp, 'SWITCHING'), (e: unknown) => (e as any).code === 'INVALID_STATE_TRANSITION');
  });

  it('13. resumption ticket valid', () => {
    const payload = { nodeId: 'a', lastEpoch: 2, expiry: Date.now() + 60_000, nonce: 'n1' };
    const t = encodeSessionTicket(payload);
    const got = decodeSessionTicket(t);
    assert.deepStrictEqual(got, payload);
  });

  it('14. resumption forces rekey (simulated: immediate MANUAL rekey by leader)', async () => {
    const { a } = makePair({ now: Date.now, localA: 'a', localB: 'b' });
    const before = getSecureTransportMetricsSnapshot().rekeys;
    await a.requestRekey?.('MANUAL');
    assert.ok(getSecureTransportMetricsSnapshot().rekeys >= before + 1);
  });
});

