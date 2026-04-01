import { canonicalizeKeysDeep } from '../logging/audit';

import { DistributedInputValidationError } from './errors';
import { createEvent, type Event, type EventGraph } from './event_model';
import { assertLogicalTimeValid, compareLogicalTime, type LogicalTime } from './logical_time';
import { mergeGraphs } from './merge_algebra';
import { evaluateInvariants, type InvariantEvaluation, type InvariantResult } from './cluster_invariant_engine';
import { evaluateCompliance, type ComplianceDecision } from './cluster_compliance_engine';
import {
  executeComplianceDecision,
  type ComplianceAction,
  type ComplianceExecutionRecord,
  type ExecutorMode,
} from './cluster_compliance_executor';
import {
  evaluateBarrierTransition,
  type BarrierMode,
  type BarrierViolation,
} from './phase_barrier_engine';
import { topologicalSortDominanceAware } from './state_engine';

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

export interface NodeState {
  readonly nodeId: string;
  readonly phase: NodePhase;
  readonly logicalTime: LogicalTime;
  readonly lastEventId: string;
}

export interface ClusterState {
  readonly nodes: Readonly<Record<string, NodeState>>;
  readonly globalPhase: ClusterPhase;
  readonly logicalTime: LogicalTime;
  readonly violations?: readonly BarrierViolation[];
  readonly invariants?: readonly InvariantEvaluation[];
  readonly overallCompliance?: InvariantResult;
  readonly complianceDecision?: ComplianceDecision;
  readonly executedActions?: readonly ComplianceAction[];
  readonly executionTimestamp?: number;
  readonly executionJournal?: Readonly<Record<string, ComplianceExecutionRecord>>;
  readonly executionMetadata?: Readonly<Record<string, unknown>>;
  readonly expectedNodeIds?: readonly string[];
  readonly invariantContextHash?: string;
}

export interface ClusterEvaluationOptions {
  readonly barrierMode?: BarrierMode;
  readonly expectedNodeIds?: readonly string[];
  readonly invariantContextHash?: string;
  readonly complianceTimestamp?: number;
  readonly executorMode?: ExecutorMode;
  readonly executorDryRun?: boolean;
  readonly executorLogOnly?: boolean;
  readonly executionTimestamp?: number;
}

type LifecycleEnvelope = {
  readonly eventId: string;
  readonly logicalTime: LogicalTime;
};

export type LifecycleEvent =
  | (LifecycleEnvelope & { readonly type: 'NODE_PHASE_CHANGED'; readonly nodeId: string; readonly from: NodePhase; readonly to: NodePhase })
  | (LifecycleEnvelope & { readonly type: 'NODE_FAILED'; readonly nodeId: string })
  | (LifecycleEnvelope & { readonly type: 'NODE_RECOVERED'; readonly nodeId: string });

export const IRIS_LIFECYCLE_EVENT_TYPE = 'ir.cluster.lifecycle' as const;

const NODE_PHASES: readonly NodePhase[] = [
  'INIT',
  'BOOTSTRAPPING',
  'SYNCING',
  'READY',
  'RUNNING',
  'DEGRADED',
  'STOPPING',
  'STOPPED',
  'FAILED',
];

const CLUSTER_PHASES: readonly ClusterPhase[] = [
  'INITIALIZING',
  'PARTIAL',
  'SYNCING',
  'READY',
  'RUNNING',
  'DEGRADED',
  'STOPPING',
  'STOPPED',
  'FAILED',
  'HALTED',
];

const ALLOWED_TRANSITIONS: Readonly<Record<NodePhase, ReadonlySet<NodePhase>>> = {
  INIT: new Set(['BOOTSTRAPPING', 'FAILED', 'STOPPING']),
  BOOTSTRAPPING: new Set(['SYNCING', 'FAILED', 'STOPPING']),
  SYNCING: new Set(['READY', 'DEGRADED', 'FAILED', 'STOPPING']),
  READY: new Set(['RUNNING', 'DEGRADED', 'FAILED', 'STOPPING']),
  RUNNING: new Set(['DEGRADED', 'FAILED', 'STOPPING']),
  DEGRADED: new Set(['RUNNING', 'SYNCING', 'FAILED', 'STOPPING']),
  STOPPING: new Set(['STOPPED', 'FAILED']),
  STOPPED: new Set([]),
  FAILED: new Set(['DEGRADED', 'STOPPING']),
};

function freezeNode(node: NodeState): NodeState {
  return Object.freeze({
    nodeId: node.nodeId,
    phase: node.phase,
    logicalTime: Object.freeze({ counter: node.logicalTime.counter, nodeId: node.logicalTime.nodeId }),
    lastEventId: node.lastEventId,
  });
}

function freezeCluster(
  nodes: Record<string, NodeState>,
  logicalTime: LogicalTime,
  globalPhase: ClusterPhase,
  violations: readonly BarrierViolation[] = Object.freeze([]),
  expectedNodeIds: readonly string[] = Object.freeze([]),
  invariantContextHash?: string,
  complianceDecision?: ComplianceDecision,
  executedActions: readonly ComplianceAction[] = Object.freeze([]),
  executionTimestamp?: number,
  executionJournal: Readonly<Record<string, ComplianceExecutionRecord>> = Object.freeze({}),
  executionMetadata: Readonly<Record<string, unknown>> = Object.freeze({}),
): ClusterState {
  const out: Record<string, NodeState> = {};
  for (const id of Object.keys(nodes).sort()) out[id] = freezeNode(nodes[id]!);
  const orderedViolations = [...violations].sort((a, b) =>
    `${a.from}\0${a.to}\0${a.reason}`.localeCompare(`${b.from}\0${b.to}\0${b.reason}`),
  );
  return Object.freeze({
    nodes: Object.freeze(out),
    globalPhase,
    logicalTime: Object.freeze({ counter: logicalTime.counter, nodeId: logicalTime.nodeId }),
    violations: Object.freeze(orderedViolations),
    ...(complianceDecision !== undefined ? { complianceDecision: Object.freeze({ ...complianceDecision }) } : {}),
    executedActions: Object.freeze([...executedActions]),
    ...(executionTimestamp !== undefined ? { executionTimestamp } : {}),
    executionJournal: Object.freeze({ ...executionJournal }),
    executionMetadata: Object.freeze({ ...executionMetadata }),
    expectedNodeIds: Object.freeze([...expectedNodeIds].sort()),
    ...(invariantContextHash !== undefined ? { invariantContextHash } : {}),
  });
}

function assertNodeId(nodeId: string): void {
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    throw new DistributedInputValidationError('nodeId must be a non-empty string');
  }
}

function assertEventId(eventId: string): void {
  if (typeof eventId !== 'string' || eventId.length === 0) {
    throw new DistributedInputValidationError('lifecycle eventId must be a non-empty string');
  }
}

function assertNodePhase(phase: string): asserts phase is NodePhase {
  if (!NODE_PHASES.includes(phase as NodePhase)) {
    throw new DistributedInputValidationError(`invalid NodePhase: ${phase}`);
  }
}

function assertClusterPhase(phase: string): asserts phase is ClusterPhase {
  if (!CLUSTER_PHASES.includes(phase as ClusterPhase)) {
    throw new DistributedInputValidationError(`invalid ClusterPhase: ${phase}`);
  }
}

function maxLogicalTime(a: LogicalTime, b: LogicalTime): LogicalTime {
  return compareLogicalTime(a, b) >= 0 ? a : b;
}

export function createInitialClusterState(localNodeId = 'cluster'): ClusterState {
  assertNodeId(localNodeId);
  return freezeCluster({}, { counter: 0, nodeId: localNodeId }, 'INITIALIZING', Object.freeze([]), Object.freeze([]));
}

export function deriveClusterPhase(nodes: readonly NodeState[]): ClusterPhase {
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

export function validateNodeTransition(from: NodePhase, to: NodePhase): void {
  assertNodePhase(from);
  assertNodePhase(to);
  if (from === to) return;
  if (!ALLOWED_TRANSITIONS[from].has(to)) {
    throw new DistributedInputValidationError(`illegal node transition ${from} -> ${to}`);
  }
}

export function canonicalizeLifecycleEvent(event: LifecycleEvent): LifecycleEvent {
  assertEventId(event.eventId);
  assertLogicalTimeValid(event.logicalTime);
  assertNodeId(event.nodeId);
  if (event.type === 'NODE_PHASE_CHANGED') {
    assertNodePhase(event.from);
    assertNodePhase(event.to);
    return Object.freeze(
      canonicalizeKeysDeep({
        type: event.type,
        eventId: event.eventId,
        nodeId: event.nodeId,
        from: event.from,
        to: event.to,
        logicalTime: { counter: event.logicalTime.counter, nodeId: event.logicalTime.nodeId },
      }) as LifecycleEvent,
    );
  }
  if (event.type === 'NODE_FAILED' || event.type === 'NODE_RECOVERED') {
    return Object.freeze(
      canonicalizeKeysDeep({
        type: event.type,
        eventId: event.eventId,
        nodeId: event.nodeId,
        logicalTime: { counter: event.logicalTime.counter, nodeId: event.logicalTime.nodeId },
      }) as LifecycleEvent,
    );
  }
  throw new DistributedInputValidationError('unknown lifecycle event type');
}

export function lifecycleEventToDistributedEvent(event: LifecycleEvent, parentEventIds: readonly string[] = []): Event {
  const c = canonicalizeLifecycleEvent(event);
  return createEvent({
    type: IRIS_LIFECYCLE_EVENT_TYPE,
    payload: c,
    parents: [...parentEventIds],
    timestampLogical: c.logicalTime.counter,
    actorId: c.logicalTime.nodeId,
  });
}

export function distributedEventToLifecycleEvent(event: Event): LifecycleEvent {
  if (event.type !== IRIS_LIFECYCLE_EVENT_TYPE) {
    throw new DistributedInputValidationError('not a lifecycle distributed event', [event.id, event.type]);
  }
  const payload = event.payload as unknown;
  if (payload === null || typeof payload !== 'object') {
    throw new DistributedInputValidationError('invalid lifecycle payload', [event.id]);
  }
  return canonicalizeLifecycleEvent(payload as LifecycleEvent);
}

export function evaluateClusterState(cluster: ClusterState, options?: ClusterEvaluationOptions): ClusterState {
  const nodes = Object.values(cluster.nodes);
  let logical = cluster.logicalTime;
  for (const n of nodes) {
    assertNodeId(n.nodeId);
    assertNodePhase(n.phase);
    assertLogicalTimeValid(n.logicalTime);
    assertEventId(n.lastEventId);
    logical = maxLogicalTime(logical, n.logicalTime);
  }
  const derived = deriveClusterPhase(nodes);
  const normalized = freezeCluster(
    { ...(cluster.nodes as Record<string, NodeState>) },
    logical,
    derived,
    cluster.violations ?? Object.freeze([]),
    options?.expectedNodeIds ?? cluster.expectedNodeIds ?? Object.freeze([]),
    options?.invariantContextHash ?? cluster.invariantContextHash,
    cluster.complianceDecision,
    cluster.executedActions ?? Object.freeze([]),
    cluster.executionTimestamp,
    cluster.executionJournal ?? Object.freeze({}),
    cluster.executionMetadata ?? Object.freeze({}),
  );
  const barrierMode: BarrierMode = options?.barrierMode ?? 'STRICT';
  const barrierEvaluated = evaluateBarrierTransition(cluster, normalized, barrierMode) as ClusterState;
  validateClusterInvariant(barrierEvaluated);
  const withInvariants = evaluateInvariants(barrierEvaluated);
  const withCompliance = evaluateCompliance(withInvariants, options?.complianceTimestamp ?? 0);
  const withDecision = Object.freeze({
    ...withInvariants,
    complianceDecision: withCompliance,
  });
  const execution = executeComplianceDecision(withDecision, withCompliance, {
    mode: options?.executorMode ?? 'STRICT',
    dryRun: options?.executorDryRun ?? false,
    logOnly: options?.executorLogOnly ?? false,
    executionTimestamp: options?.executionTimestamp,
  });
  return execution.mutatedCluster as ClusterState;
}

export function validateClusterInvariant(cluster: ClusterState): void {
  assertClusterPhase(cluster.globalPhase);
  assertLogicalTimeValid(cluster.logicalTime);
  const nodes = Object.values(cluster.nodes);
  for (const n of nodes) {
    if (compareLogicalTime(cluster.logicalTime, n.logicalTime) < 0) {
      throw new DistributedInputValidationError('cluster logicalTime must dominate node logicalTime', [n.nodeId]);
    }
  }
  const anyRunning = nodes.some((n) => n.phase === 'RUNNING');
  const anyInitLike = nodes.some((n) => n.phase === 'INIT' || n.phase === 'BOOTSTRAPPING');
  if (anyRunning && anyInitLike) {
    throw new DistributedInputValidationError('illegal cluster state: RUNNING mixed with INIT/BOOTSTRAPPING');
  }
  if (
    nodes.some((n) => n.phase === 'FAILED') &&
    cluster.globalPhase !== 'FAILED' &&
    cluster.globalPhase !== 'HALTED'
  ) {
    throw new DistributedInputValidationError('illegal cluster phase: FAILED node requires FAILED/HALTED cluster');
  }
}

export function applyLifecycleEvent(cluster: ClusterState, event: LifecycleEvent, options?: ClusterEvaluationOptions): ClusterState {
  const c = evaluateClusterState(cluster, options);
  const e = canonicalizeLifecycleEvent(event);
  const nodes = { ...(c.nodes as Record<string, NodeState>) };
  const prev = nodes[e.nodeId];
  const prevPhase: NodePhase = prev?.phase ?? 'INIT';
  const prevLt: LogicalTime = prev?.logicalTime ?? { counter: 0, nodeId: e.logicalTime.nodeId };
  const prevEventId = prev?.lastEventId ?? '';
  if (prevEventId === e.eventId) return c;
  if (compareLogicalTime(e.logicalTime, prevLt) < 0) {
    throw new DistributedInputValidationError('non-monotonic lifecycle logicalTime', [e.nodeId, e.eventId]);
  }

  let nextPhase: NodePhase;
  if (e.type === 'NODE_PHASE_CHANGED') {
    if (e.from !== prevPhase) {
      throw new DistributedInputValidationError('NODE_PHASE_CHANGED.from mismatch with current node phase', [
        e.nodeId,
        `expected=${prevPhase}`,
        `got=${e.from}`,
      ]);
    }
    validateNodeTransition(e.from, e.to);
    nextPhase = e.to;
  } else if (e.type === 'NODE_FAILED') {
    validateNodeTransition(prevPhase, 'FAILED');
    nextPhase = 'FAILED';
  } else {
    if (prevPhase !== 'FAILED') {
      throw new DistributedInputValidationError('NODE_RECOVERED requires previous FAILED phase', [e.nodeId]);
    }
    validateNodeTransition('FAILED', 'DEGRADED');
    nextPhase = 'DEGRADED';
  }

  nodes[e.nodeId] = freezeNode({
    nodeId: e.nodeId,
    phase: nextPhase,
    logicalTime: e.logicalTime,
    lastEventId: e.eventId,
  });
  const globalLt = maxLogicalTime(c.logicalTime, e.logicalTime);
  const out = freezeCluster(
    nodes,
    globalLt,
    deriveClusterPhase(Object.values(nodes)),
    c.violations ?? Object.freeze([]),
    options?.expectedNodeIds ?? c.expectedNodeIds ?? Object.freeze([]),
    options?.invariantContextHash ?? c.invariantContextHash,
    c.complianceDecision,
    c.executedActions ?? Object.freeze([]),
    c.executionTimestamp,
    c.executionJournal ?? Object.freeze({}),
    c.executionMetadata ?? Object.freeze({}),
  );
  return evaluateClusterState(out, options);
}

export function evaluateClusterFromEventGraph(graph: EventGraph, initial?: ClusterState, options?: ClusterEvaluationOptions): ClusterState {
  const ordered = topologicalSortDominanceAware(graph);
  let cluster = evaluateClusterState(initial ?? createInitialClusterState(), options);
  for (const event of ordered) {
    if (event.type !== IRIS_LIFECYCLE_EVENT_TYPE) continue;
    cluster = applyLifecycleEvent(cluster, distributedEventToLifecycleEvent(event), options);
  }
  return evaluateClusterState(cluster, options);
}

export function mergeAndEvaluateCluster(
  graphA: EventGraph,
  graphB: EventGraph,
  initial?: ClusterState,
  options?: ClusterEvaluationOptions,
): ClusterState {
  const merged = mergeGraphs(graphA, graphB);
  return evaluateClusterFromEventGraph(merged, initial, options);
}
