import { describe, expect, it } from 'vitest';

import type { ComplianceDecision } from '../../src/distributed/cluster_compliance_engine';
import { deriveComplianceDecisionId } from '../../src/distributed/cluster_compliance_executor';
import type { RuntimeDecision } from '../../src/runtime/execution/decision_types';
import { sortDecisionsCanonical } from '../../src/runtime/ordering/canonical_order';
import { canonicalSerialize, normalizeNumber, sha256Canonical } from '../../src/runtime/ops/deterministic_utils';

function fixtureEvents(): readonly unknown[] {
  return Object.freeze([
    Object.freeze({ z: 3, a: 1, nested: Object.freeze({ y: 2, x: 1 }) }),
    Object.freeze({ a: [3, 2, 1], b: 'k', c: null }),
  ]);
}

function mkDecision(n: number): ComplianceDecision {
  return Object.freeze({
    severity: 'CRITICAL',
    action: 'ESCALATE',
    reasons: Object.freeze([`r-${n}`]),
    invariantIds: Object.freeze([`i-${n}`]),
    violationCount: 1,
    timestamp: n,
  });
}

describe('Canonical Hash Stability', () => {
  it('should produce identical hashes across environments', () => {
    const serialized = canonicalSerialize(fixtureEvents());
    const hash = sha256Canonical(serialized);
    // CI / Actions: one line, fixed prefix, 64 lowercase hex after '='.
    // eslint-disable-next-line no-console
    console.log(`IRIS_CANONICAL_STABILITY_SHA256=${hash}`);
    // eslint-disable-next-line no-console
    console.log(hash);
    expect(hash).toMatchInlineSnapshot('"2828e4a709a9c230370ec275b15eda3c1f7379118b6fffb2208ab9cbcc717246"');
  });
});

describe('Numeric Determinism', () => {
  it('should produce identical hashes with floating operations', () => {
    const runSimulation = (): unknown => {
      const values = [0.1, 0.2, 0.3, 1 / 3, Math.PI, Math.sqrt(2)];
      const transformed = values.map((v) => normalizeNumber((v * 7) / 3));
      return Object.freeze({
        transformed: Object.freeze(transformed),
        sum: normalizeNumber(transformed.reduce((acc, x) => acc + x, 0)),
      });
    };
    const result1 = runSimulation();
    const result2 = runSimulation();
    expect(sha256Canonical(result1)).toBe(sha256Canonical(result2));
  });
});

describe('Logical Clock Collision', () => {
  it('should resolve collisions deterministically', () => {
    const events: RuntimeDecision[] = [
      { decision: mkDecision(2), logicalClock: { counter: 10, nodeId: 'n1' }, sequence: 1 },
      { decision: mkDecision(1), logicalClock: { counter: 10, nodeId: 'n1' }, sequence: 1 },
      { decision: mkDecision(3), logicalClock: { counter: 10, nodeId: 'n1' }, sequence: 1 },
    ];
    const ordered1 = sortDecisionsCanonical(events).map((x) => deriveComplianceDecisionId(x.decision));
    const ordered2 = sortDecisionsCanonical([...events].reverse()).map((x) => deriveComplianceDecisionId(x.decision));
    expect(ordered1).toEqual(ordered2);
  });
});
