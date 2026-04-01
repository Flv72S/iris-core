# Distributed Phase Barriers — 16F.6.E

This layer enforces cluster-wide lifecycle phase coherence without a central coordinator.

## Barrier model

`PhaseBarrier`:

- `from: ClusterPhase`
- `to: ClusterPhase`
- `condition(prev, next): boolean` (pure, deterministic)
- `description`

Registry: `PHASE_BARRIERS` in `src/distributed/phase_barrier_engine.ts`.

## Mandatory barriers

- `INITIALIZING -> READY`: all nodes are `READY`
- `READY -> RUNNING`: previous cluster snapshot has all nodes `READY`
- `RUNNING -> STOPPING`: next cluster snapshot nodes are in `{RUNNING, DEGRADED, STOPPING}`
- `STOPPING -> STOPPED`: all nodes are `STOPPED`
- Failure precedence: any `FAILED` node forces immediate `FAILED` cluster phase

## Modes

`BarrierMode = "STRICT" | "PERMISSIVE"`

- **STRICT**
  - blocks invalid phase advance
  - keeps previous cluster phase
  - appends deterministic `BarrierViolation`
- **PERMISSIVE**
  - allows advance
  - appends deterministic `BarrierViolation`

`BarrierViolation`:

- `from`
- `to`
- `reason`

Violations are serializable, replayable, and deterministic.

## Integration with lifecycle engine (16F.6.D)

Pipeline:

`EventGraph -> NodeState fold -> deriveClusterPhase -> evaluateBarrierTransition -> ClusterState`

Implementation details:

- `cluster_lifecycle_engine.evaluateClusterState` performs barrier evaluation post-derivation
- `applyLifecycleEvent` and replay evaluators accept barrier options (`barrierMode`)
- NodeState is never mutated by barriers; barriers only affect `globalPhase` and `violations`

## Determinism and CRDT compatibility

- No wall-clock usage
- No mutable global state
- No leader/coordinator dependency
- Barrier outcome is derived solely from previous/next cluster snapshots
- Merge/evaluation convergence remains intact because enforcement is pure and replayable

## Relation to 16F.6.G

16F.6.E provides enforcement primitives and observability (`violations`).
16F.6.G adds the post-barrier invariant engine (`cluster_invariant_engine.ts`) that evaluates
cluster-wide compliance without mutating lifecycle semantics.
