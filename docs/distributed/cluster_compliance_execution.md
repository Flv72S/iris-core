# Cluster Compliance Execution Layer — 16F.6.I

This layer transforms `ComplianceDecision` into deterministic cluster-state metadata updates.

## Pure execution model

Core API:

- `executeComplianceDecision(cluster, decision, options?)`
- `simulateComplianceExecution(cluster, decision, options?)`

Properties:

- no in-place mutation
- no external side effects
- no implicit clock usage
- replay-safe output for identical input

## Decision identity and idempotency

- `decisionId = SHA-256(canonical({ severity, action, sorted invariantIds, sorted reasons, timestamp }))`
- execution journal key: `cluster.executionJournal[decisionId]`
- if already present: execution is skipped and existing record is returned

## Deterministic timestamp

- `executionTimestamp = options.executionTimestamp ?? decision.timestamp`
- never uses `Date.now()`

## Canonical action handling

- canonical order:
  1. `HALT_CLUSTER`
  2. `FREEZE_TRANSITIONS`
  3. `REQUIRE_MANUAL_INTERVENTION`
  4. `ESCALATE`
  5. `LOG_ONLY`
  6. `NO_OP`
- exactly one effective action is executed

## STRICT vs PERMISSIVE

- `STRICT` (default): apply action as-is
- `PERMISSIVE` deterministic downgrade:
  - `HALT_CLUSTER -> FREEZE_TRANSITIONS`
  - `FREEZE_TRANSITIONS -> ESCALATE`
  - `REQUIRE_MANUAL_INTERVENTION -> ESCALATE`

## Allowed state mutations

Only these fields may be changed by executor:

- `globalPhase` (set to `HALTED` for halt action)
- `transitionLocks`
- `locked`
- `requiresOperator`
- `escalation`
- `executedActions`
- `executionTimestamp`
- `executionJournal`
- `executionMetadata`

`nodes`, event history, invariant/barrier definitions remain unchanged.

## Integration point

Lifecycle pipeline:

1. normalize
2. barrier enforcement
3. invariant evaluation
4. compliance decision
5. compliance execution (this layer)

Execution remains derived metadata over cluster state, not imperative orchestration.
