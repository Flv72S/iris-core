import { describe, it } from 'node:test';
import assert from 'node:assert';

import { normalizeSnapshot } from '../normalize_snapshot.js';
import { assertStateConsistency } from '../observability_invariants.js';
import { isDeterministicSnapshot } from '../observability_persist.js';
import { createValidSnapshot, cloneSnapshot } from './fixtures/snapshot.factory.js';
import { corruptedInvalidStateGauge } from './fixtures/corrupted.snapshot.js';

describe('ADR-003.A unit invariants', () => {
  it('INV-001: assertStateConsistency true on valid snapshot', () => {
    const snap = createValidSnapshot();
    assert.strictEqual(assertStateConsistency(snap), true);
  });

  it('INV-001: assertStateConsistency false on invalid state/gauge pair', () => {
    const snap = corruptedInvalidStateGauge();
    assert.strictEqual(assertStateConsistency(snap), false);
  });

  it('INV-001: assertStateConsistency true when gauge is absent', () => {
    const snap = createValidSnapshot();
    delete snap.metrics.metrics['runtime.state'];
    assert.strictEqual(assertStateConsistency(snap), true);
  });

  it('INV-003: normalizeSnapshot stable for equivalent snapshots', () => {
    const a = createValidSnapshot({
      node: { timestamp: 1_700_000_000_000, uptime_seconds: 10 },
      metrics: {
        timestamp: '2026-03-27T00:00:00.000Z',
        metrics: {
          'runtime.boot.time': 123,
          'runtime.init.phase.duration': 3,
          node_uptime_seconds: 10,
        },
      },
    });
    const b = createValidSnapshot({
      node: { timestamp: 1_700_000_099_999, uptime_seconds: 99 },
      metrics: {
        timestamp: '2026-03-27T01:00:00.000Z',
        metrics: {
          'runtime.boot.time': 999,
          'runtime.init.phase.duration': 9,
          node_uptime_seconds: 99,
        },
      },
    });
    assert.deepStrictEqual(normalizeSnapshot(a), normalizeSnapshot(b));
  });

  it('INV-003: normalizeSnapshot changes when stable semantic state changes', () => {
    const a = createValidSnapshot();
    const b = cloneSnapshot(a);
    b.runtime!.state = 'ERROR';
    assert.notDeepStrictEqual(normalizeSnapshot(a), normalizeSnapshot(b));
  });

  it('INV-003: normalizeSnapshot preserves deterministic semantic keys', () => {
    const s = createValidSnapshot();
    const out = normalizeSnapshot(s) as any;
    assert.strictEqual(out.runtime.state, 'RUNNING');
    assert.strictEqual(out.federationEnabled, true);
    assert.ok(Array.isArray(out.runtime.activeComponentsList));
  });

  it('INV-012: isDeterministicSnapshot true on valid snapshot', () => {
    const snap = createValidSnapshot();
    assert.strictEqual(isDeterministicSnapshot(snap), true);
  });

  it('INV-012: isDeterministicSnapshot false for non-deterministic getter snapshot', () => {
    let t = 1_700_000_000_000;
    const snap: any = createValidSnapshot();
    Object.defineProperty(snap.node, 'timestamp', {
      enumerable: true,
      configurable: true,
      get() {
        t += 1;
        return t;
      },
    });
    assert.strictEqual(isDeterministicSnapshot(snap), false);
  });

  it('INV-012: isDeterministicSnapshot true for reordered input keys', () => {
    const a = createValidSnapshot();
    const b = createValidSnapshot();
    b.metrics.metrics = {
      messages_sent: a.metrics.metrics.messages_sent ?? 0,
      'runtime.component.count': a.metrics.metrics['runtime.component.count'] ?? 0,
      'runtime.active_components': a.metrics.metrics['runtime.active_components'] ?? 0,
      'runtime.errors': a.metrics.metrics['runtime.errors'] ?? 0,
      'runtime.state': a.metrics.metrics['runtime.state'] ?? 0,
    };
    assert.strictEqual(isDeterministicSnapshot(a), true);
    assert.strictEqual(isDeterministicSnapshot(b), true);
  });
});

