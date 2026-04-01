import { describe, expect, it } from 'vitest';

import type { ComplianceDecision } from '../../src/distributed/cluster_compliance_engine';
import { deriveComplianceDecisionId } from '../../src/distributed/cluster_compliance_executor';
import { createInitialClusterState } from '../../src/distributed/cluster_lifecycle_engine';
import type { RuntimeDecision } from '../../src/runtime/execution/decision_types';
import { replayDeterministically } from '../../src/runtime/execution/replay_engine';
import { decodeAndValidateRuntimeDecision } from '../../src/runtime/network/message_codec';
import { sortDecisionsCanonical } from '../../src/runtime/ordering/canonical_order';
import { buildAuditProof } from '../../src/runtime/ops/audit_proof';
import { hasIdenticalOrderAcrossNodes } from '../../src/runtime/ops/ordering_validator';

function d(n: number, action: ComplianceDecision['action'] = 'ESCALATE'): ComplianceDecision {
  return Object.freeze({
    severity: 'CRITICAL',
    action,
    reasons: Object.freeze([`r-${n}`]),
    invariantIds: Object.freeze([`i-${n}`]),
    violationCount: 1,
    timestamp: n,
  });
}

describe('test:certify:cluster', () => {
  it('Deterministic Ordering: shuffled inputs produce identical canonical ordering', () => {
    const a: RuntimeDecision[] = [
      { decision: d(1), logicalClock: { counter: 2, nodeId: 'n1' } },
      { decision: d(2), logicalClock: { counter: 1, nodeId: 'n2' } },
      { decision: d(3), logicalClock: { counter: 2, nodeId: 'n3' } },
    ];
    const b: RuntimeDecision[] = [a[2]!, a[0]!, a[1]!];
    const sa = sortDecisionsCanonical(a).map((x) => deriveComplianceDecisionId(x.decision));
    const sb = sortDecisionsCanonical(b).map((x) => deriveComplianceDecisionId(x.decision));
    expect(sa).toEqual(sb);
  });

  it('Replay Stability + Audit Consistency: same log => same state hash and proof', () => {
    const entries = [d(10), d(11), d(12)].map((x, i) => ({
      decisionId: deriveComplianceDecisionId(x),
      decision: x,
      executionTimestamp: i + 1,
    }));
    const s1 = replayDeterministically(createInitialClusterState('n1'), entries);
    const s2 = replayDeterministically(createInitialClusterState('n1'), entries);
    const p1 = buildAuditProof(entries, s1);
    const p2 = buildAuditProof(entries, s2);
    expect(p1).toEqual(p2);
  });

  it('Cross-node Determinism: identical canonical sequence across nodes', () => {
    const ordered = ['CMP:a', 'CMP:b', 'CMP:c'];
    expect(hasIdenticalOrderAcrossNodes({
      n1: ordered,
      n2: [...ordered],
      n3: [...ordered],
    })).toBe(true);
  });

  it('Byzantine malformed ordering payload is rejected at boundary', () => {
    expect(() =>
      decodeAndValidateRuntimeDecision({
        decision: d(20),
        logicalClock: { counter: 'x', nodeId: '' },
      }),
    ).toThrow();
  });
});
