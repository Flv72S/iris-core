import { describe, expect, it } from 'vitest';

import { evaluateCompliance } from '../../src/distributed/cluster_compliance_engine';
import type { InvariantEvaluation } from '../../src/distributed/cluster_invariant_engine';
import type { BarrierViolation } from '../../src/distributed/phase_barrier_engine';

function clusterInput(input: {
  globalPhase?: 'RUNNING' | 'FAILED' | 'READY' | 'PARTIAL';
  overallCompliance?: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';
  invariants?: readonly InvariantEvaluation[];
  violations?: readonly BarrierViolation[];
}) {
  return Object.freeze({
    globalPhase: input.globalPhase ?? 'RUNNING',
    overallCompliance: input.overallCompliance,
    invariants: input.invariants ?? Object.freeze([]),
    violations: input.violations ?? Object.freeze([]),
  });
}

describe('16F.6.H cluster compliance engine', () => {
  it('determinism: same input yields same decision', () => {
    const c = clusterInput({
      overallCompliance: 'COMPLIANT',
      violations: Object.freeze([]),
    });
    expect(evaluateCompliance(c, 42)).toEqual(evaluateCompliance(c, 42));
  });

  it('all-good policy -> INFO NO_OP', () => {
    const d = evaluateCompliance(clusterInput({ overallCompliance: 'COMPLIANT', violations: Object.freeze([]) }), 1);
    expect(d.severity).toBe('INFO');
    expect(d.action).toBe('NO_OP');
  });

  it('warning policy -> WARNING LOG_ONLY', () => {
    const d = evaluateCompliance(
      clusterInput({
        overallCompliance: 'UNKNOWN',
        violations: Object.freeze([{ from: 'READY', to: 'RUNNING', reason: 'r1' }]),
      }),
      2,
    );
    expect(d.severity).toBe('WARNING');
    expect(d.action).toBe('LOG_ONLY');
  });

  it('non-compliant policy -> CRITICAL ESCALATE', () => {
    const d = evaluateCompliance(clusterInput({ overallCompliance: 'NON_COMPLIANT' }), 3);
    expect(d.severity).toBe('CRITICAL');
    expect(d.action).toBe('ESCALATE');
  });

  it('failure override wins action precedence: HALT > FREEZE > ESCALATE', () => {
    const d = evaluateCompliance(
      clusterInput({
        globalPhase: 'FAILED',
        overallCompliance: 'NON_COMPLIANT',
        violations: Object.freeze([
          { from: 'READY', to: 'RUNNING', reason: 'v1' },
          { from: 'READY', to: 'RUNNING', reason: 'v2' },
          { from: 'READY', to: 'RUNNING', reason: 'v3' },
        ]),
      }),
      4,
    );
    expect(d.severity).toBe('CRITICAL');
    expect(d.action).toBe('HALT_CLUSTER');
  });

  it('critical invariant set -> REQUIRE_MANUAL_INTERVENTION', () => {
    const d = evaluateCompliance(
      clusterInput({
        overallCompliance: 'NON_COMPLIANT',
        invariants: Object.freeze([
          { id: 'cluster.temporal_consistency', result: 'NON_COMPLIANT', reason: 'bad time' },
          { id: 'cluster.node_completeness', result: 'COMPLIANT', reason: 'ok' },
        ]),
      }),
      5,
    );
    expect(d.action).toBe('REQUIRE_MANUAL_INTERVENTION');
    expect(d.invariantIds).toContain('cluster.temporal_consistency');
  });

  it('aggregation includes deterministic reasons/invariantIds and replay timestamp', () => {
    const d = evaluateCompliance(
      clusterInput({
        overallCompliance: 'NON_COMPLIANT',
        invariants: Object.freeze([{ id: 'cluster.no_illegal_transition_residue', result: 'NON_COMPLIANT', reason: 'v' }]),
      }),
      99,
    );
    expect(d.timestamp).toBe(99);
    expect(Array.isArray(d.reasons)).toBe(true);
    expect(Array.isArray(d.invariantIds)).toBe(true);
  });

  it('replay invariance with fixed timestamp', () => {
    const c = clusterInput({
      globalPhase: 'FAILED',
      overallCompliance: 'NON_COMPLIANT',
    });
    expect(evaluateCompliance(c, 1234)).toEqual(evaluateCompliance(c, 1234));
  });
});
