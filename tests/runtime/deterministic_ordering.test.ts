import { describe, expect, it } from 'vitest';

import type { ComplianceDecision } from '../../src/distributed/cluster_compliance_engine';
import { deriveComplianceDecisionId } from '../../src/distributed/cluster_compliance_executor';
import { sortDecisionsCanonical } from '../../src/runtime/ordering/canonical_order';
import { hasIdenticalOrderAcrossNodes } from '../../src/runtime/ops/ordering_validator';

function makeDecision(n: number): ComplianceDecision {
  return Object.freeze({
    severity: 'CRITICAL',
    action: 'ESCALATE',
    reasons: Object.freeze([`r-${n}`]),
    invariantIds: Object.freeze([`i-${n}`]),
    violationCount: 1,
    timestamp: n,
  });
}

describe('deterministic canonical ordering', () => {
  it('returns same order regardless of input permutation', () => {
    const d1 = makeDecision(1);
    const d2 = makeDecision(2);
    const d3 = makeDecision(3);
    const a = sortDecisionsCanonical([
      { decision: d2, logicalClock: { counter: 9, nodeId: 'n2' } },
      { decision: d1, logicalClock: { counter: 3, nodeId: 'n1' } },
      { decision: d3, logicalClock: { counter: 9, nodeId: 'n3' } },
    ]).map((x) => deriveComplianceDecisionId(x.decision));
    const b = sortDecisionsCanonical([
      { decision: d3, logicalClock: { counter: 9, nodeId: 'n3' } },
      { decision: d1, logicalClock: { counter: 3, nodeId: 'n1' } },
      { decision: d2, logicalClock: { counter: 9, nodeId: 'n2' } },
    ]).map((x) => deriveComplianceDecisionId(x.decision));
    expect(a).toEqual(b);
  });

  it('validator detects identical ordered sequences', () => {
    const seq = ['CMP:a', 'CMP:b', 'CMP:c'];
    expect(hasIdenticalOrderAcrossNodes({
      n1: seq,
      n2: ['CMP:a', 'CMP:b', 'CMP:c'],
      n3: ['CMP:a', 'CMP:b', 'CMP:c'],
    })).toBe(true);
    expect(hasIdenticalOrderAcrossNodes({
      n1: seq,
      n2: ['CMP:b', 'CMP:a', 'CMP:c'],
    })).toBe(false);
  });
});
