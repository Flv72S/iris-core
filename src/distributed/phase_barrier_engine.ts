import { canonicalizeKeysDeep } from '../logging/audit';

import { DistributedInputValidationError } from './errors';

export type NodePhase =
  | 'INIT'
  | 'BOOTSTRAPPING'
  | 'SYNCING'
  | 'READY'
  | 'RUNNING'
  | 'DEGRADED'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED';

export type ClusterPhase =
  | 'INITIALIZING'
  | 'PARTIAL'
  | 'SYNCING'
  | 'READY'
  | 'RUNNING'
  | 'DEGRADED'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED'
  | 'HALTED';

export interface NodeStateLike {
  readonly nodeId: string;
  readonly phase: NodePhase;
}

export interface BarrierViolation {
  readonly from: ClusterPhase;
  readonly to: ClusterPhase;
  readonly reason: string;
}

export interface ClusterStateLike {
  readonly nodes: Readonly<Record<string, NodeStateLike>>;
  readonly globalPhase: ClusterPhase;
  readonly violations?: readonly BarrierViolation[];
}

export type BarrierMode = 'STRICT' | 'PERMISSIVE';

export interface PhaseBarrier {
  readonly from: ClusterPhase;
  readonly to: ClusterPhase;
  readonly condition: (prev: ClusterStateLike, next: ClusterStateLike) => boolean;
  readonly description: string;
}

function all(nodes: readonly NodeStateLike[], ...phases: readonly NodePhase[]): boolean {
  return nodes.length > 0 && nodes.every((n) => phases.includes(n.phase));
}

function any(nodes: readonly NodeStateLike[], ...phases: readonly NodePhase[]): boolean {
  return nodes.some((n) => phases.includes(n.phase));
}

function deriveClusterPhaseFromNodes(nodes: readonly NodeStateLike[]): ClusterPhase {
  if (nodes.length === 0) return 'INITIALIZING';
  if (all(nodes, 'STOPPED')) return 'STOPPED';
  if (any(nodes, 'FAILED')) return 'FAILED';
  if (any(nodes, 'DEGRADED')) return 'DEGRADED';
  if (all(nodes, 'RUNNING')) return 'RUNNING';
  if (all(nodes, 'READY')) return 'READY';
  if (all(nodes, 'SYNCING')) return 'SYNCING';
  if (all(nodes, 'INIT', 'BOOTSTRAPPING')) return 'INITIALIZING';
  if (any(nodes, 'STOPPING')) return 'STOPPING';
  return 'PARTIAL';
}

function canonicalViolation(v: BarrierViolation): BarrierViolation {
  return Object.freeze(canonicalizeKeysDeep(v) as BarrierViolation);
}

function appendViolation(next: ClusterStateLike, violation: BarrierViolation): ClusterStateLike {
  const prior = next.violations ?? [];
  return Object.freeze({
    ...next,
    violations: Object.freeze([...prior, canonicalViolation(violation)]),
  });
}

export const PHASE_BARRIERS: readonly PhaseBarrier[] = Object.freeze([
  {
    from: 'INITIALIZING',
    to: 'READY',
    description: 'INIT -> READY requires all nodes READY',
    condition: (_prev, next) => all(Object.values(next.nodes), 'READY'),
  },
  {
    from: 'READY',
    to: 'RUNNING',
    description: 'READY -> RUNNING requires all nodes READY in previous phase',
    condition: (prev) => all(Object.values(prev.nodes), 'READY'),
  },
  {
    from: 'RUNNING',
    to: 'STOPPING',
    description: 'RUNNING -> STOPPING requires all nodes RUNNING or DEGRADED',
    condition: (_prev, next) => all(Object.values(next.nodes), 'RUNNING', 'DEGRADED', 'STOPPING'),
  },
  {
    from: 'STOPPING',
    to: 'STOPPED',
    description: 'STOPPING -> STOPPED requires all nodes STOPPED',
    condition: (_prev, next) => all(Object.values(next.nodes), 'STOPPED'),
  },
]);

export function evaluateBarrierTransition(prev: ClusterStateLike, next: ClusterStateLike, mode: BarrierMode = 'STRICT'): ClusterStateLike {
  if (prev.globalPhase === 'HALTED') {
    return Object.freeze({ ...next, globalPhase: 'HALTED', violations: next.violations ?? Object.freeze([]) });
  }
  const desiredPhase = deriveClusterPhaseFromNodes(Object.values(next.nodes));
  const desired = Object.freeze({
    ...next,
    globalPhase: desiredPhase,
  }) as ClusterStateLike;

  if (desiredPhase === 'FAILED') {
    // Immediate failure phase dominates barriers.
    return Object.freeze({ ...desired, violations: desired.violations ?? Object.freeze([]) });
  }

  if (prev.globalPhase === desiredPhase) {
    return Object.freeze({ ...desired, violations: desired.violations ?? Object.freeze([]) });
  }

  const barrier = PHASE_BARRIERS.find((b) => b.from === prev.globalPhase && b.to === desiredPhase);
  if (barrier === undefined) {
    // Transitions with no explicit barrier are considered direct derivations.
    return Object.freeze({ ...desired, violations: desired.violations ?? Object.freeze([]) });
  }

  if (barrier.condition(prev, desired)) {
    return Object.freeze({ ...desired, violations: desired.violations ?? Object.freeze([]) });
  }

  const violation = canonicalViolation({
    from: prev.globalPhase,
    to: desiredPhase,
    reason: `phase barrier not satisfied: ${barrier.description}`,
  });
  if (mode === 'STRICT') {
    // Block phase advance, keep next node snapshot and previous phase, expose violation.
    return appendViolation(Object.freeze({ ...desired, globalPhase: prev.globalPhase }) as ClusterStateLike, violation);
  }
  if (mode === 'PERMISSIVE') {
    return appendViolation(desired, violation);
  }
  throw new DistributedInputValidationError(`unknown barrier mode ${mode}`);
}
