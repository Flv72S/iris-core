/**
 * Microstep 16D.X1 — HMAC + nonce + ingest auth tests.
 * Microstep 16D.X1.HARDENING — logging + constant-time unknown-node path.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { verifyIngestRequestAuth, buildSignedPayloadString } from '../../control_plane/control_plane_ingest_auth.js';
import { signPayload, verifySignature } from '../hmac.js';
import { InMemoryNonceStore, generateNonce } from '../nonce.js';
import { stableStringify } from '../stable_json.js';

const SECRET_A = '01234567890123456789012345678901'; // 32 chars
const SECRET_B = 'abcdefghijklmnopqrstuvwxyzABCDEF'; // 32 chars

describe('Security ingest auth (16D.X1)', () => {
  it('sign / verify: valid signature ok; tampered fail', () => {
    const payload = stableStringify({ a: 1, b: { c: 2 } });
    const sig = signPayload(SECRET_A, payload);
    assert.strictEqual(verifySignature(SECRET_A, payload, sig), true);
    assert.strictEqual(verifySignature(SECRET_A, payload + 'x', sig), false);
    assert.strictEqual(verifySignature(SECRET_B, payload, sig), false);
  });

  it('nonce: reuse -> replay', () => {
    const now = 1_000_000;
    const store = new InMemoryNonceStore(60_000, () => now);
    const n = generateNonce();
    assert.strictEqual(store.isReplay('n1', n), false);
    assert.strictEqual(store.isReplay('n1', n), true);
  });

  it('timestamp: old timestamp rejected + logged', () => {
    const logs: string[] = [];
    const body = {
      nodeId: 'n1',
      snapshot: { node: { id: 'n1', timestamp: 1, uptime_seconds: 0 }, metrics: { metrics: {}, timestamp: '', nodeId: 'n1' } },
    };
    const ts = Date.now() - 120_000;
    const nonce = generateNonce();
    const payload = buildSignedPayloadString({ nodeId: 'n1', timestamp: ts, nonce, body });
    const sig = signPayload(SECRET_A, payload);

    const r = verifyIngestRequestAuth({
      requireSignedIngest: true,
      now: Date.now(),
      headers: {
        'x-iris-node-id': 'n1',
        'x-iris-timestamp': String(ts),
        'x-iris-nonce': nonce,
        'x-iris-signature': sig,
      },
      parsedBody: body,
      getNodeAuth: () => ({ trustState: 'ACTIVE', activeSecret: SECRET_A }),
      nonceStore: new InMemoryNonceStore(),
      log: (ev) => logs.push(ev),
    });
    assert.strictEqual(r.ok, false);
    if (r.ok) throw new Error('expected fail');
    assert.strictEqual(r.status, 401);
    assert.ok(logs.includes('AUTH_TIMESTAMP_INVALID'));
  });

  it('full request: valid signed -> accepted', () => {
    const body = {
      nodeId: 'n1',
      snapshot: { node: { id: 'n1', timestamp: 1, uptime_seconds: 0 }, metrics: { metrics: {}, timestamp: '', nodeId: 'n1' } },
    };
    const ts = Date.now();
    const nonce = generateNonce();
    const payload = buildSignedPayloadString({ nodeId: 'n1', timestamp: ts, nonce, body });
    const sig = signPayload(SECRET_A, payload);

    const r = verifyIngestRequestAuth({
      requireSignedIngest: true,
      now: ts,
      headers: {
        'x-iris-node-id': 'n1',
        'x-iris-timestamp': String(ts),
        'x-iris-nonce': nonce,
        'x-iris-signature': sig,
      },
      parsedBody: body,
      getNodeAuth: () => ({ trustState: 'ACTIVE', activeSecret: SECRET_A }),
      nonceStore: new InMemoryNonceStore(),
    });
    assert.strictEqual(r.ok, true);
    if (!r.ok) throw new Error('expected ok');
    assert.strictEqual(r.mode, 'signed');
  });

  it('spoofing: nodeId valid but wrong secret -> reject + log', () => {
    const logs: string[] = [];
    const body = {
      nodeId: 'n1',
      snapshot: { node: { id: 'n1', timestamp: 1, uptime_seconds: 0 }, metrics: { metrics: {}, timestamp: '', nodeId: 'n1' } },
    };
    const ts = Date.now();
    const nonce = generateNonce();
    const payload = buildSignedPayloadString({ nodeId: 'n1', timestamp: ts, nonce, body });
    const sig = signPayload(SECRET_B, payload);

    const r = verifyIngestRequestAuth({
      requireSignedIngest: true,
      now: ts,
      headers: {
        'x-iris-node-id': 'n1',
        'x-iris-timestamp': String(ts),
        'x-iris-nonce': nonce,
        'x-iris-signature': sig,
      },
      parsedBody: body,
      getNodeAuth: () => ({ trustState: 'ACTIVE', activeSecret: SECRET_A }),
      nonceStore: new InMemoryNonceStore(),
      log: (ev) => logs.push(ev),
    });
    assert.strictEqual(r.ok, false);
    assert.ok(logs.includes('AUTH_INVALID_SIGNATURE'));
  });

  it('constant-time unknown-node path: signature checked then unknown-node rejection', () => {
    const logs: string[] = [];
    const body = {
      nodeId: 'ghost',
      snapshot: { node: { id: 'ghost', timestamp: 1, uptime_seconds: 0 }, metrics: { metrics: {}, timestamp: '', nodeId: 'ghost' } },
    };
    const ts = Date.now();
    const nonce = generateNonce();
    // Signed with arbitrary secret; server should still verify against dummy secret and reject.
    const payload = buildSignedPayloadString({ nodeId: 'ghost', timestamp: ts, nonce, body });
    const sig = signPayload(SECRET_A, payload);

    const r = verifyIngestRequestAuth({
      requireSignedIngest: true,
      now: ts,
      headers: {
        'x-iris-node-id': 'ghost',
        'x-iris-timestamp': String(ts),
        'x-iris-nonce': nonce,
        'x-iris-signature': sig,
      },
      parsedBody: body,
      getNodeAuth: () => undefined,
      nonceStore: new InMemoryNonceStore(),
      log: (ev) => logs.push(ev),
    });
    assert.strictEqual(r.ok, false);
    assert.ok(logs.includes('AUTH_INVALID_SIGNATURE') || logs.includes('AUTH_UNKNOWN_NODE'));
  });

  it('dev mode: no headers -> unsigned accepted when requireSignedIngest false', () => {
    const r = verifyIngestRequestAuth({
      requireSignedIngest: false,
      now: Date.now(),
      headers: {},
      parsedBody: { nodeId: 'n1', snapshot: {} },
      getNodeAuth: () => undefined,
      nonceStore: new InMemoryNonceStore(),
    });
    assert.strictEqual(r.ok, true);
    if (!r.ok) throw new Error('expected ok');
    assert.strictEqual(r.mode, 'unsigned_dev');
  });

  it('rotation: accepts signature with nextSecret when ROTATING', () => {
    const body = {
      nodeId: 'n1',
      snapshot: { node: { id: 'n1', timestamp: 1, uptime_seconds: 0 }, metrics: { metrics: {}, timestamp: '', nodeId: 'n1' } },
    };
    const ts = Date.now();
    const nonce = generateNonce();
    const payload = buildSignedPayloadString({ nodeId: 'n1', timestamp: ts, nonce, body });
    const sigWithNext = signPayload(SECRET_B, payload);
    const r = verifyIngestRequestAuth({
      requireSignedIngest: true,
      now: ts,
      headers: {
        'x-iris-node-id': 'n1',
        'x-iris-timestamp': String(ts),
        'x-iris-nonce': nonce,
        'x-iris-signature': sigWithNext,
      },
      parsedBody: body,
      getNodeAuth: () => ({ trustState: 'ROTATING', activeSecret: SECRET_A, nextSecret: SECRET_B }),
      nonceStore: new InMemoryNonceStore(),
    });
    assert.strictEqual(r.ok, true);
  });

  it('trust states: pending and revoked are rejected', () => {
    const body = {
      nodeId: 'n1',
      snapshot: { node: { id: 'n1', timestamp: 1, uptime_seconds: 0 }, metrics: { metrics: {}, timestamp: '', nodeId: 'n1' } },
    };
    const ts = Date.now();
    const nonceA = generateNonce();
    const payloadA = buildSignedPayloadString({ nodeId: 'n1', timestamp: ts, nonce: nonceA, body });
    const sig = signPayload(SECRET_A, payloadA);
    const pending = verifyIngestRequestAuth({
      requireSignedIngest: true,
      now: ts,
      headers: {
        'x-iris-node-id': 'n1',
        'x-iris-timestamp': String(ts),
        'x-iris-nonce': nonceA,
        'x-iris-signature': sig,
      },
      parsedBody: body,
      getNodeAuth: () => ({ trustState: 'PENDING', activeSecret: SECRET_A }),
      nonceStore: new InMemoryNonceStore(),
    });
    assert.strictEqual(pending.ok, false);
    const nonceB = generateNonce();
    const payloadB = buildSignedPayloadString({ nodeId: 'n1', timestamp: ts, nonce: nonceB, body });
    const revoked = verifyIngestRequestAuth({
      requireSignedIngest: true,
      now: ts,
      headers: {
        'x-iris-node-id': 'n1',
        'x-iris-timestamp': String(ts),
        'x-iris-nonce': nonceB,
        'x-iris-signature': signPayload(SECRET_A, payloadB),
      },
      parsedBody: body,
      getNodeAuth: () => ({ trustState: 'REVOKED', activeSecret: SECRET_A }),
      nonceStore: new InMemoryNonceStore(),
    });
    assert.strictEqual(revoked.ok, false);
  });
});
