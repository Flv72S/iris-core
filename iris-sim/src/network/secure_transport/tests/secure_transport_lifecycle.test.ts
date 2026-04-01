/**
 * Microstep 16F.X5.X7 — Session lifecycle, key exhaustion, rekey orchestration, PFS continuity.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { randomBytes } from 'node:crypto';

import { createSecureConnection } from '../secure_connection.js';
import type { TransportSession } from '../transport_session.js';
import {
  resolveSessionLifecyclePolicy,
  DEFAULT_MAX_SESSION_DURATION_MS,
  DEFAULT_REKEY_INTERVAL_MS,
  DEFAULT_MAX_BYTES_PER_KEY,
} from '../transport_policy.js';
import type { PfsMode } from '../transport_policy.js';
import {
  getSecureTransportMetricsSnapshot,
  setTransportSessionDebug,
  patchTransportSessionLifecycleDebug,
} from '../transport_metrics.js';
import type { TransportAuditEvent } from '../audit_hooks.js';

function pairPfsLifecycle(args: {
  now: () => number;
  lifecycle: ReturnType<typeof resolveSessionLifecyclePolicy>;
  pfsMode?: PfsMode;
  /** Optional shared audit buffer (both sides append). */
  audits?: TransportAuditEvent[];
  /** If false, B → A frames are dropped (rekey hang). */
  wireBack?: boolean;
}) {
  const channelKeyHex = randomBytes(32).toString('hex');
  const t0 = args.now();
  const sessionId = `lc-${t0}-${Math.random().toString(36).slice(2)}`;
  const sessA: TransportSession = { sessionId, peerNodeId: 'peer-b', createdAt: t0, lastActivity: t0 };
  const sessB: TransportSession = { sessionId, peerNodeId: 'peer-a', createdAt: t0, lastActivity: t0 };
  const audits = args.audits ?? [];
  const auditHook = (e: TransportAuditEvent) => audits.push(e);

  const common = {
    trustLevel: 'FULL' as const,
    channelKeyHex,
    pfsEnabled: true,
    rekeyMode: 'PFS' as const,
    sessionLifecycle: args.lifecycle,
    ...(args.pfsMode !== undefined ? { pfsMode: args.pfsMode } : {}),
    now: args.now,
    auditHook,
    rateLimit: { messagesPerSecond: 10_000, bytesPerSecond: 50_000_000 },
    expiresAt: t0 + 24 * 60 * 60_000,
  };

  const a = createSecureConnection({
    localNodeId: 'peer-a',
    peerNodeId: 'peer-b',
    session: sessA,
    ...common,
  });
  const b = createSecureConnection({
    localNodeId: 'peer-b',
    peerNodeId: 'peer-a',
    session: sessB,
    ...common,
  });

  a.__setFrameSink?.((frame) => b.handleIncomingEncrypted(frame));
  if (args.wireBack !== false) {
    b.__setFrameSink?.((frame) => a.handleIncomingEncrypted(frame));
  }

  return { a, b, audits, sessionId, t0 };
}

describe('Secure Transport lifecycle (16F.X5.X7)', () => {
  it('1. session expires on max wall-clock age', async () => {
    let t = 50_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy({ maxSessionDurationMs: 1000, rekeyIntervalMs: 60_000 }, 'OPTIONAL');
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a, audits } = pairPfsLifecycle({ now, lifecycle });
    const beforeExp = getSecureTransportMetricsSnapshot().sessionExpired;
    t += 2000;
    a.__enforceLifecycle?.();
    await new Promise((r) => setTimeout(r, 25));
    assert.ok(audits.some((e) => e.type === 'SESSION_EXPIRED'));
    assert.ok(getSecureTransportMetricsSnapshot().sessionExpired >= beforeExp + 1);
    await assert.rejects(a.send(new Uint8Array([1])), /TRANSPORT_CLOSED/);
  });

  it('2. rekey triggered by time (paired PFS)', async () => {
    let t = 1_000_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy(
      { maxSessionDurationMs: 600_000, rekeyIntervalMs: 5000, maxBytesPerKey: 10_000_000 },
      'REQUIRED',
    );
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a, audits } = pairPfsLifecycle({ now, lifecycle, pfsMode: 'REQUIRED' });
    const beforeT = getSecureTransportMetricsSnapshot().rekeyTriggeredTime;
    const beforeRekeys = getSecureTransportMetricsSnapshot().rekeys;
    t += 6000;
    await a.send(new Uint8Array([9]));
    await new Promise((r) => setImmediate(r));
    assert.ok(getSecureTransportMetricsSnapshot().rekeyTriggeredTime >= beforeT + 1);
    assert.ok(getSecureTransportMetricsSnapshot().rekeys >= beforeRekeys + 1);
    assert.ok(audits.some((e) => e.type === 'PFS_REKEY_TRIGGERED' && (e.meta as { reason?: string })?.reason === 'TIME'));
  });

  it('3. rekey triggered by data volume', async () => {
    let t = 2_000_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy(
      { maxSessionDurationMs: 600_000, rekeyIntervalMs: 60_000, maxBytesPerKey: 40 },
      'REQUIRED',
    );
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a, audits } = pairPfsLifecycle({ now, lifecycle, pfsMode: 'REQUIRED' });
    const beforeD = getSecureTransportMetricsSnapshot().rekeyTriggeredData;
    const chunk = new Uint8Array(40);
    await a.send(chunk);
    await a.send(chunk);
    await new Promise((r) => setImmediate(r));
    assert.ok(getSecureTransportMetricsSnapshot().rekeyTriggeredData >= beforeD + 1);
    assert.ok(audits.some((e) => e.type === 'KEY_EXHAUSTION'));
    assert.ok(audits.some((e) => e.type === 'PFS_REKEY_TRIGGERED' && (e.meta as { reason?: string })?.reason === 'DATA'));
  });

  it('4. maxBytesPerKey enforced before unbounded send', async () => {
    let t = 3_000_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy(
      { maxBytesPerKey: 50, rekeyIntervalMs: 3600_000, maxSessionDurationMs: 3600_000 },
      'OPTIONAL',
    );
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a } = pairPfsLifecycle({ now, lifecycle });
    await a.send(new Uint8Array(50));
    await a.send(new Uint8Array(1));
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(a.bytesSent, 1);
  });

  it('5. continuous PFS: TIME rekey emits PFS_CONTINUOUS_ENFORCED', async () => {
    let t = 4_000_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy(
      { rekeyIntervalMs: 2000, maxSessionDurationMs: 600_000, maxBytesPerKey: 10_000_000 },
      'STRICT',
    );
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a, audits } = pairPfsLifecycle({ now, lifecycle, pfsMode: 'STRICT' });
    t += 2500;
    await a.send(new Uint8Array([1]));
    await new Promise((r) => setImmediate(r));
    assert.ok(audits.some((e) => e.type === 'PFS_CONTINUOUS_ENFORCED'));
  });

  it('6. rekey timeout terminates session (one-way wire)', async () => {
    const lifecycle = resolveSessionLifecyclePolicy(
      {
        maxSessionDurationMs: 600_000,
        rekeyIntervalMs: 1000,
        maxBytesPerKey: 10_000_000,
        rekeyPendingTimeoutMs: 40,
      },
      'STRICT',
    );
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: Date.now() },
    });
    const { a } = pairPfsLifecycle({ now: Date.now, lifecycle, pfsMode: 'STRICT', wireBack: false });
    const beforeTerm = getSecureTransportMetricsSnapshot().sessionTerminated;
    await assert.rejects(a.requestRekey!('MANUAL'), /SESSION_REKEY_TIMEOUT/);
    assert.ok(getSecureTransportMetricsSnapshot().sessionTerminated >= beforeTerm + 1);
    assert.strictEqual(a.isAuthenticated(), false);
  });

  it('7. STRICT mode uses tighter default rekey pending timeout than OPTIONAL', () => {
    const strict = resolveSessionLifecyclePolicy({}, 'STRICT');
    const soft = resolveSessionLifecyclePolicy({}, 'OPTIONAL');
    assert.strictEqual(strict.rekeyPendingTimeoutMs, 30_000);
    assert.strictEqual(soft.rekeyPendingTimeoutMs, 60_000);
  });

  it('8. OPTIONAL policy keeps soft default timeouts (fallback-friendly)', () => {
    const o = resolveSessionLifecyclePolicy({ rekeyIntervalMs: 60_000 }, 'OPTIONAL');
    assert.strictEqual(o.rekeyPendingTimeoutMs, 60_000);
    assert.strictEqual(o.maxBytesPerKey, DEFAULT_MAX_BYTES_PER_KEY);
  });

  it('9. lifecycle metrics increment on events', async () => {
    let t = 6_000_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy({ maxSessionDurationMs: 500, rekeyIntervalMs: 60_000 }, 'OPTIONAL');
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a } = pairPfsLifecycle({ now, lifecycle });
    const s0 = getSecureTransportMetricsSnapshot();
    t += 2000;
    a.__enforceLifecycle?.();
    await new Promise((r) => setImmediate(r));
    const s1 = getSecureTransportMetricsSnapshot();
    assert.ok(s1.sessionExpired >= s0.sessionExpired + 1);
    assert.ok(s1.sessionTerminated >= s0.sessionTerminated + 1);
  });

  it('10. audit stream includes lifecycle and rekey events', async () => {
    let t = 7_000_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy(
      { rekeyIntervalMs: 1000, maxSessionDurationMs: 600_000, maxBytesPerKey: 10_000_000 },
      'REQUIRED',
    );
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a, audits } = pairPfsLifecycle({ now, lifecycle, pfsMode: 'REQUIRED' });
    t += 1500;
    await a.send(new Uint8Array([2]));
    await new Promise((r) => setImmediate(r));
    const types = new Set(audits.map((e) => e.type));
    assert.ok(types.has('PFS_REKEY_TRIGGERED'));
    assert.ok(types.has('TRANSPORT_REKEY'));
  });

  it('11. terminateSession leaves connection unusable (keys cleared)', async () => {
    let t = 8_000_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy({ maxSessionDurationMs: 600_000, rekeyIntervalMs: 60_000 }, 'OPTIONAL');
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a, audits } = pairPfsLifecycle({ now, lifecycle });
    await a.terminateSession?.('TEST_REASON');
    await new Promise((r) => setImmediate(r));
    assert.ok(audits.some((e) => e.type === 'SESSION_TERMINATED'));
    await assert.rejects(a.send(new Uint8Array([1])), /TRANSPORT_CLOSED/);
  });

  it('12. no plaintext traffic after expiration', async () => {
    let t = 9_000_000;
    const now = () => t;
    const lifecycle = resolveSessionLifecyclePolicy({ maxSessionDurationMs: 100, rekeyIntervalMs: 60_000 }, 'OPTIONAL');
    setTransportSessionDebug({
      sessionId: 'x',
      pfsEnabled: true,
      rekeyMode: 'PFS',
    });
    patchTransportSessionLifecycleDebug({
      sessionLifecycle: { ageMs: 0, bytesSent: 0, bytesReceived: 0, lastRekeyAt: t },
    });
    const { a, b } = pairPfsLifecycle({ now, lifecycle });
    let got: Uint8Array | null = null;
    b.onReceive?.((d) => {
      got = d;
    });
    await a.send(new Uint8Array([7]));
    await new Promise((r) => setImmediate(r));
    assert.ok(got !== null);
    got = null;
    t += 500;
    await assert.rejects(a.send(new Uint8Array([8])), /TRANSPORT_CLOSED/);
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(got, null);
  });

  it('13. policy defaults match enterprise spec', () => {
    const d = resolveSessionLifecyclePolicy({});
    assert.strictEqual(d.maxSessionDurationMs, DEFAULT_MAX_SESSION_DURATION_MS);
    assert.strictEqual(d.rekeyIntervalMs, DEFAULT_REKEY_INTERVAL_MS);
    assert.strictEqual(d.maxBytesPerKey, DEFAULT_MAX_BYTES_PER_KEY);
  });
});
