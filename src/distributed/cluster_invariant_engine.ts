import { compareLogicalTime, type LogicalTime } from './logical_time';
import { type BarrierViolation } from './phase_barrier_engine';

export type InvariantScope = 'LOCAL' | 'GLOBAL';

export type InvariantResult = 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';

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

export interface NodeStateInvariantInput {
  readonly nodeId: string;
  readonly phase: NodePhase;
  readonly logicalTime: LogicalTime;
}

export interface ClusterStateInvariantInput {
  readonly nodes: Readonly<Record<string, NodeStateInvariantInput>>;
  readonly globalPhase: ClusterPhase;
  readonly logicalTime: LogicalTime;
  readonly violations?: readonly BarrierViolation[];
  readonly expectedNodeIds?: readonly string[];
  readonly invariantContextHash?: string;
}

export interface Invariant {
  readonly id: string;
  readonly description: string;
  readonly scope: InvariantScope;
  readonly evaluate: (cluster: ClusterStateInvariantInput) => InvariantResult;
  readonly explain: (cluster: ClusterStateInvariantInput, result: InvariantResult) => string;
}

export interface InvariantEvaluation {
  readonly id: string;
  readonly result: InvariantResult;
  readonly reason?: string;
}

function deriveClusterPhase(nodes: readonly NodeStateInvariantInput[]): ClusterPhase {
  if (nodes.length === 0) return 'INITIALIZING';
  const phases = nodes.map((n) => n.phase);
  const all = (p: NodePhase): boolean => phases.every((x) => x === p);
  const any = (p: NodePhase): boolean => phases.some((x) => x === p);
  if (all('STOPPED')) return 'STOPPED';
  if (any('FAILED')) return 'FAILED';
  if (any('DEGRADED')) return 'DEGRADED';
  if (all('RUNNING')) return 'RUNNING';
  if (all('READY')) return 'READY';
  if (all('SYNCING')) return 'SYNCING';
  if (all('INIT') || phases.every((x) => x === 'INIT' || x === 'BOOTSTRAPPING')) return 'INITIALIZING';
  if (any('STOPPING')) return 'STOPPING';
  return 'PARTIAL';
}

function convergenceInvariant(cluster: ClusterStateInvariantInput): InvariantResult {
  if (cluster.globalPhase === 'HALTED') return cluster.invariantContextHash === undefined ? 'UNKNOWN' : 'COMPLIANT';
  const derived = deriveClusterPhase(Object.values(cluster.nodes));
  if (cluster.globalPhase !== derived) return 'NON_COMPLIANT';
  if (cluster.invariantContextHash === undefined) return 'UNKNOWN';
  return 'COMPLIANT';
}

function phaseCoherenceInvariant(cluster: ClusterStateInvariantInput): InvariantResult {
  if (cluster.globalPhase === 'HALTED') return 'COMPLIANT';
  return cluster.globalPhase === deriveClusterPhase(Object.values(cluster.nodes)) ? 'COMPLIANT' : 'NON_COMPLIANT';
}

function nodeCompletenessInvariant(cluster: ClusterStateInvariantInput): InvariantResult {
  const expected = cluster.expectedNodeIds;
  if (expected === undefined || expected.length === 0) return 'UNKNOWN';
  const got = new Set(Object.keys(cluster.nodes));
  for (const id of expected) if (!got.has(id)) return 'NON_COMPLIANT';
  for (const id of got) if (!expected.includes(id)) return 'NON_COMPLIANT';
  return 'COMPLIANT';
}

function noIllegalTransitionResidueInvariant(cluster: ClusterStateInvariantInput): InvariantResult {
  return (cluster.violations?.length ?? 0) === 0 ? 'COMPLIANT' : 'NON_COMPLIANT';
}

function temporalConsistencyInvariant(cluster: ClusterStateInvariantInput): InvariantResult {
  const nodes = Object.values(cluster.nodes);
  if (nodes.length === 0) return 'UNKNOWN';
  for (const n of nodes) {
    if (compareLogicalTime(cluster.logicalTime, n.logicalTime) < 0) return 'NON_COMPLIANT';
  }
  return 'COMPLIANT';
}

export const CLUSTER_INVARIANTS: readonly Invariant[] = Object.freeze([
  {
    id: 'cluster.convergence',
    description: 'Cluster phase is stable and order-independent under deterministic derivation',
    scope: 'GLOBAL',
    evaluate: convergenceInvariant,
    explain: (_c, r) =>
      r === 'COMPLIANT'
        ? 'cluster phase derivation is stable and context hash is present'
        : r === 'UNKNOWN'
          ? 'convergence context hash missing (cannot fully attest)'
          : 'global phase diverges from deterministic derivation',
  },
  {
    id: 'cluster.phase_coherence',
    description: 'ClusterPhase must be coherent with NodeState set',
    scope: 'GLOBAL',
    evaluate: phaseCoherenceInvariant,
    explain: (_c, r) => (r === 'COMPLIANT' ? 'global phase matches derived phase from nodes' : 'global phase/node phase mismatch'),
  },
  {
    id: 'cluster.node_completeness',
    description: 'All required nodes must exist and no ghost nodes are present',
    scope: 'GLOBAL',
    evaluate: nodeCompletenessInvariant,
    explain: (c, r) =>
      r === 'COMPLIANT'
        ? 'required node set is complete'
        : r === 'UNKNOWN'
          ? 'expected node set not provided'
          : `node set mismatch expected=${(c.expectedNodeIds ?? []).join(',')}`,
  },
  {
    id: 'cluster.no_illegal_transition_residue',
    description: 'No persistent barrier violations should remain after strict enforcement',
    scope: 'GLOBAL',
    evaluate: noIllegalTransitionResidueInvariant,
    explain: (c, r) => (r === 'COMPLIANT' ? 'no barrier violations' : `${c.violations?.length ?? 0} barrier violations present`),
  },
  {
    id: 'cluster.temporal_consistency',
    description: 'Cluster logical time dominates all node logical times',
    scope: 'GLOBAL',
    evaluate: temporalConsistencyInvariant,
    explain: (_c, r) =>
      r === 'COMPLIANT'
        ? 'cluster logical time is monotonic and dominates nodes'
        : r === 'UNKNOWN'
          ? 'no nodes available for temporal check'
          : 'cluster logical time is behind at least one node',
  },
]);

export function aggregateCompliance(results: readonly InvariantEvaluation[]): InvariantResult {
  if (results.some((r) => r.result === 'NON_COMPLIANT')) return 'NON_COMPLIANT';
  if (results.length > 0 && results.every((r) => r.result === 'COMPLIANT')) return 'COMPLIANT';
  return 'UNKNOWN';
}

export function evaluateInvariants<T extends ClusterStateInvariantInput>(cluster: T): T & {
  readonly invariants: readonly InvariantEvaluation[];
  readonly overallCompliance: InvariantResult;
} {
  const evaluations: InvariantEvaluation[] = CLUSTER_INVARIANTS.map((inv) => {
    const result = inv.evaluate(cluster);
    return Object.freeze({
      id: inv.id,
      result,
      reason: inv.explain(cluster, result),
    });
  });
  const overallCompliance = aggregateCompliance(evaluations);
  return Object.freeze({
    ...cluster,
    invariants: Object.freeze(evaluations),
    overallCompliance,
  });
}
