# ADR-003.B — Compliance Matrix (Enterprise / Audit-Grade)

## 1. Purpose

Compliance in IRIS Core means that each runtime invariant is:

1. formally defined (ADR-003.A),
2. bound to concrete runtime evidence,
3. validated by a declared method,
4. assigned a measurable compliance status with explicit residual risk.

This document operationalizes:

- `ADR-003.A` as the formal invariant source (`INV-001` ... `INV-020`),
- `ADR-002` as governance model (determinism, fail-fast, no partial state, auditability),
- the ADR-003.A test system as execution evidence (unit, integration, determinism, negative, classification, non-deterministic observability).

Scope:

- runtime correctness,
- deterministic correctness,
- bounded non-determinism governance.

---

## 2. Compliance Model

Canonical mapping model:

`Invariant -> Evidence -> Validation Method -> Compliance Status`

Validation methods are restricted to:

- `STRICT_DETERMINISTIC`
- `RUNTIME_VALIDATION`
- `TS_CONTROLLED_VALIDATION`
- `OBSERVATIONAL_VALIDATION`

Status values are restricted to:

- `COMPLIANT`
- `CONDITIONALLY_COMPLIANT`
- `NON_COMPLIANT`

---

## 3. Master Compliance Matrix

| INV-ID | Name | Category | Class | Formal Condition | Evidence Source | Validation Method | Test Coverage | Compliance Status | Residual Risk |
|---|---|---|---|---|---|---|---|---|---|
| INV-001 | runtime_state_valid | lifecycle | SN_DETERMINISTIC | `runtime.state` in allowed enum; gauge coherent when present | `snapshot.runtime.state`, `metrics['runtime.state']`, `assertStateConsistency` | STRICT_DETERMINISTIC | unit, negative | COMPLIANT | NONE |
| INV-002 | no_partial_initialization | lifecycle | SN_DETERMINISTIC | `RUNNING => activeComponents >= 6` | `snapshot.runtime.state`, `snapshot.runtime.activeComponents`, runtime gauges | STRICT_DETERMINISTIC | integration | COMPLIANT | LOW |
| INV-003 | deterministic_boot | observability | TS_CONTROLLED | `normalize(snap1) == normalize(snap2)` under controlled identical scenario | `normalizeSnapshot` output, sorted runtime/federation/metrics projections | TS_CONTROLLED_VALIDATION | unit, determinism, negative | COMPLIANT | LOW |
| INV-004 | active_components_consistency | observability | SN_DETERMINISTIC | `activeComponents == runtime.active_components == runtime.component.count` | `snapshot.runtime.activeComponents`, metrics record | STRICT_DETERMINISTIC | integration, negative | COMPLIANT | NONE |
| INV-005 | component_lifecycle_alignment | lifecycle | RT_DETERMINISTIC | `stop() completed => state STOPPED and active list empty` | post-stop snapshot on disk + runtime snapshot | RUNTIME_VALIDATION | integration, negative | COMPLIANT | NONE |
| INV-006 | crdt_convergence | data_consistency | NON_DETERMINISTIC | distributed convergence is bounded/observable, not strict-equality asserted globally | `snapshot.crdt.*`, `snapshot.gossip*`, ND checks ND-001..ND-006 | OBSERVATIONAL_VALIDATION | nondeterministic | CONDITIONALLY_COMPLIANT | LOW |
| INV-007 | no_unresolved_conflicts | data_consistency | SN_DETERMINISTIC | `conflictsResolved <= operationsApplied + operationsRejected` | `snapshot.crdt.*`, validator rule | STRICT_DETERMINISTIC | negative, nondeterministic | COMPLIANT | NONE |
| INV-008 | secure_transport_required | security | RT_DETERMINISTIC | canonical runtime requires secure transport enabled | runtime config guard + init failure traces | RUNTIME_VALIDATION | integration | COMPLIANT | LOW |
| INV-009 | federation_integrity | federation | RT_DETERMINISTIC | federation enabled and domain registration coherent | `snapshot.federation.*`, runtime convergence/federation checks | RUNTIME_VALIDATION | integration, negative | COMPLIANT | LOW |
| INV-010 | identity_initialized | security | RT_DETERMINISTIC | identity phase must complete before transport/runtime progression | init phase trace fields (`lastInitPhase*`), active components | RUNTIME_VALIDATION | integration | COMPLIANT | LOW |
| INV-011 | snapshot_completeness | observability | SN_DETERMINISTIC | core snapshot blocks and mandatory fields valid | `validateObservabilitySnapshot`, persisted snapshot | STRICT_DETERMINISTIC | negative, integration | COMPLIANT | NONE |
| INV-012 | snapshot_determinism | observability | SN_DETERMINISTIC | sanitized serialization deterministic and stable | `isDeterministicSnapshot`, `sanitizeSnapshotForJson` | STRICT_DETERMINISTIC | unit, determinism, negative | COMPLIANT | NONE |
| INV-013 | metrics_consistency | observability | SN_DETERMINISTIC | all metrics finite and structurally valid | `snapshot.metrics.metrics`, validator finite checks | STRICT_DETERMINISTIC | negative, nondeterministic | COMPLIANT | NONE |
| INV-014 | fail_fast_enforced | lifecycle | RT_DETERMINISTIC | phase failure aborts progression and records failure phase | `runtime.lastInitPhase`, `lastInitPhaseStatus`, `lastInitErrorPhase` | RUNTIME_VALIDATION | integration | COMPLIANT | NONE |
| INV-015 | error_state_consistency | lifecycle | RT_DETERMINISTIC | init failure implies `runtime.state=ERROR` and non-running state path | runtime snapshot after forced init failures | RUNTIME_VALIDATION | integration | COMPLIANT | NONE |
| INV-016 | gossip_runtime_required | security | RT_DETERMINISTIC | canonical runtime requires gossip enabled | runtime convergence guard + runtime snapshot coherence | RUNTIME_VALIDATION | integration, nondeterministic | COMPLIANT | LOW |
| INV-017 | crdt_runtime_required | data_consistency | RT_DETERMINISTIC | canonical runtime requires CRDT enabled | runtime convergence guard + `snapshot.crdt` presence | RUNTIME_VALIDATION | integration, nondeterministic | COMPLIANT | LOW |
| INV-018 | legacy_transport_forbidden | security | RT_DETERMINISTIC | legacy transport path forbidden when `allowLegacy=false` | runtime config + init behavior (fail-fast path) | RUNTIME_VALIDATION | integration | COMPLIANT | LOW |
| INV-019 | control_plane_node_secret | security | RT_DETERMINISTIC | if control plane node security is enabled, a valid secret is required | runtime guard path + startup failure semantics | RUNTIME_VALIDATION | integration | COMPLIANT | LOW |
| INV-020 | snapshot_write_rejects_invalid | observability | SN_DETERMINISTIC | persistence rejects invalid snapshot payloads | `writeObservabilitySnapshot` pre-validation and throws | STRICT_DETERMINISTIC | negative, integration | COMPLIANT | NONE |

Status rationale:

- `COMPLIANT`: deterministic or runtime validation is directly implemented and passing.
- `CONDITIONALLY_COMPLIANT`: non-deterministic invariant validated with bounded observational strategy (safe-zone proof, no strict equality).

---

## 4. Validation Pipeline

Canonical enforcement/verification path:

1. **Runtime execution** (`IrisNode.start/stop`, phase guards, fail-fast behavior)
2. **Snapshot construction** (`buildObservabilitySnapshot`)
3. **Normalization** (`normalizeSnapshot`) for deterministic comparison views
4. **Validation** (`validateObservabilitySnapshot`, `assertStateConsistency`)
5. **Persistence** (`writeObservabilitySnapshot`, deterministic sanitization)
6. **Audit evidence** (test suites + persisted snapshots + classification matrix)

Where invariants are enforced:

- hard fail-fast guards: runtime convergence/init path (`INV-008,009,014,016,017,018,019`)
- runtime state consistency path: lifecycle transitions (`INV-005,015`)
- snapshot validator/persistence gate: structural and numeric coherence (`INV-001,004,007,011,012,013,020`)
- controlled/observational evidence layer: deterministic and non-deterministic test suites (`INV-003,006`)

---

## 5. Determinism Guarantee

Deterministic domain:

- snapshot structure and key ordering after sanitization,
- normalized semantic projection for stable cross-run comparison,
- idempotent normalization under equivalent canonical input.

Normalization excludes volatile fields:

- `runtime.boot.time`
- `runtime.init.phase.duration`
- `node_uptime_seconds`
- mutable wall-clock timestamp paths intentionally omitted from deterministic projection

Formal guarantee (test-proven):

1. **Idempotence**: `N(N(s)) = N(s)`
2. **Non-mutation**: normalization does not mutate input snapshot
3. **Multi-run equality**: repeated identical runtime scenarios produce deep-equal normalized outputs

---

## 6. Non-Deterministic Governance

Non-deterministic/controlled invariants are governed by bounded observational evidence, not strict equality.

Mapping:

- `ND-001`: field presence
- `ND-002`: structural/type validity
- `ND-003`: bounded numeric domains (finite, non-negative, rates in range)
- `ND-004`: monotonic/non-regression safety checks
- `ND-005`: multi-run variability safe-zone
- `ND-006`: no-crash repeated-run stability

Class mapping:

- `INV-006` (`NON_DETERMINISTIC`) -> `OBSERVATIONAL_VALIDATION`
- `INV-003` (`TS_CONTROLLED`) -> `TS_CONTROLLED_VALIDATION` with controlled variability boundary

This replaces blind skip semantics with auditable bounded correctness.

---

## 7. Failure Model

Failure trigger:

- invariant predicate evaluates false in runtime path, snapshot validation, or test harness.

Detection channels:

- runtime phase exceptions (`RuntimeInitError`, phase markers),
- snapshot validator errors (`validateObservabilitySnapshot().errors`),
- determinism probes (`isDeterministicSnapshot`, normalization checks),
- nondeterministic bounded checks (`ND-001..ND-006`).

Reporting:

- runtime state transition to `ERROR` where applicable,
- validation errors attached to failed snapshot handling/persistence,
- failing test case with invariant-linked assertion,
- compliance status downgrade path (`COMPLIANT -> CONDITIONALLY_COMPLIANT -> NON_COMPLIANT`).

---

## 8. Auditability Model

Audit evidence is reproducible through:

- invariant catalogue with formal predicates (`ADR-003.A`),
- classification source of truth (`RUNTIME_INVARIANT_CLASSIFICATION`),
- deterministic and observational test artifacts,
- persisted normalized/sanitized snapshots,
- explicit validation method per invariant in this matrix.

Reproducibility guarantees:

- deterministic tests rely on canonical normalization and sorted output,
- non-deterministic checks rely on bounded domain assertions (not exact value replay),
- no invariant in this matrix is unbound to evidence.

---

## 9. Compliance Summary

- Total invariants: **20**
- Fully deterministic validation (`SN_DETERMINISTIC + RT_DETERMINISTIC`): **18 / 20 = 90%**
- Observational/controlled validation (`TS_CONTROLLED + NON_DETERMINISTIC`): **2 / 20 = 10%**
- Current status distribution:
  - `COMPLIANT`: **19**
  - `CONDITIONALLY_COMPLIANT`: **1** (`INV-006`, by design bounded non-determinism)
  - `NON_COMPLIANT`: **0**
- Residual risk profile:
  - `NONE`: 10
  - `LOW`: 10
  - `MEDIUM/HIGH`: 0 (at current validated scope)

---

## 10. Machine-Readable Export (Normative)

```ts
export const ADR003_COMPLIANCE = {
  version: 'ADR-003.B',
  versioning: {
    complianceVersion: {
      adrVersion: '003.B',
      invariantSetVersion: 'v1.0.0',
      runtimeCompatibility: '>= current',
      generatedAt: 'REPRODUCIBLE_AT_BUILD_TIME_UTC_ISO8601',
      snapshotSchemaVersion: 'IrisObservabilitySnapshot@v1',
    },
  },
  generatedFrom: ['ADR-003.A', 'RUNTIME_INVARIANT_CLASSIFICATION', 'ADR-003.A test suites'],
  traceability: {
    catalog: [
      'iris-sim/src/observability/tests/invariants.unit.test.ts',
      'iris-sim/src/observability/tests/invariants.integration.test.ts',
      'iris-sim/src/observability/tests/invariants.determinism.test.ts',
      'iris-sim/src/observability/tests/invariants.negative.test.ts',
      'iris-sim/src/observability/tests/invariants.nondeterministic.test.ts',
    ],
  },
  degradationPolicy: {
    transitions: ['COMPLIANT->CONDITIONALLY_COMPLIANT', 'CONDITIONALLY_COMPLIANT->NON_COMPLIANT'],
    reactions: ['LOG_ONLY', 'WARN', 'FAIL_FAST', 'BLOCK_RUNTIME', 'AUDIT_FLAG'],
  },
  invariants: {
    'INV-001': { class: 'SN_DETERMINISTIC', validation: 'STRICT_DETERMINISTIC', status: 'COMPLIANT', onFailure: { reaction: 'AUDIT_FLAG', escalation: 'CONDITIONALLY_COMPLIANT' } },
    'INV-002': { class: 'SN_DETERMINISTIC', validation: 'STRICT_DETERMINISTIC', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-003': { class: 'TS_CONTROLLED', validation: 'TS_CONTROLLED_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'WARN', escalation: 'CONDITIONALLY_COMPLIANT' } },
    'INV-004': { class: 'SN_DETERMINISTIC', validation: 'STRICT_DETERMINISTIC', status: 'COMPLIANT', onFailure: { reaction: 'AUDIT_FLAG', escalation: 'CONDITIONALLY_COMPLIANT' } },
    'INV-005': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'BLOCK_RUNTIME', escalation: 'NON_COMPLIANT' } },
    'INV-006': { class: 'NON_DETERMINISTIC', validation: 'OBSERVATIONAL_VALIDATION', status: 'CONDITIONALLY_COMPLIANT', onFailure: { reaction: 'WARN', escalation: 'NON_COMPLIANT' } },
    'INV-007': { class: 'SN_DETERMINISTIC', validation: 'STRICT_DETERMINISTIC', status: 'COMPLIANT', onFailure: { reaction: 'AUDIT_FLAG', escalation: 'CONDITIONALLY_COMPLIANT' } },
    'INV-008': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-009': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-010': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-011': { class: 'SN_DETERMINISTIC', validation: 'STRICT_DETERMINISTIC', status: 'COMPLIANT', onFailure: { reaction: 'BLOCK_RUNTIME', escalation: 'NON_COMPLIANT' } },
    'INV-012': { class: 'SN_DETERMINISTIC', validation: 'STRICT_DETERMINISTIC', status: 'COMPLIANT', onFailure: { reaction: 'AUDIT_FLAG', escalation: 'CONDITIONALLY_COMPLIANT' } },
    'INV-013': { class: 'SN_DETERMINISTIC', validation: 'STRICT_DETERMINISTIC', status: 'COMPLIANT', onFailure: { reaction: 'AUDIT_FLAG', escalation: 'CONDITIONALLY_COMPLIANT' } },
    'INV-014': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-015': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'BLOCK_RUNTIME', escalation: 'NON_COMPLIANT' } },
    'INV-016': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-017': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-018': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-019': { class: 'RT_DETERMINISTIC', validation: 'RUNTIME_VALIDATION', status: 'COMPLIANT', onFailure: { reaction: 'FAIL_FAST', escalation: 'NON_COMPLIANT' } },
    'INV-020': { class: 'SN_DETERMINISTIC', validation: 'STRICT_DETERMINISTIC', status: 'COMPLIANT', onFailure: { reaction: 'BLOCK_RUNTIME', escalation: 'NON_COMPLIANT' } },
  },
} as const;
```

Compliance is therefore provable per invariant, evidence-bound, method-bound, and audit-replayable.

---

## 11. Traceability Matrix

`test -> invariant -> evidence -> validation` mapping is normative.  
Note: the ADR-003.A "invariants suite" is physically split into `invariants.unit.test.ts`, `invariants.integration.test.ts`, and `invariants.negative.test.ts`.

| INV-ID | Test IDs (file + test name) | Assertion Type | Evidence Path | Validation Hook |
|---|---|---|---|---|
| INV-001 | `invariants.unit.test.ts :: INV-001: assertStateConsistency true/false/...`; `invariants.negative.test.ts :: invalid state/gauge -> INV-001 fails` | equality + boolean predicate | `snapshot.runtime.state`, `metrics.metrics['runtime.state']` | `assertStateConsistency`, `validateObservabilitySnapshot` |
| INV-002 | `invariants.integration.test.ts :: start -> RUNNING -> snapshot valid ...` | threshold (`>=6`) + state implication | `snapshot.runtime.state`, `snapshot.runtime.activeComponents` | integration runtime assertions |
| INV-003 | `invariants.unit.test.ts :: INV-003:*`; `invariants.determinism.test.ts :: TEST1, IDP-001, DET-002, DET-003` | deep-equality on normalized output, idempotence | `normalizeSnapshot(...)` output | `normalizeSnapshot` |
| INV-004 | `invariants.integration.test.ts :: start -> RUNNING ...`; `invariants.negative.test.ts :: runtime components length mismatch -> validation fails` | equality/coherence | `snapshot.runtime.activeComponents`, runtime gauges | `validateObservabilitySnapshot` |
| INV-005 | `invariants.integration.test.ts :: stop -> snapshot emitted ...`; `LC-001`; `STOP-002`; `invariants.negative.test.ts :: missing stop snapshot -> INV-005 fails` | lifecycle postcondition | persisted snapshot + runtime snapshot | `readObservabilitySnapshot`, runtime stop path |
| INV-006 | `invariants.nondeterministic.test.ts :: ND-001..ND-006` | bounded observational checks | `snapshot.crdt.*`, `snapshot.gossip*`, `snapshot.runtime.*` | ND assertions + `validateObservabilitySnapshot` |
| INV-007 | `invariants.negative.test.ts :: CORR-004 duplicated entries ...`; `invariants.nondeterministic.test.ts :: ND-003 bounded values` | inequality bound | `snapshot.crdt.conflictsResolved/applied/rejected` | `validateObservabilitySnapshot` |
| INV-008 | `invariants.integration.test.ts :: init failure captures phase trace (transport)` | rejection + error-state assertion | `runtime.lastInitErrorPhase`, `runtime.state` | runtime init guards + phase trace assertions |
| INV-009 | `invariants.integration.test.ts :: federation edge ...`; `start -> RUNNING ... domainsRegistered` | membership/order/shape | `snapshot.federation.domainId/domainsRegistered` | `validateObservabilitySnapshot`, normalize checks |
| INV-010 | `invariants.integration.test.ts :: INIT-001 phase traces ...`; `INIT-002` | phase-order/failure localization | `runtime.lastInitPhase*`, active components | `runInitPhase` trace assertions |
| INV-011 | `invariants.negative.test.ts :: corrupted snapshot -> INV-011 fails`; `CORR-001`, `CORR-002` | structural validation | snapshot root + runtime/federation blocks | `validateObservabilitySnapshot` |
| INV-012 | `invariants.unit.test.ts :: INV-012:*`; `invariants.determinism.test.ts :: TEST2, TEST3, TEST4, IMM-001` | determinism probe + stable serialization | sanitized snapshot JSON + normalized output | `isDeterministicSnapshot`, `sanitizeSnapshotForJson` |
| INV-013 | `invariants.negative.test.ts :: CORR-*`; `invariants.nondeterministic.test.ts :: ND-003` | finite-range assertions | `snapshot.metrics.metrics` | `validateObservabilitySnapshot` |
| INV-014 | `invariants.integration.test.ts :: INIT-001, INIT-002, INIT-003` | fail-fast + phase tracking | `runtime.lastInitPhaseStatus`, `lastInitErrorPhase` | runtime init phase wrapper assertions |
| INV-015 | `invariants.integration.test.ts :: init failure captures phase trace (transport)`; `LC-004 failure then restart` | error-state consistency | `snapshot.runtime.state` on failure | runtime start failure assertions |
| INV-016 | `invariants.integration.test.ts :: start -> RUNNING ...`; `invariants.nondeterministic.test.ts :: ND-001` | presence + runtime validity | `snapshot.gossip*` | runtime convergence guard + snapshot validation |
| INV-017 | `invariants.integration.test.ts :: start -> RUNNING ...`; `invariants.nondeterministic.test.ts :: ND-001/ND-003` | presence + bounded values | `snapshot.crdt.*` | runtime convergence guard + ND bounded checks |
| INV-018 | `invariants.integration.test.ts :: LC-004 failure then restart succeeds cleanly` | forbidden legacy path handling | runtime init behavior under guarded config | runtime config guard assertions |
| INV-019 | `invariants.integration.test.ts :: INIT-001 phase traces ...` (guard/failure path class) | guarded failure semantics | init phase errors / runtime error state | runtime security guard path assertions |
| INV-020 | `invariants.negative.test.ts :: CORR-*`; `invariants.integration.test.ts :: start -> snapshot file exists` | pre-persist validation gating | persisted snapshot + validator errors | `writeObservabilitySnapshot` pre-validation contract |

---

## 12. Compliance Versioning Model

Compliance version object:

```ts
const complianceVersion = {
  adrVersion: '003.B',
  invariantSetVersion: 'v1.0.0',
  runtimeCompatibility: '>= current',
  generatedAt: 'REPRODUCIBLE_AT_BUILD_TIME_UTC_ISO8601',
  snapshotSchemaVersion: 'IrisObservabilitySnapshot@v1',
} as const;
```

Reproducibility rules:

- `invariantSetVersion` changes only when invariant IDs/conditions change.
- `snapshotSchemaVersion` changes only when contract shape changes (`IrisObservabilitySnapshot`).
- `generatedAt` is produced by CI build pipeline in UTC ISO-8601 and stored with the exported artifact.
- the tuple `(adrVersion, invariantSetVersion, snapshotSchemaVersion)` uniquely identifies the compliance model used for audit replay.

---

## 13. Compliance Degradation Policy

Status transitions:

`COMPLIANT -> CONDITIONALLY_COMPLIANT -> NON_COMPLIANT`

| Transition | Trigger Condition | Detection Layer | System Reaction |
|---|---|---|---|
| COMPLIANT -> CONDITIONALLY_COMPLIANT | bounded drift or controlled non-deterministic instability without hard safety violation | nondeterministic layer (`ND-*`) or TS-controlled determinism checks | `WARN` + `AUDIT_FLAG` |
| CONDITIONALLY_COMPLIANT -> NON_COMPLIANT | hard invariant failure (invalid shape, fail-fast breach, impossible state transition, persistence acceptance of invalid snapshot) | runtime guard, validator, persistence gate, failing invariant tests | `FAIL_FAST` or `BLOCK_RUNTIME` + `AUDIT_FLAG` |

Per-invariant `onFailure` policy:

| INV-ID | onFailure.reaction | onFailure.escalation |
|---|---|---|
| INV-001 | AUDIT_FLAG | CONDITIONALLY_COMPLIANT |
| INV-002 | FAIL_FAST | NON_COMPLIANT |
| INV-003 | WARN | CONDITIONALLY_COMPLIANT |
| INV-004 | AUDIT_FLAG | CONDITIONALLY_COMPLIANT |
| INV-005 | BLOCK_RUNTIME | NON_COMPLIANT |
| INV-006 | WARN | NON_COMPLIANT |
| INV-007 | AUDIT_FLAG | CONDITIONALLY_COMPLIANT |
| INV-008 | FAIL_FAST | NON_COMPLIANT |
| INV-009 | FAIL_FAST | NON_COMPLIANT |
| INV-010 | FAIL_FAST | NON_COMPLIANT |
| INV-011 | BLOCK_RUNTIME | NON_COMPLIANT |
| INV-012 | AUDIT_FLAG | CONDITIONALLY_COMPLIANT |
| INV-013 | AUDIT_FLAG | CONDITIONALLY_COMPLIANT |
| INV-014 | FAIL_FAST | NON_COMPLIANT |
| INV-015 | BLOCK_RUNTIME | NON_COMPLIANT |
| INV-016 | FAIL_FAST | NON_COMPLIANT |
| INV-017 | FAIL_FAST | NON_COMPLIANT |
| INV-018 | FAIL_FAST | NON_COMPLIANT |
| INV-019 | FAIL_FAST | NON_COMPLIANT |
| INV-020 | BLOCK_RUNTIME | NON_COMPLIANT |

Reaction semantics:

- `LOG_ONLY`: evidence logged, no status change.
- `WARN`: status can degrade to `CONDITIONALLY_COMPLIANT`.
- `FAIL_FAST`: current init/runtime progression is aborted.
- `BLOCK_RUNTIME`: runtime is not allowed to continue as operational.
- `AUDIT_FLAG`: explicit audit marker for post-run compliance review.

---

## 14. Runtime Enforcement Mapping

| Enforcement Stage | Runtime Location | Invariants Primarily Enforced |
|---|---|---|
| init phase | runtime convergence + `runInitPhase` | INV-002, INV-008, INV-009, INV-010, INV-014, INV-015, INV-016, INV-017, INV-018, INV-019 |
| runtime loop / operational state | runtime state + component counters | INV-004, INV-005, INV-006 |
| snapshot build | `buildObservabilitySnapshot` | INV-001, INV-004, INV-011, INV-012, INV-013 |
| snapshot persistence | `writeObservabilitySnapshot` pre-validation + sanitize | INV-011, INV-012, INV-020 |
| test layer | unit/integration/determinism/negative/nondeterministic suites | all INV-001..INV-020 (class-dependent method) |

---

## 15. Audit Replay Guarantee

Auditor replay procedure (deterministic and bounded non-deterministic):

1. Checkout the exact revision containing:
   - `ADR-003.A`,
   - `ADR-003.B`,
   - invariant test suites.
2. Rebuild runtime artifacts from source.
3. Re-run invariant suites (unit/integration/determinism/negative/nondeterministic).
4. Recompute compliance from `ADR003_COMPLIANCE` export:
   - verify class,
   - verify method,
   - verify status and `onFailure` policy.
5. Cross-check persisted snapshots and validator outcomes against matrix evidence paths.

Replay is unambiguous because each invariant has:

- fixed ID,
- fixed class,
- fixed validation method,
- explicit test linkage and evidence path,
- explicit failure reaction/escalation.

---

## 16. Machine Export Extension

The machine export in Section 10 is normative and extended with:

- `traceability`
- `versioning`
- `degradationPolicy`
- per-invariant `onFailure`

This extension makes compliance state computable and auditable end-to-end without interpretive gaps.
