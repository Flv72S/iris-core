import { describe, expect, it } from 'vitest';

import {
  aggregateCompliance,
  CLUSTER_INVARIANTS,
  evaluateInvariants,
  type InvariantEvaluation,
} from '../../src/distributed/cluster_invariant_engine';

const baseCluster = Object.freeze({
  nodes: Object.freeze({
    n1: Object.freeze({ nodeId: 'n1', phase: 'RUNNING', logicalTime: Object.freeze({ counter: 3, nodeId: 'n1' }) }),
    n2: Object.freeze({ nodeId: 'n2', phase: 'RUNNING', logicalTime: Object.freeze({ counter: 2, nodeId: 'n2' }) }),
  }),
  globalPhase: 'RUNNING' as const,
  logicalTime: Object.freeze({ counter: 3, nodeId: 'n1' }),
  violations: Object.freeze([]),
  expectedNodeIds: Object.freeze(['n1', 'n2']),
  invariantContextHash: 'ctx:stable',
});

describe('16F.6.G cluster invariant engine', () => {
  it('registry contains required invariants', () => {
    const ids = new Set(CLUSTER_INVARIANTS.map((x) => x.id));
    expect(ids.has('cluster.convergence')).toBe(true);
    expect(ids.has('cluster.phase_coherence')).toBe(true);
    expect(ids.has('cluster.node_completeness')).toBe(true);
    expect(ids.has('cluster.no_illegal_transition_residue')).toBe(true);
    expect(ids.has('cluster.temporal_consistency')).toBe(true);
  });

  it('aggregateCompliance obeys NON_COMPLIANT > COMPLIANT > UNKNOWN', () => {
    const compliant: InvariantEvaluation = { id: 'a', result: 'COMPLIANT' };
    const non: InvariantEvaluation = { id: 'b', result: 'NON_COMPLIANT' };
    const unk: InvariantEvaluation = { id: 'c', result: 'UNKNOWN' };
    expect(aggregateCompliance([compliant, compliant])).toBe('COMPLIANT');
    expect(aggregateCompliance([compliant, unk])).toBe('UNKNOWN');
    expect(aggregateCompliance([compliant, non, unk])).toBe('NON_COMPLIANT');
  });

  it('deterministic evaluation: same cluster -> same invariant result', () => {
    const a = evaluateInvariants(baseCluster);
    const b = evaluateInvariants(baseCluster);
    expect(a).toEqual(b);
    expect(a.overallCompliance).toBe('COMPLIANT');
  });

  it('unknown state surfaces UNKNOWN (missing expected node set / context)', () => {
    const r = evaluateInvariants({
      ...baseCluster,
      expectedNodeIds: Object.freeze([]),
      invariantContextHash: undefined,
    });
    expect(r.invariants.some((x) => x.result === 'UNKNOWN')).toBe(true);
    expect(r.overallCompliance).toBe('UNKNOWN');
  });

  it('detects non-compliance for phase mismatch and temporal inconsistency', () => {
    const r = evaluateInvariants({
      ...baseCluster,
      globalPhase: 'READY' as const,
      logicalTime: Object.freeze({ counter: 1, nodeId: 'n1' }),
    });
    expect(r.invariants.some((x) => x.id === 'cluster.phase_coherence' && x.result === 'NON_COMPLIANT')).toBe(true);
    expect(r.invariants.some((x) => x.id === 'cluster.temporal_consistency' && x.result === 'NON_COMPLIANT')).toBe(true);
    expect(r.overallCompliance).toBe('NON_COMPLIANT');
  });

  it('detects illegal transition residue when violations persist', () => {
    const r = evaluateInvariants({
      ...baseCluster,
      violations: Object.freeze([{ from: 'READY', to: 'RUNNING', reason: 'blocked' }]),
    });
    expect(
      r.invariants.some((x) => x.id === 'cluster.no_illegal_transition_residue' && x.result === 'NON_COMPLIANT'),
    ).toBe(true);
  });
});
