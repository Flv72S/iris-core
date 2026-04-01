import { describe, it } from 'node:test';
import assert from 'node:assert';

import { assertStateConsistency, validateObservabilitySnapshot } from '../observability_invariants.js';
import { normalizeSnapshot } from '../normalize_snapshot.js';
import { isDeterministicSnapshot, readObservabilitySnapshot } from '../observability_persist.js';
import {
  corruptedInvalidStateGauge,
  corruptedDuplicateComponents,
  corruptedDuplicateDomains,
  corruptedMissingNodeId,
  corruptedMissingRuntimeNestedField,
  corruptedPartiallySortedComponents,
  corruptedWrongActiveComponentsListType,
  corruptedUnsortedComponents,
  corruptedUnsortedDomains,
} from './fixtures/corrupted.snapshot.js';
import { createRuntimeNode, startNode, stopNode } from './fixtures/runtime.factory.js';

function stopInvariantSatisfied(snapshot: ReturnType<typeof readObservabilitySnapshot>): boolean {
  if (!snapshot?.runtime) return false;
  return snapshot.runtime.state === 'STOPPED' && (snapshot.runtime.activeComponentsList?.length ?? -1) === 0;
}

describe('ADR-003.A negative invariants', () => {
  it('invalid state/gauge -> INV-001 fails', () => {
    const snap = corruptedInvalidStateGauge();
    assert.strictEqual(assertStateConsistency(snap), false);
  });

  it('unsorted components -> invariant validation fails (INV-003 ordering path)', () => {
    const snap = corruptedUnsortedComponents();
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, false);
    if (!v.ok) {
      assert.ok(v.errors.includes('runtime.activeComponentsList must be sorted'));
    }
    // Normalize still returns deterministic object (expected behavior), so this is not a pass condition.
    const normalized = normalizeSnapshot(snap);
    assert.ok(normalized);
  });

  it('corrupted snapshot -> INV-011 fails', () => {
    const snap = corruptedMissingNodeId();
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, false);
  });

  it('non-deterministic snapshot object -> INV-012 fails', () => {
    const snap: any = corruptedMissingNodeId();
    let n = 0;
    Object.defineProperty(snap.node, 'timestamp', {
      enumerable: true,
      configurable: true,
      get() {
        n += 1;
        return 1000 + n;
      },
    });
    assert.strictEqual(isDeterministicSnapshot(snap), false);
  });

  it('missing stop snapshot -> INV-005 fails', async () => {
    const { node, cwd } = createRuntimeNode({ nodeId: 'adr003-neg-stop' });
    await startNode(node);
    await stopNode(node);
    const good = readObservabilitySnapshot(cwd);
    assert.strictEqual(stopInvariantSatisfied(good), true);

    // Simulate missing stop snapshot case.
    const missing = null;
    assert.strictEqual(stopInvariantSatisfied(missing), false);
  });

  it('CORR-001 missing nested runtime fields -> validation fails', () => {
    const snap = corruptedMissingRuntimeNestedField();
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, false);
    if (!v.ok) {
      assert.ok(v.errors.some((e) => e.includes('runtime.updatedAt invalid')));
    }
  });

  it('CORR-002 wrong type activeComponentsList -> validation fails', () => {
    const snap = corruptedWrongActiveComponentsListType();
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, false);
    if (!v.ok) {
      assert.ok(v.errors.some((e) => e.includes('runtime.activeComponentsList must be array')));
    }
  });

  it('CORR-003 partially sorted arrays -> validation fails', () => {
    const snap = corruptedPartiallySortedComponents();
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, false);
    if (!v.ok) {
      assert.ok(v.errors.some((e) => e.includes('runtime.activeComponentsList must be sorted')));
    }
  });

  it('CORR-004 duplicated entries (components/domains) -> validation fails', () => {
    const c = corruptedDuplicateComponents();
    const cV = validateObservabilitySnapshot(c);
    assert.strictEqual(cV.ok, false);
    if (!cV.ok) {
      assert.ok(cV.errors.some((e) => e.includes('duplicate')));
    }

    const d = corruptedDuplicateDomains();
    const dV = validateObservabilitySnapshot(d);
    assert.strictEqual(dV.ok, false);
    if (!dV.ok) {
      assert.ok(dV.errors.some((e) => e.includes('duplicate')));
    }
  });

  it('federation unsorted domains -> validation fails', () => {
    const snap = corruptedUnsortedDomains();
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, false);
    if (!v.ok) {
      assert.ok(v.errors.some((e) => e.includes('domainsRegistered must be sorted')));
    }
  });

  it('runtime components length mismatch -> validation fails', () => {
    const snap = corruptedUnsortedComponents();
    if (!snap.runtime) throw new Error('runtime block required');
    snap.runtime.activeComponents = 3;
    const v = validateObservabilitySnapshot(snap);
    assert.strictEqual(v.ok, false);
    if (!v.ok) {
      assert.ok(v.errors.some((e) => e.includes('length mismatch')));
    }
  });
});

