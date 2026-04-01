# Cluster Cross-Node Invariants — 16F.6.G

This layer defines deterministic, replayable correctness checks over `ClusterState`.

## Invariant model

- `InvariantScope`: `LOCAL | GLOBAL`
- `InvariantResult`: `COMPLIANT | NON_COMPLIANT | UNKNOWN`
- `Invariant`: `{ id, description, scope, evaluate(cluster), explain(...) }`

Evaluation output:

- `InvariantEvaluation`: `{ id, result, reason }`
- `overallCompliance` aggregated by:
  - if any `NON_COMPLIANT` -> `NON_COMPLIANT`
  - else if all `COMPLIANT` -> `COMPLIANT`
  - else -> `UNKNOWN`

## Implemented invariants

- `cluster.convergence`
  - checks deterministic derivation coherence; returns `UNKNOWN` when convergence context hash is absent.
- `cluster.phase_coherence`
  - cluster phase must match phase derived from node set.
- `cluster.node_completeness`
  - expected node set must be fully present and contain no ghost nodes.
- `cluster.no_illegal_transition_residue`
  - no persistent barrier violations.
- `cluster.temporal_consistency`
  - cluster logical time must dominate all node logical times.

## Semantics

- **COMPLIANT**: rule satisfied.
- **NON_COMPLIANT**: clear violation detected.
- **UNKNOWN**: insufficient information to decide (e.g. expected node set missing).

Every invariant emits a deterministic `reason` for explainability.

## Integration point

Lifecycle pipeline (post-16F.6.E):

`EventGraph -> Node fold -> deriveClusterPhase -> barrier enforcement -> invariant evaluation -> final ClusterState`

So invariants are post-barrier and diagnostic only.

## Relation with 16F.6.E and 16F.6.H

- **16F.6.E**: barrier enforcement controls phase advances and records violations.
- **16F.6.G**: invariant engine observes resulting cluster state and grades compliance.
- **16F.6.H**: compliance engine can later enforce policy based on invariant outcomes.
