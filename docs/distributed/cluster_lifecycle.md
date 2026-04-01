# Cluster Lifecycle Model — 16F.6.D

This module extends lifecycle semantics from single-node runtime to deterministic multi-node cluster state.

## 1) Node model

`NodeState`:

- `nodeId`
- `phase` (`INIT | BOOTSTRAPPING | SYNCING | READY | RUNNING | DEGRADED | STOPPING | STOPPED | FAILED`)
- `logicalTime` (`LogicalTime`)
- `lastEventId`

Properties:

- transition monotonicity is enforced by `validateNodeTransition`
- each state update is event-derived (`applyLifecycleEvent`)
- no hidden mutable runtime fields

## 2) Cluster model

`ClusterState`:

- `nodes: Record<string, NodeState>`
- `globalPhase: ClusterPhase`
- `logicalTime`

`ClusterPhase`:

- `INITIALIZING | PARTIAL | SYNCING | READY | RUNNING | DEGRADED | STOPPING | STOPPED | FAILED`

## 3) Deterministic Node -> Cluster phase mapping

`deriveClusterPhase(nodes)` is complete and deterministic:

- all `INIT/BOOTSTRAPPING` -> `INITIALIZING`
- all `SYNCING` -> `SYNCING`
- all `READY` -> `READY`
- all `RUNNING` -> `RUNNING`
- any `FAILED` -> `FAILED`
- any `DEGRADED` (and no FAILED) -> `DEGRADED`
- all `STOPPED` -> `STOPPED`
- any `STOPPING` (without stronger terminal conditions above) -> `STOPPING`
- otherwise -> `PARTIAL`

## 4) Lifecycle events

`LifecycleEvent`:

- `NODE_PHASE_CHANGED { nodeId, from, to, logicalTime, eventId }`
- `NODE_FAILED { nodeId, logicalTime, eventId }`
- `NODE_RECOVERED { nodeId, logicalTime, eventId }`

Canonicalization:

- `canonicalizeLifecycleEvent` validates and canonicalizes payload
- `lifecycleEventToDistributedEvent` maps lifecycle payload to `Event` (`type: ir.cluster.lifecycle`) with deterministic identity

## 5) Invariants

Implemented base invariants:

1. **Monotonic transitions** — illegal edges rejected (`validateNodeTransition`).
2. **No illegal cluster state** — example invalid mix (`RUNNING` with `INIT/BOOTSTRAPPING`) rejected.
3. **Temporal coherence** — `cluster.logicalTime >= node.logicalTime` for all nodes.
4. **FAILED precedence** — if any node failed, cluster phase must be `FAILED`.

## 6) Engine API

- `applyLifecycleEvent(cluster, event): ClusterState` (pure, deterministic, idempotent on same `eventId`)
- `evaluateClusterState(cluster): ClusterState` (normalization + invariant checks)
- `evaluateClusterFromEventGraph(graph, initial?)` (replay from merged distributed events)
- `mergeAndEvaluateCluster(graphA, graphB, initial?)`

## 7) Relation to 16F.6.E (barriers)

Barrier enforcement is implemented in `phase_barrier_engine.ts` and applied post-derivation in lifecycle evaluation.
See `docs/distributed/phase_barriers.md` for strict/permissive enforcement details and violation semantics.

## 8) Relation to 16F.6.G (cross-node invariants)

Post-barrier lifecycle evaluation attaches:

- `invariants[]` (deterministic per-rule outcomes)
- `overallCompliance` (`COMPLIANT | NON_COMPLIANT | UNKNOWN`)

See `docs/distributed/cluster_invariants.md`.
