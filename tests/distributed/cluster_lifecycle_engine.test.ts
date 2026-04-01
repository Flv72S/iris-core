import { describe, expect, it } from 'vitest';

import { EventGraph, type Event } from '../../src/distributed/event_model';
import {
  applyLifecycleEvent,
  type ClusterEvaluationOptions,
  createInitialClusterState,
  deriveClusterPhase,
  evaluateClusterFromEventGraph,
  evaluateClusterState,
  lifecycleEventToDistributedEvent,
  mergeAndEvaluateCluster,
  type LifecycleEvent,
  type NodePhase,
} from '../../src/distributed/cluster_lifecycle_engine';

function graphFromEvents(events: readonly Event[], order: readonly string[]): EventGraph {
  const byId = new Map(events.map((e) => [e.id, e]));
  const g = new EventGraph();
  for (const id of order) g.addEvent(byId.get(id)!);
  return g;
}

function ev(nodeId: string, type: LifecycleEvent['type'], counter: number, extra?: Partial<LifecycleEvent>): LifecycleEvent {
  const base = {
    eventId: `${nodeId}:${type}:${counter}`,
    nodeId,
    logicalTime: { counter, nodeId },
  };
  if (type === 'NODE_PHASE_CHANGED') {
    return {
      ...base,
      type,
      from: (extra?.type === 'NODE_PHASE_CHANGED' ? extra.from : undefined) ?? 'INIT',
      to: (extra?.type === 'NODE_PHASE_CHANGED' ? extra.to : undefined) ?? 'BOOTSTRAPPING',
    };
  }
  return { ...base, type };
}

describe('16F.6.D cluster lifecycle engine', () => {
  const STRICT: ClusterEvaluationOptions = Object.freeze({ barrierMode: 'STRICT' });
  const PERMISSIVE: ClusterEvaluationOptions = Object.freeze({ barrierMode: 'PERMISSIVE' });

  it('deriveClusterPhase mapping is deterministic and complete', () => {
    const mk = (phase: NodePhase, i: number) => ({ nodeId: `n${i}`, phase, logicalTime: { counter: 0, nodeId: `n${i}` }, lastEventId: `e${i}` });
    expect(deriveClusterPhase([mk('INIT', 1), mk('BOOTSTRAPPING', 2)])).toBe('INITIALIZING');
    expect(deriveClusterPhase([mk('SYNCING', 1), mk('SYNCING', 2)])).toBe('SYNCING');
    expect(deriveClusterPhase([mk('READY', 1), mk('READY', 2)])).toBe('READY');
    expect(deriveClusterPhase([mk('RUNNING', 1), mk('RUNNING', 2)])).toBe('RUNNING');
    expect(deriveClusterPhase([mk('FAILED', 1), mk('READY', 2)])).toBe('FAILED');
    expect(deriveClusterPhase([mk('DEGRADED', 1), mk('READY', 2)])).toBe('DEGRADED');
    expect(deriveClusterPhase([mk('STOPPED', 1), mk('STOPPED', 2)])).toBe('STOPPED');
    expect(deriveClusterPhase([mk('READY', 1), mk('SYNCING', 2)])).toBe('PARTIAL');
  });

  it('same lifecycle stream -> same cluster state (determinism/replay)', () => {
    const stream: LifecycleEvent[] = [
      ev('n1', 'NODE_PHASE_CHANGED', 1, { type: 'NODE_PHASE_CHANGED', from: 'INIT', to: 'BOOTSTRAPPING' }),
      ev('n1', 'NODE_PHASE_CHANGED', 2, { type: 'NODE_PHASE_CHANGED', from: 'BOOTSTRAPPING', to: 'SYNCING' }),
      ev('n1', 'NODE_PHASE_CHANGED', 3, { type: 'NODE_PHASE_CHANGED', from: 'SYNCING', to: 'READY' }),
      ev('n1', 'NODE_PHASE_CHANGED', 4, { type: 'NODE_PHASE_CHANGED', from: 'READY', to: 'RUNNING' }),
    ];
    let a = createInitialClusterState('cluster');
    let b = createInitialClusterState('cluster');
    for (const e of stream) {
      a = applyLifecycleEvent(a, e, STRICT);
      b = applyLifecycleEvent(b, e, STRICT);
    }
    const ea = evaluateClusterState(a, { ...STRICT, invariantContextHash: 'stream:v1' });
    const eb = evaluateClusterState(b, { ...STRICT, invariantContextHash: 'stream:v1' });
    expect(ea).toEqual(eb);
    expect(ea.invariants?.length).toBeGreaterThan(0);
    expect(ea.overallCompliance).toBeDefined();
    expect(ea.complianceDecision).toBeDefined();
    expect(ea.executionJournal).toBeDefined();
  });

  it('cross-node coherence and invalid transition fail-fast', () => {
    let c = createInitialClusterState('cluster');
    c = applyLifecycleEvent(c, ev('n1', 'NODE_PHASE_CHANGED', 1, { type: 'NODE_PHASE_CHANGED', from: 'INIT', to: 'BOOTSTRAPPING' }), STRICT);
    c = applyLifecycleEvent(c, ev('n2', 'NODE_PHASE_CHANGED', 1, { type: 'NODE_PHASE_CHANGED', from: 'INIT', to: 'BOOTSTRAPPING' }), STRICT);
    c = applyLifecycleEvent(c, ev('n1', 'NODE_PHASE_CHANGED', 2, { type: 'NODE_PHASE_CHANGED', from: 'BOOTSTRAPPING', to: 'SYNCING' }), STRICT);
    c = applyLifecycleEvent(c, ev('n2', 'NODE_PHASE_CHANGED', 2, { type: 'NODE_PHASE_CHANGED', from: 'BOOTSTRAPPING', to: 'SYNCING' }), STRICT);
    expect(c.globalPhase).toBe('SYNCING');

    expect(() =>
      applyLifecycleEvent(c, ev('n1', 'NODE_PHASE_CHANGED', 3, { type: 'NODE_PHASE_CHANGED', from: 'SYNCING', to: 'RUNNING' }), STRICT),
    ).toThrow(/illegal node transition/i);
  });

  it('adversarial ordering after merge -> same final cluster', () => {
    const l1 = lifecycleEventToDistributedEvent(
      ev('n1', 'NODE_PHASE_CHANGED', 1, { type: 'NODE_PHASE_CHANGED', from: 'INIT', to: 'BOOTSTRAPPING' }),
    );
    const l2 = lifecycleEventToDistributedEvent(
      ev('n1', 'NODE_PHASE_CHANGED', 2, { type: 'NODE_PHASE_CHANGED', from: 'BOOTSTRAPPING', to: 'SYNCING' }),
      [l1.id],
    );
    const r1 = lifecycleEventToDistributedEvent(
      ev('n2', 'NODE_PHASE_CHANGED', 1, { type: 'NODE_PHASE_CHANGED', from: 'INIT', to: 'BOOTSTRAPPING' }),
    );
    const r2 = lifecycleEventToDistributedEvent(
      ev('n2', 'NODE_PHASE_CHANGED', 2, { type: 'NODE_PHASE_CHANGED', from: 'BOOTSTRAPPING', to: 'SYNCING' }),
      [r1.id],
    );
    const gA = graphFromEvents([l1, l2, r1], [l1.id, r1.id, l2.id]);
    const gB = graphFromEvents([l1, r1, r2], [l1.id, r1.id, r2.id]);

    const ab = mergeAndEvaluateCluster(gA, gB, createInitialClusterState('cluster'), {
      ...STRICT,
      invariantContextHash: 'merge:ab',
    });
    const ba = mergeAndEvaluateCluster(gB, gA, createInitialClusterState('cluster'), {
      ...STRICT,
      invariantContextHash: 'merge:ab',
    });
    expect(ab).toEqual(ba);
    expect(ab.globalPhase).toBe('SYNCING');
    expect(ab.complianceDecision).toEqual(ba.complianceDecision);
    expect(ab.executionJournal).toEqual(ba.executionJournal);
  });

  it('NODE_FAILED and NODE_RECOVERED are deterministic and coherent', () => {
    let c = createInitialClusterState('cluster');
    c = applyLifecycleEvent(c, ev('n1', 'NODE_PHASE_CHANGED', 1, { type: 'NODE_PHASE_CHANGED', from: 'INIT', to: 'BOOTSTRAPPING' }), STRICT);
    c = applyLifecycleEvent(c, ev('n1', 'NODE_PHASE_CHANGED', 2, { type: 'NODE_PHASE_CHANGED', from: 'BOOTSTRAPPING', to: 'SYNCING' }), STRICT);
    c = applyLifecycleEvent(c, ev('n1', 'NODE_PHASE_CHANGED', 3, { type: 'NODE_PHASE_CHANGED', from: 'SYNCING', to: 'READY' }), STRICT);
    c = applyLifecycleEvent(c, ev('n1', 'NODE_PHASE_CHANGED', 4, { type: 'NODE_PHASE_CHANGED', from: 'READY', to: 'RUNNING' }), STRICT);
    c = applyLifecycleEvent(c, ev('n1', 'NODE_FAILED', 5), STRICT);
    expect(c.nodes.n1?.phase).toBe('FAILED');
    expect(c.globalPhase).toBe('HALTED');
    c = applyLifecycleEvent(c, ev('n1', 'NODE_RECOVERED', 6), STRICT);
    expect(c.nodes.n1?.phase).toBe('DEGRADED');
    expect(c.globalPhase).toBe('DEGRADED');
  });

  it('evaluateClusterFromEventGraph replays deterministic lifecycle from events', () => {
    const e1 = lifecycleEventToDistributedEvent(
      ev('n1', 'NODE_PHASE_CHANGED', 1, { type: 'NODE_PHASE_CHANGED', from: 'INIT', to: 'BOOTSTRAPPING' }),
    );
    const e2 = lifecycleEventToDistributedEvent(
      ev('n1', 'NODE_PHASE_CHANGED', 2, { type: 'NODE_PHASE_CHANGED', from: 'BOOTSTRAPPING', to: 'SYNCING' }),
      [e1.id],
    );
    const e3 = lifecycleEventToDistributedEvent(
      ev('n1', 'NODE_PHASE_CHANGED', 3, { type: 'NODE_PHASE_CHANGED', from: 'SYNCING', to: 'READY' }),
      [e2.id],
    );
    const e4 = lifecycleEventToDistributedEvent(
      ev('n1', 'NODE_PHASE_CHANGED', 4, { type: 'NODE_PHASE_CHANGED', from: 'READY', to: 'RUNNING' }),
      [e3.id],
    );
    const g = graphFromEvents([e1, e2, e3, e4], [e1.id, e2.id, e3.id, e4.id]);
    const c = evaluateClusterFromEventGraph(g, createInitialClusterState('cluster'), STRICT);
    expect(c.nodes.n1?.phase).toBe('RUNNING');
    expect(c.globalPhase).toBe('RUNNING');
  });

  it('supports explicit barrier mode options without breaking determinism', () => {
    let strictCluster = createInitialClusterState('cluster');
    let permissiveCluster = createInitialClusterState('cluster');
    const stream: LifecycleEvent[] = [
      ev('n1', 'NODE_PHASE_CHANGED', 1, { type: 'NODE_PHASE_CHANGED', from: 'INIT', to: 'BOOTSTRAPPING' }),
      ev('n1', 'NODE_PHASE_CHANGED', 2, { type: 'NODE_PHASE_CHANGED', from: 'BOOTSTRAPPING', to: 'SYNCING' }),
      ev('n1', 'NODE_PHASE_CHANGED', 3, { type: 'NODE_PHASE_CHANGED', from: 'SYNCING', to: 'READY' }),
      ev('n1', 'NODE_PHASE_CHANGED', 4, { type: 'NODE_PHASE_CHANGED', from: 'READY', to: 'RUNNING' }),
    ];
    for (const e of stream) {
      strictCluster = applyLifecycleEvent(strictCluster, e, STRICT);
      permissiveCluster = applyLifecycleEvent(permissiveCluster, e, PERMISSIVE);
    }
    expect(strictCluster).toEqual(permissiveCluster);
  });
});
