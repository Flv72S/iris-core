# Cluster Compliance Engine — 16F.6.H

The compliance engine interprets lifecycle/barrier/invariant outcomes and produces deterministic policy decisions.

## Purpose

- Convert cluster correctness signals into structured actions.
- Remain non-intrusive: decision metadata only, no mutation of node phase data.
- Keep replay invariance and deterministic behavior.

## Policy model

`CompliancePolicy` receives:

- `cluster`
- `overallCompliance`
- `violations`

and returns a `ComplianceDecision`.

Registry: `COMPLIANCE_POLICIES` in `src/distributed/cluster_compliance_engine.ts`.

## Severity levels

- `INFO`
- `WARNING`
- `CRITICAL`

## Action types

- `NO_OP`
- `LOG_ONLY`
- `ESCALATE`
- `HALT_CLUSTER`
- `FREEZE_TRANSITIONS`
- `REQUIRE_MANUAL_INTERVENTION`

Selection:

1. highest severity wins
2. tie-break by strongest action:
   `HALT_CLUSTER > FREEZE_TRANSITIONS > REQUIRE_MANUAL_INTERVENTION > ESCALATE > LOG_ONLY > NO_OP`

## Determinism guarantees

- All policies are pure.
- No external state or clocks are read.
- `evaluateCompliance(cluster, now)` is deterministic for fixed input and fixed `now`.
- Lifecycle integration passes explicit deterministic timestamp (`complianceTimestamp`, default `0`).

## Integration pipeline

`EventGraph -> lifecycle fold -> barrier enforcement -> invariant evaluation -> compliance decision`

Compliance output is attached as:

- `ClusterState.complianceDecision`

without mutating:

- `nodes`
- `globalPhase`
- `invariants`

## Relationship with other engines

- **Lifecycle engine (16F.6.D):** produces cluster/node runtime state.
- **Phase barriers (16F.6.E):** enforce phase transition conditions and violations.
- **Invariants (16F.6.G):** grade correctness (`COMPLIANT/NON_COMPLIANT/UNKNOWN`).
- **Compliance (16F.6.H):** maps those grades to deterministic operational action metadata.
