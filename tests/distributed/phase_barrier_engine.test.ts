import { describe, expect, it } from 'vitest';

import {
  evaluateBarrierTransition,
  type ClusterPhase,
  type ClusterStateLike,
  type NodePhase,
  PHASE_BARRIERS,
} from '../../src/distributed/phase_barrier_engine';

function mkState(nodePhases: readonly NodePhase[], phase: ClusterPhase): ClusterStateLike {
  const nodes: Record<string, { nodeId: string; phase: NodePhase }> = {};
  nodePhases.forEach((p, i) => {
    nodes[`n${i + 1}`] = { nodeId: `n${i + 1}`, phase: p };
  });
  return Object.freeze({ nodes: Object.freeze(nodes), globalPhase: phase, violations: Object.freeze([]) });
}

describe('16F.6.E phase barrier engine', () => {
  it('has required barrier registry entries', () => {
    const keys = new Set(PHASE_BARRIERS.map((b) => `${b.from}->${b.to}`));
    expect(keys.has('INITIALIZING->READY')).toBe(true);
    expect(keys.has('READY->RUNNING')).toBe(true);
    expect(keys.has('RUNNING->STOPPING')).toBe(true);
    expect(keys.has('STOPPING->STOPPED')).toBe(true);
  });

  it('strict mode blocks invalid transition and records violation', () => {
    const prev = mkState(['READY', 'SYNCING'], 'READY');
    const next = mkState(['RUNNING', 'RUNNING'], 'RUNNING');
    const out = evaluateBarrierTransition(prev, next, 'STRICT');
    expect(out.globalPhase).toBe(prev.globalPhase);
    expect((out.violations ?? []).length).toBeGreaterThan(0);
    expect(out.violations?.[0]?.reason).toMatch(/phase barrier not satisfied/i);
  });

  it('permissive mode allows transition and records violation', () => {
    const prev = mkState(['READY', 'SYNCING'], 'READY');
    const next = mkState(['RUNNING', 'RUNNING'], 'RUNNING');
    const out = evaluateBarrierTransition(prev, next, 'PERMISSIVE');
    expect(out.globalPhase).toBe('RUNNING');
    expect((out.violations ?? []).length).toBeGreaterThan(0);
  });

  it('valid transition is allowed without violations', () => {
    const prev = mkState(['READY', 'READY'], 'READY');
    const next = mkState(['RUNNING', 'RUNNING'], 'RUNNING');
    const out = evaluateBarrierTransition(prev, next, 'STRICT');
    expect(out.globalPhase).toBe('RUNNING');
    expect((out.violations ?? []).length).toBe(0);
  });

  it('failure is immediate and bypasses barriers', () => {
    const prev = mkState(['RUNNING', 'RUNNING'], 'RUNNING');
    const next = mkState(['RUNNING', 'FAILED'], 'FAILED');
    const out = evaluateBarrierTransition(prev, next, 'STRICT');
    expect(out.globalPhase).toBe('FAILED');
  });
});
