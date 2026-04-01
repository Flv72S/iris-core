/**
 * Microstep 15D — Distributed Replay Protection. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import type { MessageEnvelope } from '../../message_envelope/index.js';
import type { ReplayDistributionEnvelope, ReplayDistributionTransport } from '../index.js';
import {
  ReplayDistributionEngine,
  ReplayError,
  ReplayErrorCode,
  ReplayNonceStore,
  ReplayProtectionEngine,
  ReplayValidator,
} from '../index.js';

function envelope(overrides: Partial<MessageEnvelope> = {}): MessageEnvelope {
  return {
    message_id: randomUUID(),
    session_id: 'session-1',
    sender_node_id: 'node-A',
    recipient_node_id: 'node-B',
    timestamp: Date.now(),
    nonce: `nonce-${randomUUID()}`,
    payload: { value: 1 },
    payload_hash: 'hash',
    signature: 'sig',
    ...overrides,
  };
}

describe('Distributed Replay Protection (15D)', () => {
  it('valid message: accepted once', () => {
    const store = new ReplayNonceStore();
    const replay = new ReplayProtectionEngine({ store, validator: new ReplayValidator(store) });
    replay.processEnvelope(envelope());
    assert.strictEqual(store.getAll().length, 1);
  });

  it('duplicate message: second time rejected', () => {
    const store = new ReplayNonceStore();
    const replay = new ReplayProtectionEngine({ store, validator: new ReplayValidator(store) });
    const msg = envelope({ message_id: 'm-1', nonce: 'n-1' });
    replay.processEnvelope(msg);
    assert.throws(
      () => replay.processEnvelope(msg),
      (e: unknown) => e instanceof ReplayError && e.code === ReplayErrorCode.REPLAY_DETECTED,
    );
  });

  it('cross-node replay: node A accepts, node B rejects after sync', async () => {
    let handlerB: ((envelope: ReplayDistributionEnvelope) => Promise<void>) | undefined;
    const transportA: ReplayDistributionTransport = {
      send: async (env) => {
        if (handlerB != null) await handlerB(env);
      },
      onReceive: () => {},
    };
    const transportB: ReplayDistributionTransport = {
      send: async () => {},
      onReceive: (handler) => {
        handlerB = handler;
      },
    };

    const storeA = new ReplayNonceStore();
    const storeB = new ReplayNonceStore();
    const distA = new ReplayDistributionEngine(storeA, transportA, 'node-A');
    const distB = new ReplayDistributionEngine(storeB, transportB, 'node-B');
    distB.start();

    const replayA = new ReplayProtectionEngine({ store: storeA, validator: new ReplayValidator(storeA), distribution: distA });
    const replayB = new ReplayProtectionEngine({ store: storeB, validator: new ReplayValidator(storeB) });
    const msg = envelope({ message_id: 'm-cross', nonce: 'n-cross' });

    replayA.processEnvelope(msg);
    await Promise.resolve();

    assert.throws(
      () => replayB.processEnvelope(msg),
      (e: unknown) => e instanceof ReplayError && e.code === ReplayErrorCode.REPLAY_DETECTED,
    );
  });

  it('old timestamp: rejected', () => {
    const now = 100_000;
    const store = new ReplayNonceStore();
    const replay = new ReplayProtectionEngine({
      store,
      validator: new ReplayValidator(store, { now: () => now, max_age_ms: 1_000 }),
    });
    const msg = envelope({ timestamp: now - 5_000 });
    assert.throws(
      () => replay.processEnvelope(msg),
      (e: unknown) => e instanceof ReplayError && e.code === ReplayErrorCode.INVALID_TIMESTAMP,
    );
  });

  it('future timestamp: rejected', () => {
    const now = 100_000;
    const store = new ReplayNonceStore();
    const replay = new ReplayProtectionEngine({
      store,
      validator: new ReplayValidator(store, { now: () => now, max_drift_ms: 500 }),
    });
    const msg = envelope({ timestamp: now + 5_000 });
    assert.throws(
      () => replay.processEnvelope(msg),
      (e: unknown) => e instanceof ReplayError && e.code === ReplayErrorCode.INVALID_TIMESTAMP,
    );
  });

  it('distribution sync: identifiers propagate and stores converge', async () => {
    let handlerA: ((envelope: ReplayDistributionEnvelope) => Promise<void>) | undefined;
    let handlerB: ((envelope: ReplayDistributionEnvelope) => Promise<void>) | undefined;
    const transportA: ReplayDistributionTransport = {
      send: async (env) => {
        if (handlerB != null) await handlerB(env);
      },
      onReceive: (handler) => {
        handlerA = handler;
      },
    };
    const transportB: ReplayDistributionTransport = {
      send: async (env) => {
        if (handlerA != null) await handlerA(env);
      },
      onReceive: (handler) => {
        handlerB = handler;
      },
    };

    const storeA = new ReplayNonceStore();
    const storeB = new ReplayNonceStore();
    const distA = new ReplayDistributionEngine(storeA, transportA, 'node-A');
    const distB = new ReplayDistributionEngine(storeB, transportB, 'node-B');
    distA.start();
    distB.start();

    const replayA = new ReplayProtectionEngine({ store: storeA, validator: new ReplayValidator(storeA), distribution: distA });
    const replayB = new ReplayProtectionEngine({ store: storeB, validator: new ReplayValidator(storeB), distribution: distB });

    replayA.processEnvelope(envelope({ message_id: 'm-a', nonce: 'n-a', sender_node_id: 'node-A', recipient_node_id: 'node-B' }));
    replayB.processEnvelope(envelope({ message_id: 'm-b', nonce: 'n-b', sender_node_id: 'node-B', recipient_node_id: 'node-A' }));
    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(storeA.getAll().length, 2);
    assert.strictEqual(storeB.getAll().length, 2);
  });

  it('idempotency: same identifier applied twice does not duplicate store', () => {
    const store = new ReplayNonceStore();
    const distribution = new ReplayDistributionEngine(
      store,
      {
        send: async () => {},
        onReceive: () => {},
      },
      'node-A',
    );

    const distributed: ReplayDistributionEnvelope = {
      node_id: 'node-A',
      identifiers: [
        {
          message_id: 'm-idem',
          nonce: 'n-idem',
          session_id: 's-idem',
          sender_node_id: 'node-A',
          recipient_node_id: 'node-B',
          timestamp: Date.now(),
        },
      ],
      timestamp: Date.now(),
    };

    distribution.handleIncoming(distributed);
    distribution.handleIncoming(distributed);
    assert.strictEqual(store.getAll().length, 1);
  });
});
