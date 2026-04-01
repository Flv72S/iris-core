import { describe, expect, it } from 'vitest';

import { evaluateCompliance } from '../../src/distributed/cluster_compliance_engine';
import {
  deriveComplianceDecisionId,
  executeComplianceDecision,
  simulateComplianceExecution,
} from '../../src/distributed/cluster_compliance_executor';

function baseCluster() {
  return Object.freeze({
    globalPhase: 'RUNNING',
    nodes: Object.freeze({}),
    violations: Object.freeze([]),
    invariants: Object.freeze([]),
    executionJournal: Object.freeze({}),
  });
}

describe('16F.6.I cluster compliance executor', () => {
  it('decision id is deterministic and order-independent', () => {
    const a = {
      severity: 'CRITICAL',
      action: 'ESCALATE',
      reasons: Object.freeze(['b', 'a']),
      invariantIds: Object.freeze(['y', 'x']),
      violationCount: 2,
      timestamp: 7,
    } as const;
    const b = {
      ...a,
      reasons: Object.freeze(['a', 'b']),
      invariantIds: Object.freeze(['x', 'y']),
    } as const;
    expect(deriveComplianceDecisionId(a)).toBe(deriveComplianceDecisionId(b));
  });

  it('strict mode applies strongest action and writes journal', () => {
    const decision = evaluateCompliance(
      Object.freeze({
        ...baseCluster(),
        globalPhase: 'FAILED',
        overallCompliance: 'NON_COMPLIANT',
      }),
      11,
    );
    const r = executeComplianceDecision(baseCluster(), decision, { mode: 'STRICT', executionTimestamp: 55 });
    expect(r.actions[0]).toBe('HALT_CLUSTER');
    expect(r.executionRecord.applied).toBe(true);
    expect(r.mutatedCluster.globalPhase).toBe('HALTED');
    expect(r.mutatedCluster.executionJournal?.[r.executionRecord.decisionId]).toBeDefined();
  });

  it('permissive mode downgrades HALT to FREEZE deterministically', () => {
    const decision = evaluateCompliance(
      Object.freeze({
        ...baseCluster(),
        globalPhase: 'FAILED',
        overallCompliance: 'NON_COMPLIANT',
      }),
      21,
    );
    const r = executeComplianceDecision(baseCluster(), decision, { mode: 'PERMISSIVE', executionTimestamp: 99 });
    expect(r.actions[0]).toBe('FREEZE_TRANSITIONS');
    expect(r.mutatedCluster.transitionLocks).toEqual({ all: true });
  });

  it('idempotency by decisionId: second execution reuses existing record', () => {
    const decision = evaluateCompliance(Object.freeze({ ...baseCluster(), overallCompliance: 'NON_COMPLIANT' }), 5);
    const first = executeComplianceDecision(baseCluster(), decision, { executionTimestamp: 1 });
    const second = executeComplianceDecision(first.mutatedCluster, decision, { executionTimestamp: 2 });
    expect(second.mutatedCluster).toEqual(first.mutatedCluster);
    expect(second.executionRecord).toEqual(first.executionRecord);
  });

  it('dryRun and simulate keep cluster unchanged and applied=false', () => {
    const decision = evaluateCompliance(Object.freeze({ ...baseCluster(), overallCompliance: 'UNKNOWN' }), 5);
    const dry = executeComplianceDecision(baseCluster(), decision, { dryRun: true, executionTimestamp: 13 });
    const sim = simulateComplianceExecution(baseCluster(), decision, { executionTimestamp: 13 });
    expect(dry.executionRecord.applied).toBe(false);
    expect(sim.executionRecord.applied).toBe(false);
    expect(dry.mutatedCluster).toEqual(baseCluster());
    expect(sim.mutatedCluster).toEqual(baseCluster());
    expect(dry.actions).toEqual(sim.actions);
  });

  it('canonical actions are unique and ordered', () => {
    const decision = evaluateCompliance(
      Object.freeze({
        ...baseCluster(),
        overallCompliance: 'NON_COMPLIANT',
        globalPhase: 'FAILED',
        violations: Object.freeze([
          { from: 'READY', to: 'RUNNING', reason: 'a' },
          { from: 'READY', to: 'RUNNING', reason: 'b' },
          { from: 'READY', to: 'RUNNING', reason: 'c' },
        ]),
      }),
      3,
    );
    const r = executeComplianceDecision(baseCluster(), decision, {});
    expect(r.actions.length).toBe(1);
    expect(r.actions[0]).toBe('HALT_CLUSTER');
  });
});
